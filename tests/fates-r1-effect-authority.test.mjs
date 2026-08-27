import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createControlledEffectSink } from '../scripts/fates-governed-smoke.mjs';

const temporaryPaths = [];

test.after(async () => {
  await Promise.all(temporaryPaths.map((path) => rm(path, { recursive: true, force: true })));
});

async function effectPath() {
  const root = await mkdtemp(join(tmpdir(), 'fates-r1-effect-authority-'));
  temporaryPaths.push(root);
  return join(root, 'effect.json');
}

test('the same authoritative ledger distinguishes confirmed, absent, and unknown evidence', async () => {
  const path = await effectPath();
  const effect = createControlledEffectSink(path);
  const authorityId = effect.authorityId;
  const effectId = 'effect:r1-authority';
  assert.equal(effect.reconcile(effectId, authorityId).status, 'ABSENT');
  effect.begin(effectId, 'digest:r1');
  effect.complete(effectId, { effectId, result: 'controlled-success' });
  assert.deepEqual(effect.reconcile(effectId, authorityId), { status: 'CONFIRMED', output: { effectId, result: 'controlled-success' } });
  assert.equal(effect.reconcile('effect:other', authorityId).status, 'ABSENT');
});

test('missing or replaced ledgers never become ABSENT for the old authority', async () => {
  const path = await effectPath();
  const original = createControlledEffectSink(path);
  const authorityId = original.authorityId;
  original.begin('effect:r1-missing', 'digest:r1');
  await rm(path);
  const missing = createControlledEffectSink(path);
  assert.notEqual(missing.authorityId, authorityId);
  assert.equal(missing.reconcile('effect:r1-missing', authorityId).status, 'UNKNOWN');
  const replacement = createControlledEffectSink(path);
  assert.notEqual(replacement.authorityId, authorityId);
  assert.equal(replacement.reconcile('effect:r1-missing', authorityId).status, 'UNKNOWN');
});

test('corrupt or checksum-invalid ledgers return UNKNOWN', async () => {
  const path = await effectPath();
  const effect = createControlledEffectSink(path);
  const authorityId = effect.authorityId;
  const document = JSON.parse(await readFile(path, 'utf8'));
  document.attempts += 1;
  await writeFile(path, JSON.stringify(document), 'utf8');
  assert.equal(effect.reconcile('effect:r1-corrupt', authorityId).status, 'UNKNOWN');
  await writeFile(path, '{not-json', 'utf8');
  assert.equal(effect.reconcile('effect:r1-corrupt', authorityId).status, 'UNKNOWN');
});
