import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assertAnankeRuntimeRoot,
  resolveAnankeRoot,
} from "../scripts/fates-slice04a-ananke-runtime.mjs";
import {
  startChild,
  stopChild,
  waitForClose,
  waitForExit,
  waitForReady,
} from "../scripts/fates-slice04a-process-lifecycle.mjs";

const integrationRoot = process.cwd();
const { root: anankeRoot } = resolveAnankeRoot({ cwd: integrationRoot });
assertAnankeRuntimeRoot(anankeRoot);
const workerPath = join(
  integrationRoot,
  "fixtures",
  "slice-004a-ananke-process",
  "server.mjs",
);
const sinkPath = join(
  integrationRoot,
  "fixtures",
  "slice-004a-receipt-sink",
  "server.mjs",
);
const activeChildren = new Set();
const TOOL = "fates.slice04a.receipt.write";
const PAYLOAD_DIGEST = "a".repeat(64);

function childEnv() {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    FATES_ANANKE_ROOT: anankeRoot,
  };
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForSinkReady(handle, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const line = handle.stdout
      .split("\n")
      .find((candidate) => candidate.startsWith("READY "));
    if (line) return JSON.parse(line.slice("READY ".length)).port;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`receipt sink did not become ready: ${handle.stderr}`);
}

async function startSink(statePath, options = {}) {
  const handle = startChild({
    nodePath: process.execPath,
    script: sinkPath,
    childArgs: ["--port", "0", "--state", statePath, "--mode", "success"],
    cwd: integrationRoot,
    env: childEnv(),
    role: "receipt-sink",
    onStart: (child) => activeChildren.add(child),
  });
  try {
    const port = await waitForSinkReady(handle, options.readyTimeoutMs ?? 5_000);
    const baseUrl = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
    return { handle, baseUrl, port };
  } catch (error) {
    await stop(handle);
    throw error;
  }
}

async function startWorker(databasePath, providerUrl, options = {}) {
  const port = await freePort();
  const childArgs = ["--port", String(port), "--database", databasePath, "--provider", providerUrl];
  if (options.failpoint) childArgs.push("--failpoint", options.failpoint);
  if (options.crashMode) childArgs.push("--crash-mode", options.crashMode);
  const handle = startChild({
    nodePath: process.execPath,
    script: workerPath,
    childArgs,
    cwd: integrationRoot,
    env: childEnv(),
    role: options.role ?? "ananke-worker",
    onStart: (child) => activeChildren.add(child),
  });
  try {
    await waitForReady(options.readinessUrl ?? `http://127.0.0.1:${port}`, {
      timeoutMs: options.readinessTimeoutMs ?? 5_000,
      handle,
      identityCheck: (body) => body?.runtime === "ananke",
    });
    return { handle, baseUrl: `http://127.0.0.1:${port}`, port };
  } catch (error) {
    await stop(handle);
    throw error;
  }
}

async function api(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  return { status: response.status, body: await response.json() };
}

async function approvedExecution(baseUrl, key) {
  const headers = {
    authorization: "Bearer dev-execution-token",
    "x-ananke-correlation-id": `diagnostic-${key}`,
  };
  const action = {
    idempotencyKey: key,
    target: "acceptance-target",
    payloadDigest: PAYLOAD_DIGEST,
  };
  const requested = await api(baseUrl, "/api/execute", {
    method: "POST",
    headers,
    body: JSON.stringify({
      toolName: TOOL,
      arguments: action,
      purpose: "bounded-recovery-regression",
    }),
  });
  assert.equal(requested.status, 200);
  assert.equal(requested.body.outcome?.state, "WAITING_FOR_APPROVAL");
  const approvals = await api(baseUrl, "/api/approvals", {
    headers: { authorization: "Bearer dev-approval-token" },
  });
  const approval = approvals.body.find(
    (candidate) => candidate.id === requested.body.approvalGrantId,
  );
  assert.ok(approval);
  const decided = await api(baseUrl, `/api/approvals/${approval.id}/approve`, {
    method: "POST",
    headers: { authorization: "Bearer dev-approval-token" },
    body: "{}",
  });
  assert.deepEqual(
    { status: decided.status, approval: decided.body.status },
    { status: 200, approval: "approved" },
  );
  return api(baseUrl, "/api/execute", {
    method: "POST",
    headers,
    body: JSON.stringify({
      toolName: TOOL,
      arguments: action,
      approvalId: approval.id,
      purpose: "bounded-recovery-regression",
    }),
  });
}

async function providerState(baseUrl) {
  return fetch(`${baseUrl}/v1/state`).then((response) => response.json());
}

