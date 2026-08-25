import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_BASE_URL } from '../scripts/fates-slm.mjs';
import {
  candidateComponentPins,
  resolveSlmCandidate,
  verifySlmPeerHeads,
  verifySlmIntegrationCheckout,
} from '../scripts/fates-slm-candidate.mjs';
import {
  loadCurrentCandidate,
  validateCurrentCandidatePointer,
} from '../scripts/fates-checkout-current.mjs';
import { validateSlmEvidence } from '../scripts/validate-slm-evidence.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function candidateRoot({ pointer, manifest, includeManifest = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'fates-slm-candidate-'));
  await cp(join(repositoryRoot, 'schemas'), join(root, 'schemas'), { recursive: true });
  await mkdir(join(root, 'compatibility-sets'), { recursive: true });
  const currentPointer = pointer ?? JSON.parse(await readFile(join(repositoryRoot, 'current-candidate.json'), 'utf8'));
  await writeFile(join(root, 'current-candidate.json'), `${JSON.stringify(currentPointer, null, 2)}\n`);
  if (includeManifest) {
    const selectedManifest = manifest ?? JSON.parse(await readFile(join(repositoryRoot, currentPointer.manifest), 'utf8'));
    await writeFile(join(root, currentPointer.manifest), `${JSON.stringify(selectedManifest, null, 2)}\n`);
  }
  return root;
}

async function evidenceFixture(overrides = {}) {
  const candidate = resolveSlmCandidate({ verifyCheckouts: false });
  const output = await mkdtemp(join(tmpdir(), 'fates-slm-evidence-'));
  const timestamp = '2026-08-25T20:00:00.000Z';
  const manifest = {
    schemaVersion: '1.0',
    testSuiteVersion: 'test',
    runId: 'slm-candidate-test',
    timestamp,
    os: 'test',
    architecture: 'x64',
    nodeVersion: 'v24',
    cpuIdentifier: null,
    memoryBytes: 1,
    llamaCppEndpoint: REQUIRED_BASE_URL,
    requestedModelId: 'fixture',
    discoveredModelId: 'fixture',
    discoveredModelIds: ['fixture'],
    modelFileHash: null,
    candidateId: candidate.candidateId,
    compatibilitySetId: candidate.compatibilitySetId,
    componentSHAs: { ...candidate.componentSHAs },
    harnessCommit: candidate.harnessCommit,
    runtimeContractsArtifactSha256: candidate.runtimeContractsArtifactSha256,
    liveModelOptIn: false,
    syntheticEffectsOnly: true,
    ...overrides.manifest,
  };
  const summary = {
    schemaVersion: '1.0',
    runId: manifest.runId,
    suite: 'fault',
    generatedAt: timestamp,
    caseCounts: { PASS: 1 },
    usability: {},
    security: {},
    timing: {},
    noRealHostEffects: true,
    ...overrides.summary,
  };
  const caseRecord = {
    id: 'FLT-01',
    category: 'FAULT',
    mode: 'FAULT_INJECTION',
    title: 'fixture',
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0,
    expected: 'fixture',
    result: 'PASS',
    observed: {},
    ...overrides.caseRecord,
  };
  const timings = {
    schemaVersion: '1.0',
    runId: manifest.runId,
    cases: [{ caseId: caseRecord.id, providerModelMs: 0, proposalCaptureMs: 0, anankeMs: 0, horaeMs: 0, mnemosyneMs: 0, fatesGovernanceMs: 0, endToEndMs: 0 }],
  };
  await writeFile(join(output, 'run-manifest.json'), JSON.stringify(manifest));
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary));
  await writeFile(join(output, 'cases.jsonl'), `${JSON.stringify(caseRecord)}\n`);
  await writeFile(join(output, 'timings.json'), JSON.stringify(timings));
  return { output, candidate, manifest };
}

test('runner candidate resolution and validator candidate identity are identical', async () => {
  const candidate = resolveSlmCandidate({ verifyCheckouts: false });
  verifySlmPeerHeads(candidate);
  const fixture = await evidenceFixture();
  try {
    const result = validateSlmEvidence(fixture.output);
    assert.equal(result.valid, true, JSON.stringify(result.failures));
    assert.equal(result.manifest.candidateId, candidate.candidateId);
    assert.deepEqual(result.manifest.componentSHAs, candidate.componentSHAs);
    assert.equal(result.manifest.harnessCommit, candidate.harnessCommit);
  } finally {
    await rm(fixture.output, { recursive: true, force: true });
  }
});

