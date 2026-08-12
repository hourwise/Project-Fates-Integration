import { spawn } from "node:child_process";
import { Socket } from "node:net";
import { performance } from "node:perf_hooks";

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

function classifyReadinessError(error) {
  const code = error?.cause?.code ?? error?.code;
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "ECONNRESET") return "connection_reset";
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return "request_timeout";
  }
  return "request_error";
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

export function diagnosticSnapshot(handle) {
  return {
    spawned: Boolean(handle?.spawned),
    pid: handle?.pid ?? null,
    spawnObserved: Boolean(handle?.spawnObserved),
    spawnError: handle?.spawnError ?? null,
    terminationRequested: Boolean(handle?.terminationRequested),
    terminationRequestedAt: handle?.terminationRequestedAt ?? null,
    exitObserved: Boolean(handle?.exitObserved),
    exitCode: handle?.exitCode ?? null,
    exitSignal: handle?.signal ?? null,
    closeObserved: Boolean(handle?.closeObserved),
    closeCode: handle?.closeCode ?? null,
    closeSignal: handle?.closeSignal ?? null,
    stdout: diagnosticTail(handle, "stdout"),
    stderr: diagnosticTail(handle, "stderr"),
    startupStages: [...(handle?.startupStages ?? [])],
    startupTimings: startupTimingSnapshot(handle),
  };
}

function observedStageTime(handle, stage) {
  return [...(handle?.startupStages ?? [])]
    .reverse()
    .find((candidate) => candidate.stage === stage)?.observedAtMonotonicMs ?? null;
}

