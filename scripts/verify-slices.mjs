// scripts/verify-slices.mjs
// Verifies slice directory structure and rules.
// Never accesses the network.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const slicesDir = resolve(root, 'slices');

const errors = [];

// Read active-slice.json
const activeSlice = JSON.parse(readFileSync(resolve(root, 'active-slice.json'), 'utf-8'));

// active-slice rules
if (activeSlice.status === 'idle' && activeSlice.activeSliceId !== null) {
  errors.push('active-slice.json: status is idle but activeSliceId is not null');
}
if (activeSlice.status === 'active' && activeSlice.activeSliceId === null) {
  errors.push('active-slice.json: status is active but activeSliceId is null');
}

// Iterate slice directories
const entries = readdirSync(slicesDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const dir = entry.name;
  const slicePath = resolve(slicesDir, dir, 'slice.json');

  if (!existsSync(slicePath)) {
    errors.push(`slices/${dir}: missing slice.json`);
    continue;
  }

  const slice = JSON.parse(readFileSync(slicePath, 'utf-8'));

  // Directory name and slice ID agree (except _template)
  if (dir !== '_template') {
    // For 001-stage-a-adoption, the sliceId should be FATES-SLICE-001
    const expectedId = dir.replace(/^(\d+)-.*$/, 'FATES-SLICE-$1');
    if (slice.sliceId !== expectedId) {
      errors.push(`slices/${dir}: sliceId "${slice.sliceId}" does not match directory name pattern (expected "${expectedId}")`);
    }
  }

  // Template must not be active
  if (dir === '_template') {
    if (slice.status === 'active') {
      errors.push('slices/_template: template must not be active');
    }
    if (slice.sliceId !== '_template') {
      errors.push(`slices/_template: sliceId must be "_template", got "${slice.sliceId}"`);
    }
  }

  // Slice 001 exists and is completed
  if (dir === '001-stage-a-adoption') {
    if (slice.status !== 'completed') {
      errors.push(`slices/001-stage-a-adoption: expected status "completed", got "${slice.status}"`);
    }
  }
}

// Verify Slice 001 exists
if (!existsSync(resolve(slicesDir, '001-stage-a-adoption', 'slice.json'))) {
  errors.push('Missing required slice: 001-stage-a-adoption');
}

if (errors.length > 0) {
  console.error('FAIL: slices verification failed.');
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
} else {
  console.log('PASS: slices verified.');
}
