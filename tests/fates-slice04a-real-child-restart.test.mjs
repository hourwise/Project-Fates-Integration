import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtemp, readdir, rmdir, rm, unlink } from "node:fs/promises";
import { existsSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import {
  assertAnankeRuntimeRoot,
  resolveAnankeRoot,
} from "../scripts/fates-slice04a-ananke-runtime.mjs";
import {
  diagnosticSnapshot,
  probePort,
  startChild,
  startupTimingSnapshot,
  stopChild,
  waitForExit,
  waitForClose,
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
const compiledRuntimePath = join(
  anankeRoot,
  "packages",
  "runtime-core",
  "dist",
  "index.js",
);
const compiledAuditPath = join(
  anankeRoot,
  "packages",
  "audit-engine",
  "dist",
  "index.js",
);
const activeChildren = new Set();
const READINESS_BUDGET_MS = 5_000;
const FUNCTIONAL_CHILD_CEILING_MS = 30_000;
const EXISTING_DIAGNOSTIC_GRACE_MS = 15_000;
// The default node:test runner executes top-level tests concurrently. These
// diagnostics intentionally create many real child processes; serialize only
// this module's heavy cohort so unrelated suite tests retain their scheduling.
let heavyDiagnosticTail = Promise.resolve();

async function withHeavyDiagnosticLock(work) {
  const previous = heavyDiagnosticTail;
  let release;
  heavyDiagnosticTail = new Promise((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}
const EXPECTED_SERVER_STAGES = [
  "worker_entered",
  "runtime_modules_loaded",
  "arguments_parsed",
  "sqlite_parent_preflight_begun",
  "sqlite_parent_preflight_completed",
  "sqlite_store_construction_begun",
  "sqlite_store_construction_completed",
  "gateway_construction_begun",
  "gateway_construction_completed",
  "gateway_start_begun",
  "gateway_start_completed",
];

function childEnv() {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    FATES_ANANKE_ROOT: anankeRoot,
  };
}

async function findFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitUntil(predicate, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition did not become true within bound");
}

function filesystemObservation(databasePath) {
  const parent = dirname(databasePath);
  const observation = {
    parentExists: existsSync(parent),
    parentWritableViaSentinel: false,
    databaseExisted: existsSync(databasePath),
    databaseExists: existsSync(databasePath),
    databaseSizeBytes: null,
    walExists: existsSync(`${databasePath}-wal`),
    shmExists: existsSync(`${databasePath}-shm`),
  };
  if (observation.parentExists) {
    const sentinel = join(parent, `.fates-slice04a-sentinel-${process.pid}-${Date.now()}`);
    try {
      writeFileSync(sentinel, "sentinel\n", { flag: "wx" });
      unlinkSync(sentinel);
      observation.parentWritableViaSentinel = true;
    } catch {
      try { unlinkSync(sentinel); } catch { /* bounded disposable probe */ }
    }
  }
  if (observation.databaseExists) {
    try { observation.databaseSizeBytes = statSync(databasePath).size; } catch { /* diagnostic only */ }
  }
  return observation;
}

function finalStartupStage(handle) {
  return handle.startupStages.at(-1)?.stage ?? null;
}

async function startSink(statePath, role) {
  const handle = startChild({
    nodePath: process.execPath,
    script: sinkPath,
    childArgs: ["--port", "0", "--state", statePath, "--mode", "success"],
    cwd: integrationRoot,
    env: childEnv(),
    role,
    onStart: (childHandle) => activeChildren.add(childHandle),
  });
  try {
    await waitUntil(() => handle.stdout.includes("READY "));
    const line = handle.stdout
      .split("\n")
      .find((candidate) => candidate.startsWith("READY "));
    const port = JSON.parse(line.slice("READY ".length)).port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    return { handle, baseUrl, port };
  } catch (error) {
    error.childHandle = handle;
    throw error;
  }
}

async function startAnanke(
  databasePath,
  port,
  providerUrl,
  role,
  {
    genericNegative = false,
    diagnosticGraceMs = EXISTING_DIAGNOSTIC_GRACE_MS,
    functionalCeilingMs = FUNCTIONAL_CHILD_CEILING_MS,
  } = {},
) {
  const filesystemBefore = filesystemObservation(databasePath);
  const handle = startChild({
    nodePath: process.execPath,
    script: workerPath,
    childArgs: [
      "--port",
      String(port),
      "--database",
      databasePath,
      ...(genericNegative ? ["--generic-negative"] : ["--provider", providerUrl]),
    ],
    cwd: integrationRoot,
    env: childEnv(),
    role,
    onStart: (childHandle) => activeChildren.add(childHandle),
  });
  const readinessStartedAt = performance.now();
  try {
    const readiness = await waitForReady(`http://127.0.0.1:${port}`, {
      timeoutMs: READINESS_BUDGET_MS,
      handle,
      identityCheck: (body) => body?.runtime === "ananke",
    });
    return {
      handle,
      readiness,
      readinessClassification: "ready_within_deadline",
      late_ready: false,
      readinessMs: Math.round(performance.now() - readinessStartedAt),
      filesystemBefore,
      filesystemAtReadiness: filesystemObservation(databasePath),
      startupTimings: startupTimingSnapshot(handle),
    };
  } catch (error) {
    const deadlineFilesystem = filesystemObservation(databasePath);
    const diagnostic = {
      classification: null,
      initialReadiness: error.readinessDiagnostics ?? null,
      graceReadiness: null,
      finalStartupStage: finalStartupStage(handle),
      filesystemBefore,
      filesystemAtDeadline: deadlineFilesystem,
      startupTimingsAtDeadline: startupTimingSnapshot(handle),
    };
    const completeLateReadiness = (lateReadiness, phase) => {
      const readinessMs = Math.round(performance.now() - readinessStartedAt);
      return {
        handle,
        readiness: lateReadiness,
        readinessClassification: "late_ready",
        late_ready: true,
        readinessMs,
        exceededDiagnosticGrace: readinessMs > diagnosticGraceMs,
        filesystemBefore,
        filesystemAtReadiness: filesystemObservation(databasePath),
        startupTimings: startupTimingSnapshot(handle),
        startupDiagnostic: {
          ...diagnostic,
          classification: "late_ready",
          [`${phase}Readiness`]: {
            ...lateReadiness,
            actualElapsedMs: readinessMs,
          },
        },
      };
    };
    try {
      const lateReadiness = await waitForReady(`http://127.0.0.1:${port}`, {
        timeoutMs: Math.min(
          diagnosticGraceMs,
          Math.max(1, functionalCeilingMs - Math.round(performance.now() - readinessStartedAt)),
        ),
        handle,
        identityCheck: (body) => body?.runtime === "ananke",
      });
      return completeLateReadiness(lateReadiness, "grace");
    } catch (graceError) {
      diagnostic.graceReadiness = graceError.readinessDiagnostics ?? null;
      diagnostic.startupTimingsAtGraceEnd = startupTimingSnapshot(handle);
      diagnostic.filesystemAtGraceEnd = filesystemObservation(databasePath);
      const remainingMs = functionalCeilingMs - Math.round(performance.now() - readinessStartedAt);
      if (remainingMs > 0) {
        try {
          const finalReadiness = await waitForReady(`http://127.0.0.1:${port}`, {
            timeoutMs: remainingMs,
            handle,
            identityCheck: (body) => body?.runtime === "ananke",
          });
          return completeLateReadiness(finalReadiness, "final");
        } catch (finalError) {
          diagnostic.finalReadiness = finalError.readinessDiagnostics ?? null;
        }
      }
      diagnostic.finalStartupStage = finalStartupStage(handle);
      diagnostic.startupTimingsAtCeiling = startupTimingSnapshot(handle);
      diagnostic.filesystemAtCeiling = filesystemObservation(databasePath);
      diagnostic.classification = handle.exitObserved
        ? "child_exited"
        : diagnostic.finalStartupStage === "sqlite_store_construction_begun"
          ? "store_construction_stall"
          : "alive_without_readiness";
      error.childHandle = handle;
      error.startupDiagnostic = diagnostic;
      error.message = `${error.message}; child=${JSON.stringify(diagnosticSnapshot(handle))}; startupDiagnostic=${JSON.stringify(diagnostic)}`;
      throw error;
    }
  }
}

async function startStoreProbe(
  databasePath,
  role,
  timeoutMs = FUNCTIONAL_CHILD_CEILING_MS,
) {
  const filesystemBefore = filesystemObservation(databasePath);
  const handle = startChild({
    nodePath: process.execPath,
    script: workerPath,
    childArgs: ["--database", databasePath, "--store-probe"],
    cwd: integrationRoot,
    env: childEnv(),
    role,
    onStart: (childHandle) => activeChildren.add(childHandle),
  });
  const startedAt = performance.now();
  try {
    await waitUntil(
      () => handle.exitObserved || handle.markers.has("STORE_PROBE_AFTER_CONSTRUCTION"),
      timeoutMs,
    );
    await waitForExit(handle, timeoutMs);
    const close = await waitForClose(handle, timeoutMs);
    const stages = handle.startupStages.map((stage) => stage.stage);
    assert.ok(stages.includes("sqlite_store_construction_begun"));
    assert.ok(stages.includes("sqlite_store_construction_completed"));
    assert.equal(handle.markers.has("STORE_PROBE_CLOSED"), true);
    activeChildren.delete(handle);
    return {
      role,
      classification: "completed",
      constructionLatencyMs: startupTimingSnapshot(handle).storeConstructionMs,
      totalChildLatencyMs: Math.round(performance.now() - startedAt),
      close,
      filesystemBefore,
      filesystemAfter: filesystemObservation(databasePath),
      diagnostics: diagnosticSnapshot(handle),
    };
  } catch (error) {
    error.childHandle = handle;
    error.startupDiagnostic = {
      classification: handle.exitObserved ? "child_exited" : "store_construction_stall",
      filesystemBefore,
      filesystemAtFailure: filesystemObservation(databasePath),
      diagnostics: diagnosticSnapshot(handle),
    };
    throw error;
  }
}

async function stopAndProbe(child, port) {
  const terminationStartedAt = Date.now();
  await stopChild(child, { activeChildren });
  const exitObservedAt = Date.now();
  const close = await waitForClose(child);
  const closeObservedAt = Date.now();
  const portProbe = await probePort(port);
  return {
    terminationRequested: child.terminationRequested,
    exitObserved: child.exitObserved,
    closeObserved: child.closeObserved,
    exitCode: child.exitCode,
    exitSignal: child.signal,
    closeCode: close.code,
    closeSignal: close.signal,
    shutdownExitCloseMs: exitObservedAt - terminationStartedAt,
    closeAfterExitMs: closeObservedAt - exitObservedAt,
    portProbe,
    portFreeAfterCloseMs: Date.now() - closeObservedAt,
    diagnostics: diagnosticSnapshot(child),
  };
}

async function disposeChildren() {
  for (const child of [...activeChildren]) {
    try {
      await stopChild(child, { activeChildren });
      await waitForClose(child);
    } catch {
      // The test reports the primary lifecycle assertion; cleanup remains bounded.
    }
  }
  assert.equal(activeChildren.size, 0);
}

async function removeDirectoryAfterRelease(directory, timeoutMs = 15_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (!existsSync(directory)) {
        return { state: "already_removed", elapsedMs: Date.now() - startedAt };
      }
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await rm(path, { recursive: true, force: true });
        else await unlink(path);
      }
      await rmdir(directory);
      return { state: "removed", elapsedMs: Date.now() - startedAt };
    } catch (error) {
      lastError = error;
      if (error.code !== "EBUSY" && error.code !== "EPERM") throw error;
      try {
        rmSync(directory, { recursive: true, force: true });
        return { state: "removed", elapsedMs: Date.now() - startedAt };
      } catch (syncError) {
        lastError = syncError;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  return {
    state: "deferred_locked",
    elapsedMs: Date.now() - startedAt,
    errorCode: lastError?.code ?? "unknown",
  };
}

async function freshDirectoryTransition(port, iteration) {
  const directoryA = await mkdtemp(join(tmpdir(), "fates-slice04a-restart-a-"));
  const directoryB = await mkdtemp(join(tmpdir(), "fates-slice04a-restart-b-"));
  let sinkA;
  let anankeA;
  let sinkB;
  let anankeB;
  try {
    const startupAStartedAt = Date.now();
    sinkA = await startSink(join(directoryA, "provider.json"), `sink-a-${iteration}`);
    anankeA = await startAnanke(
      join(directoryA, "ananke.sqlite"),
      port,
      sinkA.baseUrl,
      `ananke-a-${iteration}`,
    );
    const startupALatencyMs = Date.now() - startupAStartedAt;
    const shutdownA = await stopAndProbe(anankeA.handle, port);
    assert.equal(shutdownA.exitObserved, true);
    assert.equal(shutdownA.closeObserved, true);
    assert.equal(shutdownA.portProbe.state, "free");
    const sinkShutdownA = await stopAndProbe(sinkA.handle, sinkA.port);
    assert.equal(sinkShutdownA.portProbe.state, "free");
    const directoryARelease = await removeDirectoryAfterRelease(directoryA);

    const startupBStartedAt = Date.now();
    sinkB = await startSink(join(directoryB, "provider.json"), `sink-b-${iteration}`);
    anankeB = await startAnanke(
      join(directoryB, "ananke.sqlite"),
      port,
      sinkB.baseUrl,
      `ananke-b-${iteration}`,
    );
    const startupBLatencyMs = Date.now() - startupBStartedAt;
    assert.notEqual(join(directoryA, "ananke.sqlite"), join(directoryB, "ananke.sqlite"));
    assert.equal(existsSync(join(directoryB, "ananke.sqlite")), true);
    assert.deepEqual(
      anankeB.handle.startupStages.map((stage) => stage.stage),
      [
        "worker_entered",
        "runtime_modules_loaded",
        "arguments_parsed",
        "sqlite_parent_preflight_begun",
        "sqlite_parent_preflight_completed",
        "sqlite_store_construction_begun",
        "sqlite_store_construction_completed",
        "gateway_construction_begun",
        "gateway_construction_completed",
        "gateway_start_begun",
        "gateway_start_completed",
      ],
    );
    return {
      iteration,
      port,
      startupALatencyMs,
      shutdownA,
      startupBLatencyMs,
      directoryARelease,
      bReadiness: anankeB.readiness,
      bDiagnostics: diagnosticSnapshot(anankeB.handle),
    };
  } finally {
    if (anankeB) await stopAndProbe(anankeB.handle, port);
    if (sinkB) await stopAndProbe(sinkB.handle, sinkB.port);
    if (anankeA && activeChildren.has(anankeA.handle)) await stopChild(anankeA.handle, { activeChildren });
    if (sinkA && activeChildren.has(sinkA.handle)) await stopChild(sinkA.handle, { activeChildren });
    await removeDirectoryAfterRelease(directoryA);
    await removeDirectoryAfterRelease(directoryB);
  }
}

async function sameDatabaseRestart(port, iteration) {
  const directory = await mkdtemp(join(tmpdir(), "fates-slice04a-same-db-"));
  const databasePath = join(directory, "ananke.sqlite");
  let sink;
  let first;
  let second;
  try {
    sink = await startSink(join(directory, "provider.json"), `same-db-sink-${iteration}`);
    first = await startAnanke(databasePath, port, sink.baseUrl, `same-db-first-${iteration}`);
    const firstStop = await stopAndProbe(first.handle, port);
    assert.equal(firstStop.portProbe.state, "free");
    assert.equal(existsSync(databasePath), true);
    second = await startAnanke(databasePath, port, sink.baseUrl, `same-db-second-${iteration}`);
    assert.equal(existsSync(databasePath), true);
    return {
      iteration,
      port,
      firstReadiness: first.readiness,
      firstStop,
      secondReadiness: second.readiness,
      secondDiagnostics: diagnosticSnapshot(second.handle),
    };
  } finally {
    if (second) await stopAndProbe(second.handle, port);
    if (first && activeChildren.has(first.handle)) await stopChild(first.handle, { activeChildren });
    if (sink) await stopAndProbe(sink.handle, sink.port);
    await removeDirectoryAfterRelease(directory);
  }
}

function latencySummary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    minMs: sorted[0] ?? null,
    medianMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    maxMs: sorted.at(-1) ?? null,
  };
}

test("004A real compiled Ananke fresh-directory same-port transition", async () => {
  return withHeavyDiagnosticLock(async () => {
    assert.equal(existsSync(compiledRuntimePath), true);
    assert.equal(existsSync(compiledAuditPath), true);
    const port = await findFreePort();
    const results = [];
    try {
      for (let iteration = 1; iteration <= 10; iteration += 1) {
        results.push(await freshDirectoryTransition(port, iteration));
        assert.equal(activeChildren.size, 0);
      }
    } finally {
      await disposeChildren();
    }
    assert.equal(results.length, 10);
    assert.ok(results.every((result) => result.bReadiness.elapsedMs >= 0));
    console.log(`REAL_CHILD_FRESH_TRANSITIONS ${JSON.stringify(results)}`);
  });
});

test("004A real compiled Ananke same-database restart", async () => {
  return withHeavyDiagnosticLock(async () => {
    assert.equal(existsSync(compiledRuntimePath), true);
    const port = await findFreePort();
    const results = [];
    try {
      for (let iteration = 1; iteration <= 5; iteration += 1) {
        results.push(await sameDatabaseRestart(port, iteration));
        assert.equal(activeChildren.size, 0);
      }
    } finally {
      await disposeChildren();
    }
    assert.equal(results.length, 5);
    assert.ok(results.every((result) => result.secondReadiness.elapsedMs >= 0));
    console.log(`REAL_CHILD_SAME_DB_RESTARTS ${JSON.stringify(results)}`);
  });
});

test("004A standalone compiled Ananke store construction probe", async () => {
  return withHeavyDiagnosticLock(async () => {
    assert.equal(existsSync(compiledRuntimePath), true);
    assert.equal(existsSync(compiledAuditPath), true);
    const results = [];
    for (let iteration = 1; iteration <= 20; iteration += 1) {
      const directory = await mkdtemp(join(tmpdir(), "fates-slice04a-store-probe-"));
      const databasePath = join(directory, "probe.sqlite");
      try {
        results.push(await startStoreProbe(databasePath, `store-probe-${iteration}`));
      } finally {
        if (activeChildren.size) await disposeChildren();
        await removeDirectoryAfterRelease(directory);
      }
    }
    const latencies = results.map((result) => result.constructionLatencyMs);
    assert.equal(results.length, 20);
    assert.equal(results.filter((result) => result.classification !== "completed").length, 0);
    assert.ok(results.every((result) => result.diagnostics.exitObserved));
    assert.ok(results.every((result) => !result.diagnostics.stderr.tail));
    console.log(`STORE_PROBE_20_RESULTS ${JSON.stringify({
      summary: latencySummary(latencies),
      failures: [],
      aliveInsideConstruction: false,
      results,
    })}`);
  });
});

if (process.env.FATES_SLICE04A_RUN_CONTENTION === "1") test("004A controlled unique-resource startup contention cohort", async () => {
  return withHeavyDiagnosticLock(async () => {
    assert.equal(existsSync(compiledRuntimePath), true);
    assert.equal(existsSync(compiledAuditPath), true);
    const cohorts = [];
    for (let iteration = 1; iteration <= 5; iteration += 1) {
      const directory = await mkdtemp(join(tmpdir(), "fates-slice04a-contention-"));
      const port = await findFreePort();
      let ananke;
      try {
      const serverPromise = startAnanke(
        join(directory, "server.sqlite"),
        port,
        "",
        `contention-server-${iteration}`,
        { genericNegative: true },
      ).then((value) => {
        ananke = value;
        return value;
      });
      const probePromises = Array.from({ length: 4 }, (_, index) =>
        startStoreProbe(
          join(directory, `probe-${index + 1}.sqlite`),
          `contention-probe-${iteration}-${index + 1}`,
        ),
      );
      const settled = await Promise.allSettled([serverPromise, ...probePromises]);
      const serverResult = settled[0];
      const probeResults = settled.slice(1);
      const failures = settled
        .filter((result) => result.status === "rejected")
        .map((result) => ({
          message: result.reason?.message ?? String(result.reason),
          startupDiagnostic: result.reason?.startupDiagnostic ?? null,
        }));
      cohorts.push({
        iteration,
        port,
        server: serverResult.status === "fulfilled"
          ? {
              classification: serverResult.value.readinessClassification,
              readiness: serverResult.value.readiness,
              startupTimings: serverResult.value.startupTimings,
            }
          : { classification: "failed", error: failures[0] },
        probes: probeResults.map((result) => result.status === "fulfilled"
          ? {
              classification: result.value.classification,
              constructionLatencyMs: result.value.constructionLatencyMs,
              startupTimings: result.value.diagnostics.startupTimings,
            }
          : { classification: "failed" }),
        failures,
      });
        assert.equal(failures.length, 0);
      } finally {
        if (ananke?.handle && activeChildren.has(ananke.handle)) {
          await stopAndProbe(ananke.handle, port);
        }
        if (activeChildren.size) await disposeChildren();
        await removeDirectoryAfterRelease(directory);
      }
    }
    assert.equal(cohorts.length, 5);
    console.log(`CONTENTION_COHORT_5_RESULTS ${JSON.stringify(cohorts)}`);
  });
});
