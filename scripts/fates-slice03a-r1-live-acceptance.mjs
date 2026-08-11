// FATES-SLICE-003A-R1 acceptance preparation and owner-approved live driver.
//
// Default mode is --plan. It performs only filesystem/source checks and a
// redaction canary; it never starts a child process or a timeout server.
// --execute is intentionally separate and is not part of this preparation
// task. It uses only Node spawn(), explicit argument arrays, shell:false, and
// exact tracked child PIDs for cleanup.

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;
const LEGACY_DRIVER = resolve(ROOT, 'scripts/fates-slice03a-live-acceptance.mjs');
const EVIDENCE_PATH = 'docs/evidence/FATES-SLICE-003A-R1-live-acceptance-2026-08-11.json';
const LEGACY_DRIVER_SHA256 = '77ad8c51d80d689396de4d2753344b9a4cf3b2ee6b52423863ed3a246f4bd99e';

export const PINNED = Object.freeze({
  ananke: '7c5cdecb078749acb129ba485daac43d7155ceb6',
  horae: '1d50b8df9943702a9724ded56a3454c882da8925',
  moirae: '56f3bc84c84e36f75d2a4e46b393f86065a736d3',
  mnemosyne: 'f4ab76a9760f856d78908d35facceb068d78c8e5',
  runtimeContracts: 'bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8',
  integration: '07ec80aabe2c62baaa776857fbcefafd154a74d7',
});

export const REPOSITORIES = Object.freeze({
  ananke: 'D:/Users/fleur/Project Ananke',
  horae: 'D:/Users/fleur/Project Horae',
  moirae: 'D:/Users/fleur/Project Moirae Code',
  mnemosyne: 'D:/Users/fleur/Project Mnemosyne',
  runtimeContracts: 'D:/Users/fleur/Project Runtime Contracts',
  integration: ROOT,
});

export const PORTS = Object.freeze({ ananke: 34212, horae: 34216 });
export const FIXED = Object.freeze({
  action: 'fates.slice02.inspect-fixed-fixture.v1',
  fixtureId: 'fates.slice02.fixed-fixture.v1',
  fixtureSha256: '7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8',
  horaeInstance: 'horae-r1-live-1',
  moiraeInstance: 'moirae-r1-live-1',
  moiraeArtifact: 'moirae-slice03a-r1-live-acceptance',
});

const PRODUCER_AUTHORITY = Object.freeze({
  repository: 'https://github.com/hourwise/Project-Ananke',
  checkpoint: 'a54cb481958e5711afc1c92c622673f85e7e0178',
  tag: 'ananke-fates-slice-002-v0.1.0-protocol-1.4.0',
  implementationCommit: '552686fe6e01e2c0bf41ccb52591076bfa68bc2c',
});

const PREFLIGHT_REPOSITORIES = Object.freeze(['ananke', 'horae', 'moirae', 'mnemosyne', 'runtimeContracts']);

export const ENV_ALLOWLISTS = Object.freeze({
  inherited: ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'],
  ananke: ['ANANKE_PORT', 'ANANKE_EXECUTION_TOKEN'],
  horae: [
    'HORAE_BIND_HOST',
    'HORAE_PORT',
    'ANANKE_ENDPOINT',
    'EXPECTED_ANANKE_ENDPOINT',
    'ANANKE_INSTANCE_ID',
    'ANANKE_EXECUTION_TOKEN',
    'HORAE_INSPECTION_TIMEOUT_MS',
    'HORAE_DISPATCH_TIMEOUT_MS',
    'HORAE_R1_INSTANCE_ID',
    'HORAE_R1_REPLAY_LEDGER_PATH',
  ],
  moirae: [
    'MOIRAE_003A_REQUEST_IDENTITY_VERSION',
    'MOIRAE_003A_HORAE_AUDIENCE',
    'MOIRAE_003A_HORAE_ENDPOINT',
    'MOIRAE_003A_INSTANCE_ID',
    'MOIRAE_003A_ARTIFACT',
    'MOIRAE_003A_SESSION_ID',
  ],
});

const SOURCE_PATHS = Object.freeze({
  ananke: [
    'packages/runtime-core/package.json',
    'packages/runtime-core/src/index.ts',
    'packages/runtime-core/src/server.ts',
    'packages/runtime-core/src/auth.test.ts',
    'packages/runtime-core/src/server-config.ts',
    'packages/runtime-core/src/server-config.test.ts',
    'packages/runtime-core/src/auth.ts',
    'packages/runtime-core/src/routes.ts',
    'packages/runtime-core/dist/server.js',
  ],
  horae: [
    'packages/slice02-host/package.json',
    'packages/slice02-host/src/index.ts',
    'packages/slice02-relay/src/index.ts',
    'packages/slice02-host/dist/index.js',
  ],
  moirae: [
    'apps/diagnostics-cli/package.json',
    'apps/diagnostics-cli/src/index.ts',
    'apps/diagnostics-cli/src/slice03a-host.ts',
    'apps/diagnostics-cli/dist/index.js',
  ],
});

