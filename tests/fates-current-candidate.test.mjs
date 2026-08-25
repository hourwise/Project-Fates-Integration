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
const manifestPath = resolve(repositoryRoot, 'compatibility-sets/fates-pre-qwen-security-2026-08-25.json');
const pointer = {
  candidate: 'fates-pre-qwen-security-2026-08-25',
  manifest: 'compatibility-sets/fates-pre-qwen-security-2026-08-25.json',
  status: 'provisional',
};

after(async () => {
  await Promise.all(temporaryPaths.map((path) => rm(path, { recursive: true, force: true })));
});

async function temporaryCandidateRoot({ manifest, pointerDocument = pointer } = {}) {
  if (manifest === undefined) manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const root = await mkdtemp(join(tmpdir(), 'fates-current-candidate-'));
  temporaryPaths.push(root);
  await mkdir(join(root, 'compatibility-sets'), { recursive: true });
  await writeFile(join(root, 'current-candidate.json'), JSON.stringify(pointerDocument));
  if (manifest !== null) await writeFile(join(root, pointer.manifest), JSON.stringify(manifest));
  return root;
}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function createRepository(originUrl = 'https://github.com/hourwise/Project-Ananke') {
  const directory = await mkdtemp(join(tmpdir(), 'fates-materializer-repo-'));
  temporaryPaths.push(directory);
  git(['init'], directory);
  git(['branch', '-M', 'main'], directory);
  git(['config', 'user.email', 'fates-test@example.invalid'], directory);
  git(['config', 'user.name', 'Fates Materializer Test'], directory);
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

test('correct current pointer and manifest resolve to the exact successor candidate', () => {
  const { pointer: resolvedPointer, manifest } = loadCurrentCandidate();
  assert.deepEqual(resolvedPointer, pointer);
  assert.equal(manifest.repositories.adrasteia.commit, '6aba3ef466a16292689d4afaf9f9bc40dc013301');
  assert.equal(manifest.repositories.ananke.commit, 'f5b071bb3f36a3721ca58811c74af5031c456832');
  assert.equal(manifest.repositories.mnemosyne.commit, '24f8541ce0e0a2f56171544a249cff56e7b634d1');
  assert.equal(manifest.repositories.horae.commit, '3a174b3f1bf791b437a22b4cfd41bf9677b9cba9');
  assert.equal(manifest.repositories['moirae-code'].commit, 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1');
  assert.equal(manifest.repositories.integration.commit, '51bad96d3a28b6727de4cffae54b399b9025de5f');
});

test('missing manifest and malformed manifest fail before materialization', async () => {
  const missingRoot = await temporaryCandidateRoot({ manifest: null });
  assert.throws(() => loadCurrentCandidate({ root: missingRoot, schemaRoot: repositoryRoot }), /cannot be read/);

  const malformedRoot = await temporaryCandidateRoot({ manifest: {} });
  assert.throws(() => loadCurrentCandidate({ root: malformedRoot, schemaRoot: repositoryRoot }), /fails fates-lock schema/);
});

test('historical fates-lock disagreement cannot influence the current pointer', async () => {
  const root = await temporaryCandidateRoot();
  await writeFile(join(root, 'fates-lock.json'), JSON.stringify({ compatibilitySetId: 'fates-slice-003a-r1-2026-08-11', snapshotPath: 'compatibility-sets/fates-slice-003a-r1-2026-08-11.json' }));
  const resolved = loadCurrentCandidate({ root, schemaRoot: repositoryRoot });
  assert.equal(resolved.pointer.candidate, 'fates-pre-qwen-security-2026-08-25');
  assert.equal(resolved.manifest.compatibilitySetId, 'fates-pre-qwen-security-2026-08-25');
});

test('verification rejects a nonexistent SHA and never falls back to a branch head', async () => {
  const checkout = await createRepository();
  const nonexistent = '0123456789abcdef0123456789abcdef01234567';
  assert.throws(() => verifyMaterializedRepository({
    directory: checkout.directory,
    expectedUrl: 'https://github.com/hourwise/Project-Ananke',
    expectedCommit: nonexistent,
  }), /expected commit object is unavailable/);
  assert.equal(git(['rev-parse', 'HEAD'], checkout.directory), checkout.second);
});

test('wrong repository identity fails closed', async () => {
  const checkout = await createRepository('https://github.com/hourwise/Project-Mnemosyne');
  assert.throws(() => verifyMaterializedRepository({
    directory: checkout.directory,
    expectedUrl: 'https://github.com/hourwise/Project-Ananke',
    expectedCommit: checkout.second,
  }), /origin mismatch/);
});

test('verify-only rejects a wrong HEAD, while materialize mode safely checks out the exact clean pin', async () => {
  const source = await createRepository('https://github.com/hourwise/Project-Ananke');
  const workspace = await mkdtemp(join(tmpdir(), 'fates-materializer-workspace-'));
  temporaryPaths.push(workspace);
  const target = join(workspace, 'Project Ananke');
  const sourceUrl = `file:///${source.directory.replaceAll('\\', '/')}`;
  git(['clone', sourceUrl, target], workspace);
  assert.equal(git(['rev-parse', 'HEAD'], target), source.second);
  assert.throws(() => verifyMaterializedRepository({ directory: target, expectedUrl: sourceUrl, expectedCommit: source.first }), /HEAD mismatch/);

  await materializeRepository({
    key: 'ananke',
    repository: { url: sourceUrl, commit: source.first },
    workspaceRoot: workspace,
    verifyOnly: false,
  });
  assert.equal(git(['rev-parse', 'HEAD'], target), source.first);
});

test('dirty checkout fails closed without reset or clean', async () => {
  const checkout = await createRepository();
  await writeFile(join(checkout.directory, 'local-only.txt'), 'do not remove\n');
  assert.throws(() => verifyMaterializedRepository({
    directory: checkout.directory,
    expectedUrl: 'https://github.com/hourwise/Project-Ananke',
    expectedCommit: checkout.second,
  }), /dirty/);
  assert.equal(await readFile(join(checkout.directory, 'local-only.txt'), 'utf8'), 'do not remove\n');
});

test('artifact digest mismatch fails closed', async () => {
  const artifact = await mkdtemp(join(tmpdir(), 'fates-artifact-test-'));
  temporaryPaths.push(artifact);
  const file = join(artifact, 'project-runtime-contracts.tgz');
  await writeFile(file, 'not-the-declared-artifact');
  const expected = '0'.repeat(64);
  await assert.rejects(() => verifyArtifactFile(file, expected), /digest mismatch/);
  const actual = createHash('sha256').update('not-the-declared-artifact').digest('hex');
  assert.notEqual(actual, expected);
});
