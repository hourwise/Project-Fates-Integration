import { readFile } from 'node:fs/promises';
const root = new URL('..', import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
const manifest = await readJson('compatibility-sets/fates-mvp-security-binding-2026-08-24.json');
const historical = await readJson('fates-lock.json');
const recovery = await readJson('docs/evidence/CANDIDATE_COMMIT_RECOVERY-2026-08-24.json');

if (manifest.compatibilitySetId !== 'fates-mvp-security-binding-2026-08-24') throw new Error('MVP compatibility set ID drifted');
if (manifest.sealStatus !== 'provisional' || manifest.securityBinding.status !== 'security_binding_incomplete') throw new Error('MVP candidate must remain explicitly provisional while mandatory security evidence is incomplete');
if (historical.compatibilitySetId !== 'fates-slice-003a-r1-2026-08-11') throw new Error('historical lock was rewritten');
for (const [name, repository] of Object.entries(manifest.repositories)) {
  if (!/^[0-9a-f]{40}$/.test(repository.commit)) throw new Error(`${name} is not pinned to a full SHA`);
  if (repository.checkpointState === 'pushed_untagged' && repository.tag !== null) throw new Error(`${name} mutable tag state is inconsistent`);
}
if (!/^[0-9a-f]{64}$/.test(manifest.repositories.adrasteia.artifact.sha256)) throw new Error('Runtime Contracts artifact hash is not exact');
if (manifest.securityBinding.integrationCommit !== '8abc4337d5ac5eca651d1e382ce3a15ba051f0a2') throw new Error('integration smoke commit drifted');
if (recovery.repositories.moirae.actualFullSha !== 'dc322a47929b8dda4ecf7b108687751f92b4aa12' || recovery.repositories.integration.actualFullSha !== '1c892fbe7237b67d23eb75dc1b9cc06b20021cc4') throw new Error('candidate recovery record drifted');

process.stdout.write(JSON.stringify({ result: 'passed', compatibilitySetId: manifest.compatibilitySetId, status: manifest.securityBinding.status }, null, 2) + '\n');
