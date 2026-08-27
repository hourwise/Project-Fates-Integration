// Materialize or verify the exact candidate selected by current-candidate.json.
// This command deliberately does not read fates-lock.json and never substitutes
// a branch head, main, or latest tag for a declared full commit.

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSchemaValidators, validateDocument } from './validate-json.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptDirectory, '..');
export const currentCandidatePath = 'current-candidate.json';
export const requiredPeerKeys = ['adrasteia', 'ananke', 'mnemosyne', 'horae', 'moirae-code'];
export const fullShaPattern = /^[0-9a-f]{40}$/;
export const sha256Pattern = /^[0-9a-f]{64}$/;

export const peerDefinitions = Object.freeze({
  adrasteia: { displayName: 'Adrasteia', directory: 'Project Runtime Contracts', canonicalUrl: 'https://github.com/hourwise/Project-Adrasteia' },
  ananke: { displayName: 'Ananke', directory: 'Project Ananke', canonicalUrl: 'https://github.com/hourwise/Project-Ananke' },
  mnemosyne: { displayName: 'Mnemosyne', directory: 'Project Mnemosyne', canonicalUrl: 'https://github.com/hourwise/Project-Mnemosyne' },
  horae: { displayName: 'Horae', directory: 'Project Horae', canonicalUrl: 'https://github.com/hourwise/Project-Horae' },
  'moirae-code': { displayName: 'Moirae Code', directory: 'Project Moirae Code', canonicalUrl: 'https://github.com/hourwise/Project-Moirae-Code' },
});

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonFile(path, label) {
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

export function assertFullSha(value, label) {
  if (typeof value !== 'string' || !fullShaPattern.test(value)) fail(`${label} must be a lowercase 40-hex commit SHA`);
}

export function normalizeGitUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') fail('Git origin URL is empty');
  let url = value.trim().replace(/^git\+/, '').replace(/\/$/, '');
  if (url.startsWith('git@')) {
    const match = /^git@([^:]+):(.+)$/.exec(url);
    if (match) url = `https://${match[1]}/${match[2]}`;
  } else if (url.startsWith('ssh://')) {
    url = url.replace(/^ssh:\/\//, 'https://');
  }
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase()}`;
  } catch {
    fail(`Git origin URL is not a supported URL: ${value}`);
  }
}

function canonicalPath(path) {
  return resolve(path).replace(/[\\/]+$/, '').toLowerCase();
}

function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) fail(`git ${args.join(' ')} failed in ${cwd}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`git ${args.join(' ')} failed in ${cwd}${detail ? `: ${detail}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function tryGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? (result.stdout || '').trim() : null;
}

function assertInsideRoot(root, candidatePath, label) {
  const relativePath = relative(root, candidatePath);
  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) fail(`${label} must remain inside the materialization root`);
}

export function validateCurrentCandidatePointer(pointer) {
  if (!isPlainObject(pointer)) fail('current-candidate.json must contain an object');
  const allowed = new Set(['candidate', 'manifest', 'status']);
  for (const key of Object.keys(pointer)) if (!allowed.has(key)) fail(`current-candidate.json has unknown field: ${key}`);
  if (typeof pointer.candidate !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pointer.candidate)) fail('current-candidate.json candidate is invalid');
  if (pointer.manifest !== `compatibility-sets/${pointer.candidate}.json`) fail('current-candidate.json must point to the candidate-named compatibility manifest');
  if (pointer.status !== 'provisional') fail('current-candidate.json status must remain provisional');
  return pointer;
}

function validateRepositoryEntry(key, repository, origins) {
  if (!isPlainObject(repository)) fail(`current candidate repository ${key} is missing`);
  assertFullSha(repository.commit, `${key} commit`);
  if (typeof repository.url !== 'string') fail(`${key} repository URL is missing`);
  const definition = peerDefinitions[key];
  if (normalizeGitUrl(repository.url) !== normalizeGitUrl(definition.canonicalUrl)) fail(`${key} repository identity does not match ${definition.canonicalUrl}`);
  const origin = normalizeGitUrl(repository.url);
  if (origins.has(origin)) fail(`current candidate has duplicate peer repository identity: ${origin}`);
  origins.add(origin);
  if (repository.branch !== null && repository.branch !== undefined && (typeof repository.branch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(repository.branch))) fail(`${key} branch is invalid`);
  if (repository.checkpointState === 'sealed_tagged' && typeof repository.tag !== 'string') fail(`${key} sealed_tagged checkpoint requires a tag`);
  if (repository.checkpointState === 'pushed_untagged' && repository.tag !== null) fail(`${key} pushed_untagged checkpoint must have tag null`);
}

