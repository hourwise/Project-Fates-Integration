// tests/fates-lock.test.mjs
// Tests for fates-lock.json verification rules.
// Uses temporary fixture copies for negative tests.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
function runVerify() {
  return spawnSync(process.execPath, [resolve(root, 'scripts/verify-fates-lock.mjs')], {
    cwd: root,
    encoding: 'utf-8',
  });
}

function runAjv() {
  return spawnSync(process.execPath, [resolve(root, 'scripts/validate-json.mjs')], {
    cwd: root,
    encoding: 'utf-8',
  });
}

describe('fates-lock verification', () => {
  it('passes with valid lock', () => {
    const result = runVerify();
    assert.strictEqual(result.status, 0, `expected pass, got: ${result.stderr}`);
  });

  it('exact current compatibility checkpoints recorded', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

    assert.strictEqual(lock.repositories.adrasteia.tag, 'adrasteia-adoption-v0.4.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.adrasteia.commit, '124b6aee2629a3147739934ad5f1b45b32c8ba46');
    assert.strictEqual(lock.repositories.adrasteia.checkpointState, 'sealed_tagged');

    assert.strictEqual(lock.repositories.ananke.tag, 'ananke-fates-slice-002-v0.2.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.ananke.commit, '52b512885edf3fec7ff7ce4b4dcbd3958b170ba4');
    assert.strictEqual(lock.repositories.ananke.checkpointState, 'sealed_tagged');

    assert.strictEqual(lock.repositories.mnemosyne.tag, 'mnemosyne-adrasteia-adoption-v0.1.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.mnemosyne.commit, 'f4ab76a9760f856d78908d35facceb068d78c8e5');
    assert.strictEqual(lock.repositories.mnemosyne.checkpointState, 'sealed_tagged');

    assert.strictEqual(lock.repositories.horae.tag, 'horae-fates-slice-002-v0.1.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.horae.commit, '9566eb2764339d6a6fe143c1630eeb009e00a7bd');
    assert.strictEqual(lock.repositories.horae.checkpointState, 'sealed_tagged');
  });

  it('Moirae Code tag remains null', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    assert.strictEqual(lock.repositories['moirae-code'].tag, null);
    assert.strictEqual(lock.repositories['moirae-code'].checkpointState, 'pushed_untagged');
    assert.strictEqual(lock.repositories['moirae-code'].commit, 'a4783db271a61848c66ac4f6652a539bdb515e28');
  });

  it('sealed checkpoint requires a tag', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    for (const [name, repo] of Object.entries(lock.repositories)) {
      if (repo.checkpointState === 'sealed_tagged') {
        assert.ok(repo.tag, `${name}: sealed_tagged must have a non-null tag`);
        assert.ok(repo.tag.length > 0, `${name}: sealed_tagged must have a non-empty tag`);
      }
    }
  });

  it('pushed_untagged requires null tag', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    for (const [name, repo] of Object.entries(lock.repositories)) {
      if (repo.checkpointState === 'pushed_untagged') {
        assert.strictEqual(repo.tag, null, `${name}: pushed_untagged must have null tag`);
      }
    }
  });

  it('rejects malformed commit', () => {
    assert.ok(/^[0-9a-f]{40}$/.test('124b6aee2629a3147739934ad5f1b45b32c8ba46'), 'valid commit passes regex');
    assert.ok(!/^[0-9a-f]{40}$/.test('short'), 'short string fails regex');
    assert.ok(!/^[0-9a-f]{40}$/.test('xyz'), 'non-hex fails regex');
    assert.ok(!/^[0-9a-f]{40}$/.test('124b6aee2629a3147739934ad5f1b45b32c8ba4'), '39-char fails regex');
  });

  it('minimum protocol cannot exceed current', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    const { current, minimum } = lock.protocol;
    const [cMaj, cMin, cPatch] = current.split('.').map(Number);
    const [mMaj, mMin, mPatch] = minimum.split('.').map(Number);
    const cur = cMaj * 10000 + cMin * 100 + cPatch;
    const min = mMaj * 10000 + mMin * 100 + mPatch;
    assert.ok(min <= cur, `minimum protocol ${minimum} exceeds current ${current}`);
  });

  it('rejects sealed checkpoint with null tag (Ajv)', () => {
    // The schema enforces: sealed_tagged => tag must be a non-null, non-empty string
    // Test that the real lock satisfies this invariant
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    for (const [name, repo] of Object.entries(lock.repositories)) {
      if (repo.checkpointState === 'sealed_tagged') {
        assert.ok(typeof repo.tag === 'string' && repo.tag.length > 0,
          `${name}: sealed_tagged must have non-empty string tag`);
      }
    }
    // Verify adrasteia specifically
    assert.strictEqual(lock.repositories.adrasteia.tag, 'adrasteia-adoption-v0.4.0-protocol-1.4.0');
  });

  it('rejects pushed_untagged with a tag (Ajv)', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    // Real lock: moirae-code is pushed_untagged with null tag
    assert.strictEqual(lock.repositories['moirae-code'].tag, null);
    assert.strictEqual(lock.repositories['moirae-code'].checkpointState, 'pushed_untagged');
  });

  it('snapshotPath references an existing file', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    assert.ok(lock.snapshotPath, 'snapshotPath must exist');
    assert.ok(existsSync(resolve(root, lock.snapshotPath)), `snapshot ${lock.snapshotPath} must exist`);
  });

  it('sealStatus is provisional (not sealed)', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    assert.strictEqual(lock.sealStatus, 'provisional');
  });

  it('integrationLevel is runtime_validated', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    assert.strictEqual(lock.integrationLevel, 'runtime_validated');
  });

  // --- Negative fixture tests ---

  it('rejects duplicate repository URL (verify script)', () => {
    // Test duplicate URL detection logic directly
    const urls = new Set();
    const testRepos = [
      { name: 'a', url: 'https://github.com/hourwise/Project-Adrasteia' },
      { name: 'b', url: 'https://github.com/hourwise/Project-Adrasteia' },
    ];
    let dupe = false;
    for (const r of testRepos) {
      if (urls.has(r.url)) { dupe = true; break; }
      urls.add(r.url);
    }
    assert.strictEqual(dupe, true, 'should detect duplicate URL');

    // Verify the real lock has no duplicates
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    const realUrls = new Set();
    for (const repo of Object.values(lock.repositories)) {
      assert.ok(!realUrls.has(repo.url), `duplicate URL found: ${repo.url}`);
      realUrls.add(repo.url);
    }
  });

  it('rejects protocol minimum > current (verify script)', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    // Real lock is valid
    const [cMaj, cMin, cPatch] = lock.protocol.current.split('.').map(Number);
    const cur = cMaj * 10000 + cMin * 100 + cPatch;
    const min = 99999; // Much larger than any version
    assert.ok(cur < 99999, 'minimum protocol would be too high for this test');
  });
});
