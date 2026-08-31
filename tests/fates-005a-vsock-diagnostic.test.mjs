import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DIAGNOSTIC_RECEIVE_TIMEOUT_MS,
  DIAGNOSTIC_STAGE_OBSERVATION_TIMEOUT_MS,
  GUEST_CONNECT_RETRY_BUDGET_MS,
  HOST_CONNECT_TIMEOUT_MS,
  MAX_DIAGNOSTIC_STAGE_EVENTS,
  captureDiagnosticSnapshot,
  createDiagnosticStageObserver,
  requiredStageOrder,
  summarizeDiagnosticLog,
} from '../scripts/fates-005a-vsock-diagnostic.mjs';

const integrationRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const diagnosticScript = join(integrationRoot, 'scripts', 'fates-005a-vsock-diagnostic.mjs');
const hostScript = join(integrationRoot, 'scripts', 'fates-005a-vsock-host.mjs');
const moiraeDist = join(resolve(integrationRoot, '..'), 'moirae-code', 'packages', 'sandbox-adapter', 'dist', 'index.js');
const moiraeModule = existsSync(moiraeDist) ? await import(pathToFileURL(moiraeDist).href) : undefined;

const allowedStages = new Set([
  'INIT_STARTED',
  'CMDLINE_PARSED',
  'EXECUTION_CONTRACT_VALID',
  'AF_VSOCK_SOCKET_CREATED',
  'AF_VSOCK_SOCKET_FAILED',
  'AF_VSOCK_CONNECT_RETRY',
  'AF_VSOCK_CONNECT_FAILED',
  'AF_VSOCK_CONNECTED',
  'PROPOSAL_SENT',
  'RESULT_RECEIVED',
  'RESULT_ALLOW',
]);

function fallbackParseDiagnosticLine(line) {
  const match = /^FATES_005A_GUEST_STAGE ([A-Z_]+)(?: errno=([0-9]{1,5}))?$/.exec(line);
  if (!match || !allowedStages.has(match[1])) throw new Error('invalid diagnostic stage');
  return match[2] === undefined ? { stage: match[1] } : { stage: match[1], errno: Number(match[2]) };
}

const parseDiagnosticLine = moiraeModule?.parseFatesGuestDiagnosticLine ?? fallbackParseDiagnosticLine;

const failureLog = [
  '[    0.000000] Linux version 6.18.44-fates-vsock-mmio',
  '[    0.001000] Run /init as init process',
  'FATES_005A_GUEST_STAGE INIT_STARTED',
  'FATES_005A_GUEST_STAGE CMDLINE_PARSED',
  'FATES_005A_GUEST_STAGE EXECUTION_CONTRACT_VALID',
  'FATES_005A_GUEST_STAGE AF_VSOCK_SOCKET_CREATED',
  'FATES_005A_GUEST_STAGE AF_VSOCK_CONNECT_RETRY errno=111',
  'FATES_005A_GUEST_STAGE AF_VSOCK_CONNECT_RETRY errno=104',
  'FATES_005A_GUEST_STAGE AF_VSOCK_CONNECT_FAILED errno=111',
].join('\n') + '\n';

const successLog = [
  '[    0.000000] Linux version 6.18.44-fates-vsock-mmio',
  '[    0.001000] Run /init as init process',
  'FATES_005A_GUEST_STAGE INIT_STARTED',
  'FATES_005A_GUEST_STAGE CMDLINE_PARSED',
  'FATES_005A_GUEST_STAGE EXECUTION_CONTRACT_VALID',
  'FATES_005A_GUEST_STAGE AF_VSOCK_SOCKET_CREATED',
  'FATES_005A_GUEST_STAGE AF_VSOCK_CONNECTED',
  'FATES_005A_GUEST_STAGE PROPOSAL_SENT',
  'FATES_005A_GUEST_STAGE RESULT_RECEIVED',
  'FATES_005A_GUEST_STAGE RESULT_ALLOW',
].join('\n') + '\n';

test('observed failure log retains bounded guest stage and terminal errno evidence', () => {
  const parsedLines = [];
  const summary = summarizeDiagnosticLog(failureLog, (line) => {
    parsedLines.push(line);
    return parseDiagnosticLine(line);
  });
  assert.equal(summary.guestStageObservation, 'OBSERVED');
  assert.deepEqual(summary.guestStages.at(-1), { stage: 'AF_VSOCK_CONNECT_FAILED', errno: 111 });
  assert.equal(summary.lastSuccessfulStage, 'AF_VSOCK_SOCKET_CREATED');
  assert.equal(summary.terminalGuestStage, 'AF_VSOCK_CONNECT_FAILED');
  assert.equal(summary.terminalGuestErrno, 111);
  assert.equal(summary.kernelLogReadable, true);
  assert.equal(summary.sawLinuxVersion, true);
  assert.equal(summary.sawRunInit, true);
  assert.equal(summary.sawKernelPanic, false);
  assert.equal(summary.sawNoWorkingInit, false);
  assert.equal(parsedLines.length, 7);
  assert.equal(summary.stageEvidenceTruncated, false);
});

