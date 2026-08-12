import test from "node:test";
import assert from "node:assert/strict";
import {
  diagnosticMarkers,
  diagnosticTail,
  markerFromHandle,
  sanitizeDiagnosticText,
  startChild,
  stopChild,
  waitForExit,
} from "../scripts/fates-slice04a-process-lifecycle.mjs";

const nodePath = process.execPath;
const cwd = process.cwd();
const activeChildren = new Set();

function child(code, role = "test-child") {
  return startChild({
    nodePath,
    script: "-e",
    childArgs: [code],
    cwd,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
    role,
    onStart: (handle) => activeChildren.add(handle),
  });
}

async function waitUntil(predicate, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition did not become true within bound");
}

test("004A process handles preserve identity and delayed live output", async () => {
  const handle = child(
    "console.log('READY'); setTimeout(() => { console.log('EXECUTION_MARKER ' + JSON.stringify({intentId: 'late'})); console.error('late stderr'); }, 100); setTimeout(() => process.exit(0), 2_000);",
  );
  assert.equal(activeChildren.has(handle), true);
  handle.baseUrl = "http://127.0.0.1:0";
  const sameHandle = handle;
  await waitUntil(() => handle.stdout.includes("EXECUTION_MARKER"));
  assert.equal(handle, sameHandle);
  assert.equal(handle.baseUrl, "http://127.0.0.1:0");
  assert.match(handle.stdout, /READY/);
  assert.match(handle.stdout, /EXECUTION_MARKER/);
  await waitUntil(() => handle.stderr.includes("late stderr"));
  assert.match(handle.stderr, /late stderr/);
  assert.deepEqual(markerFromHandle(handle, "EXECUTION_MARKER"), { intentId: "late" });
  assert.equal(diagnosticTail(handle, "stdout").status, "observed");
  assert.equal(diagnosticTail(handle, "stderr").status, "observed");
  assert.equal(diagnosticMarkers(handle).EXECUTION_MARKER.status, "observed");
  await stopChild(handle, { activeChildren });
  assert.equal(activeChildren.has(handle), false);
});

test("004A cleanup removes an already-exited child without a bounded wait", async () => {
  const handle = child("process.exit(0)", "already-exited");
  await waitForExit(handle);
  const started = Date.now();
  await stopChild(handle, { activeChildren });
  assert.ok(Date.now() - started < 500);
  assert.equal(activeChildren.has(handle), false);
  assert.equal(handle.exitCode, 0);
});

test("004A early failure retains bounded sanitized stderr diagnostics", async () => {
  const handle = child(
    "process.stderr.write('failure secret=do-not-retain C:\\\\Users\\\\fleur\\\\private.log\\n'); process.exit(7)",
    "early-failure",
  );
  assert.equal(await waitForExit(handle), 7);
  const diagnostic = diagnosticTail(handle, "stderr");
  assert.equal(diagnostic.status, "observed");
  assert.ok(diagnostic.tail.length <= 8192);
  assert.doesNotMatch(diagnostic.tail, /do-not-retain|C:\\\\Users/);
  assert.match(diagnostic.tail, /<windows-path>/);
  await stopChild(handle, { activeChildren });
});

test("004A diagnostic sanitizer removes credential-shaped values and host paths", () => {
  const value = sanitizeDiagnosticText(
    "Bearer abc123 token=xyz C:\\Users\\fleur\\secret.log /home/fleur/trace.log",
  );
  assert.doesNotMatch(value, /abc123|xyz|C:\\Users|\/home\/fleur/);
  assert.match(value, /<redacted>/);
  assert.match(value, /<windows-path>/);
  assert.match(value, /<unix-path>/);
});