async function recover(databasePath, providerUrl, intentId) {
  const handle = startChild({
    nodePath: process.execPath,
    script: workerPath,
    childArgs: [
      "--database",
      databasePath,
      "--provider",
      providerUrl,
      "--reconcile-intent",
      intentId,
    ],
    cwd: integrationRoot,
    env: childEnv(),
    role: "ananke-recovery",
    onStart: (child) => activeChildren.add(child),
  });
  const exitCode = await waitForExit(handle, 10_000);
  const close = await waitForClose(handle, 10_000);
  return {
    handle,
    exitCode,
    close,
    result: handle.markers.get("RECOVERY_RESULT"),
  };
}

async function stop(handle) {
  if (!handle) return;
  await stopChild(handle, { activeChildren });
  await waitForClose(handle, 10_000);
}

async function runRecoveryScenario(failpoint, crashMode, key) {
  const directory = await mkdtemp(join(tmpdir(), "fates-slice04a-recovery-regression-"));
  const databasePath = join(directory, "ananke.sqlite");
  const providerStatePath = join(directory, "provider.json");
  let sink;
  let worker;
  let restartedSink;
  let recovery;
  try {
    sink = await startSink(providerStatePath);
    worker = await startWorker(databasePath, sink.baseUrl, {
      failpoint,
      crashMode,
    });
    try {
      await approvedExecution(worker.baseUrl, key);
    } catch {
      // The bounded crash may close the HTTP response before it is returned.
    }
    await waitForExit(worker.handle, 10_000);
    await waitForClose(worker.handle, 10_000);
    const crash = worker.handle.markers.get("CRASH_MARKER");
    assert.equal(crash?.state, "dispatch_marked");
    const beforeRestart = await providerState(sink.baseUrl);
    await stop(sink.handle);
    sink = undefined;
    restartedSink = await startSink(providerStatePath);
    recovery = await recover(databasePath, restartedSink.baseUrl, crash.intentId);
    const afterRestart = await providerState(restartedSink.baseUrl);
    return { recovery, beforeRestart, afterRestart };
  } finally {
    await stop(recovery?.handle);
    await stop(worker?.handle);
    await stop(restartedSink?.handle);
    await stop(sink?.handle);
    assert.equal(activeChildren.size, 0);
    await rm(directory, { recursive: true, force: true });
  }
}

test("startup readiness failure cleans children before ownership transfer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fates-slice04a-readiness-cleanup-"));
  const before = new Set(activeChildren);
  try {
    await assert.rejects(
      startWorker(
        join(directory, "worker.sqlite"),
        "http://127.0.0.1:9",
        {
          readinessUrl: "http://127.0.0.1:1",
          readinessTimeoutMs: 250,
          role: "readiness-cleanup-probe-worker",
        },
      ),
      /child did not become ready/,
    );
    assert.deepEqual(
      [...activeChildren].filter((child) => !before.has(child)),
      [],
      "worker readiness failure must not leave an unowned child",
    );

    await assert.rejects(
      startSink(join(directory, "provider.json"), { readyTimeoutMs: 0 }),
      /receipt sink did not become ready/,
    );
    assert.deepEqual(
      [...activeChildren].filter((child) => !before.has(child)),
      [],
      "sink readiness failure must not leave an unowned child",
    );
  } finally {
    for (const child of [...activeChildren].filter((candidate) => !before.has(candidate))) {
      await stop(child);
    }
    await rm(directory, { recursive: true, force: true });
  }
});

test("004A Case-C recovery drains naturally without redispatch", async () => {
  const { recovery, beforeRestart, afterRestart } = await runRecoveryScenario(
    "after_dispatch_marker",
    "after_dispatch_marker",
    "bounded-case-c-recovery",
  );
  assert.equal(beforeRestart.operationCount, 0);
  assert.equal(afterRestart.operationCount, 0);
  assert.equal(recovery.result?.state, "terminal_unresolved");
  assert.equal(recovery.result?.reconciliationAttempts, 3);
  assert.equal(recovery.exitCode, 0);
  assert.deepEqual(recovery.close, { code: 0, signal: null });
  assert.equal(recovery.handle.closeObserved, true);
  assert.doesNotMatch(recovery.handle.stderr, /UV_HANDLE_CLOSING|Assertion failed/i);
});
test("004A Case-B recovery remains reconciled with exactly one provider operation", async () => {
  const { recovery, beforeRestart, afterRestart } = await runRecoveryScenario(
    "after_provider_call",
    "after_provider_call",
    "bounded-case-b-recovery",
  );
  assert.equal(beforeRestart.operationCount, 1);
  assert.equal(afterRestart.operationCount, 1);
  assert.equal(recovery.result?.state, "reconciled_success");
  assert.equal(recovery.exitCode, 0);
  assert.deepEqual(recovery.close, { code: 0, signal: null });
  assert.equal(recovery.handle.closeObserved, true);
  assert.doesNotMatch(recovery.handle.stderr, /UV_HANDLE_CLOSING|Assertion failed/i);
});
