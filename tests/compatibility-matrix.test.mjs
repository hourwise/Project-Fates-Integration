// tests/compatibility-matrix.test.mjs
// Tests for compatibility-matrix.json verification rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('compatibility-matrix verification', () => {
  const matrix = JSON.parse(readFileSync(resolve(root, 'compatibility-matrix.json'), 'utf-8'));
  const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

  it('Stage-A matrix row matches fates-lock', () => {
    const stageA = matrix.rows.find(r => r.sliceId === 'FATES-SLICE-001');
    assert.ok(stageA, 'FATES-SLICE-001 row must exist');
    assert.strictEqual(stageA.compatibilitySet, lock.compatibilitySetId);

    // Check each repository in the row against the lock
    for (const [name, repo] of Object.entries(stageA.repositories)) {
      const lockRepo = lock.repositories[name];
      assert.ok(lockRepo, `${name} must exist in fates-lock.json`);
      assert.strictEqual(repo.commit, lockRepo.commit, `${name} commit mismatch`);
      assert.strictEqual(repo.tag, lockRepo.tag, `${name} tag mismatch`);
      assert.strictEqual(repo.checkpointState, lockRepo.checkpointState, `${name} checkpointState mismatch`);
    }
  });

  it('duplicate slice ID rejected', () => {
    const ids = matrix.rows.map(r => r.sliceId);
    const unique = new Set(ids);
    assert.strictEqual(ids.length, unique.size, 'slice IDs must be unique');
  });

  it('planned rows cannot claim commits', () => {
    for (const row of matrix.rows) {
      if (row.status === 'planned') {
        assert.strictEqual(row.repositories, undefined, `${row.sliceId}: planned row must not have repositories`);
        assert.strictEqual(row.compatibilitySet, undefined, `${row.sliceId}: planned row must not have compatibilitySet`);
      }
    }
  });
});