export function startupTimingSnapshot(handle) {
  const spawnAt = handle?.spawnObservedAtMonotonicMs ?? null;
  const workerEnteredAt = observedStageTime(handle, "worker_entered");
  const storeBegunAt = observedStageTime(handle, "sqlite_store_construction_begun");
  const storeCompletedAt = observedStageTime(handle, "sqlite_store_construction_completed");
  const gatewayStartBegunAt = observedStageTime(handle, "gateway_start_begun");
  const readinessAt = handle?.readinessObservedAtMonotonicMs ?? null;
  const duration = (from, to) => from !== null && to !== null ? Math.max(0, to - from) : null;
  return {
    spawnToWorkerEnteredMs: duration(spawnAt, workerEnteredAt),
    workerEnteredToStoreConstructionBegunMs: duration(workerEnteredAt, storeBegunAt),
    storeConstructionMs: duration(storeBegunAt, storeCompletedAt),
    storeCompletedToGatewayStartMs: duration(storeCompletedAt, gatewayStartBegunAt),
    gatewayStartToHttpReadyMs: duration(gatewayStartBegunAt, readinessAt),
    spawnToHttpReadyMs: duration(spawnAt, readinessAt),
  };
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
    spawned: child.pid !== undefined,
    pid: child.pid ?? null,
    spawnObserved: false,
    terminationRequested: false,
    terminationRequestedAt: null,
    exitObserved: false,
    closeObserved: false,
    closeCode: null,
    closeSignal: null,
    startupStages: [],
    startedAtMonotonicMs: performance.now(),
    spawnObservedAtMonotonicMs: null,
    readinessObservedAtMonotonicMs: null,
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
        const match = line.match(/^(READY|EXECUTION_MARKER|CRASH_MARKER|RECOVERY_RESULT|STARTUP_STAGE|STORE_PROBE_BEFORE_CONSTRUCTION|STORE_PROBE_AFTER_CONSTRUCTION|STORE_PROBE_CLOSED)\s(.+)$/);
        if (!match) continue;
        try {
          const value = JSON.parse(match[2]);
          handle.markers.set(match[1], value);
          if (match[1] === "STARTUP_STAGE") {
            handle.startupStages.push({
              ...value,
              observedAtMonotonicMs: performance.now(),
            });
          }
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
  child.once("spawn", () => {
    handle.spawned = true;
    handle.spawnObserved = true;
    handle.pid = child.pid ?? null;
    handle.spawnObservedAtMonotonicMs = performance.now();
  });
  child.once("error", (error) => {
    handle.spawnError = String(error?.message ?? error).slice(0, 512);
    handle.exited = true;
    resolveExit({ code: null, signal: null });
  });
  child.once("exit", (code, signal) => {
    handle.exitObserved = true;
    handle.exited = true;
    handle.exitCode = code;
    handle.signal = signal;
    resolveExit({ code, signal });
  });
  child.once("close", (code, signal) => {
    handle.closeObserved = true;
    handle.closeCode = code;
    handle.closeSignal = signal;
    handle.resolveClose?.({ code, signal });
  });
  handle.closePromise = new Promise((resolveClose) => {
    handle.resolveClose = resolveClose;
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

export async function waitForClose(handle, timeoutMs = 5_000) {
  if (!handle) return null;
  if (handle.closeObserved) {
    return { code: handle.closeCode, signal: handle.closeSignal };
  }
  let timer;
  try {
    return await Promise.race([
      handle.closePromise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("child process streams did not close within bound")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForReady(
  baseUrl,
  { timeoutMs = 5_000, handle, identityCheck } = {},
) {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const diagnostics = {
    attempts: 0,
    firstFailureClass: null,
    lastFailureClass: null,
    lastHttpStatus: null,
    childAliveAtDeadline: null,
    elapsedMs: null,
  };
  while (Date.now() < deadline) {
    diagnostics.attempts += 1;
    if (handle?.exitObserved || handle?.child?.exitCode !== null) {
      diagnostics.firstFailureClass ??= "child_already_exited";
      diagnostics.lastFailureClass = "child_already_exited";
      break;
    }
    try {
      const response = await fetch(`${baseUrl}/api/runtime/identity`, {
        signal: AbortSignal.timeout(Math.min(500, Math.max(1, deadline - Date.now()))),
      });
      diagnostics.lastHttpStatus = response.status;
      if (!response.ok) {
        diagnostics.firstFailureClass ??= "http_non_success";
        diagnostics.lastFailureClass = "http_non_success";
      } else {
        const body = await response.json();
        if (identityCheck && !identityCheck(body)) {
          diagnostics.firstFailureClass ??= "identity_mismatch";
          diagnostics.lastFailureClass = "identity_mismatch";
        } else {
          handle.readinessObservedAtMonotonicMs = performance.now();
          diagnostics.elapsedMs = Date.now() - startedAt;
          return diagnostics;
        }
      }
    } catch (error) {
      const failureClass = classifyReadinessError(error);
      diagnostics.firstFailureClass ??= failureClass;
      diagnostics.lastFailureClass = failureClass;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  diagnostics.childAliveAtDeadline = handle
    ? !handle.exitObserved && handle.child?.exitCode === null
    : null;
  diagnostics.elapsedMs = Date.now() - startedAt;
  diagnostics.firstFailureClass ??= "readiness_deadline";
  diagnostics.lastFailureClass ??= "readiness_deadline";
  const error = new Error(`child did not become ready at ${baseUrl}`);
  error.readinessDiagnostics = diagnostics;
  throw error;
}

export function probePort(port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ state: "unknown", failureClass: "probe_timeout" }),
      timeoutMs,
    );
    socket.once("connect", () => {
      clearTimeout(timer);
      finish({ state: "occupied", failureClass: null });
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      finish(
        error.code === "ECONNREFUSED"
          ? { state: "free", failureClass: "connection_refused" }
          : { state: "unknown", failureClass: error.code ?? "probe_error" },
      );
    });
    socket.connect(port, "127.0.0.1");
  });
}

export async function stopChild(handle, { timeoutMs = 5_000, activeChildren } = {}) {
  if (!handle) return;
  if (!handle.exited && handle.child.exitCode === null) {
    handle.terminationRequested = true;
    handle.terminationRequestedAt = new Date().toISOString();
    handle.child.kill("SIGTERM");
    await waitForExit(handle, timeoutMs);
  }
  activeChildren?.delete(handle);
}
