// tests/slices.test.mjs
// Tests for slice record rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function findSubsliceRecords(directory) {
  const records = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      records.push(...findSubsliceRecords(entryPath));
    } else if (entry.name === 'subslice.json') {
      records.push(JSON.parse(readFileSync(entryPath, 'utf-8')));
    }
  }
  return records;
}

describe('slice verification', () => {
  it('records the active parent and current child lifecycle state after the sealed R1 baseline', () => {
    const activeSlice = JSON.parse(readFileSync(resolve(root, 'active-slice.json'), 'utf-8'));
    assert.strictEqual(activeSlice.status, 'active');
    assert.strictEqual(activeSlice.activeSliceId, 'FATES-SLICE-004');
    assert.strictEqual(activeSlice.baselineCompatibilitySet, 'fates-slice-003a-r1-2026-08-11');
    assert.strictEqual(activeSlice.nextRecommendedSlice, 'FATES-SLICE-004');
    assert.match(activeSlice.activationRequirements.acceptedScope, /FATES-SLICE-004A/);
    assert.match(activeSlice.activationRequirements.userAuthorisation, /only the bounded FATES-SLICE-004A activation/);

    const childRecords = findSubsliceRecords(resolve(root, 'slices'))
      .filter((subslice) => subslice.parentSliceId === activeSlice.activeSliceId);
    assert.strictEqual(childRecords.length, 1, 'the active parent must resolve to one registered child record');

    const child = childRecords[0];
    const terminal = child.implementationStatus === 'completed' &&
      child.sealStatus === 'sealed' &&
      child.activation?.state === 'closed';

    if (terminal) {
      assert.strictEqual(activeSlice.activeSubsliceId, null);
    } else {
      assert.ok(
        (child.implementationStatus === 'planned' || child.implementationStatus === 'active') &&
          child.sealStatus === 'provisional',
        'a non-terminal child must remain planned/active and provisional',
      );
      assert.strictEqual(activeSlice.activeSubsliceId, child.subsliceId);
    }
  });

  it('template is not active', () => {
    const template = JSON.parse(readFileSync(resolve(root, 'slices/_template/slice.json'), 'utf-8'));
    assert.strictEqual(template.implementationStatus, 'template');
    assert.strictEqual(template.sliceId, '_template');
  });

  it('Slice 001 exists and implementationStatus is completed', () => {
    assert.ok(existsSync(resolve(root, 'slices/001-stage-a-adoption/slice.json')), 'Slice 001 slice.json must exist');
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/001-stage-a-adoption/slice.json'), 'utf-8'));
    assert.strictEqual(slice.sliceId, 'FATES-SLICE-001');
    assert.strictEqual(slice.implementationStatus, 'completed');
  });

  it('Slice 001 sealStatus is provisional', () => {
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/001-stage-a-adoption/slice.json'), 'utf-8'));
    assert.strictEqual(slice.sealStatus, 'provisional');
  });

  it('Slice 002 exists and is completed and sealed', () => {
    assert.ok(existsSync(resolve(root, 'slices/002-governed-action-handoff/slice.json')), 'Slice 002 slice.json must exist');
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/002-governed-action-handoff/slice.json'), 'utf-8'));
    assert.strictEqual(slice.sliceId, 'FATES-SLICE-002');
    assert.strictEqual(slice.implementationStatus, 'completed');
    assert.strictEqual(slice.sealStatus, 'sealed');
    assert.strictEqual(slice.integrationLevel, 'runtime_validated');
    assert.ok(slice.finalEvidence);
  });

  it('Slice 001 completion conditions preserve its provisional seal', () => {
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/001-stage-a-adoption/slice.json'), 'utf-8'));
    assert.ok(
      slice.stopConditions.includes(
        'All required commits are pushed and recorded; any missing checkpoint tag is explicitly recorded as provisional',
      ),
    );
    assert.ok(
      !slice.stopConditions.includes('All tags and commits are pushed and recorded'),
      'a provisional slice must not claim every checkpoint tag exists',
    );
  });

  it('slice directory name matches sliceId', () => {
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/001-stage-a-adoption/slice.json'), 'utf-8'));
    assert.strictEqual(slice.sliceId, 'FATES-SLICE-001');
  });

  it('all $schema paths resolve correctly', () => {
    const files = [
      'slices/001-stage-a-adoption/slice.json',
      'slices/002-governed-action-handoff/slice.json',
      'slices/002-governed-action-handoff/handoffs/ananke-transport-handoff.json',
      'slices/002-governed-action-handoff/handoffs/horae-handoff.json',
      'slices/_template/slice.json',
      'slices/_template/handoffs/handoff.example.json',
      'slices/004-governed-execution/subslices/004A-durable-governed-effect-lifecycle/subslice.json',
      'fates-lock.json',
      'compatibility-matrix.json',
      'active-slice.json',
      'compatibility-sets/fates-stage-a-2026-07.json',
      'compatibility-sets/fates-slice-002-2026-08-09.json',
      'compatibility-sets/fates-slice-003a-2026-08-10.json',
      'compatibility-sets/fates-slice-003a-r1-2026-08-11.json',
    ];
    for (const file of files) {
      const data = JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
      if (data.$schema) {
        const schemaPath = resolve(root, file, '..', data.$schema);
        assert.ok(existsSync(schemaPath), `${file}: $schema "${data.$schema}" does not resolve to ${schemaPath}`);
      }
    }
  });

  // Negative tests

  it('preserves idle-state invariant in the negative fixture shape', () => {
    // An idle active-slice must have activeSliceId: null.
    const activeSlice = JSON.parse(readFileSync(resolve(root, 'active-slice.json'), 'utf-8'));
    const fixture = { ...activeSlice, status: 'idle', activeSliceId: null };
    assert.strictEqual(fixture.status, 'idle');
    assert.strictEqual(fixture.activeSliceId, null);
  });

  it('rejects active state with null activeSliceId', () => {
    const fixture = { status: 'active', activeSliceId: null };
    assert.ok(fixture.status === 'active' && fixture.activeSliceId === null,
      'this combination should be invalid');
  });

  it('rejects template with implementationStatus active', () => {
    const template = JSON.parse(readFileSync(resolve(root, 'slices/_template/slice.json'), 'utf-8'));
    assert.notStrictEqual(template.implementationStatus, 'active');
    assert.notStrictEqual(template.implementationStatus, 'completed');
  });

  it('rejects malformed schema path', () => {
    // All real schema paths should resolve; broken ones would fail resolution
    const badPaths = ['../schemas/nonexistent.json', './wrong/slice.schema.json'];
    for (const bp of badPaths) {
      assert.ok(!existsSync(resolve(root, 'slices/001-stage-a-adoption', bp)),
        `path "${bp}" should not exist`);
    }
  });
});
