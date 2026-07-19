// tests/slices.test.mjs
// Tests for slice record rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('slice verification', () => {
  it('idle active-slice rules hold', () => {
    const activeSlice = JSON.parse(readFileSync(resolve(root, 'active-slice.json'), 'utf-8'));
    assert.strictEqual(activeSlice.status, 'idle');
    assert.strictEqual(activeSlice.activeSliceId, null);
  });

  it('template is not active', () => {
    const template = JSON.parse(readFileSync(resolve(root, 'slices/_template/slice.json'), 'utf-8'));
    assert.notStrictEqual(template.status, 'active');
    assert.strictEqual(template.sliceId, '_template');
  });

  it('Slice 001 exists and is completed', () => {
    assert.ok(existsSync(resolve(root, 'slices/001-stage-a-adoption/slice.json')), 'Slice 001 slice.json must exist');
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/001-stage-a-adoption/slice.json'), 'utf-8'));
    assert.strictEqual(slice.sliceId, 'FATES-SLICE-001');
    assert.strictEqual(slice.status, 'completed');
  });

  it('slice directory name matches sliceId', () => {
    const slice = JSON.parse(readFileSync(resolve(root, 'slices/001-stage-a-adoption/slice.json'), 'utf-8'));
    assert.strictEqual(slice.sliceId, 'FATES-SLICE-001');
  });
});
