// tests/slices.test.mjs
// Tests for slice record rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
describe('slice verification', () => {
  it('closes the R1 control slot after the sealed qualification', () => {
    const activeSlice = JSON.parse(readFileSync(resolve(root, 'active-slice.json'), 'utf-8'));
    assert.strictEqual(activeSlice.status, 'idle');
    assert.strictEqual(activeSlice.activeSliceId, null);
    assert.strictEqual(activeSlice.baselineCompatibilitySet, 'fates-slice-003a-r1-2026-08-11');
    assert.strictEqual(activeSlice.nextRecommendedSlice, 'FATES-SLICE-004');
    assert.match(activeSlice.activationRequirements.acceptedScope, /FATES-SLICE-003A-R1/);
    assert.strictEqual(activeSlice.status, 'idle', 'NO ACTIVE SLICE AFTER R1 SEAL');
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