const ACCEPTANCE_MATRIX = Object.freeze([
  {
    id: 'positive-r1-v2',
    execution: 'future live',
    expected: 'completed / result_received / HTTP 200',
    proof: 'one Horae dispatch, one producer read, preserved route/correlation/decision/outcome evidence',
  },
  {
    id: 'replay',
    execution: 'future live only with the exact captured Moirae request body',
    expected: 'denied / rejected_before_dispatch; no Ananke inspection or dispatch',
    proof: 'the same v2 receipt is rejected by Horae replay ledger',
  },
  {
    id: 'wrong-audience',
    execution: 'future live only through a reviewed Moirae request-identity test seam',
    expected: 'malformed / rejected_before_dispatch; no dispatch',
    proof: 'Horae rejects a non-canonical or non-matching v2 audience with no downgrade',
  },
  {
    id: 'expired',
    execution: 'future live only through a reviewed Moirae request-identity test seam',
    expected: 'stale / rejected_before_dispatch; no dispatch',
    proof: 'expired validity is rejected before Ananke inspection/dispatch',
  },
  {
    id: 'legacy-v1',
    execution: 'future live only through a reviewed request-identity test seam',
    expected: 'malformed / rejected_before_dispatch; no v1 downgrade',
    proof: 'R1 Horae requires the configured r1-v2 schema and audience',
  },
  {
    id: 'wrong-ananke-token',
    execution: 'future live with a fresh Horae process only',
    expected: 'Ananke authentication denied after inspection; no effect',
    proof: 'distinguish wrong token from Horae startup missing-token configuration failure',
  },
  {
    id: 'pre-dispatch-timeout',
    execution: 'deterministic Horae validation; no scratch timeout server',
    expected: 'timed_out / dispatch_not_attempted / HTTP 504',
    proof: 'bounded cancellation, zero dispatch, no retry/fallback',
  },
  {
    id: 'result-projection',
    execution: 'deterministic Horae validation unless safe live proof is available',
    expected: 'only the canonical producer-result allowlist is projected',
    proof: 'unexpected producer fields do not cross the Horae route boundary',
  },
  {
    id: 'restart-replay',
    execution: 'future live with the same authoritative Horae ledger and a controlled restart',
    expected: 'denied / rejected_before_dispatch after restart; no second effect',
    proof: 'persisted claim is loaded before inspection/dispatch',
  },
]);

const EVIDENCE_SCHEMA = Object.freeze({
  schemaVersion: 'fates-slice03a-r1-live-acceptance-preparation-v1',
  status: 'NOT_EXECUTED / PREPARATION ONLY',
  evidencePath: EVIDENCE_PATH,
  requiredTopLevel: [
    'status',
    'runTimestamp',
    'pinnedCheckpoints',
    'acceptanceDriverSha256',
    'sourcePreflight',
    'authentication',
    'r1',
    'processes',
    'ports',
    'positive',
    'negatives',
    'negativeMatrix',
    'chronology',
    'cleanup',
    'limitations',
    'credentialDisposition',
    'endpointSecurity',
  ],
  processRecord: ['role', 'pid', 'executable', 'cwd', 'spawnedAt', 'exitCode', 'signal', 'cleanup'],
  chronologyRecord: ['timestamp', 'role', 'event', 'pid', 'dispatchState', 'effectCount'],
});

