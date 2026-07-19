// tests/compatibility-matrix.test.mjs
// Tests for compatibility-matrix.json verification rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
function runVerify() {
  return spawnSync(process.execPath, [resolve(root, 'scripts/verify-compatibility-matrix.mjs')], {
    cwd: root,
    encoding: 'utf-8',
  });
}

describe('compatibility-matrix verification', () => {
  const matrix = JSON.parse(readFileSync(resolve(root, 'compatibility-matrix.json'), 'utf-8'));
  const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

  it('passes verification', () => {
    const result = runVerify();
    assert.strictEqual(result.status, 0, `expected pass: ${result.stderr}`);
  });

  it('Stage-A matrix row matches fates-lock', () => {
    const stageA = matrix.rows.find(r => r.sliceId === 'FATES-SLICE-001');
    assert.ok(stageA, 'FATES-SLICE-001 row must exist');
    assert.strictEqual(stageA.compatibilitySet, lock.compatibilitySetId);
    assert.strictEqual(stageA.implementationStatus, 'completed');
    assert.strictEqual(stageA.sealStatus, 'provisional');
    assert.strictEqual(stageA.integrationLevel, 'inspection_only');

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
      if (row.implementationStatus === 'planned') {
        assert.strictEqual(row.repositories, undefined, `${row.sliceId}: planned row must not have repositories`);
        assert.strictEqual(row.compatibilitySet, undefined, `${row.sliceId}: planned row must not have compatibilitySet`);
        assert.strictEqual(row.explicitLimits, undefined, `${row.sliceId}: planned row must not have explicitLimits`);
      }
    }
  });

  it('completed rows have integrationLevel', () => {
    for (const row of matrix.rows) {
      if (row.implementationStatus === 'completed') {
        assert.ok(row.integrationLevel, `${row.sliceId}: completed row must have integrationLevel`);
        assert.ok(row.compatibilitySet, `${row.sliceId}: completed row must have compatibilitySet`);
      }
    }
  });

  it('no planned row claims implementationStatus completed', () => {
    for (const row of matrix.rows) {
      if (row.implementationStatus === 'planned') {
        assert.notStrictEqual(row.implementationStatus, 'completed');
      }
    }
  });

  // Negative tests

  it('rejects duplicate sliceId in fixture', () => {
    const dup = { compatibilitySetId: 'test', rows: [
      { sliceId: 'FATES-SLICE-001', title: 'A', implementationStatus: 'planned', sealStatus: 'provisional' },
      { sliceId: 'FATES-SLICE-001', title: 'B', implementationStatus: 'planned', sealStatus: 'provisional' },
    ]};
    const ids = dup.rows.map(r => r.sliceId);
    const unique = new Set(ids);
    assert.notStrictEqual(ids.length, unique.size, 'duplicate should be detected');
  });

  it('rejects planned row with repositories', () => {
    const plannedWithRepos = matrix.rows.find(r => r.implementationStatus === 'planned' && r.repositories);
    assert.strictEqual(plannedWithRepos, undefined, 'no planned row should have repositories');
  });
});
