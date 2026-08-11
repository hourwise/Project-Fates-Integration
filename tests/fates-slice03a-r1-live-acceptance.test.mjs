import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ACCEPTANCE_MATRIX,
  EVIDENCE_SCHEMA,
  ENV_ALLOWLISTS,
  FIXED,
  LIVE_CASE_ORDER,
  NEGATIVE_PORTS,
  RESIDUAL_LIMITATIONS,
  assertIntegrationApproval,
  buildExpiredValidity,
  buildPlan,
  buildRouteRequest,
  buildWrongAudience,
  childEnvironment,
  gitPreflightEnvironment,
  parseCliArgs,
  runRedactionCanary,
  serializeEvidence,
} from '../scripts/fates-slice03a-r1-live-acceptance.mjs';

const root = resolve(import.meta.dirname, '..');
const driverPath = resolve(root, 'scripts/fates-slice03a-r1-live-acceptance.mjs');

test('R1 plan has the required bounded matrix and preparation-only evidence status', () => {
  assert.equal(EVIDENCE_SCHEMA.status, 'NOT_EXECUTED / PREPARATION ONLY');
  assert.equal(EVIDENCE_SCHEMA.evidencePath, 'docs/evidence/FATES-SLICE-003A-R1-live-acceptance-2026-08-11.json');
  assert.ok(EVIDENCE_SCHEMA.requiredTopLevel.includes('acceptanceDriverSha256'));
  assert.ok(EVIDENCE_SCHEMA.requiredTopLevel.includes('integrationExecutionCheckpoint'));
  assert.ok(EVIDENCE_SCHEMA.requiredTopLevel.includes('ownerApprovedIntegrationCheckpoint'));
  assert.ok(EVIDENCE_SCHEMA.requiredTopLevel.includes('endpointSecurity'));
  assert.deepEqual(
    ACCEPTANCE_MATRIX.map((item) => item.id),
    ['positive-r1-v2', 'replay', 'wrong-audience', 'expired', 'legacy-v1', 'wrong-ananke-token', 'pre-dispatch-timeout', 'result-projection', 'restart-replay'],
  );
  assert.match(ACCEPTANCE_MATRIX.find((item) => item.id === 'pre-dispatch-timeout').expected, /timed_out \/ dispatch_not_attempted \/ HTTP 504/);
  assert.match(ACCEPTANCE_MATRIX.find((item) => item.id === 'legacy-v1').expected, /no v1 downgrade/);
  for (const id of ['replay', 'wrong-audience', 'expired', 'legacy-v1', 'wrong-ananke-token', 'pre-dispatch-timeout', 'restart-replay']) {
    assert.equal(ACCEPTANCE_MATRIX.find((item) => item.id === id).implementation.startsWith('executable'), true);
  }
  assert.equal(ACCEPTANCE_MATRIX.find((item) => item.id === 'result-projection').implementation, undefined);
  assert.deepEqual(LIVE_CASE_ORDER, [
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
  assert.equal(NEGATIVE_PORTS.timeoutScratch !== NEGATIVE_PORTS.timeoutHorae, true);
  assert.equal(RESIDUAL_LIMITATIONS.length, 14);
  assert.ok(RESIDUAL_LIMITATIONS.some((item) => item.includes('fresh v2 request')));
  assert.ok(RESIDUAL_LIMITATIONS.some((item) => item.includes('power-loss')));
  assert.ok(RESIDUAL_LIMITATIONS.some((item) => item.includes('003B')));
});

test('child environments are explicit and keep the token out of Moirae', () => {
  const token = `synthetic-${randomUUID()}`;
  const developmentModeKey = ['ANANKE_', 'DEVELOPMENT_MODE'].join('');
  const developmentModeValue = ['tr', 'ue'].join('');
  const ananke = childEnvironment('ananke', { ANANKE_PORT: '34212', ANANKE_EXECUTION_TOKEN: token }, {
    PATH: 'safe-path',
    NODE_OPTIONS: '--unexpected-parent-option',
    [developmentModeKey]: developmentModeValue,
  });
  assert.equal(ananke.PATH, 'safe-path');
  assert.equal(ananke.ANANKE_EXECUTION_TOKEN, token);
  assert.equal(ananke[developmentModeKey], undefined);
  assert.equal(ananke.NODE_OPTIONS, undefined);

  const moirae = childEnvironment('moirae', {
    MOIRAE_003A_REQUEST_IDENTITY_VERSION: 'r1-v2',
    MOIRAE_003A_HORAE_AUDIENCE: 'fates.slice03a.r1.horae:horae:POST:/slice-02/governed-actions',
    MOIRAE_003A_HORAE_ENDPOINT: 'http://127.0.0.1:34216',
    MOIRAE_003A_INSTANCE_ID: 'moirae',
    MOIRAE_003A_ARTIFACT: 'artifact',
    MOIRAE_003A_SESSION_ID: 'session',
  }, { PATH: 'safe-path', ANANKE_EXECUTION_TOKEN: token });
  assert.equal(moirae.ANANKE_EXECUTION_TOKEN, undefined);
  assert.deepEqual(ENV_ALLOWLISTS.moirae, [
    'MOIRAE_003A_REQUEST_IDENTITY_VERSION',
    'MOIRAE_003A_HORAE_AUDIENCE',
    'MOIRAE_003A_HORAE_ENDPOINT',
    'MOIRAE_003A_INSTANCE_ID',
    'MOIRAE_003A_ARTIFACT',
    'MOIRAE_003A_SESSION_ID',
  ]);
});

test('Git preflight receives USERPROFILE without widening runtime child environments', () => {
  const gitEnvironment = gitPreflightEnvironment({
    PATH: 'safe-path',
    SystemRoot: 'C:\\Windows',
    USERPROFILE: 'C:\\Users\\USER',
    HOME: 'C:\\Users\\USER',
    GIT_CONFIG_COUNT: '1',
  });
  assert.deepEqual(Object.keys(gitEnvironment).sort(), ['PATH', 'SystemRoot', 'USERPROFILE']);
  assert.equal(gitEnvironment.USERPROFILE, 'C:\\Users\\USER');
  assert.equal(gitEnvironment.HOME, undefined);
  assert.equal(gitEnvironment.GIT_CONFIG_COUNT, undefined);
  const ananke = childEnvironment('ananke', { ANANKE_PORT: '34212' }, {
    PATH: 'safe-path',
    USERPROFILE: 'C:\\Users\\USER',
  });
  assert.equal(ananke.USERPROFILE, undefined);
});

test('synthetic random redaction canary passes through output, error, and evidence serialization', () => {
  assert.deepEqual(runRedactionCanary(), {
    passed: true,
    fields: ['stdout', 'stderr', 'error', 'evidence serialization'],
    trackedValues: 2,
  });
  const canary = `synthetic-${randomUUID()}`;
  const serialized = serializeEvidence({ stdout: canary, stderr: canary, error: new Error(canary) }, [canary]);
  assert.equal(serialized.includes(canary), false);
  assert.match(serialized, /\[REDACTED\]/);
});

test('owner-approved Integration SHA binding is explicit and fails closed', () => {
  const sha = 'a'.repeat(40);
  assert.deepEqual(parseCliArgs([]), { mode: 'plan', approvedIntegrationSha: undefined });
  assert.deepEqual(parseCliArgs(['--plan', '--approved-integration-sha', sha]), { mode: 'plan', approvedIntegrationSha: sha });
  assert.deepEqual(parseCliArgs(['--execute', '--approved-integration-sha', sha]), { mode: 'execute', approvedIntegrationSha: sha });
  assert.throws(() => parseCliArgs(['--execute']), /requires/);
  assert.throws(() => parseCliArgs(['--execute', '--approved-integration-sha', 'not-a-sha']), /exactly 40/);
  assert.throws(() => assertIntegrationApproval(sha, 'b'.repeat(40)), /does not equal/);
  assert.deepEqual(assertIntegrationApproval(sha, sha), { actual: sha, approved: sha });
  const plan = buildPlan();
  assert.equal(plan.pinnedCheckpoints.integration, undefined);
  assert.equal(plan.preparationStartingBaseline, '07ec80aabe2c62baaa776857fbcefafd154a74d7');
  assert.equal(plan.previousPreparationCheckpoint, '17052be6335cae6081fafb6da7b48c0eef1a3cf3');
  assert.equal(plan.acceptanceDriverSha256.length, 64);
});

test('route-level identity fixtures cover replay, wrong audience, expiry, and legacy v1 without live processes', () => {
  const audience = `fates.slice03a.r1.horae:${FIXED.horaeInstance}:POST:/slice-02/governed-actions`;
  const replayRequest = buildRouteRequest({ audience });
  assert.equal(replayRequest.origin.receipt.audience, audience);
  assert.equal(replayRequest.origin.receipt.originDigest, buildRouteRequest({ audience, originId: replayRequest.origin.receipt.originId, validity: replayRequest.origin.receipt.validity }).origin.receipt.originDigest);
  const wrongAudience = buildWrongAudience(audience);
  assert.notEqual(wrongAudience, audience);
  const wrongAudienceRequest = buildRouteRequest({ audience: wrongAudience });
  assert.equal(wrongAudienceRequest.origin.receipt.audience, wrongAudience);
  const expired = buildExpiredValidity();
  assert.ok(Date.parse(expired.expiresAt) < Date.now());
  const expiredRequest = buildRouteRequest({ audience, validity: expired });
  assert.equal(expiredRequest.origin.receipt.validity.expiresAt, expired.expiresAt);
  const legacy = buildRouteRequest({ audience, identityVersion: 'legacy-v1' });
  assert.equal(legacy.origin.receipt.schemaId, 'urn:fates:slice02:inspect-fixed-fixture-request:v1');
  assert.equal(legacy.origin.receipt.audience, undefined);
  assert.equal(legacy.origin.instanceId, FIXED.moiraeInstance);
});

test('negative authentication and timeout resources remain isolated and credential-free from Moirae/scratch', () => {
  const syntheticToken = `synthetic-${randomUUID()}`;
  const horae = childEnvironment('horae', {
    HORAE_BIND_HOST: '127.0.0.1',
    HORAE_PORT: String(NEGATIVE_PORTS.wrongAuthHorae),
    ANANKE_ENDPOINT: 'http://127.0.0.1:34212',
    EXPECTED_ANANKE_ENDPOINT: 'http://localhost:34212/api',
    ANANKE_INSTANCE_ID: 'ananke-instance',
    ANANKE_EXECUTION_TOKEN: syntheticToken,
    HORAE_R1_INSTANCE_ID: 'horae-r1-negative',
    HORAE_R1_REPLAY_LEDGER_PATH: 'C:\\temporary\\ledger.json',
  }, { PATH: 'safe-path' });
  const moirae = childEnvironment('moirae', {
    MOIRAE_003A_REQUEST_IDENTITY_VERSION: 'r1-v2',
    MOIRAE_003A_HORAE_AUDIENCE: 'fates.slice03a.r1.horae:horae-r1-negative:POST:/slice-02/governed-actions',
    MOIRAE_003A_HORAE_ENDPOINT: 'http://127.0.0.1:34216',
    MOIRAE_003A_INSTANCE_ID: FIXED.moiraeInstance,
    MOIRAE_003A_ARTIFACT: FIXED.moiraeArtifact,
    MOIRAE_003A_SESSION_ID: 'session',
  }, { PATH: 'safe-path', ANANKE_EXECUTION_TOKEN: syntheticToken });
  assert.equal(horae.ANANKE_EXECUTION_TOKEN, syntheticToken);
  assert.equal(moirae.ANANKE_EXECUTION_TOKEN, undefined);
  const serialized = serializeEvidence({ horae, moirae, scratch: { endpoint: 'http://127.0.0.1:34219' } }, [syntheticToken]);
  assert.equal(serialized.includes(syntheticToken), false);
  assert.equal(NEGATIVE_PORTS.timeoutScratch, 34219);
  assert.equal(NEGATIVE_PORTS.timeoutHorae, 34220);
});

test('the new driver is Node-only, non-bypass, and does not alter the historical harness', () => {
  const source = readFileSync(driverPath, 'utf8');
  assert.match(source, /from 'node:child_process'/);
  assert.match(source, /spawn\(/);
  assert.match(source, /shell: false/);
  const forbiddenExecutionMarkers = [
    ['spawn', 'Sync'].join(''),
    ['exec', 'Sync'].join(''),
    ['child_process', '.exec'].join(''),
    ['shell', ':\\s*true'].join(''),
    ['Power', 'Shell'].join(''),
    ['Execution', 'Policy'].join(''),
    ['inspection', '_timed', '_out'].join(''),
  ];
  assert.doesNotMatch(source, new RegExp(forbiddenExecutionMarkers.join('|')));
  const developmentAssignment = ['ANANKE_DEVELOPMENT_MODE', '\\s*[:=]\\s*[\'\"]', 'true', '[\'\"]'].join('');
  assert.doesNotMatch(source, new RegExp(developmentAssignment));
  assert.match(source, /approvedIntegrationSha/);
  assert.match(source, /integrationExecutionCheckpoint/);
  assert.match(source, /LIVE NEGATIVE INDUCTION AGAINST SCRATCH INSPECTION ENDPOINT/);
  assert.doesNotMatch(source, /integration:\s*[\'\"]07ec80aabe2c62baaa776857fbcefafd154a74d7/);
  assert.doesNotMatch(source, /fates-slice03a-live-acceptance\.mjs[\'\"]\s*\]/);
});
