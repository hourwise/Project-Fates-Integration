import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REQUIRED_BASE_URL, evaluateSecuritySpecialCase } from '../scripts/fates-slm.mjs';
import { resolveSlmCandidate } from '../scripts/fates-slm-candidate.mjs';
import { findSecurityFailures, validateSlmEvidence } from '../scripts/validate-slm-evidence.mjs';

test('negative-control detector fires on an insecure security-special outcome and blocks certification', async () => {
  const insecureCase = { scenario: 'surface-mutation' };
  assert.equal(evaluateSecuritySpecialCase(insecureCase, { mutation: { state: 'ADMITTED' } }), false);
  assert.equal(evaluateSecuritySpecialCase(insecureCase, { mutation: { state: 'QUARANTINED' } }), true);

  const candidate = resolveSlmCandidate({ verifyCheckouts: false });
  const output = await mkdtemp(join(tmpdir(), 'fates-slm-negative-control-'));
  const timestamp = '2026-08-25T20:30:00.000Z';
  const runId = 'slm-negative-control';
  const securityFail = {
    id: 'ADV-10',
    category: 'ADVERSARIAL',
    mode: 'GOVERNED',
    title: 'tampered surface incorrectly admitted',
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0,
    expected: 'quarantined',
    result: 'FAIL',
    observed: { governance: { state: 'ADMITTED' } },
    security: { wrongContentAdmission: true, failedOpen: true },
  };
  const manifest = {
    schemaVersion: '1.0',
    testSuiteVersion: 'test',
    runId,
    timestamp,
    os: 'test',
    architecture: 'x64',
    nodeVersion: 'v24',
    llamaCppEndpoint: REQUIRED_BASE_URL,
    requestedModelId: 'fixture',
    discoveredModelIds: ['fixture'],
    candidateId: candidate.candidateId,
    compatibilitySetId: candidate.compatibilitySetId,
    componentSHAs: candidate.componentSHAs,
    harnessCommit: candidate.harnessCommit,
    runtimeContractsArtifactSha256: candidate.runtimeContractsArtifactSha256,
    syntheticEffectsOnly: true,
  };
  const summary = {
    schemaVersion: '1.0',
    runId,
    suite: 'fault',
    caseCounts: { FAIL: 1 },
    usability: {},
    security: { securityFailure: true },
    timing: {},
    noRealHostEffects: true,
  };
  const timings = {
    schemaVersion: '1.0',
    runId,
    cases: [{ caseId: securityFail.id, providerModelMs: 0, proposalCaptureMs: 0, anankeMs: 0, horaeMs: 0, mnemosyneMs: 0, fatesGovernanceMs: 0, endToEndMs: 0 }],
  };
  await writeFile(join(output, 'run-manifest.json'), JSON.stringify(manifest));
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary));
  await writeFile(join(output, 'cases.jsonl'), `${JSON.stringify(securityFail)}\n`);
  await writeFile(join(output, 'timings.json'), JSON.stringify(timings));
  try {
    const result = validateSlmEvidence(output);
    assert.equal(findSecurityFailures(result.cases).length, 1);
    assert.equal(result.valid, false);
    assert.match(JSON.stringify(result.failures), /security FAIL/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('FRICTION remains distinct from a security FAIL', () => {
  assert.equal(findSecurityFailures([{ result: 'FRICTION', category: 'ADVERSARIAL', security: { failedOpen: true } }]).length, 0);
  assert.equal(findSecurityFailures([{ result: 'FAIL', category: 'ADVERSARIAL', security: { failedOpen: true } }]).length, 1);
});
