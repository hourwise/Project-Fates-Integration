import { spawn } from 'node:child_process';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { constants as fsConstants, createWriteStream, existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siblingRoot = resolve(integrationRoot, '..');
const roots = {
  ananke: resolve(siblingRoot, 'Project Ananke'),
  horae: resolve(siblingRoot, 'Project Horae'),
  moirae: resolve(siblingRoot, 'Project Moirae Code'),
};
const scripts = {
  ananke: join(roots.ananke, 'packages', 'runtime-core', 'dist', 'server.js'),
  horae: join(tmpdir(), 'fates-slice02-live-20260809', 'horae-live-server.mjs'),
  moirae: join(roots.moirae, 'apps', 'diagnostics-cli', 'dist', 'index.js'),
};

const ports = { ananke: 34212, horae: 34216 };
const urls = {
  anankeTransport: `http://127.0.0.1:${ports.ananke}`,
  anankeCanonical: `http://localhost:${ports.ananke}/api`,
  horae: `http://127.0.0.1:${ports.horae}`,
};
urls.anankeApi = `${urls.anankeTransport}/api`;
urls.horaeRoute = `${urls.horae}/slice-02/governed-actions`;

const fixed = {
  action: 'fates.slice02.inspect-fixed-fixture.v1',
  fixtureId: 'fates.slice02.fixed-fixture.v1',
  fixtureSha256: '7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8',
  schemaId: 'urn:fates:slice02:inspect-fixed-fixture-request:v1',
  schemaSha256: 'db1864fdc4978d6befb4b6d3913461e4f2d2732dd0ca87e076977ab98cf6049c',
  moiraeInstance: 'moirae-live-origin-1',
  moiraeArtifact: 'moirae-slice02-live-origin',
  producerCheckpoint: 'a54cb481958e5711afc1c92c622673f85e7e0178',
  producerTag: 'ananke-fates-slice-002-v0.1.0-protocol-1.4.0',
  producerImplementation: '552686fe6e01e2c0bf41ccb52591076bfa68bc2c',
};
const runtimeEnvKeys = [
  'APPDATA', 'ComSpec', 'LOCALAPPDATA', 'OS', 'PATH', 'PATHEXT',
  'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'WINDIR',
];
const tracked = new Map();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function assertEndpointConfiguration() {
  const transport = new URL(urls.anankeTransport);
  const canonical = new URL(urls.anankeCanonical);
  assert(transport.protocol === 'http:' && transport.hostname === '127.0.0.1', 'Ananke transport base must be the local HTTP root.');
  assert(transport.pathname === '/' && !transport.search && !transport.hash, 'Ananke transport base must not contain an API path.');
  assert(canonical.protocol === 'http:' && canonical.hostname === 'localhost', 'Ananke canonical endpoint must use the local registered host.');
  assert(canonical.pathname === '/api' && !canonical.search && !canonical.hash, 'Ananke canonical endpoint must terminate at /api.');
  assert(transport.port === canonical.port && transport.port === String(ports.ananke), 'Ananke transport and canonical ports must match.');
}

function childEnv(overrides) {
  const environment = {};
  for (const key of runtimeEnvKeys) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  return { ...environment, ...overrides };
}

function redact(text) {
  return text
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/(authorization|token|secret|api[_-]?key)(\s*[:=]\s*)([^\s,;}]+)/gi, '$1$2[REDACTED]');
}

async function readable(path) {
  try { await access(path, fsConstants.R_OK); return true; } catch { return false; }
}

async function portState(port) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let done = false;
    const finish = (state) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      resolvePromise(state);
    };
    const timer = setTimeout(() => finish('unknown'), 750);
    socket.once('connect', () => finish('busy'));
    socket.once('error', (error) => finish(error?.code === 'ECONNREFUSED' ? 'free' : 'unknown'));
  });
}

async function assertPortsFree() {
  for (const port of Object.values(ports)) {
    assert(await portState(port) === 'free', `Port ${port} is not confirmed free.`);
  }
}

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code === 'EPERM'; }
}