export function validateCandidateManifest(manifest, pointer) {
  if (!isPlainObject(manifest)) fail('current candidate manifest must contain an object');
  if (manifest.compatibilitySetId !== pointer.candidate) fail('current candidate pointer and manifest IDs disagree');
  if (manifest.snapshotPath !== pointer.manifest) fail('current candidate manifest snapshotPath disagrees with current-candidate.json');
  if (manifest.sealStatus !== 'provisional') fail('current candidate manifest must remain provisional');
  if (manifest.integrationLevel !== 'partial_runtime') fail('current candidate must remain a partial_runtime candidate');
  if (!isPlainObject(manifest.candidateOperation) || manifest.candidateOperation.status !== 'bounded_vertical') fail('current candidate bounded operation metadata is missing');
  if (manifest.candidateOperation.mnemosyneParticipation !== 'STRICT_ADMISSION') fail('current candidate must identify strict Mnemosyne admission for this operation');
  if (manifest.candidateOperation.contractRuntimeVersion !== manifest.securityBinding?.contractRuntimeVersion) fail('candidate contract/runtime versions disagree');
  if (manifest.securityBinding?.status !== 'security_binding_incomplete') fail('current candidate must remain security_binding_incomplete');
  if (!isPlainObject(manifest.repositories)) fail('current candidate manifest repositories must be an object');

  const expectedKeys = new Set([...requiredPeerKeys, 'integration']);
  for (const key of Object.keys(manifest.repositories)) if (!expectedKeys.has(key)) fail(`current candidate has unknown repository key: ${key}`);
  const origins = new Set();
  for (const key of requiredPeerKeys) validateRepositoryEntry(key, manifest.repositories[key], origins);

  const integration = manifest.repositories.integration;
  if (!isPlainObject(integration)) fail('current candidate integration identity is missing');
  assertFullSha(integration.commit, 'integration control commit');
  if (normalizeGitUrl(integration.url) !== normalizeGitUrl('https://github.com/hourwise/Project-Fates-Integration')) fail('integration repository identity is incorrect');
  if (!isPlainObject(manifest.securityBinding.integrationIdentity)) fail('candidate Integration identity contract is missing');
  assertFullSha(manifest.securityBinding.integrationIdentity.controlCommit, 'Integration control commit');
  if (manifest.securityBinding.integrationIdentity.controlCommit !== integration.commit) fail('Integration manifest pin and control identity disagree');
  if (manifest.securityBinding.integrationIdentity.identityMode !== 'non_recursive_control_commit') fail('unsupported Integration identity mode');

  const artifact = manifest.repositories.adrasteia.artifact;
  if (!isPlainObject(artifact) || typeof artifact.url !== 'string' || !sha256Pattern.test(artifact.sha256)) fail('Runtime Contracts artifact URL/SHA-256 is invalid');
  if (!artifact.url.startsWith('https://')) fail('Runtime Contracts artifact must use HTTPS');
  assertFullSha(manifest.repositories.adrasteia.artifactSourceCommit, 'Runtime Contracts artifact source commit');
  if (!Array.isArray(manifest.knownLimits) || manifest.knownLimits.length === 0) fail('current candidate knownLimits are required');
  return manifest;
}

export function loadCurrentCandidate({ root = repositoryRoot, schemaRoot = repositoryRoot } = {}) {
  const absoluteRoot = resolve(root);
  const pointerPath = resolve(absoluteRoot, currentCandidatePath);
  const pointer = validateCurrentCandidatePointer(parseJsonFile(pointerPath, currentCandidatePath));
  const manifestPath = resolve(absoluteRoot, pointer.manifest);
  assertInsideRoot(absoluteRoot, manifestPath, 'candidate manifest');
  const manifest = parseJsonFile(manifestPath, pointer.manifest);
  const validators = createSchemaValidators(schemaRoot);
  const schemaResult = validateDocument(validators, 'fates-lock', manifest);
  if (!schemaResult.valid) fail(`candidate manifest fails fates-lock schema: ${JSON.stringify(schemaResult.errors)}`);
  validateCandidateManifest(manifest, pointer);
  return { pointer, manifest, pointerPath, manifestPath };
}

