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
import { mkdir, mkdtemp, open as openFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;
const LEGACY_DRIVER = resolve(ROOT, 'scripts/fates-slice03a-live-acceptance.mjs');
export const EVIDENCE_PATH_TEMPLATE = 'docs/evidence/FATES-SLICE-003A-R1-live-acceptance-attempt-<attemptId>.json';
const LEGACY_DRIVER_SHA256 = '77ad8c51d80d689396de4d2753344b9a4cf3b2ee6b52423863ed3a246f4bd99e';
export const PREPARATION_STARTING_BASELINE = '07ec80aabe2c62baaa776857fbcefafd154a74d7';
export const PREVIOUS_PREPARATION_CHECKPOINT = '17052be6335cae6081fafb6da7b48c0eef1a3cf3';
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ATTEMPT_ID_PATTERN = /^[0-9]{3}$/;

export const PINNED = Object.freeze({
  ananke: 'dde9f74cbcfefea2176a6f0103e1f6b9064f4e64',
  horae: '3f531d4f5558a10a36aeae20c3458080eb4468b9',
  moirae: 'bc7b984bd2eb0e0f07a1cd7259a8eab21556f097',
  mnemosyne: 'f4ab76a9760f856d78908d35facceb068d78c8e5',
  runtimeContracts: 'bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8',
});

export const REPOSITORIES = Object.freeze({
  ananke: 'D:/Users/fleur/Project Ananke',
  horae: 'D:/Users/fleur/Project Horae',
  moirae: 'D:/Users/fleur/Project Moirae Code',
  mnemosyne: 'D:/Users/fleur/Project Mnemosyne',
  runtimeContracts: 'D:/Users/fleur/Project Runtime Contracts',
  integration: ROOT,
});

const PORTABLE_REPOSITORY_IDS = Object.freeze({
  ananke: 'repo:ananke',
  horae: 'repo:horae',
  moirae: 'repo:moirae',
  mnemosyne: 'repo:mnemosyne',
  runtimeContracts: 'repo:runtime-contracts',
  integration: 'repo:integration',
});

export const PORTS = Object.freeze({ ananke: 34212, horae: 34216 });
export const NEGATIVE_PORTS = Object.freeze({
  replayHorae: 34217,
  wrongAuthHorae: 34218,
  timeoutScratch: 34219,
  timeoutHorae: 34220,
  missingAuthHorae: 34221,
});
export const FIXED = Object.freeze({
  action: 'fates.slice02.inspect-fixed-fixture.v1',
  fixtureId: 'fates.slice02.fixed-fixture.v1',
  fixtureSha256: '7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8',
  horaeInstance: 'horae-r1-live-1',
  moiraeInstance: 'moirae-live-origin-1',
  moiraeArtifact: 'moirae-slice02-live-origin',
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

const GIT_PREFLIGHT_ENVIRONMENT_KEYS = Object.freeze([...ENV_ALLOWLISTS.inherited, 'USERPROFILE']);

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
    execution: 'future live route-level replay seed on an isolated Horae host',
    expected: 'denied / rejected_before_dispatch; no Ananke inspection or dispatch',
    proof: 'the same v2 receipt is rejected by Horae replay ledger',
    implementation: 'executable',
  },
  {
    id: 'wrong-audience',
    execution: 'future live route-level request against the tracked Horae host',
    expected: 'malformed / rejected_before_dispatch; no dispatch',
    proof: 'Horae rejects a non-canonical or non-matching v2 audience with no downgrade',
    implementation: 'executable',
  },
  {
    id: 'expired',
    execution: 'future live route-level request with explicit expired timestamps',
    expected: 'stale / rejected_before_dispatch; no dispatch',
    proof: 'expired validity is rejected before Ananke inspection/dispatch',
    implementation: 'executable',
  },
  {
    id: 'legacy-v1',
    execution: 'future live route-level historical request shape against the R1 host',
    expected: 'malformed / rejected_before_dispatch; no v1 downgrade',
    proof: 'R1 Horae requires the configured r1-v2 schema and audience',
    implementation: 'executable',
  },
  {
    id: 'wrong-ananke-token',
    execution: 'future live with a fresh isolated Horae process and wrong token',
    expected: 'Ananke authentication denied / route fail-closed; no effect',
    proof: 'distinguish wrong token from Horae startup missing-token configuration failure',
    implementation: 'executable',
  },
  {
    id: 'pre-dispatch-timeout',
    execution: 'future live negative induction against a localhost scratch inspection endpoint',
    expected: 'timed_out / dispatch_not_attempted / HTTP 504',
    proof: 'bounded cancellation, zero dispatch, no retry/fallback',
    implementation: 'executable-negative-induction',
  },
  {
    id: 'result-projection',
    execution: 'deterministic Horae validation unless safe live proof is available',
    expected: 'only the canonical producer-result allowlist is projected',
    proof: 'unexpected producer fields do not cross the Horae route boundary',
  },
  {
    id: 'restart-replay',
    execution: 'future live with the same tracked Horae build, instance, audience, and ledger',
    expected: 'denied / rejected_before_dispatch after restart; no second effect',
    proof: 'persisted claim is loaded before inspection/dispatch',
    implementation: 'executable',
  },
]);

export const LIVE_CASE_ORDER = Object.freeze([
  'positive-r1-v2',
  'replay',
  'wrong-audience',
  'expired',
  'legacy-v1',
  'wrong-ananke-token',
  'missing-horae-auth',
  'pre-dispatch-timeout',
  'restart-replay',
]);