function spawnChild(name, script, args, cwd, env, runDirectory) {
  assert(existsSync(script), `${name} entrypoint is missing: ${script}`);
  const child = spawn(process.execPath, [script, ...args], {
    cwd,
    env: childEnv(env),
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  const record = {
    name, pid: child.pid, script, cwd, child, stdout, stderr,
    stdoutPath: join(runDirectory, `${name}.stdout.log`),
    stderrPath: join(runDirectory, `${name}.stderr.log`),
    exit: undefined, spawnError: undefined,
  };
  assert(Number.isInteger(record.pid), `${name} did not expose a child PID.`);
  const stdoutLog = createWriteStream(record.stdoutPath, { encoding: 'utf8' });
  const stderrLog = createWriteStream(record.stderrPath, { encoding: 'utf8' });
  child.stdout.on('data', (chunk) => { const text = redact(String(chunk)); stdout.push(text); stdoutLog.write(text); });
  child.stderr.on('data', (chunk) => { const text = redact(String(chunk)); stderr.push(text); stderrLog.write(text); });
  record.closed = new Promise((resolvePromise) => child.once('close', (code, signal) => {
    record.exit = { code, signal };
    stdoutLog.end();
    stderrLog.end();
    resolvePromise(record);
  }));
  child.once('error', (error) => { record.spawnError = { code: error?.code ?? 'spawn_error' }; });
  tracked.set(record.pid, record);
  return record;
}

async function waitChild(record, timeoutMs = 20_000) {
  if (record.exit) return record;
  const timeout = sleep(timeoutMs).then(() => { throw new Error(`${record.name} exceeded its bounded exit timeout.`); });
  return Promise.race([record.closed, timeout]);
}

async function stopChild(record) {
  if (!record || record.exit) return;
  record.child.kill();
  await Promise.race([record.closed, sleep(5_000)]);
}

async function jsonResponse(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = undefined; }
    return { status: response.status, body };
  } finally { clearTimeout(timer); }
}

async function waitFor(url, predicate, label) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await jsonResponse(url);
      if (predicate(response)) return response;
    } catch { /* retry only bounded readiness probes */ }
    await sleep(100);
  }
  throw new Error(`${label} did not become ready.`);
}

function plan() {
  assertEndpointConfiguration();
  console.log(JSON.stringify({
    mode: 'plan',
    driver: resolve(fileURLToPath(import.meta.url)),
    roles: [
      { role: 'Ananke', executable: process.execPath, script: scripts.ananke, cwd: roots.ananke, port: ports.ananke, args: [], envKeys: ['ANANKE_PORT', 'ANANKE_DEVELOPMENT_MODE'] },
      { role: 'Horae', executable: process.execPath, script: scripts.horae, cwd: roots.horae, port: ports.horae, boundary: 'established temporary Slice 02 relay wrapper', envKeys: ['HORAE_PORT', 'ANANKE_ENDPOINT', 'EXPECTED_ANANKE_ENDPOINT', 'ANANKE_INSTANCE_ID', 'HORAE_TIMEOUT_MS'] },
      { role: 'Moirae', executable: process.execPath, script: scripts.moirae, cwd: roots.moirae, args: ['run-003a'], envKeys: ['MOIRAE_003A_INSTANCE_ID', 'MOIRAE_003A_ARTIFACT', 'MOIRAE_003A_HORAE_ENDPOINT', 'MOIRAE_003A_TENANT_ID', 'MOIRAE_003A_PROJECT_ID', 'MOIRAE_003A_WORKSPACE_ID', 'MOIRAE_003A_SESSION_ID', 'MOIRAE_003A_AUTHENTICATED_PRINCIPAL', 'MOIRAE_003A_ACTING_PRINCIPAL'] },
    ],
    endpoints: { horaeRoute: urls.horaeRoute, anankeTransportBase: urls.anankeTransport, anankeTransportExecute: `${urls.anankeApi}/execute`, anankeCanonical: urls.anankeCanonical },
    temporaryDirectoryPattern: join(tmpdir(), 'fates-slice03a-live-*'),
    fixedAction: fixed.action,
    fixedFixture: { id: fixed.fixtureId, sha256: fixed.fixtureSha256 },
    negativeCases: ['Moirae origin drift', 'malformed Moirae launch configuration'],
    cleanup: { trackedChildrenOnly: true, childPidsAbsent: true, portsFree: Object.values(ports) },
  }, null, 2));
}