export function inspectRepositoryIdentityAndClean({ directory, expectedUrl }) {
  if (!existsSync(directory)) fail(`peer checkout is missing: ${directory}`);
  const topLevel = runGit(['rev-parse', '--show-toplevel'], directory);
  if (canonicalPath(topLevel) !== canonicalPath(directory)) fail(`peer checkout root mismatch: ${directory}`);
  const actualUrl = runGit(['remote', 'get-url', 'origin'], directory);
  if (normalizeGitUrl(actualUrl) !== normalizeGitUrl(expectedUrl)) fail(`peer checkout origin mismatch at ${directory}: expected ${expectedUrl}, got ${actualUrl}`);
  const status = runGit(['status', '--porcelain=v1', '--untracked-files=all'], directory);
  if (status !== '') fail(`peer checkout is dirty; refusing to mutate ${directory}`);
  return { directory, origin: actualUrl };
}

export function verifyMaterializedRepository({ directory, expectedUrl, expectedCommit }) {
  inspectRepositoryIdentityAndClean({ directory, expectedUrl });
  assertFullSha(expectedCommit, 'expected peer commit');
  try {
    runGit(['cat-file', '-e', `${expectedCommit}^{commit}`], directory);
  } catch {
    fail(`expected commit object is unavailable in ${directory}: ${expectedCommit}`);
  }
  const head = runGit(['rev-parse', 'HEAD'], directory);
  if (head !== expectedCommit) fail(`peer HEAD mismatch at ${directory}: expected ${expectedCommit}, got ${head}`);
  return { directory, head, status: 'VERIFIED' };
}

function verifyRemoteReference({ directory, repository, key }) {
  const reference = repository.tag ? `refs/tags/${repository.tag}` : repository.branch ? `refs/heads/${repository.branch}` : null;
  if (!reference) return { status: 'NOT_DECLARED' };
  let output;
  try {
    output = runGit(['ls-remote', 'origin', reference], directory);
  } catch (error) {
    fail(`${key} declared ${reference} cannot be remotely verified: ${error.message}`);
  }
  const lines = output.split(/\r?\n/).filter(Boolean);
  const matching = lines.find((line) => line.split(/\s+/)[0] === repository.commit);
  if (!matching) fail(`${key} declared ${reference} does not resolve to ${repository.commit}`);
  return { status: 'VERIFIED', reference, commit: repository.commit };
}

export async function materializeRepository({ key, repository, workspaceRoot, verifyOnly, verifyRemote = false }) {
  const definition = peerDefinitions[key];
  const directory = resolve(workspaceRoot, definition.directory);
  assertInsideRoot(resolve(workspaceRoot), directory, `${key} checkout`);
  assertFullSha(repository.commit, `${key} commit`);

  if (verifyOnly) {
    const verified = verifyMaterializedRepository({ directory, expectedUrl: repository.url, expectedCommit: repository.commit });
    if (verifyRemote) verifyRemoteReference({ directory, repository, key });
    return { key, directory, head: verified.head, status: verified.status };
  }

  await mkdir(workspaceRoot, { recursive: true });
  if (!existsSync(directory)) {
    runGit(['clone', '--no-checkout', repository.url, directory], workspaceRoot);
  } else {
    inspectRepositoryIdentityAndClean({ directory, expectedUrl: repository.url });
  }

  if (verifyRemote) verifyRemoteReference({ directory, repository, key });
  // Fetch the exact object requested by the manifest. A missing object is a
  // hard error; no branch, main, or tag is used as a fallback.
  runGit(['fetch', '--no-tags', 'origin', repository.commit], directory);
  try {
    runGit(['cat-file', '-e', `${repository.commit}^{commit}`], directory);
  } catch {
    fail(`manifest commit was not fetched for ${key}: ${repository.commit}`);
  }

  const head = runGit(['rev-parse', 'HEAD'], directory);
  const branch = tryGit(['symbolic-ref', '--short', '-q', 'HEAD'], directory);
  if (head !== repository.commit || branch) runGit(['checkout', '--detach', repository.commit], directory);
  const verified = verifyMaterializedRepository({ directory, expectedUrl: repository.url, expectedCommit: repository.commit });
  return { key, directory, head: verified.head, status: verified.status };
}

