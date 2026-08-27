import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  loadCurrentCandidate,
  materializeRepository,
  repositoryRoot,
  verifyArtifactFile,
  verifyMaterializedRepository,
} from '../scripts/fates-checkout-current.mjs';

const temporaryPaths = [];
const manifestPath = resolve(repositoryRoot, 'compatibility-sets/fates-current-candidate-2026-08-27.json');
const pointer = {
  candidate: 'fates-current-candidate-2026-08-27',
  manifest: 'compatibility-sets/fates-current-candidate-2026-08-27.json',
  status: 'provisional',
};
const currentPointer = {
  candidate: 'fates-durable-candidate-2026-08-27-r7',
  manifest: 'compatibility-sets/fates-durable-candidate-2026-08-27-r7.json',
  status: 'provisional',
};

after(async () => {
  await Promise.all(temporaryPaths.map((path) => rm(path, { recursive: true, force: true })));
});

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function temporaryCandidateRoot({ manifest, pointerDocument = pointer } = {}) {
  if (manifest === undefined) manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const root = await mkdtemp(join(tmpdir(), 'fates-005c-candidate-'));
  temporaryPaths.push(root);
  await mkdir(join(root, 'compatibility-sets'), { recursive: true });
  await writeFile(join(root, 'current-candidate.json'), JSON.stringify(pointerDocument));
  if (manifest !== null) await writeFile(join(root, pointer.manifest), JSON.stringify(manifest));
  return root;
}

async function createRepository(originUrl = 'https://github.com/hourwise/Project-Ananke') {
  const directory = await mkdtemp(join(tmpdir(), 'fates-005c-repo-'));
  temporaryPaths.push(directory);
  git(['init'], directory);
  git(['branch', '-M', 'main'], directory);
  git(['config', 'user.email', 'fates-test@example.invalid'], directory);
  git(['config', 'user.name', 'FATES-005C test'], directory);
  await writeFile(join(directory, 'fixture.txt'), 'first\n');
  git(['add', 'fixture.txt'], directory);
  git(['commit', '-m', 'first'], directory);
  const first = git(['rev-parse', 'HEAD'], directory);
  await writeFile(join(directory, 'fixture.txt'), 'second\n');
  git(['add', 'fixture.txt'], directory);
  git(['commit', '-m', 'second'], directory);
  const second = git(['rev-parse', 'HEAD'], directory);
  git(['remote', 'add', 'origin', originUrl], directory);
  return { directory, first, second };
}

