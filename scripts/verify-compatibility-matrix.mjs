// scripts/verify-compatibility-matrix.mjs
// Verifies compatibility matrix rules using the two-axis status model.
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

const validImpl = ['planned', 'active', 'implemented', 'completed', 'superseded'];
const validSeal = ['provisional', 'sealed', 'superseded'];
const validLevel = ['inspection_only', 'partial_runtime', 'runtime_validated'];

for (const row of matrix.rows) {
  // Unique slice IDs
  if (sliceIds.has(row.sliceId)) {
    errors.push(`Duplicate slice ID: ${row.sliceId}`);
  }
  sliceIds.add(row.sliceId);

  // Slice ID format
  if (!/^FATES-SLICE-\d{3}$/.test(row.sliceId)) {
    errors.push(`${row.sliceId}: malformed slice ID`);
  }

  // Valid enums
  if (!validImpl.includes(row.implementationStatus)) {
    errors.push(`${row.sliceId}: unknown implementationStatus "${row.implementationStatus}"`);
  }
  if (!validSeal.includes(row.sealStatus)) {
    errors.push(`${row.sliceId}: unknown sealStatus "${row.sealStatus}"`);
  }
  if (row.integrationLevel !== null && !validLevel.includes(row.integrationLevel)) {
    errors.push(`${row.sliceId}: unknown integrationLevel "${row.integrationLevel}"`);
  }

  // Planned rows must not contain checkpoint evidence
  if (row.implementationStatus === 'planned') {
    if (row.repositories) {
      errors.push(`${row.sliceId}: planned row must not contain repository checkpoints`);
    }
    if (row.compatibilitySet) {
      errors.push(`${row.sliceId}: planned row must not contain a compatibility set`);
    }
    if (row.explicitLimits) {
      errors.push(`${row.sliceId}: planned row must not contain explicit limits`);
    }
  }

  // Completed/implemented rows must have compatibilitySet and integrationLevel
  if (row.implementationStatus === 'completed' || row.implementationStatus === 'implemented') {
    if (!row.compatibilitySet) {
      errors.push(`${row.sliceId}: ${row.implementationStatus} row must reference a compatibilitySet`);
    }
    if (!row.integrationLevel) {
      errors.push(`${row.sliceId}: ${row.implementationStatus} row must have an integrationLevel`);
    }
  }

  // Sealed rows must not have provisional sealStatus on completed rows
  if (row.sealStatus === 'sealed' && row.implementationStatus === 'completed' && row.repositories) {
    for (const [name, repo] of Object.entries(row.repositories)) {
      if (repo.checkpointState && repo.checkpointState !== 'sealed_tagged') {
        errors.push(`${row.sliceId}: sealed but ${name} is ${repo.checkpointState}`);
      }
    }
  }

  // Stage-A row must reference the lock compatibility set
  if (row.sliceId === 'FATES-SLICE-001' && row.compatibilitySet) {
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
          errors.push(`FATES-SLICE-001: ${name} commit mismatch`);
        }
        if (repo.tag !== lockRepo.tag) {
          errors.push(`FATES-SLICE-001: ${name} tag mismatch`);
        }
        if (repo.checkpointState !== lockRepo.checkpointState) {
          errors.push(`FATES-SLICE-001: ${name} checkpointState mismatch`);
        }
      }
    }
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