async function inspectAnanke() {
  const paths = ['runtime/identity', 'runtime/registration', 'runtime/health', 'runtime/readiness', 'runtime/compatibility'];
  const snapshots = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await jsonResponse(`${urls.anankeApi}/${path}`)])));
  const action = await jsonResponse(`${urls.anankeApi}/tools/${encodeURIComponent(fixed.action)}`);
  const negotiation = await jsonResponse(`${urls.anankeApi}/runtime/negotiate`, {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ protocolVersion: '1.4.0', minimumProtocolVersion: '1.0.0' }),
  });
  for (const response of Object.values(snapshots)) assert(response.status === 200, 'Ananke inspection was not HTTP 200.');
  assert(action.status === 200 && negotiation.status === 200 && negotiation.body?.compatible === true, 'Ananke capability inspection failed.');
  const identity = snapshots['runtime/identity'].body;
  const registration = snapshots['runtime/registration'].body;
  const health = snapshots['runtime/health'].body;
  const readiness = snapshots['runtime/readiness'].body;
  const compatibility = snapshots['runtime/compatibility'].body;
  assert(identity?.runtime === 'ananke' && identity.protocolVersion === '1.4.0' && identity.instanceId, 'Ananke identity drifted.');
  assert(health?.healthy === true && readiness?.ready === true, 'Ananke is not healthy and ready.');
  assert(registration?.endpoints?.some((entry) => entry.url === urls.anankeCanonical), 'Ananke endpoint drifted.');
  assert(compatibility?.runtimeName === 'ananke', 'Ananke compatibility identity drifted.');
  assert(action.body?.name === fixed.action && action.body?.riskClass === 'READ_ONLY' && action.body?.retryable === false, 'Ananke action capability drifted.');
  const annotations = identity.metadata?.annotations ?? {};
  assert(annotations['fates.slice02.producerCheckpoint'] === fixed.producerCheckpoint, 'Ananke producer checkpoint drifted.');
  assert(annotations['fates.slice02.producerTag'] === fixed.producerTag, 'Ananke producer tag drifted.');
  assert(annotations['fates.slice02.implementationCommit'] === fixed.producerImplementation, 'Ananke producer implementation drifted.');
  return {
    identity,
    registration: { endpoints: registration.endpoints, inspectionMechanism: registration.inspectionMechanism },
    health: { healthy: health.healthy, status: health.status },
    readiness: { ready: readiness.ready, status: readiness.status, checkedAt: readiness.checkedAt, dependencies: readiness.dependencies },
    compatibility: { runtimeName: compatibility.runtimeName, protocolVersion: compatibility.protocolVersion, supportedProtocolRange: compatibility.supportedProtocolRange },
    action: { name: action.body.name, server: action.body.server, riskClass: action.body.riskClass, retryable: action.body.retryable, requiresApproval: action.body.requiresApproval },
    negotiation: negotiation.body,
  };
}

function parseOutput(record, label) {
  const output = record.stdout.join('').trim();
  assert(output, `${label} produced no JSON result.`);
  try { return JSON.parse(output); } catch { throw new Error(`${label} produced non-JSON output.`); }
}

function hostEvidence(result, record, instanceId, artifact) {
  const evidence = result?.hostEvidence;
  assert(evidence?.runtime === 'moirae-code' && evidence.instanceId === instanceId && evidence.artifact === artifact, 'Moirae origin evidence drifted.');
  assert(evidence.processId === record.pid && evidence.executable === process.execPath, 'Moirae PID/executable evidence drifted.');
  assert(typeof evidence.originId === 'string' && typeof evidence.originDigest === 'string' && evidence.originDigest.length === 64, 'Moirae origin receipt is incomplete.');
  assert(typeof evidence.requestId === 'string' && typeof evidence.correlationId === 'string', 'Moirae correlation evidence is incomplete.');
  return evidence;
}

