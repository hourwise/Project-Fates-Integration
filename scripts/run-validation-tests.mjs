// Run validation tests in two deterministic cohorts.
// Ordinary tests retain node:test's normal concurrency. Tests that own child
// processes and local listeners run serially to avoid cross-file interference.

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const testsRoot = resolve(root, 'tests');

const processHeavyTests = new Set([
  'fates-slice04a-process-lifecycle.test.mjs',
  'fates-slice04a-real-child-restart.test.mjs',
  'fates-slice04a-receipt-sink.test.mjs',
]);

function collectTestFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.mjs')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function runTests(label, testFiles, extraArgs = []) {
  console.log(`\n--- ${label} (${testFiles.length} files) ---`);
  const result = spawnSync(process.execPath, ['--test', ...extraArgs, ...testFiles], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const testFiles = collectTestFiles(testsRoot);
const heavyTests = testFiles.filter((file) => processHeavyTests.has(basename(file)));
const ordinaryTests = testFiles.filter((file) => !processHeavyTests.has(basename(file)));

runTests('validation:ordinary-tests', ordinaryTests);
runTests('validation:process-heavy-tests', heavyTests, ['--test-concurrency=1']);
