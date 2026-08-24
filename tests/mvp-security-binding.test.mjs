import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('MVP security-binding candidate pins full remote SHAs and remains provisional', () => {
  const output = execFileSync(process.execPath, ['scripts/verify-mvp-security-binding.mjs'], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.result, 'passed');
  assert.equal(result.status, 'security_binding_incomplete');
});