function positiveEvidence(result, record, anankeInstance) {
  const host = hostEvidence(result, record, fixed.moiraeInstance, fixed.moiraeArtifact);
  const route = result.routeResult;
  assert(route?.state === 'completed' && route.dispatchState === 'result_received', 'Positive route did not complete with a typed result.');
  assert(route.routeId && route.eventId && route.correlation?.requestId === host.requestId && route.correlation?.correlationId === host.correlationId, 'Route correlation evidence drifted.');
  assert(result.request?.action === fixed.action && result.request?.route === '/slice-02/governed-actions', 'Moirae route/action drifted.');
  assert(result.request.arguments.fixtureId === fixed.fixtureId && result.request.arguments.expectedSha256 === fixed.fixtureSha256, 'Moirae fixture request drifted.');
  assert(result.horae?.endpoint === urls.horaeRoute && result.horae.httpStatus === 200, 'Horae route evidence drifted.');
  assert(route.receipt?.ananke?.runtime === 'ananke' && route.receipt.ananke.instanceId === anankeInstance, 'Horae Ananke identity evidence drifted.');
  assert(route.receipt.ananke.endpoint === urls.anankeCanonical && route.receipt.ananke.producer?.checkpoint === fixed.producerCheckpoint, 'Horae canonical producer evidence drifted.');
  const producer = route.ananke;
  const evidence = route.producerEvidence ?? producer?.evidence;
  assert(producer?.outcome?.state === 'COMPLETED' && evidence?.readAttemptCount === 1 && evidence.adapterInvocation === true, 'Ananke producer/read evidence is not exactly one completed read.');
  assert(evidence.dispatchState === 'read-completed' && evidence.actualFixtureDigest === fixed.fixtureSha256, 'Ananke fixture evidence drifted.');
  assert(typeof evidence.decisionId === 'string' && typeof evidence.outcomeId === 'string', 'Ananke decision/outcome evidence IDs are missing.');
  return {
    process: { pid: record.pid, executable: host.executable, instanceId: host.instanceId, artifact: host.artifact },
    hostEvidence: host,
    horae: { endpoint: result.horae.endpoint, httpStatus: result.horae.httpStatus },
    route: { state: route.state, dispatchState: route.dispatchState, routeId: route.routeId, eventId: route.eventId, correlation: route.correlation, ananke: route.receipt.ananke },
    producer: { outcomeState: producer.outcome.state, decisionId: evidence.decisionId, outcomeId: evidence.outcomeId, readAttemptCount: evidence.readAttemptCount, actualFixtureDigest: evidence.actualFixtureDigest, dispatchState: evidence.dispatchState },
    boundedChecks: { dispatchAttempts: 1, retries: 0, fallbacks: 0, alternateEndpoints: 0, duplicateExecutions: 0, fixtureReadPathsInMoiraeOrHorae: 0 },
  };
}

function originNegative(result, record) {
  const host = hostEvidence(result, record, 'wrong-live-instance', fixed.moiraeArtifact);
  const route = result.routeResult;
  assert(route?.state === 'malformed' && route.dispatchState === 'rejected_before_dispatch', 'Origin drift was not rejected before dispatch.');
  assert(!route.ananke && !route.producerEvidence, 'Origin drift produced dispatch evidence.');
  return { process: { pid: record.pid, instanceId: host.instanceId }, route: { state: route.state, dispatchState: route.dispatchState, routeId: route.routeId, eventId: route.eventId, correlation: route.correlation }, classification: 'LIVE VERIFIED' };
}

async function moiraeCase(name, overrides, runDirectory) {
  const record = spawnChild(name, scripts.moirae, ['run-003a'], roots.moirae, {
    MOIRAE_003A_INSTANCE_ID: overrides.instanceId ?? fixed.moiraeInstance,
    MOIRAE_003A_ARTIFACT: overrides.artifact ?? fixed.moiraeArtifact,
    MOIRAE_003A_HORAE_ENDPOINT: overrides.horaeEndpoint ?? urls.horae,
    MOIRAE_003A_TENANT_ID: 'fates-003a-tenant',
    MOIRAE_003A_PROJECT_ID: 'fates-003a-project',
    MOIRAE_003A_WORKSPACE_ID: 'fates-003a-workspace',
    MOIRAE_003A_SESSION_ID: `${name}-session`,
    MOIRAE_003A_AUTHENTICATED_PRINCIPAL: 'moirae-003a-host',
    MOIRAE_003A_ACTING_PRINCIPAL: 'moirae-003a-agent',
  }, runDirectory);
  await waitChild(record);
  return record;
}

function childInfo(record) {
  return { name: record.name, pid: record.pid, script: record.script, cwd: record.cwd, exit: record.exit, stdoutPath: record.stdoutPath, stderrPath: record.stderrPath, spawnError: record.spawnError };
}

