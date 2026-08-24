import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { assertImplementationUnchanged } from '../scripts/verify-mvp-security-binding.mjs';

test('MVP security-binding candidate pins full remote SHAs and remains provisional', () => {
  const output = execFileSync(process.execPath, ['scripts/verify-mvp-security-binding.mjs'], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.result, 'passed');
  assert.equal(result.status, 'security_binding_incomplete');
});

test('implementation publication verification rejects a governed runtime change after the smoke commit', () => {
  const unchanged = assertImplementationUnchanged({
    integrationCommit: '8abc4337d5ac5eca651d1e382ce3a15ba051f0a2',
    implementationPaths: ['scripts/fates-governed-smoke.mjs'],
    changedPaths: [],
  });
  assert.deepEqual(unchanged.changedPaths, []);
  assert.throws(() => assertImplementationUnchanged({
    integrationCommit: '8abc4337d5ac5eca651d1e382ce3a15ba051f0a2',
    implementationPaths: ['scripts/fates-governed-smoke.mjs'],
    changedPaths: ['scripts/fates-governed-smoke.mjs'],
  }), /governed integration implementation changed/);
});
