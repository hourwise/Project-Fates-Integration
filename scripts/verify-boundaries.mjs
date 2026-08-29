// scripts/verify-boundaries.mjs
// Verifies hard boundaries are not violated.
// Inspects package.json, package-lock.json, all evidence files, slices, and handoffs.
// Never accesses the network.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const errors = [];

// --- Forbidden dependency patterns ---
const forbiddenPrefixes = ['file:', 'link:', 'workspace:', 'git+file:'];
const forbiddenBranchPattern = /^https:\/\/github\.com\/hourwise\/Project-[A-Za-z-]+#/;
const forbiddenShorthand = /^hourwise\/Project-[A-Za-z-]+@/;
const fateRepos = [
  'Project-Adrasteia', 'Project-Ananke', 'Project-Mnemosyne',
  'Project-Horae', 'Project-Moirae-Code',
];
const logicalSourceIdPattern = /^[A-Za-z0-9._:-]+(?:\/[A-Za-z0-9._:-]+)*$/;

// 1. Check .gitmodules
if (existsSync(resolve(root, '.gitmodules'))) {
  errors.push('.gitmodules exists — Git submodules are forbidden');
}

// 2. Peer source folders at root
const forbiddenDirs = [
  ...fateRepos,
  'adrasteia', 'ananke', 'mnemosyne', 'horae', 'moirae-code', 'moirae',
  '.peer-checkouts',
];
for (const dir of forbiddenDirs) {
  if (existsSync(resolve(root, dir))) {
    errors.push(`Peer source folder "${dir}" exists at repository root`);
  }
}

// 3. Check package.json dependencies
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
for (const field of depFields) {
  if (pkg[field]) {
    for (const [name, version] of Object.entries(pkg[field])) {
      if (typeof version === 'string') {
        for (const prefix of forbiddenPrefixes) {
          if (version.startsWith(prefix)) {
            errors.push(`package.json: ${field}.${name} uses forbidden prefix "${prefix}"`);
          }
        }
        if (forbiddenBranchPattern.test(version)) {
          errors.push(`package.json: ${field}.${name} uses mutable GitHub branch reference "${version}"`);
        }
      }
    }
  }
}
if (pkg.workspaces) {
  errors.push('package.json: workspaces are forbidden');
}

// 4. Check package-lock.json for Fate repository references
if (existsSync(resolve(root, 'package-lock.json'))) {
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf-8'));
  checkForLocalPathsObj(lock, 'package-lock.json');
}

// 5. Scan all JSON evidence files for local paths
const evidenceFiles = findAllJsonFiles(root, ['node_modules', '.git', 'package-lock.json']);
for (const file of evidenceFiles) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    const relPath = file.replace(root, '').replace(/^[\\/]/, '').replace(/\\/g, '/');
    checkForLocalPathsObj(data, relPath);
  } catch (e) {
    // Skip unparseable files
  }
}

// 6. Check for peer snapshots/archives
scanForArchives(root, '.');

// --- Helper functions ---

function checkForLocalPathsObj(obj, filePath, propertyName = null) {
  if (typeof obj === 'string') {
    // Windows absolute paths
    if (/^[A-Za-z]:[/\\]/.test(obj)) {
      errors.push(`${filePath}: contains absolute Windows path "${obj}"`);
    }
    // Unix absolute paths (exclude https://, http://)
    if (/^\/[^/]/.test(obj) && !/^https?:\/\//.test(obj)) {
      errors.push(`${filePath}: contains absolute Unix path "${obj}"`);
    }
    // Forbidden dependency patterns in any string
    for (const prefix of forbiddenPrefixes) {
      const isBoundedEvidenceSourceId = prefix === 'file:' &&
        propertyName === 'sourceId' &&
        filePath.startsWith('docs/evidence/') &&
        isLogicalSourceId(obj);
      if (obj.startsWith(prefix) && !isBoundedEvidenceSourceId) {
        errors.push(`${filePath}: contains forbidden "${prefix}" reference`);
      }
    }
    if (forbiddenBranchPattern.test(obj)) {
      errors.push(`${filePath}: contains mutable GitHub branch reference`);
    }
    // GitHub shorthand
    for (const repo of fateRepos) {
      if (obj.includes(`hourwise/${repo}#`) || obj.includes(`hourwise/${repo}@`)) {
        errors.push(`${filePath}: contains mutable Fate repository reference to ${repo}`);
      }
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      checkForLocalPathsObj(item, filePath);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      checkForLocalPathsObj(value, filePath, key);
    }
  }
}

function isLogicalSourceId(value) {
  if (typeof value !== 'string' || !value.startsWith('file:')) return false;

  const logicalPath = value.slice('file:'.length);
  if (!logicalPath || logicalPath.startsWith('/') || logicalPath.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(logicalPath) || logicalPath.includes('\\') || logicalPath.includes('..')) return false;
  if (!logicalSourceIdPattern.test(logicalPath)) return false;

  return logicalPath.split('/').every((segment) => segment !== '.');
}

function findAllJsonFiles(dir, excludeDirs) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          results.push(...findAllJsonFiles(resolve(dir, entry.name), excludeDirs));
        }
      } else if (extname(entry.name) === '.json') {
        results.push(resolve(dir, entry.name));
      }
    }
  } catch (e) {
    // Skip unreadable directories
  }
  return results;
}

function scanForArchives(dir, relativePath) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'coverage') continue;
        scanForArchives(resolve(dir, entry.name), `${relativePath}/${entry.name}`);
      } else {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.tgz') || name.endsWith('.tar.gz') ||
            name.endsWith('.zip') || name.endsWith('.tar')) {
          errors.push(`${relativePath}/${entry.name}: peer archive detected`);
        }
      }
    }
  } catch (e) {
    // Skip unreadable
  }
}

if (errors.length > 0) {
  console.error('FAIL: boundary verification failed.');
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
} else {
  console.log('PASS: boundaries verified.');
}
