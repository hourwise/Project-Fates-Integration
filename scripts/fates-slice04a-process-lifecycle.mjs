import { spawn } from "node:child_process";

export const PROCESS_OUTPUT_TAIL_BYTES = 8192;

export function sanitizeDiagnosticText(value) {
  return String(value ?? "")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer <redacted>")
    .replace(/(token|secret|password|authorization)\s*[:=]\s*[^\s,;}]+/gi, "$1=<redacted>")
    .replace(/[A-Za-z]:[\\/][^\s"'<>]+/g, "<windows-path>")
    .replace(/(?:^|[\s=(])\/(?:home|Users|tmp|var|private|workspace)[^\s"'<>]*/g, "$1<unix-path>");
}

function appendTail(previous, chunk) {
  const bytes = Buffer.from(`${previous}${chunk}`, "utf8");
  return bytes.length <= PROCESS_OUTPUT_TAIL_BYTES
    ? bytes.toString("utf8")
    : bytes.subarray(-PROCESS_OUTPUT_TAIL_BYTES).toString("utf8");
}

function streamStatus(handle, stream) {
  if (!handle?.child?.[stream]) return "unavailable";
  if (handle[`${stream}Observed`]) {
    return handle[stream] ? "observed" : "observed_empty";
  }
  return "not_observed";
}

export function diagnosticTail(handle, stream) {
  return {
    status: streamStatus(handle, stream),
    tail: handle?.[stream] == null ? null : sanitizeDiagnosticText(handle[stream]),
    truncated: Boolean(handle?.[`${stream}Truncated`]),
  };
}

export function diagnosticMarkers(handle, names = ["READY", "EXECUTION_MARKER", "CRASH_MARKER", "RECOVERY_RESULT"]) {
  return Object.fromEntries(names.map((name) => [
    name,
    handle?.markers?.has(name)
      ? { status: "observed", value: sanitizeDiagnosticText(JSON.stringify(handle.markers.get(name))) }
      : { status: "not_observed" },
  ]));
}

export function markerFromHandle(handle, prefix) {
  const value = handle?.markers?.get(prefix);
  if (value === undefined) {
    throw new Error(`${prefix} was not emitted by acceptance worker`);
  }
  return value;
}

export function startChild({
  nodePath,
  script,
  childArgs = [],
  cwd,
  env,
  role = "ananke",
  onStart,
}) {
  const child = spawn(nodePath, [script, ...childArgs], {
    cwd,
    env,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const handle = {
    child,
    role,
    script,
    childArgs: [...childArgs],
    startedAt: new Date().toISOString(),
    stdout: "",
    stderr: "",
    stdoutObserved: false,
    stderrObserved: false,
    stdoutTruncated: false,
    stderrTruncated: false,
    exited: false,
    exitCode: null,
    signal: null,
    spawnError: null,
    markers: new Map(),
    markerLineBuffer: "",
  };
  let resolveExit;
  handle.exitPromise = new Promise((resolveExitPromise) => {
    resolveExit = resolveExitPromise;
  });
  const capture = (stream, chunk) => {
    const value = String(chunk);
    const key = stream === "stdout" ? "stdout" : "stderr";
    const observedKey = `${key}Observed`;
    const truncatedKey = `${key}Truncated`;
    handle[observedKey] = true;
    const previousBytes = Buffer.byteLength(handle[key], "utf8");
    handle[key] = appendTail(handle[key], value);
    handle[truncatedKey] ||= previousBytes + Buffer.byteLength(value, "utf8") > PROCESS_OUTPUT_TAIL_BYTES;
    if (key === "stdout") {
      handle.markerLineBuffer = appendTail(handle.markerLineBuffer, value);
      const lines = handle.markerLineBuffer.split("\n");
      handle.markerLineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const match = line.match(/^(READY|EXECUTION_MARKER|CRASH_MARKER|RECOVERY_RESULT)\s(.+)$/);
        if (!match) continue;
        try {
          handle.markers.set(match[1], JSON.parse(match[2]));
        } catch {
          // Marker parsing remains fail-closed at the caller.
        }
      }
    }
  };
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => capture("stdout", chunk));
  child.stderr?.on("data", (chunk) => capture("stderr", chunk));
  child.once("error", (error) => {
    handle.spawnError = String(error?.message ?? error).slice(0, 512);
    handle.exited = true;
    resolveExit({ code: null, signal: null });
  });
  child.once("exit", (code, signal) => {
    handle.exited = true;
    handle.exitCode = code;
    handle.signal = signal;
    resolveExit({ code, signal });
  });
  onStart?.(handle);
  return handle;
}

export async function waitForExit(handle, timeoutMs = 5_000) {
  if (!handle) return null;
  if (handle.exited || handle.child.exitCode !== null) {
    return handle.exitCode ?? handle.child.exitCode ?? 1;
  }
  let timer;
  try {
    const result = await Promise.race([
      handle.exitPromise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("child process did not exit within bound")),
          timeoutMs,
        );
      }),
    ]);
    return result.code ?? 1;
  } finally {
    clearTimeout(timer);
  }
}

export async function stopChild(handle, { timeoutMs = 5_000, activeChildren } = {}) {
  if (!handle) return;
  if (!handle.exited && handle.child.exitCode === null) {
    handle.child.kill("SIGTERM");
    await waitForExit(handle, timeoutMs);
  }
  activeChildren?.delete(handle);
}
