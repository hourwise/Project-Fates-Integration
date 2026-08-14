import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSchemaValidators,
  repositoryRoot,
  validateDocument,
} from '../scripts/validate-json.mjs';
import {
  deriveSubsliceTag,
  expectedSubsliceSealPath,
  validateActiveSubsliceState,
  verifySubsliceSealRecords,
} from '../scripts/verify-slices.mjs';

const validators = createSchemaValidators(repositoryRoot);
const childId = 'FATES-SLICE-123B';
const parentId = 'FATES-SLICE-123';

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
}

function writeAttempt(root, attemptId, classification) {
  const evidencePath = `docs/evidence/${childId}-live-acceptance-attempt-${attemptId}.json`;
  const journalPath = `docs/evidence/${childId}-live-acceptance-attempt-${attemptId}.events.ndjson`;
  writeFileSync(resolve(root, evidencePath), JSON.stringify({
    attemptId,
    subsliceId: childId,
    classification,
  }));
  writeFileSync(resolve(root, journalPath), JSON.stringify({
    event: 'progress',
    lifecycle: 'terminal',
    classification,
  }) + '\n');
  return {
    attemptId,
    classification,
    evidencePath,
    evidenceSha256: digest(resolve(root, evidencePath)),
    journalPath,
    journalSha256: digest(resolve(root, journalPath)),
  };
}

function syntheticSeal(root, overrides = {}) {
  const historical = writeAttempt(root, '005', 'FAIL_BOUNDED');
  const successful = writeAttempt(root, '006', 'PASS_BOUNDED');
  return {
    $schema: '../../schemas/subslice-seal.schema.json',
    schemaVersion: 1,
    subsliceId: childId,
    parentSliceId: parentId,
    sealedAt: '2026-08-14T10:00:00.000Z',
    classification: 'PASS_BOUNDED',
    acceptance: {
      successfulAttempt: successful,
      historicalAttempts: [historical],
    },
    provenance: {
      integrationCommit: 'a'.repeat(40),
      components: {
        integration: { commit: 'a'.repeat(40) },
        ananke: { commit: 'b'.repeat(40), tag: 'ananke-test-v0.1.0' },
      },
    },
    validation: {
      fullValidation: { status: 'passed', command: 'npm run validate' },
      ci: {
        runId: 123,
        commit: 'c'.repeat(40),
        status: 'completed',
        conclusion: 'success',
      },
    },
    tag: {
      name: deriveSubsliceTag(childId, '0.1.0', '1.4.0'),
      releaseVersion: '0.1.0',
      protocol: '1.4.0',
    },
    ...overrides,
  };
}

