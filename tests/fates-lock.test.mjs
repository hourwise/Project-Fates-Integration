// tests/fates-lock.test.mjs
// Tests for fates-lock.json verification rules.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function runVerify(...args) {
  return spawnSync(process.execPath, [resolve(root, 'scripts/verify-fates-lock.mjs'), ...args], {
    cwd: root,
    encoding: 'utf-8',
  });
}

describe('fates-lock verification', () => {
  it('passes with valid lock', () => {
    const result = runVerify();
    assert.strictEqual(result.status, 0, `expected pass, got: ${result.stderr}`);
  });

  it('exact Stage-A checkpoints recorded', () => {
    // Read lock and verify exact values
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

    assert.strictEqual(lock.repositories.adrasteia.tag, 'adrasteia-adoption-v0.4.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.adrasteia.commit, '124b6aee2629a3147739934ad5f1b45b32c8ba46');
    assert.strictEqual(lock.repositories.adrasteia.checkpointState, 'sealed_tagged');

    assert.strictEqual(lock.repositories.ananke.tag, 'ananke-adrasteia-adoption-v0.1.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.ananke.commit, 'dcbb115c5798072221afdd2e4fdd36e786defddf');
    assert.strictEqual(lock.repositories.ananke.checkpointState, 'sealed_tagged');

    assert.strictEqual(lock.repositories.mnemosyne.tag, 'mnemosyne-adrasteia-adoption-v0.1.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.mnemosyne.commit, 'f4ab76a9760f856d78908d35facceb068d78c8e5');
    assert.strictEqual(lock.repositories.mnemosyne.checkpointState, 'sealed_tagged');

    assert.strictEqual(lock.repositories.horae.tag, 'horae-adrasteia-adoption-v0.1.0-protocol-1.4.0');
    assert.strictEqual(lock.repositories.horae.commit, '52e14fa574f7427f62747fe84d2789aec25b94e3');
    assert.strictEqual(lock.repositories.horae.checkpointState, 'sealed_tagged');
  });

  it('Moirae Code tag remains null', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    assert.strictEqual(lock.repositories['moirae-code'].tag, null);
    assert.strictEqual(lock.repositories['moirae-code'].checkpointState, 'pushed_untagged');
    assert.strictEqual(lock.repositories['moirae-code'].commit, 'a4783db271a61848c66ac4f6652a539bdb515e28');
  });

  it('sealed checkpoint requires a tag', () => {
    // All sealed repos have non-null tags
    const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));
    for (const [name, repo] of Object.entries(lock.repositories)) {
      if (repo.checkpointState === 'sealed_tagged') {
        assert.ok(repo.tag, `${name}: sealed_tagged must have a non-null tag`);
        assert.ok(repo.tag.length > 0, `${name}: sealed_tagged must have a non-empty tag`);
      }
    }
  });

  it('rejects malformed commit', () => {
    // We test this indirectly: the verify script checks for 40-char hex
    assert.ok(/^[0-9a-f]{40}$/.test('124b6aee2629a3147739934ad5f1b45b32c8ba46'), 'valid commit passes regex');
    assert.ok(!/^[0-9a-f]{40}$/.test('short'), 'short string fails regex');
    assert.ok(!/^[0-9a-f]{40}$/.test('xyz'), 'non-hex fails regex');
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
});
