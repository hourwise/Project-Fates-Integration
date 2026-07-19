// scripts/verify-compatibility-matrix.mjs
// Verifies compatibility matrix rules.
// Never accesses the network.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const matrix = JSON.parse(readFileSync(resolve(root, 'compatibility-matrix.json'), 'utf-8'));
const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

const errors = [];
const sliceIds = new Set();

for (const row of matrix.rows) {
  // Unique slice IDs
  if (sliceIds.has(row.sliceId)) {
    errors.push(`Duplicate slice ID: ${row.sliceId}`);
  }
  sliceIds.add(row.sliceId);

  // Planned rows must not contain invented checkpoints
  if (row.status === 'planned') {
    if (row.repositories) {
      errors.push(`${row.sliceId}: planned row must not contain repository checkpoints`);
    }
    if (row.compatibilitySet) {
      errors.push(`${row.sliceId}: planned row must not contain compatibility set`);
    }
    if (row.explicitLimits) {
      errors.push(`${row.sliceId}: planned row must not contain explicit limits`);
    }
  }

  // Stage-A row must reference the lock set
  if (row.sliceId === 'FATES-SLICE-001') {
    if (row.compatibilitySet !== lock.compatibilitySetId) {
      errors.push(`FATES-SLICE-001: compatibilitySet "${row.compatibilitySet}" does not match lock "${lock.compatibilitySetId}"`);
    }
    if (row.repositories) {
      for (const [name, repo] of Object.entries(row.repositories)) {
        const lockRepo = lock.repositories[name];
        if (!lockRepo) {
          errors.push(`FATES-SLICE-001: repository "${name}" not found in fates-lock.json`);
          continue;
        }
        if (repo.commit !== lockRepo.commit) {
          errors.push(`FATES-SLICE-001: ${name} commit mismatch — matrix "${repo.commit}", lock "${lockRepo.commit}"`);
        }
        if (repo.tag !== lockRepo.tag) {
          errors.push(`FATES-SLICE-001: ${name} tag mismatch — matrix "${repo.tag}", lock "${lockRepo.tag}"`);
        }
      }
    }
  }

  // Unknown status
  const validStatuses = ['planned', 'active', 'implemented_with_inspection_limits', 'completed', 'superseded'];
  if (!validStatuses.includes(row.status)) {
    errors.push(`${row.sliceId}: unknown status "${row.status}"`);
  }
}

if (errors.length > 0) {
  console.error('FAIL: compatibility-matrix.json verification failed.');
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
} else {
  console.log('PASS: compatibility-matrix.json verified.');
  console.log(`  Rows: ${matrix.rows.length}`);
}