function syntheticRoot({ sealOverrides = {}, childOverrides = {}, matrixRows = [] } = {}) {
  const root = resolve(tmpdir(), `fates-subslice-seal-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(resolve(root, 'slices', '123-test', 'subslices', '0-child'), { recursive: true });
  mkdirSync(resolve(root, 'docs', 'evidence'), { recursive: true });
  writeFileSync(resolve(root, 'slices', '123-test', 'slice.json'), JSON.stringify({
    sliceId: parentId,
    implementationStatus: 'planned',
    sealStatus: 'provisional',
  }));
  writeFileSync(resolve(root, 'active-slice.json'), JSON.stringify({
    status: 'active',
    activeSliceId: parentId,
    activeSubsliceId: null,
  }));
  const seal = syntheticSeal(root, sealOverrides);
  const sealPath = expectedSubsliceSealPath(childId);
  writeFileSync(resolve(root, sealPath), JSON.stringify(seal));
  writeFileSync(
    resolve(root, 'slices', '123-test', 'subslices', '0-child', 'subslice.json'),
    JSON.stringify({
      subsliceId: childId,
      parentSliceId: parentId,
      implementationStatus: 'completed',
      sealStatus: 'sealed',
      title: 'Synthetic child',
      objective: 'Synthetic objective',
      owners: ['Integration'],
      components: ['Integration'],
      prerequisites: ['baseline'],
      scope: ['bounded'],
      nonScope: ['next child'],
      requirements: ['REQ-1'],
      activation: {
        state: 'closed',
        ownerDecision: 'separate authorization',
        baselineCompatibilitySet: 'baseline',
      },
      sealRecord: sealPath,
      ...childOverrides,
    }),
  );
  if (matrixRows.length > 0) {
    writeFileSync(resolve(root, 'compatibility-matrix.json'), JSON.stringify({ rows: matrixRows }));
  }
  return { root, seal, sealPath };
}

function withSynthetic(options, callback) {
  const fixture = syntheticRoot(options);
  try {
    return callback(fixture);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

test('existing provisional 004A remains valid without a seal record', () => {
  const current = JSON.parse(readFileSync(resolve(repositoryRoot, 'slices/004-governed-execution/subslices/004A-durable-governed-effect-lifecycle/subslice.json'), 'utf8'));
  const result = validateDocument(validators, 'subslice', current);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(current.sealStatus, 'provisional');
  assert.equal(existsSync(resolve(repositoryRoot, 'docs/evidence/FATES-SLICE-004A-seal.json')), false);
});

test('valid sealed letter-qualified sub-slice passes and leaves parent open', () => {
  withSynthetic({}, ({ root, seal }) => {
    const schemaResult = validateDocument(validators, 'subslice-seal', seal);
    assert.equal(schemaResult.valid, true, JSON.stringify(schemaResult.errors));
    assert.deepEqual(verifySubsliceSealRecords(root), []);
    const parent = JSON.parse(readFileSync(resolve(root, 'slices/123-test/slice.json'), 'utf8'));
    assert.equal(parent.implementationStatus, 'planned');
    assert.equal(parent.sealStatus, 'provisional');
  });
});

test('sealed sub-slice requires complete final seal evidence', () => {
  withSynthetic({ sealOverrides: { acceptance: { historicalAttempts: [] } } }, ({ root, seal }) => {
    const schemaResult = validateDocument(validators, 'subslice-seal', seal);
    assert.equal(schemaResult.valid, false);
    assert.ok(schemaResult.errors.some((error) => error.instancePath.includes('/acceptance')));
    rmSync(resolve(root, 'docs/evidence/FATES-SLICE-123B-seal.json'));
    assert.ok(verifySubsliceSealRecords(root).some((error) => error.includes('seal record is missing')));
  });
});

test('seal record rejects parent mismatch and evidence attempt/hash mismatch', () => {
  withSynthetic({ sealOverrides: { parentSliceId: 'FATES-SLICE-122' } }, ({ root }) => {
    assert.ok(verifySubsliceSealRecords(root).some((error) => error.includes('parentSliceId mismatch')));
  });
  withSynthetic({}, ({ root, seal, sealPath }) => {
    seal.acceptance.successfulAttempt.attemptId = '005';
    writeFileSync(resolve(root, sealPath), JSON.stringify(seal));
    assert.ok(verifySubsliceSealRecords(root).some((error) => error.includes('evidence attemptId does not match')));
  });
  withSynthetic({ sealOverrides: { acceptance: { successfulAttempt: { attemptId: '005', classification: 'PASS_BOUNDED', evidencePath: 'docs/evidence/missing.json', evidenceSha256: 'A'.repeat(64), journalPath: 'docs/evidence/missing.events.ndjson', journalSha256: 'A'.repeat(64) }, historicalAttempts: [] } } }, ({ root }) => {
    const errors = verifySubsliceSealRecords(root);
    assert.ok(errors.some((error) => error.includes('referenced evidence or journal is missing')));
  });
  withSynthetic({}, ({ root, seal, sealPath }) => {
    seal.acceptance.successfulAttempt.evidenceSha256 = 'A'.repeat(64);
    writeFileSync(resolve(root, sealPath), JSON.stringify(seal));
    assert.ok(verifySubsliceSealRecords(root).some((error) => error.includes('evidence SHA-256 mismatch')));
  });
});

test('malformed seal metadata is rejected by the dedicated schema', () => {
  withSynthetic({ sealOverrides: { tag: { name: 'not-a-sub-slice-tag', releaseVersion: '0.1.0', protocol: '1.4.0' } } }, ({ seal }) => {
    const result = validateDocument(validators, 'subslice-seal', seal);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.instancePath.includes('/tag/name')));
  });
});

test('failed-only acceptance history cannot satisfy a seal', () => {
  withSynthetic({ sealOverrides: { acceptance: { successfulAttempt: { attemptId: '005', classification: 'FAIL_BOUNDED', evidencePath: 'docs/evidence/FATES-SLICE-123B-live-acceptance-attempt-005.json', evidenceSha256: '0'.repeat(64), journalPath: 'docs/evidence/FATES-SLICE-123B-live-acceptance-attempt-005.events.ndjson', journalSha256: '0'.repeat(64) }, historicalAttempts: [] } } }, ({ root }) => {
    const errors = verifySubsliceSealRecords(root);
    assert.ok(errors.some((error) => error.includes('successful acceptance basis must be PASS_BOUNDED')));
  });
});

test('sub-slice seals do not duplicate the compatibility matrix', () => {
  withSynthetic({ matrixRows: [{ sliceId: childId }] }, ({ root }) => {
    assert.ok(verifySubsliceSealRecords(root).some((error) => error.includes('must not be a matrix peer')));
  });
});

test('sealed child is not active, while the open parent may remain active', () => {
  const canonical = [{ slice: { sliceId: parentId } }];
  const sealedChild = [{ subslice: { subsliceId: childId, parentSliceId: parentId, implementationStatus: 'completed', sealStatus: 'sealed', activation: { state: 'closed' }, prerequisites: ['baseline'] } }];
  assert.deepEqual(
    validateActiveSubsliceState({ status: 'active', activeSliceId: parentId, activeSubsliceId: null }, canonical, sealedChild),
    [],
  );
  assert.ok(
    validateActiveSubsliceState({ status: 'active', activeSliceId: parentId, activeSubsliceId: childId }, canonical, sealedChild)
      .some((error) => error.includes('not eligible')),
  );
});

test('a later sibling remains uncreated and unauthorized', () => {
  const active = JSON.parse(readFileSync(resolve(repositoryRoot, 'active-slice.json'), 'utf8'));
  assert.equal(active.activeSliceId, 'FATES-SLICE-004');
  assert.equal(active.activeSubsliceId, 'FATES-SLICE-004A');
  assert.equal(
    existsSync(resolve(repositoryRoot, 'slices/004-governed-execution/subslices/004B-durable-governed-effect-lifecycle/subslice.json')),
    false,
  );
});

test('tag derivation is generic and version/protocol-driven', () => {
  assert.equal(
    deriveSubsliceTag('FATES-SLICE-004A', '0.1.0', '1.4.0'),
    'fates-slice-004a-v0.1.0-protocol-1.4.0',
  );
  assert.equal(
    deriveSubsliceTag(childId, '2.3.4', '9.8.7'),
    'fates-slice-123b-v2.3.4-protocol-9.8.7',
  );
});

test('legacy numeric slice schema remains valid', () => {
  for (const path of [
    'slices/002-governed-action-handoff/slice.json',
    'slices/003-constrained-host-route/slice.json',
  ]) {
    const data = JSON.parse(readFileSync(resolve(repositoryRoot, path), 'utf8'));
    const result = validateDocument(validators, 'slice', data);
    assert.equal(result.valid, true, `${path}: ${JSON.stringify(result.errors)}`);
  }
});
