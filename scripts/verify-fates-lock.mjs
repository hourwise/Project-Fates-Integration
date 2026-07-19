// scripts/verify-fates-lock.mjs
// Verifies exact supplied checkpoints, protocol consistency, and structural rules.
// Never accesses the network.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const lock = JSON.parse(readFileSync(resolve(root, 'fates-lock.json'), 'utf-8'));

const errors = [];

// Protocol consistency
const { current, minimum, maximum } = lock.protocol;
if (compareVersions(minimum, current) > 0) {
  errors.push(`Protocol minimum (${minimum}) exceeds current (${current})`);
}
if (compareVersions(current, maximum) > 0) {
  errors.push(`Protocol current (${current}) exceeds maximum (${maximum})`);
}

// Duplicate repository check
const urls = new Set();
for (const [name, repo] of Object.entries(lock.repositories)) {
  if (urls.has(repo.url)) {
    errors.push(`Duplicate repository URL: ${repo.url}`);
  }
  urls.add(repo.url);
}

// Per-repository checks
for (const [name, repo] of Object.entries(lock.repositories)) {
  // Commit format
  if (!/^[0-9a-f]{40}$/.test(repo.commit)) {
    errors.push(`${name}: malformed commit ID "${repo.commit}"`);
  }

  // Checkpoint state rules
  if (repo.checkpointState === 'sealed_tagged') {
    if (!repo.tag || repo.tag === '') {
      errors.push(`${name}: sealed_tagged requires a non-empty tag`);
    }
  }

  if (repo.checkpointState === 'pushed_untagged') {
    if (repo.tag !== null) {
      errors.push(`${name}: pushed_untagged requires tag to be null, got "${repo.tag}"`);
    }
  }

  // Unknown checkpoint state
  const validStates = ['sealed_tagged', 'pushed_untagged', 'planned', 'superseded'];
  if (!validStates.includes(repo.checkpointState)) {
    errors.push(`${name}: unknown checkpointState "${repo.checkpointState}"`);
  }

  // No local paths in URL
  if (repo.url.includes(':\\') || repo.url.startsWith('/') || repo.url.startsWith('.')) {
    errors.push(`${name}: URL appears to be a local path: ${repo.url}`);
  }
  if (!repo.url.startsWith('https://')) {
    errors.push(`${name}: URL must use HTTPS: ${repo.url}`);
  }

  // Artifact URL checks
  if (repo.artifact) {
    if (repo.artifact.url.includes(':\\') || repo.artifact.url.startsWith('/') || repo.artifact.url.startsWith('.')) {
      errors.push(`${name}: artifact URL appears to be a local path`);
    }
    if (!repo.artifact.url.startsWith('https://')) {
      errors.push(`${name}: artifact URL must use HTTPS`);
    }
    if (!/^[0-9a-f]{64}$/.test(repo.artifact.sha256)) {
      errors.push(`${name}: malformed SHA-256 hash`);
    }
  }
}

// Specific named checkpoints
const expected = {
  adrasteia: {
    tag: 'adrasteia-adoption-v0.4.0-protocol-1.4.0',
    commit: '124b6aee2629a3147739934ad5f1b45b32c8ba46',
  },
  ananke: {
    tag: 'ananke-adrasteia-adoption-v0.1.0-protocol-1.4.0',
    commit: 'dcbb115c5798072221afdd2e4fdd36e786defddf',
  },
  mnemosyne: {
    tag: 'mnemosyne-adrasteia-adoption-v0.1.0-protocol-1.4.0',
    commit: 'f4ab76a9760f856d78908d35facceb068d78c8e5',
  },
  horae: {
    tag: 'horae-adrasteia-adoption-v0.1.0-protocol-1.4.0',
    commit: '52e14fa574f7427f62747fe84d2789aec25b94e3',
  },
  'moirae-code': {
    tag: null,
    commit: 'a4783db271a61848c66ac4f6652a539bdb515e28',
  },
};

for (const [name, expectedRepo] of Object.entries(expected)) {
  const actual = lock.repositories[name];
  if (!actual) {
    errors.push(`Missing repository: ${name}`);
    continue;
  }
  if (actual.tag !== expectedRepo.tag) {
    errors.push(`${name}: expected tag "${expectedRepo.tag}", got "${actual.tag}"`);
  }
  if (actual.commit !== expectedRepo.commit) {
    errors.push(`${name}: expected commit "${expectedRepo.commit}", got "${actual.commit}"`);
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
