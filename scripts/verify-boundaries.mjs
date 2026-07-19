// scripts/verify-boundaries.mjs
// Verifies hard boundaries are not violated.
// Never accesses the network.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const errors = [];

// 1. No .gitmodules
if (existsSync(resolve(root, '.gitmodules'))) {
  errors.push('.gitmodules exists — Git submodules are forbidden');
}

// 2. No peer source folders at repository root
const forbiddenDirs = [
  'Project-Adrasteia',
  'Project-Ananke',
  'Project-Mnemosyne',
  'Project-Horae',
  'Project-Moirae-Code',
  'adrasteia',
  'ananke',
  'mnemosyne',
  'horae',
  'moirae-code',
  'moirae',
];
for (const dir of forbiddenDirs) {
  if (existsSync(resolve(root, dir))) {
    errors.push(`Peer source folder "${dir}" exists at repository root`);
  }
}

// 3. No local file dependencies in package.json
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
for (const field of depFields) {
  if (pkg[field]) {
    for (const [name, version] of Object.entries(pkg[field])) {
      if (typeof version === 'string') {
        if (version.startsWith('file:') || version.startsWith('link:')) {
          errors.push(`package.json: ${field}.${name} uses local path "${version}"`);
        }
      }
    }
  }
}

// 4. No peer workspace paths
if (pkg.workspaces) {
  errors.push('package.json: workspaces are forbidden');
}

// 5. No absolute local paths in evidence
// Scan all JSON files for local paths
function checkForLocalPaths(obj, filePath) {
  if (typeof obj === 'string') {
    // Windows paths
    if (/^[A-Za-z]:\\/.test(obj)) {
      errors.push(`${filePath}: contains absolute Windows path "${obj}"`);
    }
    // Unix absolute paths (but allow https://)
    if (/^\/[a-z]/.test(obj) && !obj.startsWith('https://')) {
      errors.push(`${filePath}: contains absolute Unix path "${obj}"`);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      checkForLocalPaths(item, filePath);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      checkForLocalPaths(value, filePath);
    }
  }
}

// Check key files for local paths
const filesToCheck = [
  'fates-lock.json',
  'compatibility-matrix.json',
  'active-slice.json',
  'slices/001-stage-a-adoption/slice.json',
  'slices/_template/slice.json',
];

for (const file of filesToCheck) {
  const filePath = resolve(root, file);
  if (existsSync(filePath)) {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    checkForLocalPaths(data, file);
  }
}

// 6. No peer source snapshots or archives
import { readdirSync } from 'node:fs';
function scanForArchives(dir, relativePath) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      scanForArchives(resolve(dir, entry.name), `${relativePath}/${entry.name}`);
    } else {
      const name = entry.name.toLowerCase();
      if (name.endsWith('.tgz') || name.endsWith('.tar.gz') ||
          name.endsWith('.zip') || name.endsWith('.tar')) {
        // Allow only in expected locations, but warn
        errors.push(`${relativePath}/${entry.name}: peer archive detected`);
      }
    }
  }
}
scanForArchives(root, '.');

if (errors.length > 0) {
  console.error('FAIL: boundary verification failed.');
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
} else {
  console.log('PASS: boundaries verified.');
}
