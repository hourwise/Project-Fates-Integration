// scripts/verify-slices.mjs
// Verifies canonical slice and bounded sub-slice structure with the two-axis
// status model. Never accesses the network.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(__dirname, '..');
export const CANONICAL_SLICE_ID_PATTERN = /^FATES-SLICE-\d{3}$/;
export const SUBSLICE_ID_PATTERN = /^FATES-SLICE-(\d{3})([A-Z])$/;

export function parentSliceIdForSubslice(subsliceId) {
  const match = SUBSLICE_ID_PATTERN.exec(subsliceId);
  return match ? `FATES-SLICE-${match[1]}` : null;
}

export function isEligibleSubsliceForActivation(subslice) {
  return subslice?.implementationStatus === 'planned' &&
    subslice?.sealStatus === 'provisional' &&
    subslice?.activation?.state === 'ready_for_activation' &&
    Array.isArray(subslice?.prerequisites) &&
    subslice.prerequisites.length > 0;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function findFiles(directory, filename) {
  if (!existsSync(directory)) return [];
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(path, filename));
    else if (entry.isFile() && entry.name === filename) results.push(path);
  }
  return results;
}

function expectedCanonicalId(directoryName) {
  const match = /^(\d{3})-/.exec(directoryName);
  return match ? `FATES-SLICE-${match[1]}` : null;
}

export function validateActiveSubsliceState(activeSlice, canonicalRecords, subsliceRecords) {
  const errors = [];
  const activeSubsliceId = activeSlice.activeSubsliceId ?? null;
  const canonicalMatches = canonicalRecords.filter(
    ({ slice }) => slice.sliceId === activeSlice.activeSliceId,
  );

  if (activeSlice.status === 'idle') {
    if (activeSubsliceId !== null) {
      errors.push('active-slice.json: status is idle but activeSubsliceId is not null');
    }
    return errors;
  }

  if (activeSlice.status !== 'active') return errors;

  if (!CANONICAL_SLICE_ID_PATTERN.test(activeSlice.activeSliceId ?? '')) return errors;
  if (canonicalMatches.length !== 1) {
    errors.push(
      `active-slice.json: active canonical slice "${activeSlice.activeSliceId}" ` +
      `must resolve to exactly one canonical slice record (found ${canonicalMatches.length})`,
    );
  }

  if (activeSubsliceId === null) return errors;

  if (!SUBSLICE_ID_PATTERN.test(activeSubsliceId)) {
    errors.push(`active-slice.json: malformed activeSubsliceId "${activeSubsliceId}"`);
    return errors;
  }

  const declaredParent = parentSliceIdForSubslice(activeSubsliceId);
  if (declaredParent !== activeSlice.activeSliceId) {
    errors.push(
      `active-slice.json: activeSubsliceId "${activeSubsliceId}" belongs to ` +
      `"${declaredParent}", not "${activeSlice.activeSliceId}"`,
    );
  }

  const matches = subsliceRecords.filter(({ subslice }) => subslice.subsliceId === activeSubsliceId);
  if (matches.length !== 1) {
    errors.push(
      `active-slice.json: active sub-slice "${activeSubsliceId}" ` +
      `must resolve to exactly one registered record (found ${matches.length})`,
    );
    return errors;
  }

  const record = matches[0].subslice;
  if (record.parentSliceId !== activeSlice.activeSliceId) {
    errors.push(
      `active sub-slice "${activeSubsliceId}" declares parent "${record.parentSliceId}" ` +
      `but activeSliceId is "${activeSlice.activeSliceId}"`,
    );
  }
  if (!isEligibleSubsliceForActivation(record)) {
    errors.push(
      `active sub-slice "${activeSubsliceId}" is not eligible: ` +
      'it must be planned, provisional, and ready_for_activation',
    );
  }

  return errors;
}