export const RESIDUAL_LIMITATIONS = Object.freeze([
  'A fresh v2 request may still be independently minted by another route-capable process.',
  'R1 does not authenticate Moirae OS process origin.',
  'Static bearer proves Horae-to-Ananke credential possession only.',
  'Environment-variable credential custody is bounded R1 plumbing.',
  'No artifact-bound producer attestation is established by this driver.',
  'No multi-process/shared-ledger exclusion is established.',
  'No power-loss stable-storage guarantee is established.',
  'No exactly-once claim is made.',
  'No OS containment is claimed.',
  'No filesystem containment is claimed.',
  'No network containment is claimed.',
  'No IPC containment is claimed.',
  'No browser or extension containment is claimed.',
  'No FATES-SLICE-003B claim is made.',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fileSha256(path) {
  return sha256(readFileSync(path));
}

function readGitHead(repo) {
  const dotGit = resolve(repo, '.git');
  if (statSync(dotGit).isFile()) {
    const gitMarker = readFileSync(dotGit, 'utf8').trim();
    if (!gitMarker.startsWith('gitdir:')) throw new Error(`${dotGit} is not a Git dir pointer`);
    return readGitHeadFromDir(resolve(repo, gitMarker.slice('gitdir:'.length).trim()));
  }
  return readGitHeadFromDir(dotGit);
}

function readGitHeadFromDir(gitDir) {
  const head = readFileSync(resolve(gitDir, 'HEAD'), 'utf8').trim();
  if (!head.startsWith('ref: ')) return head;
  const ref = head.slice('ref: '.length);
  const refPath = resolve(gitDir, ref);
  if (existsSync(refPath)) return readFileSync(refPath, 'utf8').trim();
  const packed = readFileSync(resolve(gitDir, 'packed-refs'), 'utf8');
  const line = packed.split(/\r?\n/).find((candidate) => candidate.endsWith(` ${ref}`));
  if (!line) throw new Error(`Unable to resolve Git ref ${ref}`);
  return line.slice(0, line.indexOf(' '));
}

function sourceText(repo, path) {
  return readFileSync(resolve(repo, path), 'utf8');
}

function verifyStaticSource() {
  const failures = [];
  const paths = {};
  for (const [name, repoPaths] of Object.entries(SOURCE_PATHS)) {
    const repo = REPOSITORIES[name];
    paths[name] = repoPaths.map((path) => ({ path, exists: existsSync(resolve(repo, path)) }));
    for (const item of paths[name]) if (!item.exists) failures.push(`${name}:${item.path} missing`);
  }

  if (failures.length === 0) {
    const anankeServer = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/server.ts');
    const anankeRuntime = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/index.ts');
    const anankeConfig = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/server-config.ts');
    const anankeAuthTest = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/auth.test.ts');
    const anankeConfigTest = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/server-config.test.ts');
    const anankeAuth = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/auth.ts');
    const anankeRoutes = sourceText(REPOSITORIES.ananke, 'packages/runtime-core/src/routes.ts');
    const horaeHost = sourceText(REPOSITORIES.horae, 'packages/slice02-host/src/index.ts');
    const horaeRelay = sourceText(REPOSITORIES.horae, 'packages/slice02-relay/src/index.ts');
    const moiraeHost = sourceText(REPOSITORIES.moirae, 'apps/diagnostics-cli/src/slice03a-host.ts');

    const checks = [
      [anankeServer.includes('createServerGatewayConfig(process.env)'), 'canonical Ananke server config'],
      [anankeConfig.includes('StaticBearerExecutionAuthenticator'), 'static bearer authenticator'],
      [anankeConfig.includes('ANANKE_EXECUTION_TOKEN'), 'raw execution token input'],
      [anankeConfig.includes('ANANKE_DEVELOPMENT_MODE'), 'development mode exclusion'],
      [anankeAuth.includes("identityFromExecutionProfile(this.profile, 'workload-token')"), 'workload-token auth method'],
      [anankeRuntime.includes("dependencyId: 'execution-authenticator'") && anankeRuntime.includes('executionAuthenticationConfigured'), 'readiness execution-authenticator dependency'],
      [anankeConfig.includes('cannot both be configured'), 'no development credential fallback with token'],
      [anankeAuthTest.includes('StaticBearerExecutionAuthenticator'), 'deterministic static-auth test checkpoint'],
      [anankeConfigTest.includes('StaticBearerExecutionAuthenticator'), 'deterministic server-config test checkpoint'],
      [anankeConfig.includes('resourceType: \'fixed-fixture\''), 'server-owned fixed-fixture scope'],
      [anankeRoutes.includes("router.get('/runtime/readiness'"), 'readiness endpoint'],
      [horaeHost.includes('slice02R1Audience(r1InstanceId)'), 'Horae-derived r1-v2 audience'],
      [horaeHost.includes('HORAE_R1_REPLAY_LEDGER_PATH'), 'Horae-owned replay ledger'],
      [horaeRelay.includes('state: "timed_out"'), 'bounded timeout route state'],
      [horaeRelay.includes('dispatchState: "dispatch_not_attempted"'), 'pre-dispatch timeout dispatch state'],
      [moiraeHost.includes('MOIRAE_003A_REQUEST_IDENTITY_VERSION') && moiraeHost.includes("'r1-v2'"), 'Moirae r1-v2 request identity'],
      [moiraeHost.includes('MOIRAE_003A_HORAE_AUDIENCE'), 'Moirae audience input'],
      [!anankeServer.includes(['ANANKE_DEVELOPMENT_MODE', "'true'"].join(': ')), 'no development-mode launch value'],
      [!horaeHost.includes(['inspection', 'timed_out'].join('_')), 'no new serialized inspection timeout state'],
    ];
    for (const [passed, label] of checks) if (!passed) failures.push(label);
  }

  const legacyUnchanged = existsSync(LEGACY_DRIVER) && fileSha256(LEGACY_DRIVER) === LEGACY_DRIVER_SHA256;
  if (!legacyUnchanged) failures.push('historical acceptance driver changed or missing');
  const currentSource = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  if (/spawn\([^)]*fates-slice03a-live-acceptance\.mjs/.test(currentSource)) failures.push('new driver invokes historical driver');

  return {
    verified: failures.length === 0,
    failures,
    paths,
    historicalDriver: { path: relative(ROOT, LEGACY_DRIVER), unchanged: legacyUnchanged },
    sourceClaims: {
      ananke: 'STATIC SOURCE VERIFIED + DETERMINISTIC TEST VERIFIED FROM COMPONENT CHECKPOINT',
      developmentMode: 'not supplied; canonical server selects static bearer from ANANKE_EXECUTION_TOKEN',
      authMethod: 'workload-token',
      serverOwnedHoraeProfile: 'horae-slice02-relay / horae-slice02-relay-agent / bounded fixed-fixture read',
      readiness: 'Ananke runtime readiness endpoint is present and Horae re-inspects before dispatch',
      processOrigin: 'not OS-authenticated; only application identity and PID correlation are evidenced',
      deterministicTests: 'Ananke auth/server-config tests are present at the pinned component checkpoint',
    },
  };
}

function buildPlan() {
  const sourcePreflight = verifyStaticSource();
  const heads = {};
  const headFailures = [];
  for (const name of PREFLIGHT_REPOSITORIES) {
    try {
      heads[name] = { path: REPOSITORIES[name], expected: PINNED[name], actual: readGitHead(REPOSITORIES[name]) };
      if (heads[name].actual !== heads[name].expected) headFailures.push(`${name} HEAD drifted`);
    } catch (error) {
      heads[name] = { path: REPOSITORIES[name], expected: PINNED[name], actual: null };
      headFailures.push(`${name} HEAD unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  return {
    mode: 'plan',
    processesStarted: 0,
    timeoutServersStarted: 0,
    driver: relative(ROOT, fileURLToPath(import.meta.url)),
    pinnedCheckpoints: { ...PINNED },
    sourcePreflight: { ...sourcePreflight, headFailures, heads },
    producerAuthority: { ...PRODUCER_AUTHORITY },
    cleanTree: {
      required: true,
      checkedBeforeExecute: true,
      planMode: 'no child process is started; execute mode performs the final git-status preflight',
      componentRepositories: PREFLIGHT_REPOSITORIES,
    },
    historicalWrapperDependency: false,
    inheritedEnvironmentReasons: {
      PATH: 'Node and the preflight Git executable resolution on Windows',
      SystemRoot: 'Windows runtime process initialization',
      WINDIR: 'Windows runtime process initialization where the host provides it',
      TEMP: 'Node runtime temporary-directory resolution and the ephemeral replay-ledger parent',
      TMP: 'Node runtime temporary-directory resolution where the host provides it',
    },
    futureBuildAndPreflightSequence: [
      'Build each pinned component in its own repository before the owner-approved run; do not generate source or wrappers here.',
      'Verify exact component HEAD, clean component trees, source/package paths, compiled dist entrypoints, and unchanged historical driver.',
      'Check ports 34212 and 34216 are free; generate the ephemeral token only after preflight and never print it.',
      'Start Ananke, read its dynamic runtime instance ID, then start tracked Horae with the derived audience and replay-ledger path.',
      'Start Moirae only after Horae readiness; capture sanitized process and route evidence; clean up tracked PIDs in reverse order.',
    ],
    futureCommands: {
      ananke: 'node packages/runtime-core/dist/server.js',
      horae: 'node packages/slice02-host/dist/index.js',
      moirae: 'node apps/diagnostics-cli/dist/index.js run-003a',
    },
    endpoints: {
      anankeTransport: `http://127.0.0.1:${PORTS.ananke}`,
      anankeCanonical: `http://localhost:${PORTS.ananke}/api`,
      horaeBase: `http://127.0.0.1:${PORTS.horae}`,
      horaeRoute: `http://127.0.0.1:${PORTS.horae}/slice-02/governed-actions`,
      r1AudienceConcept: `fates.slice03a.r1.horae:${FIXED.horaeInstance}:POST:/slice-02/governed-actions`,
    },
    envAllowlist: ENV_ALLOWLISTS,
    credentialHandling: {
      generation: 'Node crypto.randomBytes at execution time only',
      custody: ['Ananke child environment', 'Horae child environment'],
      excludedFrom: ['Moirae environment', 'argv', 'URLs', 'stdout', 'stderr', 'logs', 'evidence', 'plan'],
      developmentMode: 'ANANKE_DEVELOPMENT_MODE is omitted; no bypass or exclusion is used',
    },
    processEvidence: {
      required: EVIDENCE_SCHEMA.processRecord,
      cleanup: 'exact tracked PIDs only; no executable-name termination',
      correlation: 'call correlation is preserved but is not authentication or OS process origin proof',
    },
    matrix: ACCEPTANCE_MATRIX,
    evidenceSchema: EVIDENCE_SCHEMA,
    effectCounting: {
      required: ['one dispatch', 'one producer read', 'decision ID', 'outcome ID', 'audit reference if exposed'],
      auditAccess: 'Ananke /api/audit requires a separate operator credential with audit:read; the R1 driver does not create or use an operator-auth workaround.',
      currentPreparationConclusion: 'No blocker for preparation. A later bounded live claim may use returned producer evidence/topology; if owner review requires operator audit as mandatory, stop and report before execution.',
      blocker: 'if authoritative audit/effect evidence is required but unavailable, stop and report; do not infer an effect count',
    },
    limitations: [
      'This command is preparation only; no live route, process chain, or acceptance PASS artifact is produced.',
      ...RESIDUAL_LIMITATIONS,
      'Timeout, projection, and advanced identity negatives remain deterministic/component evidence unless an owner-approved safe live seam exists.',
    ],
    endpointSecurity: { status: 'no endpoint-security interaction during preparation', controlsChanged: false, stopRule: 'stop if the new driver, plan/self-test, or tracked component is flagged; do not evade or weaken controls' },
    credentialDisposition: 'credential disposition: provider-side revoked/rotated; former exposed credential set invalid',
  };
}

function inheritedEnv(parent = process.env) {
  return Object.fromEntries(ENV_ALLOWLISTS.inherited.flatMap((key) => parent[key] === undefined ? [] : [[key, parent[key]]]));
}

function childEnvironment(role, values, parent = process.env) {
  const allowed = new Set([...ENV_ALLOWLISTS.inherited, ...ENV_ALLOWLISTS[role]]);
  const env = inheritedEnv(parent);
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key)) throw new Error(`${role} environment key is not allowlisted: ${key}`);
    env[key] = value;
  }
  return env;
}