test('readable kernel log with no guest markers is distinguished from unavailable evidence', async () => {
  const directory = await mkdtemp(join(resolve(process.cwd()), 'fates-005a-diagnostic-observation-'));
  try {
    const logPath = join(directory, 'jailer.log');
    await writeFile(logPath, '[    0.000000] Linux version 6.18.44-fates-vsock-mmio\n[    0.001000] Run /init as init process\n', 'utf8');
    const readable = await captureDiagnosticSnapshot(logPath, parseDiagnosticLine);
    assert.equal(readable.guestStageObservation, 'NO_STAGE_MARKERS_PRESENT');
    assert.deepEqual(readable.guestStages, []);
    assert.equal(readable.kernelLogReadable, true);
    assert.equal(readable.sawLinuxVersion, true);
    assert.equal(readable.sawRunInit, true);
    assert.equal(readable.stageLogError, null);

    const missing = await captureDiagnosticSnapshot(join(directory, 'missing-jailer.log'), parseDiagnosticLine);
    assert.equal(missing.guestStageObservation, 'LOG_UNAVAILABLE');
    assert.deepEqual(missing.guestStages, []);
    assert.equal(missing.kernelLogReadable, false);
    assert.equal(missing.stageLogError.code, 'ENOENT');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('success path observes the required stage order concurrently and snapshots before stopping', async () => {
  const directory = await mkdtemp(join(resolve(process.cwd()), 'fates-005a-diagnostic-observer-'));
  try {
    const logPath = join(directory, 'jailer.log');
    await writeFile(logPath, 'FATES_005A_GUEST_STAGE INIT_STARTED\n', 'utf8');
    const observer = createDiagnosticStageObserver(logPath, parseDiagnosticLine, { pollIntervalMs: 5 }).start();
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
    await writeFile(logPath, successLog, 'utf8');
    const observed = await observer.waitForRequiredStages(500);
    assert.equal(observed.guestStageObservation, 'OBSERVED');
    assert.equal(requiredStageOrder(observed.guestStages).ok, true);
    assert.equal(observed.terminalGuestStage, 'RESULT_ALLOW');
    const finalSnapshot = await observer.stopAndSnapshot(500);
    assert.equal(finalSnapshot.guestStageObservation, 'OBSERVED');
    assert.equal(finalSnapshot.terminalGuestStage, 'RESULT_ALLOW');
    assert.equal(finalSnapshot.sawLinuxVersion, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('stage evidence remains bounded and reports truncation instead of accepting an incomplete list', () => {
  const log = Array.from({ length: MAX_DIAGNOSTIC_STAGE_EVENTS + 1 }, () => 'FATES_005A_GUEST_STAGE INIT_STARTED').join('\n');
  const summary = summarizeDiagnosticLog(log, parseDiagnosticLine);
  assert.equal(summary.guestStageObservation, 'OBSERVED');
  assert.equal(summary.guestStages.length, MAX_DIAGNOSTIC_STAGE_EVENTS);
  assert.equal(summary.stageEvidenceTruncated, true);
});

test('diagnostic inspection is ordered before receive and the observer starts after inspection', () => {
  const source = readFileSync(diagnosticScript, 'utf8');
  const listen = source.indexOf('await transport.listen()');
  const beforeAuthorization = source.indexOf('boundSocketIdentityBeforeAuthorization = await inspectBoundSocket');
  const authorize = source.indexOf("invokeFixedHelper('diagnostic-authorize-listener')");
  const afterAuthorization = source.indexOf('boundSocketIdentityAfterAuthorization = await inspectBoundSocket');
  const launch = source.indexOf("invokeFixedHelper('diagnostic-launch')");
  const inspect = source.indexOf("invokeFixedHelper('diagnostic-inspect')");
  const observer = source.indexOf('stageObserver = createDiagnosticStageObserver');
  const receive = source.indexOf('transport.receive()');
  assert.ok(listen >= 0);
  assert.ok(beforeAuthorization > listen);
  assert.ok(authorize > beforeAuthorization);
  assert.ok(afterAuthorization > authorize);
  assert.ok(launch >= 0);
  assert.ok(launch > afterAuthorization);
  assert.ok(inspect > launch);
  assert.ok(observer > inspect);
  assert.ok(receive > observer);
  assert.match(source, /finalStageEvidence[\s\S]*diagnostic-cleanup/);
});

test('guest and host connect budgets are aligned without an earlier outer receive timeout', () => {
  const hostSource = readFileSync(hostScript, 'utf8');
  assert.equal(GUEST_CONNECT_RETRY_BUDGET_MS, 60_000);
  assert.equal(HOST_CONNECT_TIMEOUT_MS, 90_000);
  assert.ok(HOST_CONNECT_TIMEOUT_MS > GUEST_CONNECT_RETRY_BUDGET_MS);
  assert.ok(DIAGNOSTIC_RECEIVE_TIMEOUT_MS > HOST_CONNECT_TIMEOUT_MS);
  assert.equal(DIAGNOSTIC_STAGE_OBSERVATION_TIMEOUT_MS, 10_000);
  assert.match(hostSource, /const HOST_CONNECT_TIMEOUT_MS = 90_000;/);
  assert.match(hostSource, /connectTimeoutMs: HOST_CONNECT_TIMEOUT_MS/);
  assert.doesNotMatch(hostSource, /connectTimeoutMs:\\s*60_000/);
});