test('current pointer selects the exact six-repository candidate without reading the historical lock', () => {
  const { pointer: resolvedPointer, manifest } = loadCurrentCandidate();
  assert.deepEqual(resolvedPointer, currentPointer);
  assert.equal(manifest.repositories.adrasteia.commit, 'a1c01bf9e6f9d6a126cfdcc1acfacd488b214210');
  assert.equal(manifest.repositories.ananke.commit, '3d76adb162a0ff07b5630700ae30a823f1419cb4');
  assert.equal(manifest.repositories.mnemosyne.commit, 'f02df61be147d6fe716a98912d37eaaf1fe89f23');
  assert.equal(manifest.repositories.horae.commit, '68508f5c37e1cb3b244116d45fa267e689a6e75c');
  assert.equal(manifest.repositories['moirae-code'].commit, 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1');
  assert.equal(manifest.repositories.integration.commit, '39f66dcb1a58b8cbc217a987942781f7b77fde7a');
  assert.equal(manifest.securityBinding.integrationIdentity.controlCommit, '39f66dcb1a58b8cbc217a987942781f7b77fde7a');
  assert.equal(manifest.securityBinding.integrationIdentity.finalPublicationCommit, null);
});

test('historical lock disagreement cannot influence current candidate resolution', async () => {
  const root = await temporaryCandidateRoot();
  await writeFile(join(root, 'fates-lock.json'), JSON.stringify({ compatibilitySetId: 'fates-stage-a-2026-07', repositories: { horae: { commit: '0'.repeat(40) } } }));
  const resolved = loadCurrentCandidate({ root, schemaRoot: repositoryRoot });
  assert.equal(resolved.pointer.candidate, pointer.candidate);
  assert.equal(resolved.manifest.repositories.horae.commit, '3a174b3f1bf791b437a22b4cfd41bf9677b9cba9');
});

test('missing and malformed current candidate declarations fail before materialization', async () => {
  const missing = await temporaryCandidateRoot({ manifest: null });
  assert.throws(() => loadCurrentCandidate({ root: missing, schemaRoot: repositoryRoot }), /cannot be read/);
  const malformedPointer = await temporaryCandidateRoot({ pointerDocument: { candidate: 'fates-current-candidate-2026-08-27', manifest: 'compatibility-sets/missing.json', status: 'provisional' } });
  assert.throws(() => loadCurrentCandidate({ root: malformedPointer, schemaRoot: repositoryRoot }), /must point to the candidate-named/);
  const malformedManifest = await temporaryCandidateRoot({ manifest: {} });
  assert.throws(() => loadCurrentCandidate({ root: malformedManifest, schemaRoot: repositoryRoot }), /fails fates-lock schema/);
});

test('nonexistent full SHA fails closed and never falls back to a valid branch head', async () => {
  const checkout = await createRepository();
  const nonexistent = '0123456789abcdef0123456789abcdef01234567';
  assert.throws(() => verifyMaterializedRepository({ directory: checkout.directory, expectedUrl: 'https://github.com/hourwise/Project-Ananke', expectedCommit: nonexistent }), /expected commit object is unavailable/);
  assert.equal(git(['rev-parse', 'HEAD'], checkout.directory), checkout.second);
});

test('wrong repository identity fails closed even when its commit is valid', async () => {
  const checkout = await createRepository('https://github.com/hourwise/Project-Mnemosyne');
  assert.throws(() => verifyMaterializedRepository({ directory: checkout.directory, expectedUrl: 'https://github.com/hourwise/Project-Ananke', expectedCommit: checkout.second }), /origin mismatch/);
});

test('clean correct repository can be materialized to the exact pinned commit', async () => {
  const source = await createRepository('https://github.com/hourwise/Project-Ananke');
  const workspace = await mkdtemp(join(tmpdir(), 'fates-005c-workspace-'));
  temporaryPaths.push(workspace);
  await materializeRepository({ key: 'ananke', repository: { url: `file:///${source.directory.replaceAll('\\', '/')}`, commit: source.first }, workspaceRoot: workspace, verifyOnly: false });
  assert.equal(git(['rev-parse', 'HEAD'], join(workspace, 'Project Ananke')), source.first);
});

test('declared branch verification requires the branch to resolve to the pinned commit', async () => {
  const source = await createRepository('https://github.com/hourwise/Project-Ananke');
  const workspace = await mkdtemp(join(tmpdir(), 'fates-005c-branch-workspace-'));
  temporaryPaths.push(workspace);
  await assert.rejects(
    () => materializeRepository({ key: 'ananke', repository: { url: `file:///${source.directory.replaceAll('\\', '/')}`, branch: 'main', tag: null, commit: source.first }, workspaceRoot: workspace, verifyOnly: false, verifyRemote: true }),
    /does not resolve to/,
  );
});

test('dirty checkout fails closed without reset or clean', async () => {
  const checkout = await createRepository();
  await writeFile(join(checkout.directory, 'local-only.txt'), 'must remain\n');
  assert.throws(() => verifyMaterializedRepository({ directory: checkout.directory, expectedUrl: 'https://github.com/hourwise/Project-Ananke', expectedCommit: checkout.second }), /dirty/);
  assert.equal(await readFile(join(checkout.directory, 'local-only.txt'), 'utf8'), 'must remain\n');
});

test('Runtime Contracts artifact digest mismatch fails closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fates-005c-artifact-'));
  temporaryPaths.push(directory);
  const path = join(directory, 'project-runtime-contracts-0.6.2.tgz');
  await writeFile(path, 'not-the-declared-artifact');
  const expected = '0'.repeat(64);
  await assert.rejects(() => verifyArtifactFile(path, expected), /digest mismatch/);
  assert.notEqual(createHash('sha256').update('not-the-declared-artifact').digest('hex'), expected);
});