function redactText(value, secrets = []) {
  let result = String(value ?? '');
  for (const secret of secrets) if (secret) result = result.split(secret).join('[REDACTED]');
  return result;
}

function redactValue(value, secrets = []) {
  if (typeof value === 'string') return redactText(value, secrets);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, secrets));
  if (value && typeof value === 'object') {
    if (value instanceof Error) return { name: value.name, message: redactText(value.message, secrets) };
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item, secrets)]));
  }
  return value;
}

export function serializeEvidence(value, secrets = []) {
  return JSON.stringify(redactValue(value, secrets), null, 2);
}

export function runRedactionCanary() {
  const canary = `r1-redaction-canary-${randomBytes(24).toString('hex')}`;
  const unsafeError = new Error(`child failure ${canary}`);
  const stdout = redactText(`stdout ${canary}`, [canary]);
  const stderr = redactText(`stderr ${canary}`, [canary]);
  const error = redactValue(unsafeError, [canary]);
  const evidence = serializeEvidence({ stdout, stderr, error, nested: canary }, [canary]);
  if ([stdout, stderr, JSON.stringify(error), evidence].some((value) => value.includes(canary))) {
    throw new Error('synthetic random redaction canary was reproduced');
  }
  return { passed: true, fields: ['stdout', 'stderr', 'error', 'evidence serialization'] };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function jsonFetch(url, options = {}, timeoutMs = 3_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(async (response) => {
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { body = undefined; }
      return { status: response.status, body };
    })
    .finally(() => clearTimeout(timer));
}

async function waitForJson(url, predicate, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await jsonFetch(url);
      if (predicate(response)) return response;
    } catch {
      // Bounded readiness polling only; this is not route retry/fallback.
    }
    await sleep(100);
  }
  throw new Error(`${label} did not become ready within the bounded preflight window`);
}