export async function verifyArtifactFile(path, expectedSha256) {
  if (!existsSync(path)) fail(`Runtime Contracts artifact is missing: ${path}`);
  if (!sha256Pattern.test(expectedSha256)) fail('Runtime Contracts artifact SHA-256 is invalid');
  const digest = createHash('sha256').update(await readFile(path)).digest('hex');
  if (digest !== expectedSha256) fail(`Runtime Contracts artifact digest mismatch: expected ${expectedSha256}, got ${digest}`);
  return { source: path, sha256: digest, status: 'VERIFIED' };
}

export async function downloadAndVerifyArtifact(artifact, artifactPath) {
  if (artifactPath) return verifyArtifactFile(resolve(artifactPath), artifact.sha256);
  let response;
  try {
    response = await fetch(artifact.url, { redirect: 'follow' });
  } catch (error) {
    fail(`Runtime Contracts artifact download failed: ${error.message}`);
  }
  if (!response.ok) fail(`Runtime Contracts artifact download failed with HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > 50 * 1024 * 1024) fail('Runtime Contracts artifact exceeds the materializer size limit');
  const temporaryPath = join(tmpdir(), `fates-runtime-contracts-${randomUUID()}.tgz`);
  try {
    await writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()));
    return await verifyArtifactFile(temporaryPath, artifact.sha256);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export function parseArguments(argv) {
  const result = {
    root: process.env.FATES_MATERIALIZATION_ROOT ? resolve(process.env.FATES_MATERIALIZATION_ROOT) : resolve(repositoryRoot, '..'),
    verifyOnly: false,
    verifyRemote: false,
    artifactPath: process.env.FATES_RUNTIME_CONTRACTS_ARTIFACT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--verify-only') result.verifyOnly = true;
    else if (argument === '--verify-remote') result.verifyRemote = true;
    else if (argument === '--root') {
      if (!argv[index + 1]) fail('--root requires a path');
      result.root = resolve(argv[++index]);
    } else if (argument === '--artifact') {
      if (!argv[index + 1]) fail('--artifact requires a file path');
      result.artifactPath = argv[++index];
    } else fail(`unknown materializer option: ${argument}`);
  }
  if (result.verifyOnly && !result.verifyRemote) result.verifyRemote = false;
  return result;
}

export async function materializeCurrentCandidate(options = {}) {
  const args = { ...parseArguments([]), ...options };
  const { pointer, manifest } = loadCurrentCandidate({ root: repositoryRoot });
  const artifact = await downloadAndVerifyArtifact(manifest.repositories.adrasteia.artifact, args.artifactPath);
  const results = [];
  for (const key of requiredPeerKeys) {
    results.push(await materializeRepository({ key, repository: manifest.repositories[key], workspaceRoot: args.root, verifyOnly: args.verifyOnly, verifyRemote: args.verifyRemote || !args.verifyOnly }));
  }
  return { pointer, manifest, artifact, results, workspaceRoot: args.root, verifyOnly: args.verifyOnly, verifyRemote: args.verifyRemote || !args.verifyOnly };
}

async function run() {
  const args = parseArguments(process.argv.slice(2));
  const result = await materializeCurrentCandidate(args);
  console.log('FATES CURRENT CANDIDATE');
  console.log(result.pointer.candidate);
  console.log(`status: ${result.pointer.status}`);
  console.log(`workspace: ${result.workspaceRoot}`);
  for (const item of result.results) {
    const definition = peerDefinitions[item.key];
    console.log(`${definition.displayName.padEnd(16)} ${item.head}  ${item.status}`);
  }
  console.log(`Runtime Contracts artifact: ${result.artifact.status} (${result.artifact.sha256})`);
  console.log(`remote references: ${result.verifyRemote ? 'verified' : 'not requested'}`);
  console.log(`mode: ${result.verifyOnly ? 'verify-only' : 'materialize'}`);
  console.log('CANDIDATE MATERIALIZATION: PASS');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`CANDIDATE MATERIALIZATION: FAIL\n${error.message}`);
    process.exitCode = 1;
  });
}
