// scripts/verify-fates-lock.mjs
// Verifies fates-lock.json invariants and consistency with the referenced snapshot.
// Stage-A specific assertions live in tests and the historical snapshot, not here.
// Never accesses the network.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

const errors = [];

// --- Invariant checks ---

// Required fields
if (!lock.schemaVersion) errors.push('Missing schemaVersion');
if (!lock.compatibilitySetId) errors.push('Missing compatibilitySetId');
if (!lock.snapshotPath) errors.push('Missing snapshotPath');
if (!lock.updatedAt) errors.push('Missing updatedAt');
if (!lock.sealStatus) errors.push('Missing sealStatus');
if (!lock.integrationLevel) errors.push('Missing integrationLevel');

// Valid enums
const validSeal = ['provisional', 'sealed', 'superseded'];
if (!validSeal.includes(lock.sealStatus)) {
  errors.push(`Unknown sealStatus: "${lock.sealStatus}"`);
}
const validLevel = ['inspection_only', 'partial_runtime', 'runtime_validated'];
if (!validLevel.includes(lock.integrationLevel)) {
  errors.push(`Unknown integrationLevel: "${lock.integrationLevel}"`);
}

// Protocol consistency
const { current, minimum, maximum } = lock.protocol || {};
if (compareVersions(minimum, current) > 0) {
  errors.push(`Protocol minimum (${minimum}) exceeds current (${current})`);
}
if (compareVersions(current, maximum) > 0) {
  errors.push(`Protocol current (${current}) exceeds maximum (${maximum})`);
}

// Repository checks
if (!lock.repositories) {
  errors.push('Missing repositories');
} else {
  const requiredRepos = ['adrasteia', 'ananke', 'mnemosyne', 'horae', 'moirae-code'];
  const urls = new Set();

  for (const name of requiredRepos) {
    const repo = lock.repositories[name];
    if (!repo) {
      errors.push(`Missing required repository: ${name}`);
      continue;
    }
    if (!repo.url) {
      errors.push(`${name}: missing URL`);
    } else {
      if (urls.has(repo.url)) errors.push(`Duplicate repository URL: ${repo.url}`);
      urls.add(repo.url);
      if (!repo.url.startsWith('https://github.com/hourwise/')) {
        errors.push(`${name}: URL must be a valid GitHub HTTPS URL, got "${repo.url}"`);
      }
    }
    if (!repo.commit || !/^[0-9a-f]{40}$/.test(repo.commit)) {
      errors.push(`${name}: malformed commit ID "${repo.commit}"`);
    }
    if (!repo.checkpointState) {
      errors.push(`${name}: missing checkpointState`);
    } else {
      const validStates = ['sealed_tagged', 'pushed_untagged', 'planned', 'superseded'];
      if (!validStates.includes(repo.checkpointState)) {
        errors.push(`${name}: unknown checkpointState "${repo.checkpointState}"`);
      }
      if (repo.checkpointState === 'sealed_tagged') {
        if (!repo.tag || repo.tag === '') errors.push(`${name}: sealed_tagged requires non-empty tag`);
      }
      if (repo.checkpointState === 'pushed_untagged') {
        if (repo.tag !== null) errors.push(`${name}: pushed_untagged requires tag null`);
      }
    }
    if (!repo.role) errors.push(`${name}: missing role`);

    // No local paths
    if (repo.url && (repo.url.includes(':\\') || repo.url.startsWith('/') || repo.url.startsWith('.'))) {
      errors.push(`${name}: URL appears to be a local path`);
    }
    if (repo.artifact) {
      const art = repo.artifact;
      if (art.url && (art.url.includes(':\\') || art.url.startsWith('/') || art.url.startsWith('.'))) {
        errors.push(`${name}: artifact URL appears to be a local path`);
      }
      if (!art.url || !art.url.startsWith('https://')) {
        errors.push(`${name}: artifact URL must use HTTPS`);
      }
      if (art.sha256 && !/^[0-9a-f]{64}$/.test(art.sha256)) {
        errors.push(`${name}: malformed SHA-256 hash`);
      }
    }
  }

  // Reject unknown repository keys
  for (const key of Object.keys(lock.repositories)) {
    if (!requiredRepos.includes(key)) {
      errors.push(`Unknown repository key: "${key}" — only ${requiredRepos.join(', ')} are allowed`);
    }
  }
}

// Seal status consistency: sealed requires all repos sealed_tagged
if (lock.sealStatus === 'sealed' && lock.repositories) {
  for (const [name, repo] of Object.entries(lock.repositories)) {
    if (repo.checkpointState !== 'sealed_tagged') {
      errors.push(`sealStatus is sealed but ${name} is ${repo.checkpointState}`);
    }
  }
}

// --- Snapshot consistency ---
if (lock.snapshotPath) {
  const snapshotAbs = resolve(root, lock.snapshotPath);
  if (!existsSync(snapshotAbs)) {
    errors.push(`Snapshot not found at ${lock.snapshotPath}`);
  } else {
    const snapshot = JSON.parse(readFileSync(snapshotAbs, 'utf-8'));
    if (snapshot.compatibilitySetId !== lock.compatibilitySetId) {
      errors.push(`Lock compatibilitySetId "${lock.compatibilitySetId}" differs from snapshot "${snapshot.compatibilitySetId}"`);
    }
    // Cross-check repository commits
    if (snapshot.repositories && lock.repositories) {
      for (const [name, snapRepo] of Object.entries(snapshot.repositories)) {
        const lockRepo = lock.repositories[name];
        if (lockRepo) {
          if (snapRepo.commit !== lockRepo.commit) {
            errors.push(`Snapshot mismatch: ${name} commit differs — lock "${lockRepo.commit}", snapshot "${snapRepo.commit}"`);
          }
          if (snapRepo.tag !== lockRepo.tag) {
            errors.push(`Snapshot mismatch: ${name} tag differs — lock "${lockRepo.tag}", snapshot "${snapRepo.tag}"`);
          }
          if (snapRepo.checkpointState !== lockRepo.checkpointState) {
            errors.push(`Snapshot mismatch: ${name} checkpointState differs — lock "${lockRepo.checkpointState}", snapshot "${snapRepo.checkpointState}"`);
          }
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('FAIL: fates-lock.json verification failed.');
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
} else {
  console.log('PASS: fates-lock.json verified.');
  console.log(`  Compatibility set: ${lock.compatibilitySetId}`);
  console.log(`  Seal status: ${lock.sealStatus}`);
  console.log(`  Integration level: ${lock.integrationLevel}`);
  console.log(`  Protocol: ${lock.protocol.current} (min ${lock.protocol.minimum}, max ${lock.protocol.maximum})`);
  console.log(`  Repositories: ${Object.keys(lock.repositories).length}`);
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