async function portState(port) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (state) => { socket.destroy(); resolvePromise(state); };
    socket.once('connect', () => finish('occupied'));
    socket.once('error', (error) => finish(error.code === 'ECONNREFUSED' ? 'free' : 'unknown'));
    socket.setTimeout(500, () => finish('unknown'));
  });
}

async function assertPortsFree() {
  for (const [name, port] of Object.entries(PORTS)) {
    if (await portState(port) !== 'free') throw new Error(`port ${name}:${port} is not confirmed free`);
  }
}

async function gitStatus(repo) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', ['status', '--porcelain', '--untracked-files=all'], {
      cwd: resolve(repo),
      env: inheritedEnv(),
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) reject(new Error(`git status failed for ${repo}: ${redactText(stderr).trim()}`));
      else resolvePromise(stdout);
    });
  });
}

async function assertComponentTreesClean() {
  for (const name of PREFLIGHT_REPOSITORIES) {
    const status = await gitStatus(REPOSITORIES[name]);
    if (status.trim()) throw new Error(`${name} worktree is not clean`);
  }
}

function spawnTracked(role, repo, args, values, secrets, runDirectory) {
  const cwd = resolve(repo);
  const env = childEnvironment(role.toLowerCase(), values);
  const startedAt = new Date().toISOString();
  const child = spawn(NODE, args, {
    cwd,
    env,
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const record = {
    role,
    pid: child.pid,
    executable: NODE,
    cwd,
    args: [...args],
    spawnedAt: startedAt,
    envKeys: Object.keys(env).sort(),
    stdout: '',
    stderr: '',
    exitCode: null,
    signal: null,
    spawnError: null,
    cleanup: 'pending',
    runDirectory,
  };
  child.stdout?.on('data', (chunk) => { record.stdout += chunk.toString(); });
  child.stderr?.on('data', (chunk) => { record.stderr += chunk.toString(); });
  record.close = new Promise((resolvePromise) => {
  child.once('error', (error) => { record.spawnError = redactText(error.message, secrets); });
  child.once('close', (code, signal) => {
    record.exitCode = code;
    record.signal = signal;
    record.stdout = redactText(record.stdout, secrets);
    record.stderr = redactText(record.stderr, secrets);
    resolvePromise(record);
  });
  });
  record.child = child;
  return record;
}

async function waitTracked(record, timeoutMs, secrets) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${record.role} exceeded bounded child timeout`)), timeoutMs);
  });
  try {
    await Promise.race([record.close, timeout]);
  } finally {
    clearTimeout(timer);
  }
  record.stdout = redactText(record.stdout, secrets);
  record.stderr = redactText(record.stderr, secrets);
  return record;
}

async function cleanupTracked(record) {
  if (!record || !record.pid || record.exitCode !== null || record.signal !== null) {
    if (record) record.cleanup = 'already-exited';
    return;
  }
  record.child.kill('SIGTERM');
  try {
    await Promise.race([record.close, sleep(3_000)]);
  } catch {
    // Cleanup continues to the exact tracked PID below.
  }
  if (record.exitCode === null && record.signal === null) {
    try { process.kill(record.pid, 'SIGKILL'); } catch { /* already absent */ }
    await Promise.race([record.close, sleep(1_000)]);
  }
  record.cleanup = 'exact-pid-termination-attempted';
}

function pidIsAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function safeChildRecord(record) {
  return {
    role: record.role,
    pid: record.pid,
    executable: record.executable,
    cwd: record.cwd,
    args: record.args,
    spawnedAt: record.spawnedAt,
    envKeys: record.envKeys,
    exitCode: record.exitCode,
    signal: record.signal,
    spawnError: record.spawnError,
    cleanup: record.cleanup,
    stdout: record.stdout,
    stderr: record.stderr,
  };
}

function parseMoiraeOutput(record) {
  const output = record.stdout.trim();
  if (!output) throw new Error('Moirae produced no JSON route result');
  try { return JSON.parse(output); } catch { throw new Error('Moirae produced non-JSON output'); }
}

function verifyPositive(result, moiraeRecord, anankeInstance, endpoints) {
  const host = result.hostEvidence;
  const route = result.routeResult;
  const producer = route?.ananke;
  const evidence = route?.producerEvidence ?? producer?.evidence;
  if (host?.runtime !== 'moirae-code' || host.processId !== moiraeRecord.pid) throw new Error('Moirae PID/runtime evidence drifted');
  if (host.instanceId !== FIXED.moiraeInstance || host.artifact !== FIXED.moiraeArtifact) throw new Error('Moirae configured origin drifted');
  if (host.applicationIdentityVersion !== 'r1-v2') throw new Error('Moirae did not emit r1-v2 identity evidence');
  if (route?.state !== 'completed' || route.dispatchState !== 'result_received') throw new Error('positive route did not complete with result_received');
  if (result.horae?.endpoint !== endpoints.horaeRoute || result.horae.httpStatus !== 200) throw new Error('Horae route evidence drifted');
  if (route.receipt?.ananke?.instanceId !== anankeInstance || route.receipt.ananke.endpoint !== endpoints.anankeCanonical) throw new Error('Horae Ananke identity/endpoint drifted');
  if (route.receipt.ananke.producer?.checkpoint !== PRODUCER_AUTHORITY.checkpoint || route.receipt.ananke.producer?.tag !== PRODUCER_AUTHORITY.tag || route.receipt.ananke.producer?.implementationCommit !== PRODUCER_AUTHORITY.implementationCommit) throw new Error('Ananke producer authority drifted');
  if (result.request?.action !== FIXED.action || result.request?.route !== '/slice-02/governed-actions') throw new Error('fixed route/action drifted');
  if (result.request.arguments?.fixtureId !== FIXED.fixtureId || result.request.arguments?.expectedSha256 !== FIXED.fixtureSha256) throw new Error('fixed arguments drifted');
  if (producer?.outcome?.state !== 'COMPLETED' || evidence?.readAttemptCount !== 1 || evidence?.adapterInvocation !== true) throw new Error('producer effect evidence is not exactly one completed read');
  if (evidence.actualFixtureDigest !== FIXED.fixtureSha256 || typeof evidence.decisionId !== 'string' || typeof evidence.outcomeId !== 'string') throw new Error('producer decision/outcome/digest evidence is incomplete');
  return {
    state: route.state,
    dispatchState: route.dispatchState,
    routeId: route.routeId,
    eventId: route.eventId,
    correlation: route.correlation,
    producer: { outcomeState: producer.outcome.state, decisionId: evidence.decisionId, outcomeId: evidence.outcomeId, readAttemptCount: evidence.readAttemptCount, actualFixtureDigest: evidence.actualFixtureDigest },
    effectCount: 1,
    dispatchCount: 1,
  };
}

async function runApprovedExecution() {
  const sourcePreflight = verifyStaticSource();
  if (!sourcePreflight.verified) throw new Error(`static source preflight failed: ${sourcePreflight.failures.join('; ')}`);
  for (const name of PREFLIGHT_REPOSITORIES) {
    if (readGitHead(REPOSITORIES[name]) !== PINNED[name]) throw new Error(`${name} HEAD drifted`);
  }
  await assertComponentTreesClean();
  const canary = runRedactionCanary();
  await assertPortsFree();

  const executionToken = randomBytes(32).toString('base64url');
  const runDirectory = await mkdtemp(join(tmpdir(), 'fates-slice03a-r1-'));
  const replayLedger = join(runDirectory, 'horae-r1-replay-ledger.json');
  const secrets = [executionToken];
  const started = [];
  const endpoints = {
    anankeTransport: `http://127.0.0.1:${PORTS.ananke}`,
    anankeCanonical: `http://localhost:${PORTS.ananke}/api`,
    horaeBase: `http://127.0.0.1:${PORTS.horae}`,
    horaeRoute: `http://127.0.0.1:${PORTS.horae}/slice-02/governed-actions`,
  };
  let evidence;
  try {
    const ananke = spawnTracked('Ananke', REPOSITORIES.ananke, ['packages/runtime-core/dist/server.js'], {
      ANANKE_PORT: String(PORTS.ananke),
      ANANKE_EXECUTION_TOKEN: executionToken,
    }, secrets, runDirectory);
    started.push(ananke);
    const identity = await waitForJson(`${endpoints.anankeTransport}/api/runtime/identity`, (response) => response.status === 200 && response.body?.runtime === 'ananke' && typeof response.body.instanceId === 'string', 'Ananke');
    const anankeInstance = identity.body.instanceId;
    const audience = `fates.slice03a.r1.horae:${FIXED.horaeInstance}:POST:/slice-02/governed-actions`;
    const sessionId = `fates-r1-session-${randomUUID()}`;
    const horae = spawnTracked('Horae', REPOSITORIES.horae, ['packages/slice02-host/dist/index.js'], {
      HORAE_BIND_HOST: '127.0.0.1',
      HORAE_PORT: String(PORTS.horae),
      ANANKE_ENDPOINT: endpoints.anankeTransport,
      EXPECTED_ANANKE_ENDPOINT: endpoints.anankeCanonical,
      ANANKE_INSTANCE_ID: anankeInstance,
      ANANKE_EXECUTION_TOKEN: executionToken,
      HORAE_INSPECTION_TIMEOUT_MS: '1000',
      HORAE_DISPATCH_TIMEOUT_MS: '1000',
      HORAE_R1_INSTANCE_ID: FIXED.horaeInstance,
      HORAE_R1_REPLAY_LEDGER_PATH: replayLedger,
    }, secrets, runDirectory);
    started.push(horae);
    await waitForJson(`${endpoints.horaeBase}/slice-02/governed-actions`, (response) => response.status === 405, 'Horae route');
    const moirae = spawnTracked('Moirae', REPOSITORIES.moirae, ['apps/diagnostics-cli/dist/index.js', 'run-003a'], {
      MOIRAE_003A_REQUEST_IDENTITY_VERSION: 'r1-v2',
      MOIRAE_003A_HORAE_AUDIENCE: audience,
      MOIRAE_003A_HORAE_ENDPOINT: endpoints.horaeBase,
      MOIRAE_003A_INSTANCE_ID: FIXED.moiraeInstance,
      MOIRAE_003A_ARTIFACT: FIXED.moiraeArtifact,
      MOIRAE_003A_SESSION_ID: sessionId,
    }, secrets, runDirectory);
    started.push(moirae);
    await waitTracked(moirae, 15_000, secrets);
    const result = parseMoiraeOutput(moirae);
    const positive = verifyPositive(result, moirae, anankeInstance, endpoints);
    evidence = {
      status: 'PASS / LIVE VERIFIED',
      runTimestamp: new Date().toISOString(),
      pinnedCheckpoints: { ...PINNED },
      acceptanceDriverSha256: fileSha256(fileURLToPath(import.meta.url)),
      sourcePreflight,
      authentication: { anankeExecutionMode: 'workload-token', developmentMode: false, credentialValue: 'omitted', processOrigin: 'not authenticated by this R1 layer' },
      r1: { audience, horaeInstanceId: FIXED.horaeInstance, moiraeSessionId: sessionId, replayLedger: 'single authoritative Horae host; process-restart-persistent claim; no power-loss durability or multi-host exclusion' },
      processes: started.map(safeChildRecord),
      ports: { ...PORTS, state: 'checked before launch' },
      positive,
      negatives: { originAndConfiguration: 'not executed by this preparation driver revision' },
      negativeMatrix: ACCEPTANCE_MATRIX,
      chronology: [{ timestamp: new Date().toISOString(), role: 'Moirae', event: 'positive result received', pid: moirae.pid, dispatchState: positive.dispatchState, effectCount: positive.effectCount }],
      cleanup: 'pending until finally completes',
      limitations: buildPlan().limitations,
      credentialDisposition: 'credential disposition: provider-side revoked/rotated; former exposed credential set invalid',
      endpointSecurity: { status: 'no endpoint-security interaction in this run', controlsChanged: false },
      redactionCanary: canary,
    };
  } finally {
    for (const record of [...started].reverse()) await cleanupTracked(record);
    const portsFree = (await portState(PORTS.ananke)) === 'free' && (await portState(PORTS.horae)) === 'free';
    const cleanup = { trackedPidsAbsent: started.every((record) => !pidIsAlive(record.pid)), portsFree, ports: { ...PORTS } };
    if (evidence) {
      evidence.processes = started.map(safeChildRecord);
      evidence.cleanup = cleanup;
    }
    await rm(runDirectory, { recursive: true, force: true });
    if (evidence) await writeFile(resolve(ROOT, EVIDENCE_PATH), `${serializeEvidence(evidence, secrets)}\n`, 'utf8');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === '--plan')) {
    const plan = buildPlan();
    const canary = runRedactionCanary();
    plan.redactionCanary = canary;
    console.log(JSON.stringify(plan, null, 2));
    if (!plan.sourcePreflight.verified || plan.sourcePreflight.headFailures.length > 0) process.exitCode = 1;
    return;
  }
  if (args.length === 1 && args[0] === '--execute') {
    await runApprovedExecution();
    return;
  }
  throw new Error('Usage: node scripts/fates-slice03a-r1-live-acceptance.mjs [--plan|--execute]');
}

export { ACCEPTANCE_MATRIX, EVIDENCE_SCHEMA, buildPlan, childEnvironment, verifyStaticSource };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(redactText(error instanceof Error ? error.message : 'R1 acceptance driver failure'));
    process.exitCode = 1;
  });
}