test('predecessor and fake-looking peer SHAs fail closed', async () => {
  const cases = [
    ['mnemosyne', '932095aabcc7fb60b4af3f26a39e62fd02d907df'],
    ['horae', 'b5216534bee32467d17316dda5a86ff6484f1c4a'],
    ['ananke', '0000000000000000000000000000000000000001'],
  ];
  for (const [component, wrongSha] of cases) {
    const fixture = await evidenceFixture({ manifest: { componentSHAs: { ...resolveSlmCandidate({ verifyCheckouts: false }).componentSHAs, [component]: wrongSha } } });
    try {
      const result = validateSlmEvidence(fixture.output);
      assert.equal(result.valid, false, component);
      assert.match(JSON.stringify(result.failures), new RegExp(`componentSHAs\\.${component}`));
    } finally {
      await rm(fixture.output, { recursive: true, force: true });
    }
  }
});

test('candidate pointer and manifest failures are rejected before evidence validation', async () => {
  const validPointer = { candidate: 'fates-pre-qwen-security-2026-08-25', manifest: 'compatibility-sets/fates-pre-qwen-security-2026-08-25.json', status: 'provisional' };
  assert.throws(() => validateCurrentCandidatePointer({ ...validPointer, manifest: 'compatibility-sets/missing.json' }), /candidate-named/);

  const missingManifestRoot = await candidateRoot({ includeManifest: false });
  try {
    assert.throws(() => loadCurrentCandidate({ root: missingManifestRoot, schemaRoot: missingManifestRoot }), /cannot be read/);
  } finally {
    await rm(missingManifestRoot, { recursive: true, force: true });
  }

  const malformedRoot = await candidateRoot({ pointer: { candidate: 'FATES', manifest: 'wrong.json', status: 'sealed' }, includeManifest: false });
  try {
    assert.throws(() => loadCurrentCandidate({ root: malformedRoot, schemaRoot: malformedRoot }), /candidate is invalid/);
  } finally {
    await rm(malformedRoot, { recursive: true, force: true });
  }

  const currentManifest = JSON.parse(await readFile(join(repositoryRoot, validPointer.manifest), 'utf8'));
  delete currentManifest.repositories.mnemosyne;
  const missingPeerRoot = await candidateRoot({ manifest: currentManifest });
  try {
    assert.throws(() => loadCurrentCandidate({ root: missingPeerRoot, schemaRoot: missingPeerRoot }), /mnemosyne|repositories/);
  } finally {
    await rm(missingPeerRoot, { recursive: true, force: true });
  }
});

test('historical fates-lock disagreement cannot change the current candidate', async () => {
  const root = await candidateRoot();
  try {
    await writeFile(join(root, 'fates-lock.json'), JSON.stringify({ compatibilitySetId: 'fates-mvp-security-binding-2026-08-24', repositories: { mnemosyne: { commit: '932095aabcc7fb60b4af3f26a39e62fd02d907df' } } }));
    const selected = loadCurrentCandidate({ root, schemaRoot: root });
    assert.equal(selected.pointer.candidate, 'fates-pre-qwen-security-2026-08-25');
    assert.equal(selected.manifest.repositories.mnemosyne.commit, '24f8541ce0e0a2f56171544a249cff56e7b634d1');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wrong candidate identity and wrong peer evidence are rejected', async () => {
  const candidate = resolveSlmCandidate({ verifyCheckouts: false });
  const wrongCandidate = await evidenceFixture({ manifest: { candidateId: 'fates-mvp-security-binding-2026-08-24' } });
  const wrongPeer = await evidenceFixture({ manifest: { componentSHAs: { ...candidate.componentSHAs, horae: 'b5216534bee32467d17316dda5a86ff6484f1c4a' } } });
  try {
    assert.equal(validateSlmEvidence(wrongCandidate.output).valid, false);
    assert.equal(validateSlmEvidence(wrongPeer.output).valid, false);
  } finally {
    await rm(wrongCandidate.output, { recursive: true, force: true });
    await rm(wrongPeer.output, { recursive: true, force: true });
  }
});

test('dirty Integration checkout is rejected for certifiable SLM identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fates-slm-dirty-integration-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    execFileSync('git', ['-C', root, 'config', 'user.email', 'fates-test@example.invalid']);
    execFileSync('git', ['-C', root, 'config', 'user.name', 'Fates Test']);
    await writeFile(join(root, 'tracked.txt'), 'clean\n');
    execFileSync('git', ['-C', root, 'add', 'tracked.txt']);
    execFileSync('git', ['-C', root, 'commit', '-qm', 'fixture']);
    execFileSync('git', ['-C', root, 'remote', 'add', 'origin', 'https://github.com/hourwise/Project-Fates-Integration']);
    await writeFile(join(root, 'dirty.txt'), 'must reject\n');
    assert.throws(() => verifySlmIntegrationCheckout(root), /dirty/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('candidate component pins are derived from the manifest, not duplicated constants', () => {
  const candidate = resolveSlmCandidate({ verifyCheckouts: false });
  assert.deepEqual(candidate.componentSHAs, candidateComponentPins(candidate.manifest));
});
