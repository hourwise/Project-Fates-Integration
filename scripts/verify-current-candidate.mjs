// Offline structural verification for the candidate selected by
// current-candidate.json. Exact peer object and artifact verification is
// performed by fates:checkout-current.

import { loadCurrentCandidate, repositoryRoot } from './fates-checkout-current.mjs';

const { pointer, manifest } = loadCurrentCandidate({ root: repositoryRoot });
console.log(`PASS: current candidate ${pointer.candidate}`);
console.log(`  status: ${pointer.status}`);
for (const [key, repository] of Object.entries(manifest.repositories)) console.log(`  ${key}: ${repository.commit}`);
console.log('PASS: current candidate structure verified (offline; no peer checkout mutation)');
