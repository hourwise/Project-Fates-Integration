// scripts/validate.mjs
// Runs all validation steps including tests. Exits on first failure.
// Does not recurse: npm test runs node:test directly, not npm run validate.

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const steps = [
  { name: 'validate:json', script: 'scripts/validate-json.mjs' },
  { name: 'verify:lock', script: 'scripts/verify-fates-lock.mjs' },
  { name: 'verify:matrix', script: 'scripts/verify-compatibility-matrix.mjs' },
  { name: 'verify:slices', script: 'scripts/verify-slices.mjs' },
  { name: 'verify:boundaries', script: 'scripts/verify-boundaries.mjs' },
  { name: 'test', script: 'scripts/run-validation-tests.mjs' },
];

let failed = false;

for (const step of steps) {
  console.log(`\n--- ${step.name} ---`);
  let result;
  result = spawnSync(process.execPath, [resolve(root, step.script)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  console.error('\nValidation failed.');
  process.exit(1);
} else {
  console.log('\nAll validations passed.');
}
