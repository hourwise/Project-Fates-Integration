import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('..', import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
const manifest = await readJson('compatibility-sets/fates-mvp-security-binding-2026-08-24.json');
const historical = await readJson('fates-lock.json');
const recovery = await readJson('docs/evidence/CANDIDATE_COMMIT_RECOVERY-2026-08-24.json');

export function assertImplementationUnchanged({ integrationCommit, implementationPaths, changedPaths }) {
  if (!/^[0-9a-f]{40}$/.test(integrationCommit)) throw new Error('integration implementation commit is not a full SHA');
  if (!Array.isArray(implementationPaths) || implementationPaths.length === 0) throw new Error('integration implementation paths are required');
  const cwd = fileURLToPath(root);
  const changedOutput = changedPaths === undefined
    ? execSync(`git diff --name-only "${integrationCommit}..HEAD" -- ${implementationPaths.map((path) => `"${path}"`).join(' ')}`, { cwd, encoding: 'utf8' })
    : '';
  const changed = changedPaths ?? changedOutput
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
  if (changed.length > 0) throw new Error(`governed integration implementation changed after smoke commit: ${changed.join(', ')}`);
  return { integrationCommit, implementationPaths: [...implementationPaths], changedPaths: changed };
}

if (manifest.compatibilitySetId !== 'fates-mvp-security-binding-2026-08-24') throw new Error('MVP compatibility set ID drifted');
if (manifest.sealStatus !== 'provisional' || manifest.securityBinding.status !== 'security_binding_incomplete') throw new Error('MVP candidate must remain explicitly provisional while mandatory security evidence is incomplete');
if (historical.compatibilitySetId !== 'fates-slice-003a-r1-2026-08-11') throw new Error('historical lock was rewritten');
for (const [name, repository] of Object.entries(manifest.repositories)) {
  if (!/^[0-9a-f]{40}$/.test(repository.commit)) throw new Error(`${name} is not pinned to a full SHA`);
  if (repository.checkpointState === 'pushed_untagged' && repository.tag !== null) throw new Error(`${name} mutable tag state is inconsistent`);
}
if (!/^[0-9a-f]{64}$/.test(manifest.repositories.adrasteia.artifact.sha256)) throw new Error('Runtime Contracts artifact hash is not exact');
assertImplementationUnchanged({
  integrationCommit: manifest.securityBinding.integrationCommit,
  implementationPaths: manifest.securityBinding.implementationPaths,
});
if (recovery.repositories.moirae.actualFullSha !== 'dc322a47929b8dda4ecf7b108687751f92b4aa12' || recovery.repositories.integration.actualFullSha !== '1c892fbe7237b67d23eb75dc1b9cc06b20021cc4') throw new Error('candidate recovery record drifted');

process.stdout.write(JSON.stringify({ result: 'passed', compatibilitySetId: manifest.compatibilitySetId, status: manifest.securityBinding.status, implementation: assertImplementationUnchanged({ integrationCommit: manifest.securityBinding.integrationCommit, implementationPaths: manifest.securityBinding.implementationPaths }) }, null, 2) + '\n');