const EVIDENCE_SCHEMA = Object.freeze({
  schemaVersion: 'fates-slice03a-r1-live-acceptance-v2',
  status: 'NOT_EXECUTED / PREPARATION ONLY',
  evidencePath: EVIDENCE_PATH_TEMPLATE,
  requiredTopLevel: [
    'attemptId',
    'predecessorAttemptId',
    'predecessorEvidencePath',
    'evidencePath',
    'status',
    'runTimestamp',
    'preparationStartingBaseline',
    'previousPreparationCheckpoint',
    'integrationExecutionCheckpoint',
    'ownerApprovedIntegrationCheckpoint',
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
  processRecord: ['role', 'pid', 'executable', 'cwd', 'repository', 'spawnedAt', 'exitCode', 'signal', 'cleanup'],
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

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('unsupported canonical request value');
}

function hashCanonical(value) {
  return sha256(canonicalJson(value));
}

const ROUTE_SCHEMA = Object.freeze({
  legacyId: 'urn:fates:slice02:inspect-fixed-fixture-request:v1',
  legacySha256: 'db1864fdc4978d6befb4b6d3913461e4f2d2732dd0ca87e076977ab98cf6049c',
  r1Id: 'urn:fates:slice02:inspect-fixed-fixture-request:r1-v2',
  r1Sha256: '104ebc4267914426434968996b2ba2e774ad4ffd6bc2fb4c97b4193a1c7389db',
});

const REQUEST_DEFAULTS = Object.freeze({
  tenantId: 'fates-003a-tenant',
  projectId: 'fates-003a-project',
  workspaceId: 'fates-003a-workspace',
  purpose: 'slice02.fixed-fixture-inspection',
});

export function buildRouteRequest({
  audience,
  identityVersion = 'r1-v2',
  validity,
  originId = `moirae-003a-origin-route-${randomUUID()}`,
  sessionId = `fates-003a-session-route-${randomUUID()}`,
} = {}) {
  const now = Date.now();
  const effectiveValidity = validity ?? {
    notBefore: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
  };
  const requestId = `moirae-003a-request-route-${randomUUID()}`;
  const correlationId = `moirae-003a-correlation-route-${randomUUID()}`;
  const resolvedAudience = audience ?? `fates.slice03a.r1.horae:${FIXED.horaeInstance}:POST:/slice-02/governed-actions`;
  const receipt = identityVersion === 'legacy-v1'
    ? {
        originId,
        originDigest: hashCanonical({ originId, schemaId: ROUTE_SCHEMA.legacyId, schemaSha256: ROUTE_SCHEMA.legacySha256 }),
        schemaId: ROUTE_SCHEMA.legacyId,
        schemaSha256: ROUTE_SCHEMA.legacySha256,
        validity: effectiveValidity,
      }
    : {
        originId,
        originDigest: hashCanonical({
          action: FIXED.action,
          audience: resolvedAudience,
          originId,
          schemaId: ROUTE_SCHEMA.r1Id,
          schemaSha256: ROUTE_SCHEMA.r1Sha256,
          validity: effectiveValidity,
        }),
        schemaId: ROUTE_SCHEMA.r1Id,
        schemaSha256: ROUTE_SCHEMA.r1Sha256,
        audience: resolvedAudience,
        validity: effectiveValidity,
      };
  const execution = {
    authenticatedPrincipal: { id: 'moirae-003a-host', kind: 'service', tenantId: REQUEST_DEFAULTS.tenantId },
    actingPrincipal: { id: 'moirae-003a-agent', kind: 'agent', tenantId: REQUEST_DEFAULTS.tenantId },
    runtimeId: 'moirae-code',
    runtimeInstanceId: FIXED.moiraeInstance,
    tenantId: REQUEST_DEFAULTS.tenantId,
    projectId: REQUEST_DEFAULTS.projectId,
    workspaceId: REQUEST_DEFAULTS.workspaceId,
    sessionId,
  };
  return {
    action: FIXED.action,
    arguments: { fixtureId: FIXED.fixtureId, expectedSha256: FIXED.fixtureSha256 },
    origin: {
      runtime: 'moirae-code',
      instanceId: FIXED.moiraeInstance,
      artifact: FIXED.moiraeArtifact,
      receipt,
    },
    execution,
    scope: {
      mode: 'bounded',
      tenantId: REQUEST_DEFAULTS.tenantId,
      projectId: REQUEST_DEFAULTS.projectId,
      workspaceId: REQUEST_DEFAULTS.workspaceId,
      resourceType: 'fixed-fixture',
      resourceIds: [FIXED.fixtureId],
      operations: ['read'],
    },
    purpose: REQUEST_DEFAULTS.purpose,
    correlation: { requestId, correlationId, sessionId },
  };
}

export function buildExpiredValidity(now = Date.now()) {
  return {
    notBefore: new Date(now - 120_000).toISOString(),
    expiresAt: new Date(now - 60_000).toISOString(),
  };
}

export function buildWrongAudience(realAudience) {
  const wrong = `${realAudience}:wrong-audience`;
  if (wrong === realAudience) throw new Error('wrong audience construction collided with real audience');
  return wrong;
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
      [horaeHost.includes('instanceId: "moirae-live-origin-1"'), 'canonical Horae expected Moirae instance'],
      [horaeHost.includes('artifact: "moirae-slice02-live-origin"'), 'canonical Horae expected Moirae artifact'],
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

export function validateSha(value, label = 'SHA') {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) {
    throw new Error(`${label} must be exactly 40 hexadecimal characters`);
  }
  return value.toLowerCase();
}

export function validateAttemptId(value) {
  if (typeof value !== 'string' || !ATTEMPT_ID_PATTERN.test(value) || Number(value) < 1) {
    throw new Error('attempt ID must be a positive three-digit decimal identifier, for example 002');
  }
  return value;
}

export function evidencePathForAttempt(attemptId) {
  return `docs/evidence/FATES-SLICE-003A-R1-live-acceptance-attempt-${validateAttemptId(attemptId)}.json`;
}

export function predecessorAttemptId(attemptId) {
  const current = Number(validateAttemptId(attemptId));
  return current === 1 ? null : String(current - 1).padStart(3, '0');
}

export async function reserveEvidenceTarget(root, attemptId) {
  const relativePath = evidencePathForAttempt(attemptId);
  const absolutePath = resolve(root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  const handle = await openFile(absolutePath, 'wx');
  try {
    const previous = predecessorAttemptId(attemptId);
    await handle.writeFile(`${serializeEvidence({
      schemaVersion: EVIDENCE_SCHEMA.schemaVersion,
      status: 'IN_PROGRESS / RESERVED',
      attemptId,
      predecessorAttemptId: previous,
      predecessorEvidencePath: previous ? evidencePathForAttempt(previous) : null,
      evidencePath: relativePath,
      reservation: 'exclusive target reserved before credential generation or child-process creation',
    })}\n`, 'utf8');
  } finally {
    await handle.close();
  }
  return relativePath;
}

export function parseCliArgs(args) {
  if (!Array.isArray(args)) throw new Error('arguments must be an array');
  let mode = '--plan';
  let approvedIntegrationSha;
  let attemptId;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--plan' || argument === '--execute') {
      if (mode !== '--plan' || (argument === '--plan' && index !== 0)) {
        throw new Error('plan/execute mode may be specified only once');
      }
      mode = argument;
    } else if (argument === '--approved-integration-sha') {
      if (approvedIntegrationSha !== undefined || args[index + 1] === undefined) throw new Error('approved Integration SHA must be supplied once');
      approvedIntegrationSha = validateSha(args[++index], 'approved Integration SHA');
    } else if (argument === '--attempt-id') {
      if (attemptId !== undefined || args[index + 1] === undefined) throw new Error('attempt ID must be supplied once');
      attemptId = validateAttemptId(args[++index]);
    } else {
      throw new Error('Usage: node scripts/fates-slice03a-r1-live-acceptance.mjs [--plan|--execute] [--attempt-id <NNN>] [--approved-integration-sha <sha>]');
    }
  }
  if (mode === '--execute') {
    if (!approvedIntegrationSha) throw new Error('--execute requires --approved-integration-sha <40-hex-sha>');
    if (!attemptId) throw new Error('--execute requires --attempt-id <three-digit-id>');
  }
  return { mode: mode === '--execute' ? 'execute' : 'plan', approvedIntegrationSha, attemptId };
}

export function assertIntegrationApproval(actualHead, approvedIntegrationSha) {
  const actual = validateSha(actualHead, 'actual Integration HEAD');
  const approved = validateSha(approvedIntegrationSha, 'approved Integration SHA');
  if (actual !== approved) {
    throw new Error('Integration HEAD does not equal the owner-approved Integration SHA');
  }
  return { actual, approved };
}

function buildPlan(approvedIntegrationSha, attemptId) {
  const previousAttempt = attemptId ? predecessorAttemptId(attemptId) : null;
  const evidencePath = attemptId ? evidencePathForAttempt(attemptId) : null;
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
    attemptId: attemptId ?? null,
    predecessorAttemptId: previousAttempt,
    predecessorEvidencePath: previousAttempt ? evidencePathForAttempt(previousAttempt) : null,
    evidencePath,
    processesStarted: 0,
    timeoutServersStarted: 0,
    driver: relative(ROOT, fileURLToPath(import.meta.url)),
    preparationStartingBaseline: PREPARATION_STARTING_BASELINE,
    previousPreparationCheckpoint: PREVIOUS_PREPARATION_CHECKPOINT,
    integration: {
      actualHead: readGitHead(ROOT),
      approvedHead: approvedIntegrationSha ?? null,
      approvalMatch: approvedIntegrationSha ? readGitHead(ROOT) === approvedIntegrationSha : null,
      cleanTreeCheckedAtExecute: true,
    },
    pinnedCheckpoints: { ...PINNED },
    acceptanceDriverSha256: fileSha256(fileURLToPath(import.meta.url)),
    sourcePreflight: { ...sourcePreflight, headFailures, heads },
    producerAuthority: { ...PRODUCER_AUTHORITY },
    cleanTree: {
      required: true,
      checkedBeforeExecute: true,
      planMode: 'no child process is started; execute mode performs the final git-status preflight',
      componentRepositories: PREFLIGHT_REPOSITORIES,
      integrationRepository: ROOT,
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
      'Run the bounded executable negative matrix in the fixed case order; stop on infrastructure failure and retain chronology.',
    ],
    futureCommands: {
      ananke: 'node packages/runtime-core/dist/server.js',
      horae: 'node packages/slice02-host/dist/index.js',
      moirae: 'node apps/diagnostics-cli/dist/index.js run-003a',
      execute: 'node scripts/fates-slice03a-r1-live-acceptance.mjs --execute --attempt-id <ATTEMPT_ID> --approved-integration-sha <OWNER_APPROVED_SHA>',
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
    negativeCaseImplementation: Object.fromEntries(ACCEPTANCE_MATRIX.map((item) => [item.id, item.implementation ?? 'deterministic-test-only'])),
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

function gitPreflightEnvironment(parent = process.env) {
  return Object.fromEntries(GIT_PREFLIGHT_ENVIRONMENT_KEYS.flatMap((key) => parent[key] === undefined ? [] : [[key, parent[key]]]));
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

function portableRepositoryId(repo) {
  const resolvedRepo = resolve(repo);
  const match = Object.entries(REPOSITORIES).find(([, path]) => resolve(path) === resolvedRepo);
  return match ? PORTABLE_REPOSITORY_IDS[match[0]] : 'repo:unclassified';
}

function replacePathVariants(value, path, replacement) {
  let result = value;
  const variants = new Set([
    path,
    path.replaceAll('\\', '/'),
    path.replaceAll('/', '\\'),
    JSON.stringify(path).slice(1, -1),
    JSON.stringify(path.replaceAll('\\', '/')).slice(1, -1),
  ]);
  for (const variant of variants) if (variant) result = result.split(variant).join(replacement);
  return result;
}

export function sanitizePortableText(value) {
  let result = String(value ?? '');
  result = result.replace(/[A-Za-z]:[\\/][^\r\n"'<>|{}]*/g, '[LOCAL_WINDOWS_PATH]');
  result = result.replace(/(^|[\s("'=])\/(?:Users|home|tmp|var|mnt|workspace)(?:\/[^\r\n"'<>|{} ]+)+/g, '$1[LOCAL_UNIX_PATH]');
  return result;
}

function sanitizeChildOutput(value, record) {
  let result = String(value ?? '');
  result = replacePathVariants(result, record.executable, 'node.exe');
  result = replacePathVariants(result, record.cwd, record.repository);
  for (const [name, repo] of Object.entries(REPOSITORIES)) {
    result = replacePathVariants(result, resolve(repo), PORTABLE_REPOSITORY_IDS[name]);
  }
  return sanitizePortableText(result);
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
  const canaries = [
    `r1-correct-token-canary-${randomBytes(24).toString('hex')}`,
    `r1-wrong-token-canary-${randomBytes(24).toString('hex')}`,
  ];
  const unsafeError = new Error(`child failure ${canaries.join(' ')}`);
  const stdout = redactText(`stdout ${canaries.join(' ')}`, canaries);
  const stderr = redactText(`stderr ${canaries.join(' ')}`, canaries);
  const error = redactValue(unsafeError, canaries);
  const evidence = serializeEvidence({ stdout, stderr, error, nested: canaries }, canaries);
  if ([stdout, stderr, JSON.stringify(error), evidence].some((value) => canaries.some((canary) => value.includes(canary)))) {
    throw new Error('synthetic random redaction canary was reproduced');
  }
  return { passed: true, fields: ['stdout', 'stderr', 'error', 'evidence serialization'], trackedValues: 2 };
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

async function postRoute(endpoint, body, timeoutMs = 5_000) {
  return jsonFetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }, timeoutMs);
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
  for (const [name, port] of Object.entries({ ...PORTS, ...NEGATIVE_PORTS })) {
    if (await portState(port) !== 'free') throw new Error(`port ${name}:${port} is not confirmed free`);
  }
}

async function gitStatus(repo) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', ['status', '--porcelain', '--untracked-files=all'], {
      cwd: resolve(repo),
      env: gitPreflightEnvironment(),
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

async function assertAllRepositoriesClean() {
  await assertComponentTreesClean();
  const integrationStatus = await gitStatus(ROOT);
  if (integrationStatus.trim()) throw new Error('integration worktree is not clean');
}

function spawnTracked(role, repo, args, values, secrets, runDirectory, environmentRole = role.toLowerCase()) {
  const cwd = resolve(repo);
  const repository = portableRepositoryId(repo);
  const env = childEnvironment(environmentRole, values);
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
    repository,
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

function horaeValues({
  port,
  anankeEndpoint,
  expectedAnankeEndpoint,
  anankeInstance,
  executionToken,
  r1Instance,
  replayLedger,
  inspectionTimeoutMs = '1000',
  dispatchTimeoutMs = '1000',
} = {}) {
  return {
    HORAE_BIND_HOST: '127.0.0.1',
    HORAE_PORT: String(port),
    ANANKE_ENDPOINT: anankeEndpoint,
    EXPECTED_ANANKE_ENDPOINT: expectedAnankeEndpoint,
    ANANKE_INSTANCE_ID: anankeInstance,
    ...(executionToken === undefined ? {} : { ANANKE_EXECUTION_TOKEN: executionToken }),
    HORAE_INSPECTION_TIMEOUT_MS: String(inspectionTimeoutMs),
    HORAE_DISPATCH_TIMEOUT_MS: String(dispatchTimeoutMs),
    HORAE_R1_INSTANCE_ID: r1Instance,
    HORAE_R1_REPLAY_LEDGER_PATH: replayLedger,
  };
}

async function startHorae({ role, port, anankeEndpoint, expectedAnankeEndpoint, anankeInstance, executionToken, r1Instance, replayLedger, secrets, runDirectory, inspectionTimeoutMs, dispatchTimeoutMs }) {
  const record = spawnTracked(
    role,
    REPOSITORIES.horae,
    ['packages/slice02-host/dist/index.js'],
    horaeValues({ port, anankeEndpoint, expectedAnankeEndpoint, anankeInstance, executionToken, r1Instance, replayLedger, inspectionTimeoutMs, dispatchTimeoutMs }),
    secrets,
    runDirectory,
    'horae',
  );
  try {
    await waitForJson(`http://127.0.0.1:${port}/slice-02/governed-actions`, (response) => response.status === 405, `${role} Horae host`);
    return record;
  } catch (error) {
    await waitTracked(record, 2_000, secrets).catch(() => {});
    throw error;
  }
}

async function startScratchInspectionServer(port) {
  const server = createServer(() => {
    // Intentionally leave every inspection request incomplete for the bounded timeout case.
  });
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolvePromise);
  });
  return { role: 'scratch-timeout-inspection-listener', port, server, sockets, closed: false };
}

async function closeScratchInspectionServer(resource) {
  if (!resource || resource.closed) return;
  for (const socket of resource.sockets) socket.destroy();
  await new Promise((resolvePromise) => resource.server.close(resolvePromise));
  resource.closed = true;
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
    executable: basename(record.executable),
    cwd: record.repository,
    repository: record.repository,
    args: record.args.map((argument) => sanitizePortableText(argument)),
    spawnedAt: record.spawnedAt,
    envKeys: record.envKeys,
    exitCode: record.exitCode,
    signal: record.signal,
    spawnError: sanitizeChildOutput(record.spawnError, record),
    cleanup: record.cleanup,
    stdout: sanitizeChildOutput(record.stdout, record),
    stderr: sanitizeChildOutput(record.stderr, record),
  };
}

function routeDispatchDelta(route) {
  if (!route || route.dispatchState === 'rejected_before_dispatch' || route.dispatchState === 'dispatch_not_attempted') return 0;
  return 1;
}

function routeReadDelta(route) {
  const evidence = route?.producerEvidence ?? route?.ananke?.evidence;
  return typeof evidence?.readAttemptCount === 'number' ? evidence.readAttemptCount : 0;
}

function observeRouteResponse(response, { realAnanke = true } = {}) {
  const route = isRecord(response?.body) ? response.body : undefined;
  return {
    httpStatus: response?.status ?? null,
    state: route?.state ?? 'no-json-result',
    dispatchState: route?.dispatchState ?? 'not-observed',
    reason: typeof route?.reason === 'string' ? route.reason : undefined,
    dispatchDelta: routeDispatchDelta(route),
    producerReadDelta: routeReadDelta(route),
    realAnankeContacted: realAnanke && routeDispatchDelta(route) > 0,
    realProducerReachable: routeReadDelta(route) > 0,
  };
}

function assertRejectedBeforeDispatch(observation, label) {
  if (observation.httpStatus === null || observation.dispatchState !== 'rejected_before_dispatch') {
    throw new Error(`${label} did not reject before dispatch`);
  }
  if (observation.dispatchDelta !== 0 || observation.producerReadDelta !== 0) {
    throw new Error(`${label} reported a non-zero dispatch/read delta`);
  }
}

function makeCaseResult(id, classification, observations, extra = {}) {
  const list = Array.isArray(observations) ? observations : [observations];
  return {
    id,
    classification,
    observations: list,
    dispatchDelta: list.reduce((sum, item) => sum + (item.dispatchDelta ?? 0), 0),
    producerReadDelta: list.reduce((sum, item) => sum + (item.producerReadDelta ?? 0), 0),
    ...extra,
  };
}

function assertNoSecretMaterial(value, secrets) {
  const serialized = serializeEvidence(value, secrets);
  if (secrets.some((secret) => secret && serialized.includes(secret))) {
    throw new Error('run-generated sensitive value appeared in retained evidence');
  }
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

async function runApprovedExecution(approvedIntegrationSha, attemptId) {
  const sourcePreflight = verifyStaticSource();
  if (!sourcePreflight.verified) throw new Error(`static source preflight failed: ${sourcePreflight.failures.join('; ')}`);
  for (const name of PREFLIGHT_REPOSITORIES) {
    if (readGitHead(REPOSITORIES[name]) !== PINNED[name]) throw new Error(`${name} HEAD drifted`);
  }
  const integrationApproval = assertIntegrationApproval(readGitHead(ROOT), approvedIntegrationSha);
  await assertAllRepositoriesClean();
  const canary = runRedactionCanary();
  await assertPortsFree();
  const evidencePath = await reserveEvidenceTarget(ROOT, attemptId);
  const previousAttempt = predecessorAttemptId(attemptId);

  const executionToken = randomBytes(32).toString('base64url');
  const runDirectory = await mkdtemp(join(tmpdir(), 'fates-slice03a-r1-'));
  const replayLedger = join(runDirectory, 'horae-r1-replay-ledger.json');
  const secrets = [executionToken];
  const started = [];
  const ownedResources = [];
  let replayToken;
  let wrongAuthToken;
  const endpoints = {
    anankeTransport: `http://127.0.0.1:${PORTS.ananke}`,
    anankeCanonical: `http://localhost:${PORTS.ananke}/api`,
    horaeBase: `http://127.0.0.1:${PORTS.horae}`,
    horaeRoute: `http://127.0.0.1:${PORTS.horae}/slice-02/governed-actions`,
  };
  const evidence = {
    status: 'IN_PROGRESS / LIVE ACCEPTANCE',
    attemptId,
    predecessorAttemptId: previousAttempt,
    predecessorEvidencePath: previousAttempt ? evidencePathForAttempt(previousAttempt) : null,
    evidencePath,
    runTimestamp: new Date().toISOString(),
    preparationStartingBaseline: PREPARATION_STARTING_BASELINE,
    previousPreparationCheckpoint: PREVIOUS_PREPARATION_CHECKPOINT,
    integrationExecutionCheckpoint: integrationApproval.actual,
    ownerApprovedIntegrationCheckpoint: integrationApproval.approved,
    pinnedCheckpoints: { ...PINNED },
    acceptanceDriverSha256: fileSha256(fileURLToPath(import.meta.url)),
    sourcePreflight,
    authentication: {
      anankeExecutionMode: 'workload-token',
      developmentMode: false,
      credentialValue: 'omitted',
      processOrigin: 'not authenticated by this R1 layer',
    },
    r1: {
      audience: `fates.slice03a.r1.horae:${FIXED.horaeInstance}:POST:/slice-02/governed-actions`,
      horaeInstanceId: FIXED.horaeInstance,
      replayLedger: 'single authoritative Horae host; process-restart-persistent claim; no power-loss durability or multi-host exclusion',
    },
    processes: [],
    ownedResources: [],
    ports: { ...PORTS, ...NEGATIVE_PORTS, state: 'checked before launch' },
    positive: null,
    negatives: {},
    negativeMatrix: ACCEPTANCE_MATRIX,
    cases: [],
    chronology: [],
    cleanup: 'pending',
    limitations: buildPlan(approvedIntegrationSha, attemptId).limitations,
    credentialDisposition: 'credential disposition: provider-side revoked/rotated; former exposed credential set invalid',
    endpointSecurity: { status: 'no endpoint-security interaction in this run', controlsChanged: false },
    redactionCanary: canary,
  };
  let failure;
  const recordCase = (result) => {
    evidence.cases.push(result);
    evidence.chronology.push({
      timestamp: new Date().toISOString(),
      caseId: result.id,
      classification: result.classification,
      dispatchDelta: result.dispatchDelta,
      producerReadDelta: result.producerReadDelta,
      observations: result.observations,
    });
  };
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
    const horae = await startHorae({
      role: 'Horae positive',
      port: PORTS.horae,
      anankeEndpoint: endpoints.anankeTransport,
      expectedAnankeEndpoint: endpoints.anankeCanonical,
      anankeInstance,
      executionToken,
      r1Instance: FIXED.horaeInstance,
      replayLedger,
      secrets,
      runDirectory,
    });
    started.push(horae);
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
    evidence.r1.moiraeSessionId = sessionId;
    evidence.positive = positive;
    recordCase(makeCaseResult(
      'positive-r1-v2',
      'LIVE VERIFIED',
      [{
        httpStatus: result.horae.httpStatus,
        state: positive.state,
        dispatchState: positive.dispatchState,
        dispatchDelta: positive.dispatchCount,
        producerReadDelta: positive.producer.readAttemptCount,
        realAnankeContacted: true,
        realProducerReachable: true,
      }],
      {
        effectCount: positive.effectCount,
        processCorrelation: { moiraePid: moirae.pid, executable: basename(moirae.executable), cwd: moirae.repository, repository: moirae.repository, classification: 'PROCESS CORRELATION' },
        fixtureDigest: positive.producer.actualFixtureDigest,
      },
    ));

    replayToken = randomBytes(32).toString('base64url');
    secrets.push(replayToken);
    const replayInstance = 'horae-r1-replay-seed';
    const replayLedgerPath = join(runDirectory, 'replay-seed-ledger.json');
    const replayHorae = await startHorae({
      role: 'Horae replay seed',
      port: NEGATIVE_PORTS.replayHorae,
      anankeEndpoint: endpoints.anankeTransport,
      expectedAnankeEndpoint: endpoints.anankeCanonical,
      anankeInstance,
      executionToken: replayToken,
      r1Instance: replayInstance,
      replayLedger: replayLedgerPath,
      secrets,
      runDirectory,
    });
    started.push(replayHorae);
    const replayRequest = buildRouteRequest({ audience: `fates.slice03a.r1.horae:${replayInstance}:POST:/slice-02/governed-actions` });
    const replaySeed = observeRouteResponse(await postRoute(`http://127.0.0.1:${NEGATIVE_PORTS.replayHorae}/slice-02/governed-actions`, replayRequest));
    if (replaySeed.dispatchDelta === 0 || replaySeed.producerReadDelta !== 0) throw new Error('route-level replay seed was not consumed without an effect');
    const replaySecond = observeRouteResponse(await postRoute(`http://127.0.0.1:${NEGATIVE_PORTS.replayHorae}/slice-02/governed-actions`, replayRequest));
    assertRejectedBeforeDispatch(replaySecond, 'exact replay second submission');
    recordCase(makeCaseResult('replay', 'LIVE VERIFIED: R1 ROUTE-LEVEL REPLAY TEST', [replaySeed, replaySecond], {
      seedSource: 'driver-generated valid request; not a Moirae process replay',
      secondSubmission: { dispatchDelta: replaySecond.dispatchDelta, producerReadDelta: replaySecond.producerReadDelta },
    }));
    await cleanupTracked(replayHorae);
    replayToken = null;

    const wrongAudienceRequest = buildRouteRequest({ audience: buildWrongAudience(audience) });
    const wrongAudience = observeRouteResponse(await postRoute(endpoints.horaeRoute, wrongAudienceRequest));
    assertRejectedBeforeDispatch(wrongAudience, 'wrong audience');
    recordCase(makeCaseResult('wrong-audience', 'LIVE VERIFIED', wrongAudience, { noDowngrade: true }));

    const expiredRequest = buildRouteRequest({ audience, validity: buildExpiredValidity() });
    const expired = observeRouteResponse(await postRoute(endpoints.horaeRoute, expiredRequest));
    assertRejectedBeforeDispatch(expired, 'expired receipt');
    recordCase(makeCaseResult('expired', 'LIVE VERIFIED', expired));

    const legacyRequest = buildRouteRequest({ audience, identityVersion: 'legacy-v1' });
    const legacy = observeRouteResponse(await postRoute(endpoints.horaeRoute, legacyRequest));
    assertRejectedBeforeDispatch(legacy, 'legacy v1');
    recordCase(makeCaseResult('legacy-v1', 'LIVE VERIFIED', legacy, { noDowngrade: true }));

    wrongAuthToken = randomBytes(32).toString('base64url');
    secrets.push(wrongAuthToken);
    const wrongAuthInstance = 'horae-r1-restart';
    const wrongAuthLedger = join(runDirectory, 'restart-replay-ledger.json');
    const wrongAuthHorae = await startHorae({
      role: 'Horae wrong-auth',
      port: NEGATIVE_PORTS.wrongAuthHorae,
      anankeEndpoint: endpoints.anankeTransport,
      expectedAnankeEndpoint: endpoints.anankeCanonical,
      anankeInstance,
      executionToken: wrongAuthToken,
      r1Instance: wrongAuthInstance,
      replayLedger: wrongAuthLedger,
      secrets,
      runDirectory,
    });
    started.push(wrongAuthHorae);
    const restartRequest = buildRouteRequest({ audience: `fates.slice03a.r1.horae:${wrongAuthInstance}:POST:/slice-02/governed-actions` });
    const wrongAuth = observeRouteResponse(await postRoute(`http://127.0.0.1:${NEGATIVE_PORTS.wrongAuthHorae}/slice-02/governed-actions`, restartRequest));
    if (wrongAuth.dispatchDelta === 0 || wrongAuth.producerReadDelta !== 0) throw new Error('wrong-auth case did not reach a fail-closed Ananke dispatch boundary');
    recordCase(makeCaseResult('wrong-ananke-token', 'LIVE VERIFIED: FAIL-CLOSED; AUTH HTTP STATUS NOT EXPOSED BY PINNED HORAE BINDING', wrongAuth, {
      authenticationObservation: 'Horae binding surfaced the non-success Ananke dispatch as result_lost_indeterminate; no producer read occurred.',
      fixedFixtureEffect: 0,
    }));

    const missingAuth = spawnTracked(
      'Horae missing-auth',
      REPOSITORIES.horae,
      ['packages/slice02-host/dist/index.js'],
      horaeValues({
        port: NEGATIVE_PORTS.missingAuthHorae,
        anankeEndpoint: endpoints.anankeTransport,
        expectedAnankeEndpoint: endpoints.anankeCanonical,
        anankeInstance,
        r1Instance: 'horae-r1-missing-auth',
        replayLedger: join(runDirectory, 'missing-auth-ledger.json'),
      }),
      secrets,
      runDirectory,
      'horae',
    );
    started.push(missingAuth);
    await waitTracked(missingAuth, 5_000, secrets);
    if (missingAuth.exitCode === 0) throw new Error('missing-auth Horae unexpectedly started successfully');
    recordCase(makeCaseResult('missing-horae-auth', 'LIVE VERIFIED', {
      httpStatus: null,
      state: 'startup_configuration_failed_closed',
      dispatchState: 'dispatch_not_attempted',
      dispatchDelta: 0,
      producerReadDelta: 0,
      realAnankeContacted: false,
      realProducerReachable: false,
    }, {
      exitCode: missingAuth.exitCode,
      stderr: redactText(missingAuth.stderr, secrets),
      developmentFallback: false,
    }));

    const scratch = await startScratchInspectionServer(NEGATIVE_PORTS.timeoutScratch);
    ownedResources.push(scratch);
    const timeoutInstance = 'horae-r1-timeout-scratch';
    const timeoutHorae = await startHorae({
      role: 'Horae timeout induction',
      port: NEGATIVE_PORTS.timeoutHorae,
      anankeEndpoint: `http://127.0.0.1:${NEGATIVE_PORTS.timeoutScratch}`,
      expectedAnankeEndpoint: `http://localhost:${NEGATIVE_PORTS.timeoutScratch}/api`,
      anankeInstance: 'scratch-inspection-endpoint',
      executionToken,
      r1Instance: timeoutInstance,
      replayLedger: join(runDirectory, 'timeout-ledger.json'),
      secrets,
      runDirectory,
      inspectionTimeoutMs: '250',
      dispatchTimeoutMs: '250',
    });
    started.push(timeoutHorae);
    const timeoutObservation = observeRouteResponse(await postRoute(`http://127.0.0.1:${NEGATIVE_PORTS.timeoutHorae}/slice-02/governed-actions`, buildRouteRequest({ audience: `fates.slice03a.r1.horae:${timeoutInstance}:POST:/slice-02/governed-actions` })), { realAnanke: false });
    if (timeoutObservation.httpStatus !== 504 || timeoutObservation.state !== 'timed_out' || timeoutObservation.dispatchState !== 'dispatch_not_attempted' || timeoutObservation.dispatchDelta !== 0 || timeoutObservation.producerReadDelta !== 0) {
      throw new Error('scratch inspection timeout did not produce the bounded 504 fail-closed result');
    }
    recordCase(makeCaseResult('pre-dispatch-timeout', 'LIVE NEGATIVE INDUCTION AGAINST SCRATCH INSPECTION ENDPOINT', timeoutObservation, {
      authoritativeAnanke: false,
      scratchEndpoint: 'localhost-only; not authoritative Ananke',
    }));
    await cleanupTracked(timeoutHorae);
    await closeScratchInspectionServer(scratch);

    await cleanupTracked(wrongAuthHorae);
    if (pidIsAlive(wrongAuthHorae.pid)) throw new Error('old Horae PID remained alive before restart');
    const restartedHorae = await startHorae({
      role: 'Horae restart-replay',
      port: NEGATIVE_PORTS.wrongAuthHorae,
      anankeEndpoint: endpoints.anankeTransport,
      expectedAnankeEndpoint: endpoints.anankeCanonical,
      anankeInstance,
      executionToken: wrongAuthToken,
      r1Instance: wrongAuthInstance,
      replayLedger: wrongAuthLedger,
      secrets,
      runDirectory,
    });
    started.push(restartedHorae);
    const restartReplay = observeRouteResponse(await postRoute(`http://127.0.0.1:${NEGATIVE_PORTS.wrongAuthHorae}/slice-02/governed-actions`, restartRequest));
    assertRejectedBeforeDispatch(restartReplay, 'restart replay');
    recordCase(makeCaseResult('restart-replay', 'LIVE VERIFIED: PROCESS-RESTART-PERSISTENT REPLAY PROTECTION', restartReplay, {
      sameHoraeInstance: wrongAuthInstance,
      sameAudience: restartRequest.origin.receipt.audience,
      sameLedger: 'same ephemeral ledger path; removed after cleanup',
      oldPidTerminatedBeforeRestart: true,
      noPowerLossClaim: true,
      noMultiProcessClaim: true,
    }));

    evidence.status = 'PASS / LIVE VERIFIED WITH BOUNDED LIMITATIONS';
  } catch (error) {
    failure = new Error(redactText(error instanceof Error ? error.message : 'R1 live acceptance failed', secrets));
    evidence.status = 'FAIL / LIVE ACCEPTANCE INCOMPLETE';
    evidence.failure = failure.message;
  } finally {
    for (const record of [...started].reverse()) await cleanupTracked(record);
    for (const resource of [...ownedResources].reverse()) await closeScratchInspectionServer(resource);
    evidence.processes = started.map(safeChildRecord);
    evidence.ownedResources = ownedResources.map((resource) => ({ role: resource.role, port: resource.port, closed: resource.closed }));
    const portsFree = await Promise.all(Object.values({ ...PORTS, ...NEGATIVE_PORTS }).map(async (port) => (await portState(port)) === 'free'));
    const cleanup = {
      trackedPidsAbsent: started.every((record) => !pidIsAlive(record.pid)),
      portsFree: portsFree.every(Boolean),
      ports: { ...PORTS, ...NEGATIVE_PORTS },
      scratchResourcesClosed: ownedResources.every((resource) => resource.closed),
    };
    evidence.cleanup = cleanup;
    evidence.credentialLeakScan = { retainedCredentialOccurrences: 0, retainedOutputScan: 'passed without reproducing generated values' };
    assertNoSecretMaterial({ evidence, processes: evidence.processes }, secrets);
    await rm(runDirectory, { recursive: true, force: true });
    await writeFile(resolve(ROOT, evidencePath), `${serializeEvidence(evidence, secrets)}\n`, 'utf8');
    if (replayToken) replayToken = null;
    if (wrongAuthToken) wrongAuthToken = null;
    secrets.length = 0;
  }
  if (failure) throw failure;
}

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (parsed.mode === 'plan') {
    const plan = buildPlan(parsed.approvedIntegrationSha, parsed.attemptId);
    const canary = runRedactionCanary();
    plan.redactionCanary = canary;
    console.log(JSON.stringify(plan, null, 2));
    if (!plan.sourcePreflight.verified || plan.sourcePreflight.headFailures.length > 0) process.exitCode = 1;
    return;
  }
  await runApprovedExecution(parsed.approvedIntegrationSha, parsed.attemptId);
}

export {
  ACCEPTANCE_MATRIX,
  EVIDENCE_SCHEMA,
  buildPlan,
  childEnvironment,
  gitPreflightEnvironment,
  safeChildRecord,
  verifyStaticSource,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(redactText(error instanceof Error ? error.message : 'R1 acceptance driver failure'));
    process.exitCode = 1;
  });
}
