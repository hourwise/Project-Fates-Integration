import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const anankeRoot = process.env.FATES_ANANKE_ROOT ?? 'D:/Users/fleur/Project Ananke';
const nodePath = process.execPath;
const TOOL = 'fates.slice04a.receipt.write';
const PAYLOAD_DIGEST = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REPOS = [
  ['integration', integrationRoot, '562d7c6545edb4d1a00f93a77f51aa95261da291'],
  ['ananke', anankeRoot, '38c43aec29fe3080ff495f5f5f2433adc4632a66'],
  ['horae', 'D:/Users/fleur/Project Horae', '3f531d4f5558a10a36aeae20c3458080eb4468b9'],
  ['moirae', 'D:/Users/fleur/Project Moirae Code', 'bc7b984bd2eb0e0f07a1cd7259a8eab21556f097'],
  ['mnemosyne', 'D:/Users/fleur/Project Mnemosyne', 'f4ab76a9760f856d78908d35facceb068d78c8e5'],
  ['runtimeContracts', 'D:/Users/fleur/Project Runtime Contracts', 'bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8'],
];
const DRIVER_PATH = fileURLToPath(import.meta.url);
const SINK_PATH = join(integrationRoot, 'fixtures', 'slice-004a-receipt-sink', 'server.mjs');
const WORKER_PATH = join(integrationRoot, 'fixtures', 'slice-004a-ananke-process', 'server.mjs');
const DEV_EXECUTION_TOKEN = 'dev-execution-token';
const DEV_APPROVAL_TOKEN = 'dev-approval-token';

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
const mode = process.argv.includes('--execute') ? 'execute' : process.argv.includes('--plan') ? 'plan' : '';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
}
function runtimeEnv() {
  return Object.fromEntries(
    ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE']
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
}
function gitEnv() {
  return runtimeEnv();
}
function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    env: gitEnv(),
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  return { exitCode: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function safePort(port) {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (free) => {
      socket.destroy();
      resolvePort(free);
    };
    socket.once('connect', () => finish(false));
    socket.once('error', () => finish(true));
  });
}
async function verifyPreflight(approvedIntegration, approvedAnanke) {
  const checkpoints = {};
  const warnings = [];
  for (const [name, repo, expected] of REPOS) {
    const expectedSha = name === 'integration' ? approvedIntegration : name === 'ananke' ? approvedAnanke : expected;
    const head = git(repo, ['rev-parse', 'HEAD']);
    const status = git(repo, ['status', '--porcelain', '--untracked-files=all']);
    assert(head.exitCode === 0 && head.stdout.trim() === expectedSha, `${name} checkpoint mismatch`);
    assert(status.exitCode === 0 && status.stdout.trim() === '', `${name} worktree is not clean`);
    if (head.stderr.trim()) warnings.push(`${name} rev-parse: ${head.stderr.trim()}`);
    if (status.stderr.trim()) warnings.push(`${name} status: ${status.stderr.trim()}`);
    checkpoints[name] = head.stdout.trim();
  }
  const active = JSON.parse(readFileSync(join(integrationRoot, 'active-slice.json'), 'utf8'));
  assert(active.status === 'active' && active.activeSliceId === 'FATES-SLICE-004' && active.activeSubsliceId === 'FATES-SLICE-004A', '004A is not active');
  assert(active.baselineCompatibilitySet === 'fates-slice-003a-r1-2026-08-11', 'R1 baseline drifted');
  const matrix = JSON.parse(readFileSync(join(integrationRoot, 'compatibility-matrix.json'), 'utf8'));
  const r1 = matrix.rows.find((row) => row.sliceId === 'FATES-SLICE-003');
  assert(r1?.sealStatus === 'sealed', 'R1 matrix seal drifted');
  const lock = JSON.parse(readFileSync(join(integrationRoot, 'fates-lock.json'), 'utf8'));
  assert(lock.sealStatus === 'sealed' && lock.compatibilitySetId === 'fates-slice-003a-r1-2026-08-11', 'R1 lock drifted');
  assert(active.activationRequirements.ownerOrder.includes('FATES-SLICE-003B remains paused'), '003B pause is not recorded');
  return { checkpoints, warnings };
}
function validateHashArgument(name, path, expected) {
  const actual = sha256(path);
  assert(expected === actual, `${name} hash mismatch: expected ${expected}, actual ${actual}`);
  return actual;
}
async function plan() {
  assert(mode === 'plan', 'use --plan or --execute');
  const approvedIntegration = arg('--approved-integration-sha');
  const approvedAnanke = arg('--approved-ananke-sha');
  const approvedDriver = arg('--approved-driver-sha256');
  const approvedSink = arg('--approved-sink-sha256');
  const approvedWorker = arg('--approved-worker-sha256');
  assert(approvedIntegration && approvedAnanke && approvedDriver && approvedSink && approvedWorker, 'plan requires all approved checkpoints and hashes');
  const sinkPort = Number(arg('--sink-port', '34220'));
  const anankePort = Number(arg('--ananke-port', '34221'));
  assert(await safePort(sinkPort), `sink port ${sinkPort} is not free`);
  assert(await safePort(anankePort), `Ananke port ${anankePort} is not free`);
  const preflight = await verifyPreflight(approvedIntegration, approvedAnanke);
  validateHashArgument('driver', DRIVER_PATH, approvedDriver);
  validateHashArgument('sink fixture', SINK_PATH, approvedSink);
  validateHashArgument('Ananke acceptance worker', WORKER_PATH, approvedWorker);
  assert(existsSync(join(anankeRoot, 'packages', 'runtime-core', 'dist', 'index.js')), 'Ananke build output is missing');
  const result = {
    mode: 'plan',
    processesStarted: 0,
    providerProcessesStarted: 0,
    providerOperations: 0,
    sqliteMutated: false,
    evidenceCreated: false,
    credentialsGenerated: 0,
    fixtureEffects: 0,
    sourcePreflight: { verified: true, route: 'Gateway.execute', lowLevelCallbacks: false },
    integration: { approvalMatch: true, approvedSha: approvedIntegration },
    ananke: { approvedSha: approvedAnanke },
    ports: { sink: sinkPort, ananke: anankePort, requiredFree: true },
    hashes: { driverSha256: approvedDriver, sinkSha256: approvedSink, workerSha256: approvedWorker },
    checkpoints: preflight.checkpoints,
    warnings: preflight.warnings,
    actions: [
      'start independent disposable receipt sink',
      'start dedicated Ananke acceptance worker',
      'execute Cases A-E through the protected /api/execute route',
      'stop/restart Ananke for bounded reconciliation cases',
      'retain sanitized immutable attempt evidence',
    ],
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function childEnv() {
  return runtimeEnv();
}
function startChild(script, childArgs) {
  const child = spawn(nodePath, [script, ...childArgs], { cwd: integrationRoot, env: childEnv(), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  return { child, get stdout() { return stdout; }, get stderr() { return stderr; } };
}
async function waitForExit(processHandle, timeoutMs = 5_000) {
  if (processHandle.child.exitCode !== null) return processHandle.child.exitCode;
  return await new Promise((resolveExit, reject) => {
    const timer = setTimeout(() => reject(new Error('child process did not exit within bound')), timeoutMs);
    processHandle.child.once('exit', (code) => { clearTimeout(timer); resolveExit(code ?? 1); });
  });
}
async function stopChild(processHandle) {
  if (!processHandle || processHandle.child.exitCode !== null) return;
  processHandle.child.kill('SIGTERM');
  await waitForExit(processHandle);
}
async function waitReady(baseUrl) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/runtime/identity`);
      if (response.ok) return;
    } catch { /* process is still starting */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Ananke did not become ready at ${baseUrl}`);
}
async function startSink(statePath, port, mode = 'success') {
  const processHandle = startChild(SINK_PATH, ['--port', String(port), '--state', statePath, '--mode', mode]);
  const deadline = Date.now() + 5_000;
  let sinkPort;
  while (Date.now() < deadline && !sinkPort) {
    const line = processHandle.stdout.split('\n').find((candidate) => candidate.startsWith('READY '));
    if (line) sinkPort = JSON.parse(line.slice('READY '.length)).port;
    else await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  assert(sinkPort, `receipt sink did not become ready: ${processHandle.stderr}`);
  const baseUrl = `http://127.0.0.1:${sinkPort}`;
  const health = await fetch(`${baseUrl}/health`);
  assert(health.ok, 'receipt sink health check failed');
  return { ...processHandle, baseUrl };
}
async function startAnanke(databasePath, port, providerUrl, options = {}) {
  const childArgs = ['--port', String(port), '--database', databasePath, '--provider', providerUrl];
  if (options.failpoint) childArgs.push('--failpoint', options.failpoint);
  if (options.crashMode) childArgs.push('--crash-mode', options.crashMode);
  if (options.genericNegative) childArgs.push('--generic-negative', '--callback-marker', options.callbackMarker);
  const processHandle = startChild(WORKER_PATH, childArgs);
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitReady(baseUrl);
  return { ...processHandle, baseUrl };
}
async function recovery(databasePath, providerUrl, intentId) {
  const processHandle = startChild(WORKER_PATH, ['--database', databasePath, '--provider', providerUrl, '--reconcile-intent', intentId]);
  const exitCode = await waitForExit(processHandle);
  assert(exitCode === 0, `recovery worker failed: ${processHandle.stderr}`);
  return marker(processHandle.stdout, 'RECOVERY_RESULT');
}
function operationDigest(providerState) {
  return providerState.operations.map((operation) => sha256String(operation.providerOperationId));
}
function sha256String(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}
async function withDirectory(callback) {
  const directory = mkdtempSync(join(tmpdir(), 'fates-slice04a-live-'));
  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
async function api(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json();
  return { status: response.status, body };
}
async function approvedExecution(baseUrl, key, correlationId) {
  const headers = { authorization: `Bearer ${DEV_EXECUTION_TOKEN}`, 'x-ananke-correlation-id': correlationId };
  const action = { idempotencyKey: key, target: 'acceptance-target', payloadDigest: PAYLOAD_DIGEST };
  const requested = await api(baseUrl, '/api/execute', { method: 'POST', headers, body: JSON.stringify({ toolName: TOOL, arguments: action, purpose: '004a-live-acceptance' }) });
  assert(requested.status === 200 && requested.body.outcome?.state === 'WAITING_FOR_APPROVAL', 'approval request did not enter Gateway approval state');
  const approvals = await api(baseUrl, '/api/approvals', { headers: { authorization: `Bearer ${DEV_APPROVAL_TOKEN}` } });
  const approval = approvals.body.find((candidate) => candidate.id === requested.body.approvalGrantId);
  assert(approval, 'approval grant was not visible through the operator route');
  const decided = await api(baseUrl, `/api/approvals/${approval.id}/approve`, { method: 'POST', headers: { authorization: `Bearer ${DEV_APPROVAL_TOKEN}` }, body: '{}' });
  assert(decided.status === 200 && decided.body.status === 'approved', 'approval was not accepted');
  const executed = await api(baseUrl, '/api/execute', { method: 'POST', headers, body: JSON.stringify({ toolName: TOOL, arguments: action, approvalId: approval.id, purpose: '004a-live-acceptance' }) });
  return { action, requested: requested.body, executed: executed.body };
}
async function providerState(baseUrl) {
  return (await fetch(`${baseUrl}/v1/state`)).json();
}
function marker(output, prefix) {
  const line = output.split('\n').find((candidate) => candidate.startsWith(`${prefix} `));
  assert(line, `${prefix} was not emitted by acceptance worker`);
  return JSON.parse(line.slice(prefix.length + 1));
}
async function execute() {
  const requiredFlags = ['--attempt-id', '--approved-integration-sha', '--approved-ananke-sha', '--approved-driver-sha256', '--approved-sink-sha256', '--approved-worker-sha256'];
  for (const flag of requiredFlags) assert(arg(flag), `${flag} is required for execute`);
  assert(process.argv.includes('--owner-authorized'), 'execute requires explicit --owner-authorized input');
  const attemptId = arg('--attempt-id');
  assert(/^\d{3}$/.test(attemptId), 'attempt ID must be exactly three digits');
  const evidenceRoot = resolve(integrationRoot, 'docs', 'evidence');
  const evidencePath = join(evidenceRoot, `FATES-SLICE-004A-live-acceptance-attempt-${attemptId}.json`);
  assert(!existsSync(evidencePath), 'attempt evidence already exists and cannot be overwritten');
  const preflight = await verifyPreflight(arg('--approved-integration-sha'), arg('--approved-ananke-sha'));
  validateHashArgument('driver', DRIVER_PATH, arg('--approved-driver-sha256'));
  validateHashArgument('sink fixture', SINK_PATH, arg('--approved-sink-sha256'));
  validateHashArgument('Ananke acceptance worker', WORKER_PATH, arg('--approved-worker-sha256'));
  const sinkPort = Number(arg('--sink-port', '34220'));
  const anankePort = Number(arg('--ananke-port', '34221'));
  assert(await safePort(sinkPort), `sink port ${sinkPort} is not free`);
  assert(await safePort(anankePort), `Ananke port ${anankePort} is not free`);
  const cases = [];
  await withDirectory(async (directory) => {
    const caseA = await withDirectory(async (caseDirectory) => {
      const sink = await startSink(join(caseDirectory, 'provider.json'), sinkPort, 'success');
      const ananke = await startAnanke(join(caseDirectory, 'ananke.sqlite'), anankePort, sink.baseUrl);
      try {
        const first = await approvedExecution(ananke.baseUrl, `004a-${attemptId}-a`, '004a-case-a');
        const duplicate = await approvedExecution(ananke.baseUrl, `004a-${attemptId}-a`, '004a-case-a-duplicate');
        const state = await providerState(sink.baseUrl);
        assert(first.executed.outcome?.state === 'COMPLETED', 'Case A did not complete');
        assert(duplicate.executed.outcome?.state === 'COMPLETED', 'Case A duplicate did not reuse completion');
        assert(state.operationCount === 1, 'Case A created more than one provider operation');
        return { id: 'A', status: 'PASS', providerOperationCount: state.operationCount, redispatchCount: 0, evidenceDigest: operationDigest(state)[0] };
      } finally {
        await stopChild(ananke);
        await stopChild(sink);
      }
    });
    cases.push(caseA);

    const caseB = await withDirectory(async (caseDirectory) => {
      const providerPath = join(caseDirectory, 'provider.json');
      const databasePath = join(caseDirectory, 'ananke.sqlite');
      let sink = await startSink(providerPath, sinkPort, 'success');
      let ananke = await startAnanke(databasePath, anankePort, sink.baseUrl, { failpoint: 'after_provider_call', crashMode: 'after_provider_call' });
      try {
        try { await approvedExecution(ananke.baseUrl, `004a-${attemptId}-b`, '004a-case-b'); } catch { /* the bounded crash may close the response */ }
        await waitForExit(ananke);
        const crash = marker(ananke.stdout, 'CRASH_MARKER');
        const beforeRestart = await providerState(sink.baseUrl);
        assert(beforeRestart.operationCount === 1, 'Case B provider did not persist exactly one operation');
        await stopChild(sink);
        sink = await startSink(providerPath, sinkPort, 'success');
        const recovered = await recovery(databasePath, sink.baseUrl, crash.intentId);
        const afterRestart = await providerState(sink.baseUrl);
        assert(recovered.state === 'reconciled_success', 'Case B did not reconcile to success');
        assert(afterRestart.operationCount === 1, 'Case B redispatched after restart');
        return { id: 'B', status: 'PASS', providerOperationCount: afterRestart.operationCount, redispatchCount: 0, evidenceDigest: operationDigest(afterRestart)[0] };
      } finally {
        await stopChild(ananke);
        await stopChild(sink);
      }
    });
    cases.push(caseB);

    const caseC = await withDirectory(async (caseDirectory) => {
      const providerPath = join(caseDirectory, 'provider.json');
      const databasePath = join(caseDirectory, 'ananke.sqlite');
      let sink = await startSink(providerPath, sinkPort, 'success');
      const ananke = await startAnanke(databasePath, anankePort, sink.baseUrl, { failpoint: 'after_dispatch_marker', crashMode: 'after_dispatch_marker' });
      try {
        try { await approvedExecution(ananke.baseUrl, `004a-${attemptId}-c`, '004a-case-c'); } catch { /* bounded crash */ }
        await waitForExit(ananke);
        const crash = marker(ananke.stdout, 'CRASH_MARKER');
        await stopChild(sink);
        sink = await startSink(providerPath, sinkPort, 'success');
        const recovered = await recovery(databasePath, sink.baseUrl, crash.intentId);
        const state = await providerState(sink.baseUrl);
        assert(recovered.state === 'terminal_unresolved', 'Case C guessed a terminal outcome');
        assert(state.operationCount === 0, 'Case C unexpectedly dispatched a provider operation');
        return { id: 'C', status: 'PASS', providerOperationCount: state.operationCount, redispatchCount: 0 };
      } finally {
        await stopChild(ananke);
        await stopChild(sink);
      }
    });
    cases.push(caseC);

    const caseD = await withDirectory(async (caseDirectory) => {
      const providerPath = join(caseDirectory, 'provider.json');
      const databasePath = join(caseDirectory, 'ananke.sqlite');
      const sink = await startSink(providerPath, sinkPort, 'mismatch');
      const ananke = await startAnanke(databasePath, anankePort, sink.baseUrl);
      try {
        const result = await approvedExecution(ananke.baseUrl, `004a-${attemptId}-d`, '004a-case-d');
        assert(result.executed.outcome?.state === 'FAILED', 'Case D did not fail closed');
        const intentId = marker(ananke.stdout, 'EXECUTION_MARKER').intentId;
        assert(typeof intentId === 'string', 'Case D did not expose the durable intent reference');
        await stopChild(ananke);
        const recovered = await recovery(databasePath, sink.baseUrl, intentId);
        const state = await providerState(sink.baseUrl);
        assert(recovered.state === 'terminal_unresolved', 'Case D accepted mismatched provider evidence');
        assert(state.operationCount === 1, 'Case D provider operation count changed');
        return { id: 'D', status: 'PASS', providerOperationCount: state.operationCount, redispatchCount: 0, evidenceDigest: operationDigest(state)[0] };
      } finally {
        await stopChild(ananke);
        await stopChild(sink);
      }
    });
    cases.push(caseD);

    const caseE = await withDirectory(async (caseDirectory) => {
      const callbackMarker = join(caseDirectory, 'generic-callback.marker');
      const ananke = await startAnanke(join(caseDirectory, 'ananke.sqlite'), anankePort, 'http://127.0.0.1:1', { genericNegative: true, callbackMarker });
      try {
        const result = await approvedExecution(ananke.baseUrl, `004a-${attemptId}-e`, '004a-case-e');
        assert(result.executed.outcome?.state === 'FAILED' && result.executed.outcome?.reasonCode === 'PERMISSION_DENIED', 'Case E did not fail closed at the chokepoint');
        assert(!existsSync(callbackMarker), 'Case E generic callback was invoked');
        return { id: 'E', status: 'PASS', providerOperationCount: 0, redispatchCount: 0 };
      } finally {
        await stopChild(ananke);
      }
    });
    cases.push(caseE);
  });
  const evidence = {
    schemaVersion: 1,
    sliceId: 'FATES-SLICE-004',
    subsliceId: 'FATES-SLICE-004A',
    attemptId,
    classification: 'PASS_BOUNDED',
    startingCheckpoints: preflight.checkpoints,
    driverSha256: arg('--approved-driver-sha256'),
    fixtureSha256: arg('--approved-sink-sha256'),
    cases,
    limitations: [
      'Bounded disposable receipt-sink contract only; no arbitrary-provider or exactly-once claim.',
      'No OS-authenticated process origin, host containment, or complete low-level bypass-resistance claim.',
      'No third-party provider or provider credential was used.',
    ],
  };
  mkdirSync(evidenceRoot, { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ mode: 'execute', attemptId, evidencePath, classification: evidence.classification, cases }, null, 2)}\n`);
}

if (mode === 'plan') await plan();
else if (mode === 'execute') await execute();
else throw new Error('exactly one of --plan or --execute is required');
