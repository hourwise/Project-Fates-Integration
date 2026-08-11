import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ACCEPTANCE_MATRIX,
  EVIDENCE_SCHEMA,
  ENV_ALLOWLISTS,
  RESIDUAL_LIMITATIONS,
  childEnvironment,
  runRedactionCanary,
  serializeEvidence,
} from '../scripts/fates-slice03a-r1-live-acceptance.mjs';

const root = resolve(import.meta.dirname, '..');
const driverPath = resolve(root, 'scripts/fates-slice03a-r1-live-acceptance.mjs');

test('R1 plan has the required bounded matrix and preparation-only evidence status', () => {
  assert.equal(EVIDENCE_SCHEMA.status, 'NOT_EXECUTED / PREPARATION ONLY');
  assert.equal(EVIDENCE_SCHEMA.evidencePath, 'docs/evidence/FATES-SLICE-003A-R1-live-acceptance-2026-08-11.json');
  assert.ok(EVIDENCE_SCHEMA.requiredTopLevel.includes('acceptanceDriverSha256'));
  assert.ok(EVIDENCE_SCHEMA.requiredTopLevel.includes('endpointSecurity'));
  assert.deepEqual(
    ACCEPTANCE_MATRIX.map((item) => item.id),
    ['positive-r1-v2', 'replay', 'wrong-audience', 'expired', 'legacy-v1', 'wrong-ananke-token', 'pre-dispatch-timeout', 'result-projection', 'restart-replay'],
  );
  assert.match(ACCEPTANCE_MATRIX.find((item) => item.id === 'pre-dispatch-timeout').expected, /timed_out \/ dispatch_not_attempted \/ HTTP 504/);
  assert.match(ACCEPTANCE_MATRIX.find((item) => item.id === 'legacy-v1').expected, /no v1 downgrade/);
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

test('synthetic random redaction canary passes through output, error, and evidence serialization', () => {
  assert.deepEqual(runRedactionCanary(), {
    passed: true,
    fields: ['stdout', 'stderr', 'error', 'evidence serialization'],
  });
  const canary = `synthetic-${randomUUID()}`;
  const serialized = serializeEvidence({ stdout: canary, stderr: canary, error: new Error(canary) }, [canary]);
  assert.equal(serialized.includes(canary), false);
  assert.match(serialized, /\[REDACTED\]/);
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
});