export function verifySlices(root = repositoryRoot) {
  const slicesDir = resolve(root, 'slices');
  const errors = [];
  const canonicalRecords = [];
  const subsliceRecords = [];

  const activeSlice = readJson(resolve(root, 'active-slice.json'));
  if (!activeSlice) errors.push('active-slice.json: could not be parsed');

  const entries = existsSync(slicesDir)
    ? readdirSync(slicesDir, { withFileTypes: true })
    : [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = entry.name;
    const slicePath = resolve(slicesDir, dir, 'slice.json');

    if (!existsSync(slicePath)) {
      errors.push(`slices/${dir}: missing slice.json`);
      continue;
    }

    const slice = readJson(slicePath);
    if (!slice) {
      errors.push(`slices/${dir}: slice.json could not be parsed`);
      continue;
    }
    canonicalRecords.push({ path: slicePath, dir, slice });

    if (slice.$schema) {
      const schemaAbs = resolve(slicesDir, dir, slice.$schema);
      if (!existsSync(schemaAbs)) {
        errors.push(`slices/${dir}: $schema path "${slice.$schema}" does not resolve to a file`);
      }
    }

    if (dir !== '_template') {
      const expectedId = expectedCanonicalId(dir);
      if (slice.sliceId !== expectedId) {
        errors.push(`slices/${dir}: sliceId "${slice.sliceId}" does not match directory name (expected "${expectedId}")`);
      }
    }

    if (dir === '_template') {
      if (slice.implementationStatus !== 'template') {
        errors.push(`slices/_template: implementationStatus must be "template", got "${slice.implementationStatus}"`);
      }
      if (slice.sliceId !== '_template') {
        errors.push(`slices/_template: sliceId must be "_template", got "${slice.sliceId}"`);
      }
    }

    if (dir === '001-stage-a-adoption' && slice.implementationStatus !== 'completed') {
      errors.push(`slices/001-stage-a-adoption: expected implementationStatus "completed", got "${slice.implementationStatus}"`);
    }
  }

  const canonicalById = new Map();
  for (const record of canonicalRecords) {
    if (!CANONICAL_SLICE_ID_PATTERN.test(record.slice.sliceId ?? '')) continue;
    const existing = canonicalById.get(record.slice.sliceId) ?? [];
    existing.push(record);
    canonicalById.set(record.slice.sliceId, existing);
  }
  for (const [sliceId, records] of canonicalById) {
    if (records.length > 1) errors.push(`Duplicate canonical slice ID: ${sliceId}`);
  }

  for (const subslicePath of findFiles(slicesDir, 'subslice.json')) {
    const subslice = readJson(subslicePath);
    if (!subslice) {
      errors.push(`${subslicePath}: subslice.json could not be parsed`);
      continue;
    }
    subsliceRecords.push({ path: subslicePath, subslice });
  }

  const subslicesById = new Map();
  for (const record of subsliceRecords) {
    const { subslice } = record;
    if (!SUBSLICE_ID_PATTERN.test(subslice.subsliceId ?? '')) {
      errors.push(`${record.path}: malformed subsliceId "${subslice.subsliceId}"`);
      continue;
    }
    if (!CANONICAL_SLICE_ID_PATTERN.test(subslice.parentSliceId ?? '')) {
      errors.push(`${record.path}: malformed parentSliceId "${subslice.parentSliceId}"`);
    }
    const expectedParent = parentSliceIdForSubslice(subslice.subsliceId);
    if (expectedParent !== subslice.parentSliceId) {
      errors.push(
        `${record.path}: subsliceId "${subslice.subsliceId}" belongs to "${expectedParent}" ` +
        `but parentSliceId is "${subslice.parentSliceId}"`,
      );
    }
    if (!canonicalById.has(subslice.parentSliceId)) {
      errors.push(`${record.path}: parentSliceId "${subslice.parentSliceId}" has no canonical slice record`);
    }
    if (subslice.activation?.state === 'ready_for_activation' &&
        (subslice.implementationStatus !== 'planned' || subslice.sealStatus !== 'provisional')) {
      errors.push(`${record.path}: ready_for_activation sub-slice must be planned and provisional`);
    }
    if (subslice.activation?.state === 'ready_for_activation' &&
        (!Array.isArray(subslice.prerequisites) || subslice.prerequisites.length === 0)) {
      errors.push(`${record.path}: ready_for_activation sub-slice must declare prerequisites`);
    }
    const existing = subslicesById.get(subslice.subsliceId) ?? [];
    existing.push(record);
    subslicesById.set(subslice.subsliceId, existing);
  }
  for (const [subsliceId, records] of subslicesById) {
    if (records.length > 1) errors.push(`Duplicate sub-slice ID: ${subsliceId}`);
  }

  if (!canonicalById.has('FATES-SLICE-001')) {
    errors.push('Missing required slice: 001-stage-a-adoption');
  }

  if (activeSlice) {
    if (activeSlice.status === 'idle' && activeSlice.activeSliceId !== null) {
      errors.push('active-slice.json: status is idle but activeSliceId is not null');
    }
    if (activeSlice.status === 'active' && activeSlice.activeSliceId === null) {
      errors.push('active-slice.json: status is active but activeSliceId is null');
    }
    errors.push(...validateActiveSubsliceState(activeSlice, canonicalRecords, subsliceRecords));

    if (activeSlice.status === 'active' && activeSlice.activeSliceId) {
      const activeCanonical = canonicalById.get(activeSlice.activeSliceId) ?? [];
      if (activeCanonical.length !== 1) {
        errors.push(`active-slice.json: active slice "${activeSlice.activeSliceId}" has no unique canonical record`);
      }
    }
  }

  return { errors, canonicalRecords, subsliceRecords };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors } = verifySlices();
  if (errors.length > 0) {
    console.error('FAIL: slices verification failed.');
    for (const err of errors) console.error(`  ${err}`);
    process.exit(1);
  } else {
    console.log('PASS: slices verified.');
  }
}
