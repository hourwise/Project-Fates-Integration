import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  CANONICAL_SLICE_ID_PATTERN,
  SUBSLICE_ID_PATTERN,
  parentSliceIdForSubslice,
  verifySlices,
} from '../scripts/verify-slices.mjs';
import {
  createSchemaValidators,
  validateDocument,
  repositoryRoot,
} from '../scripts/validate-json.mjs';

const validators = createSchemaValidators(repositoryRoot);

const baseActive = {
  status: 'active',
  activeSliceId: 'FATES-SLICE-004',
  activeSubsliceId: 'FATES-SLICE-004A',
};

const baseSubslice = {
  subsliceId: 'FATES-SLICE-004A',
  parentSliceId: 'FATES-SLICE-004',
  implementationStatus: 'planned',
  sealStatus: 'provisional',
  prerequisites: ['R1'],
  activation: { state: 'ready_for_activation' },
};

function runSynthetic({ active = baseActive, canonicalIds = ['FATES-SLICE-001', 'FATES-SLICE-004'], children = [baseSubslice] } = {}) {
  const root = mkdtempSync(resolve(tmpdir(), 'fates-subslice-test-'));
  try {
    writeFileSync(resolve(root, 'active-slice.json'), JSON.stringify(active));
    for (const canonicalId of canonicalIds) {
      const number = canonicalId.match(/\d{3}$/)?.[0];
      const directory = canonicalId === 'FATES-SLICE-001'
        ? '001-stage-a-adoption'
        : `${number}-test`;
      const path = resolve(root, 'slices', directory);
      mkdirSync(path, { recursive: true });
      writeFileSync(resolve(path, 'slice.json'), JSON.stringify({
        sliceId: canonicalId,
        implementationStatus: canonicalId === 'FATES-SLICE-001' ? 'completed' : 'planned',
      }));
    }
    for (const [index, child] of children.entries()) {
      const path = resolve(root, 'slices', '004-test', 'subslices', `${index}-${child.subsliceId}`);
      mkdirSync(path, { recursive: true });
      writeFileSync(resolve(path, 'subslice.json'), JSON.stringify(child));
    }
    return verifySlices(root).errors;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('bounded sub-slice control state', () => {
  it('accepts a valid numeric owner and ready-for-activation child', () => {
    assert.deepEqual(runSynthetic(), []);
  });

  it('accepts an active numeric owner without a child', () => {
    assert.deepEqual(runSynthetic({
      active: { status: 'active', activeSliceId: 'FATES-SLICE-004', activeSubsliceId: null },
      children: [],
    }), []);
  });

  it('preserves backward-compatible idle state without the optional child field', () => {
    const historicalIdle = JSON.parse(readFileSync(resolve(repositoryRoot, 'active-slice.json'), 'utf-8'));
    delete historicalIdle.activeSubsliceId;
    const result = validateDocument(validators, 'active-slice', historicalIdle);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.deepEqual(runSynthetic({
      active: { status: 'idle', activeSliceId: null },
      children: [],
    }), []);
  });

  it('rejects a child whose owner differs from the active canonical owner', () => {
    const wrongParent = { ...baseSubslice, parentSliceId: 'FATES-SLICE-003' };
    const errors = runSynthetic({ children: [wrongParent], canonicalIds: ['FATES-SLICE-001', 'FATES-SLICE-004', 'FATES-SLICE-003'] });
    assert.ok(errors.some((error) => error.includes('belongs to')));
    assert.ok(errors.some((error) => error.includes('declares parent')));
  });

  it('rejects active owner 004 with child 003A', () => {
    const errors = runSynthetic({
      active: { ...baseActive, activeSubsliceId: 'FATES-SLICE-003A' },
      canonicalIds: ['FATES-SLICE-001', 'FATES-SLICE-003', 'FATES-SLICE-004'],
      children: [{ ...baseSubslice, subsliceId: 'FATES-SLICE-003A', parentSliceId: 'FATES-SLICE-003' }],
    });
    assert.ok(errors.some((error) => error.includes('belongs to')));
  });

  it('rejects a child from a different numeric owner', () => {
    const errors = runSynthetic({
      active: { ...baseActive, activeSliceId: 'FATES-SLICE-003', activeSubsliceId: 'FATES-SLICE-004A' },
      canonicalIds: ['FATES-SLICE-001', 'FATES-SLICE-003', 'FATES-SLICE-004'],
    });
    assert.ok(errors.some((error) => error.includes('belongs to')));
  });

  it('rejects malformed child identifiers', () => {
    for (const id of ['FATES-SLICE-04A', 'FATES-SLICE-004AA', 'FATES-SLICE-004-foo', 'arbitrary']) {
      assert.equal(SUBSLICE_ID_PATTERN.test(id), false, id);
    }
    assert.equal(CANONICAL_SLICE_ID_PATTERN.test('FATES-SLICE-004A'), false);
    assert.equal(parentSliceIdForSubslice('FATES-SLICE-004A'), 'FATES-SLICE-004');
    assert.equal(parentSliceIdForSubslice('FATES-SLICE-004AA'), null);
  });

  it('fails closed for missing and duplicate registered children', () => {
    const missing = runSynthetic({ children: [] });
    assert.ok(missing.some((error) => error.includes('exactly one registered record')));

    const duplicate = runSynthetic({ children: [baseSubslice, baseSubslice] });
    assert.ok(duplicate.some((error) => error.includes('Duplicate sub-slice ID')));
    assert.ok(duplicate.some((error) => error.includes('exactly one registered record')));
  });

  it('enforces idle and active owner invariants', () => {
    const idle = runSynthetic({ active: { status: 'idle', activeSliceId: null, activeSubsliceId: 'FATES-SLICE-004A' }, children: [] });
    assert.ok(idle.some((error) => error.includes('activeSubsliceId is not null')));

    const unresolvedOwner = runSynthetic({
      active: { status: 'active', activeSliceId: 'FATES-SLICE-009', activeSubsliceId: null },
      children: [],
    });
    assert.ok(unresolvedOwner.some((error) => error.includes('exactly one canonical slice record')));

    const nullParent = runSynthetic({
      children: [{ ...baseSubslice, parentSliceId: null }],
    });
    assert.ok(nullParent.some((error) => error.includes('parentSliceId')));
  });

  it('validates a complete proposed 004A record with the dedicated schema', () => {
    const result = validateDocument(
      validators,
      'subslice',
      {
        ...baseSubslice,
        title: 'Durable governed-effect lifecycle',
        objective: 'Bounded objective',
        owners: ['Ananke'],
        components: ['Integration'],
        prerequisites: ['R1'],
        scope: ['durability'],
        nonScope: ['003B'],
        requirements: ['POST004-01'],
        activation: {
          state: 'ready_for_activation',
          ownerDecision: 'Separate activation required',
          baselineCompatibilitySet: 'fates-slice-003a-r1-2026-08-11',
        },
      },
    );
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  });
});
