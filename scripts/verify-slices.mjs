// scripts/verify-slices.mjs
// Verifies slice directory structure and rules with the two-axis status model.
// Never accesses the network.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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
if (activeSlice.status === 'active') {
  if (activeSlice.activeSliceId === null) {
    errors.push('active-slice.json: status is active but activeSliceId is null');
  }
  if (activeSlice.activeSliceId && !/^FATES-SLICE-\d{3}$/.test(activeSlice.activeSliceId)) {
    errors.push(`active-slice.json: activeSliceId "${activeSlice.activeSliceId}" does not match FATES-SLICE-NNN`);
  }
  // Verify the active slice directory exists and is not _template
  if (activeSlice.activeSliceId) {
    const expectedDir = activeSlice.activeSliceId.replace(/^FATES-SLICE-(\d{3})$/, '$1-').toLowerCase();
    // Look for matching directory
    const dirs = readdirSync(slicesDir, { withFileTypes: true }).filter(e => e.isDirectory());
    const match = dirs.find(d => d.name.startsWith(activeSlice.activeSliceId.replace(/^FATES-SLICE-(\d{3})$/, '$1-')));
    if (!match) {
      errors.push(`active-slice.json: active slice "${activeSlice.activeSliceId}" has no matching directory in slices/`);
    }
  }
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

  // Check $schema path
  if (slice.$schema) {
    const depth = dir === '_template' ? '../..' : '../..';
    // For _template at slices/_template/slice.json, path to schemas/slice.schema.json is ../../schemas/...
    const expectedSchemaPath = `${depth}/schemas/slice.schema.json`;
    // Just verify it exists
    const schemaAbs = resolve(slicesDir, dir, slice.$schema);
    if (!existsSync(schemaAbs)) {
      errors.push(`slices/${dir}: $schema path "${slice.$schema}" does not resolve to a file`);
    }
  }

  // Directory name and slice ID agree (except _template)
  if (dir !== '_template') {
    const expectedId = dir.replace(/^(\d+)-.*$/, 'FATES-SLICE-$1');
    if (slice.sliceId !== expectedId) {
      errors.push(`slices/${dir}: sliceId "${slice.sliceId}" does not match directory name (expected "${expectedId}")`);
    }
  }

  // Template rules
  if (dir === '_template') {
    if (slice.implementationStatus !== 'template') {
      errors.push(`slices/_template: implementationStatus must be "template", got "${slice.implementationStatus}"`);
    }
    if (slice.sliceId !== '_template') {
      errors.push(`slices/_template: sliceId must be "_template", got "${slice.sliceId}"`);
    }
  }

  // Stage-A slice checks
  if (dir === '001-stage-a-adoption') {
    if (slice.implementationStatus !== 'completed') {
      errors.push(`slices/001-stage-a-adoption: expected implementationStatus "completed", got "${slice.implementationStatus}"`);
    }
    // sealStatus should be provisional while Moirae Code is pushed_untagged
    // (This is informational; the slice.json itself records the status)
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
