// Shared candidate resolution for the local-SLM runner and evidence validator.
// The current-candidate pointer and its manifest are the only candidate source
// of truth. Historical locks and branch heads are intentionally not consulted.

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import {
  inspectRepositoryIdentityAndClean,
  loadCurrentCandidate,
  peerDefinitions,
  repositoryRoot,
  verifyMaterializedRepository,
} from './fates-checkout-current.mjs';

export const runtimePeerComponents = Object.freeze([
  ['adrasteia', 'adrasteia'],
  ['ananke', 'ananke'],
  ['mnemosyne', 'mnemosyne'],
  ['horae', 'horae'],
  ['moirae', 'moirae-code'],
]);

function gitHead(directory) {
  try {
    return execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

export function candidateComponentPins(manifest) {
  return Object.freeze({
    adrasteia: manifest.repositories.adrasteia.commit,
    ananke: manifest.repositories.ananke.commit,
    mnemosyne: manifest.repositories.mnemosyne.commit,
    horae: manifest.repositories.horae.commit,
    moirae: manifest.repositories['moirae-code'].commit,
    // This is the established pre-manifest Integration control/evidence
    // identity. The actual checkout used for an SLM run is harnessCommit.
    integration: manifest.repositories.integration.commit,
  });
}

export function inferredPeerDirectories(options = {}, root = repositoryRoot) {
  const anankeDir = options.anankeDir ? resolve(options.anankeDir) : null;
  const sibling = (name) => resolve(root, '..', name);
  return {
    adrasteia: resolve(options.adrasteiaDir ?? (anankeDir ? resolve(dirname(anankeDir), 'Project Runtime Contracts') : sibling(peerDefinitions.adrasteia.directory))),
    ananke: options.anankeDir ? resolve(options.anankeDir) : sibling(peerDefinitions.ananke.directory),
    mnemosyne: options.mnemosyneDir ? resolve(options.mnemosyneDir) : sibling(peerDefinitions.mnemosyne.directory),
    horae: options.horaeDir ? resolve(options.horaeDir) : sibling(peerDefinitions.horae.directory),
    moirae: options.moiraeDir ? resolve(options.moiraeDir) : sibling(peerDefinitions['moirae-code'].directory),
  };
}

export function verifySlmIntegrationCheckout(root = repositoryRoot, expectedUrl = 'https://github.com/hourwise/Project-Fates-Integration') {
  inspectRepositoryIdentityAndClean({ directory: root, expectedUrl });
  const head = gitHead(root);
  if (!head) throw new Error(`Integration harness checkout is unavailable: ${root}`);
  return head;
}

function observedPeerHeads(directories) {
  return Object.fromEntries(runtimePeerComponents.map(([component]) => [component, gitHead(directories[component])]));
}

export function resolveSlmCandidate({ options = {}, root = repositoryRoot, verifyCheckouts = true } = {}) {
  const selected = loadCurrentCandidate({ root, schemaRoot: root });
  const componentSHAs = candidateComponentPins(selected.manifest);
  const directories = inferredPeerDirectories(options, root);
  const observed = observedPeerHeads(directories);
  const harnessCommit = verifyCheckouts ? verifySlmIntegrationCheckout(root, selected.manifest.repositories.integration.url) : gitHead(root);
  if (!harnessCommit) throw new Error(`Integration harness checkout is unavailable: ${root}`);

  if (verifyCheckouts) {
    for (const [component, key] of runtimePeerComponents) {
      verifyMaterializedRepository({
        directory: directories[component],
        expectedUrl: selected.manifest.repositories[key].url,
        expectedCommit: selected.manifest.repositories[key].commit,
      });
    }
    const cleanHarnessCommit = gitHead(root);
    if (cleanHarnessCommit !== harnessCommit) throw new Error('Integration harness HEAD changed during candidate verification');
  }

  return {
    ...selected,
    candidateId: selected.pointer.candidate,
    compatibilitySetId: selected.pointer.candidate,
    componentSHAs,
    runtimePeerSHAs: Object.fromEntries(runtimePeerComponents.map(([component]) => [component, componentSHAs[component]])),
    observedPeerHeads: observed,
    harnessCommit,
    peerDirectories: directories,
    runtimeContractsArtifactSha256: selected.manifest.repositories.adrasteia.artifact.sha256,
  };
}

export function verifySlmPeerHeads(candidate) {
  for (const [component] of runtimePeerComponents) {
    if (candidate.observedPeerHeads?.[component] !== candidate.runtimePeerSHAs[component]) {
      throw new Error(`PIN_MISMATCH:${component}:expected=${candidate.runtimePeerSHAs[component]}:observed=${candidate.observedPeerHeads?.[component] ?? 'unavailable'}`);
    }
  }
  return candidate.observedPeerHeads;
}