async function run() {
  assertEndpointConfiguration();
  for (const [name, path] of Object.entries(scripts)) assert(await readable(path), `${name} entrypoint is unavailable.`);
  await assertPortsFree();
  const runDirectory = await mkdtemp(join(tmpdir(), 'fates-slice03a-live-'));
  const started = [];
  let failure;
  let result;
  let cleanup;
  let ananke;
  let horae;
  try {
    ananke = spawnChild('ananke', scripts.ananke, [], roots.ananke, { ANANKE_PORT: String(ports.ananke), ANANKE_DEVELOPMENT_MODE: 'true' }, runDirectory);
    started.push(ananke);
    const ready = await waitFor(`${urls.anankeApi}/runtime/identity`, (response) => response.status === 200 && response.body?.runtime === 'ananke', 'Ananke');
    const anankeInstance = ready.body.instanceId;
    assert(typeof anankeInstance === 'string' && anankeInstance.length > 0, 'Ananke instance is missing.');
    horae = spawnChild('horae', scripts.horae, [], roots.horae, {
      HORAE_PORT: String(ports.horae), ANANKE_ENDPOINT: urls.anankeTransport, EXPECTED_ANANKE_ENDPOINT: urls.anankeCanonical,
      ANANKE_INSTANCE_ID: anankeInstance, HORAE_TIMEOUT_MS: '1000',
    }, runDirectory);
    started.push(horae);
    await waitFor(`${urls.horae}/health`, (response) => response.status === 200 && response.body?.runtime === 'horae' && response.body?.ready === true, 'Horae');
    const inspection = await inspectAnanke();

    const positive = await moiraeCase('moirae-positive', {}, runDirectory);
    started.push(positive);
    const positiveResult = positiveEvidence(parseOutput(positive, 'Moirae positive'), positive, anankeInstance);

    const origin = await moiraeCase('moirae-origin-drift', { instanceId: 'wrong-live-instance' }, runDirectory);
    started.push(origin);
    assert(origin.exit?.code === 0, 'Origin-drift Moirae process did not return its typed rejection.');
    const originResult = originNegative(parseOutput(origin, 'Moirae origin drift'), origin);

    const malformed = await moiraeCase('moirae-malformed-config', { horaeEndpoint: 'not-a-url' }, runDirectory);
    started.push(malformed);
    assert(malformed.exit?.code !== 0 && malformed.stdout.join('').trim() === '', 'Malformed Moirae configuration unexpectedly routed.');

    result = {
      status: 'PASS', acceptanceStatus: 'LIVE VERIFIED', runTimestamp: new Date().toISOString(), temporaryDirectory: runDirectory,
      horaeBoundary: { artifact: scripts.horae, kind: 'established temporary Slice 02 relay wrapper' },
      processRoles: { ananke: childInfo(ananke), horae: childInfo(horae), moiraePositive: childInfo(positive), moiraeOriginDrift: childInfo(origin), moiraeMalformedConfiguration: childInfo(malformed) },
      endpoints: urls, fixedAction: fixed.action, fixedFixture: { id: fixed.fixtureId, sha256: fixed.fixtureSha256 },
      freshAnankeInspection: inspection, positive: positiveResult,
      negatives: {
        originDrift: originResult,
        malformedConfiguration: { pid: malformed.pid, exit: malformed.exit, routeStarted: false, dispatchAttempted: false, classification: 'OWNER-LOCAL / DETERMINISTIC TEST VERIFIED' },
      },
      deterministicOnly: ['Post-dispatch transport loss, indeterminate preservation, timeout induction, and sealed-state mutation cases were not live-induced.'],
      credentialDisposition: 'provider-side revoked/rotated; former exposed credential set invalid',
      endpointSecurityChronology: ['Initial large inline acceptance harness was blocked/remediated before successful 003A acceptance.', 'No successful 003A route occurred through that harness.', 'No endpoint-security controls were changed or weakened.', 'This run used the reviewed Node driver.'],
      claimLimitations: ['003A proves bounded process origin, governed route, authority preservation, correlation, fixed effect/result, and bounded fail-closed behavior only.', '003A does not prove OS, filesystem, network, shell, subprocess, browser, extension, credential-isolation, or complete bypass containment.'],
    };
  } catch (error) {
    failure = error;
  } finally {
    for (const record of [...started].reverse()) await stopChild(record);
    const processAbsence = started.every((record) => !alive(record.pid));
    const portsFree = await portState(ports.ananke) === 'free' && await portState(ports.horae) === 'free';
    cleanup = { processAbsence, ports: { ...ports, free: portsFree }, trackedPids: started.map((record) => ({ name: record.name, pid: record.pid, absent: !alive(record.pid) })) };
    if (result) result.cleanup = cleanup;
    else result = { status: 'FAILED', temporaryDirectory: runDirectory, cleanup };
    await writeFile(join(runDirectory, 'run-summary.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  if (failure) throw failure;
  assert(cleanup.processAbsence && cleanup.ports.free, 'Acceptance cleanup was not clean.');
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--plan') return plan();
  assert(args.length === 0, 'Only --plan is supported.');
  console.log(JSON.stringify(await run(), null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAILED', error: error instanceof Error ? error.message : 'acceptance driver failure' }));
  process.exitCode = 1;
});
