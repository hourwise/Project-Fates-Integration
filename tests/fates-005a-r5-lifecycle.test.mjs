import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { lstat, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { areImplementationPathsAllowed, assertRepo, captureChild, checkImplementationRepo, stopChild, waitForPath } from '../scripts/fates-005a-live-acceptance.mjs';

const integrationRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const liveAcceptanceScript = join(integrationRoot, 'scripts', 'fates-005a-live-acceptance.mjs');
const hostListenerScript = join(integrationRoot, 'scripts', 'fates-005a-vsock-host.mjs');
const installedHelper = '/usr/local/libexec/fates-005a-host-control';
const reposRoot = resolve(integrationRoot, '..');
const moiraeRoot = join(reposRoot, 'moirae-code');
const moiraeDist = join(moiraeRoot, 'packages', 'sandbox-adapter', 'dist', 'index.js');
const hostControlSourcePath = join(integrationRoot, 'scripts', 'fates-005a-host-control.c');
const acceptanceDesignPath = join(integrationRoot, 'docs', 'design', 'FATES-005A-live-acceptance.md');
const lifecycleFixturePath = '/home/fatesadmin/fates-005a/diagnostics/r4/guest-initrd.cpio';
const lifecycleFixtureSha256 = '51eb8d4ac3bdff9d1d17a591ae9a148f514b48e0984be0331ff99b03144f446b';
const integrationPublicationBaseline = '35a00e881df8e5143eb86bf88332292b8baaa13d';
const integrationR51 = 'df5422c7364d9ddddfc516d2e36aea5ec63fd663';
const moiraeR5Implementation = '832d35d3fe14e5539059adfedf43ce1159d2fbd8';

function fixedEnvironment() {
  return { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' };
}

function gitIn(directory, args) {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8', shell: false, env: process.env });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function parseJsonLines(stdout) {
  return String(stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

test('R5.2 publication allowlist enumerates retained historical evidence exactly', () => {
  const source = readFileSync(liveAcceptanceScript, 'utf8');
  const historicalPaths = [
    'docs/evidence/FATES-005A-live-acceptance-attempt-001.json',
    'docs/evidence/FATES-005A-live-acceptance-attempt-002.json',
    'docs/evidence/FATES-005A-live-acceptance-attempt-003.json',
  ];
  for (const path of historicalPaths) {
    assert.equal(areImplementationPathsAllowed('integration-publication', [path]), true, path);
    assert.equal(source.includes(`'${path}'`), true, path);
  }
  assert.equal(areImplementationPathsAllowed('integration-publication', ['docs/evidence/FATES-005A-live-acceptance-attempt-004.json']), false);
  assert.equal(areImplementationPathsAllowed('integration-publication', ['docs/evidence/FATES-005A-live-acceptance-attempt-999.json']), false);
  assert.equal(source.includes('docs/evidence/**'), false);
  assert.equal(source.includes('FATES-005A-live-acceptance-attempt-*.json'), false);

  const diff = spawnSync('git', ['-C', integrationRoot, 'diff', '--name-only', `${integrationPublicationBaseline}..${integrationR51}`], { encoding: 'utf8', shell: false, env: process.env });
  assert.equal(diff.status, 0, diff.stderr);
  const changedPaths = diff.stdout.split(/\r?\n/).filter(Boolean);
  assert.ok(changedPaths.length > 0);
  assert.equal(areImplementationPathsAllowed('integration-publication', changedPaths), true, changedPaths.join(', '));
});

test('implementation preflight rejects a descendant fixture with an unsupported changed path', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fates-005a-r52-implementation-'));
  try {
    gitIn(directory, ['init', '--quiet']);
    gitIn(directory, ['config', 'user.email', 'fates-005a-tests@example.invalid']);
    gitIn(directory, ['config', 'user.name', 'FATES-005A tests']);
    await writeFile(join(directory, 'baseline.txt'), 'baseline\n', 'utf8');
    gitIn(directory, ['add', 'baseline.txt']);
    gitIn(directory, ['commit', '--quiet', '-m', 'baseline']);
    const baseline = gitIn(directory, ['rev-parse', 'HEAD']);
    await writeFile(join(directory, 'unsupported-file.txt'), 'unsupported\n', 'utf8');
    gitIn(directory, ['add', 'unsupported-file.txt']);
    gitIn(directory, ['commit', '--quiet', '-m', 'unsupported descendant']);
    const implementation = gitIn(directory, ['rev-parse', 'HEAD']);

    const check = checkImplementationRepo('integration-publication', directory, baseline, implementation);
    assert.equal(check.implementationBaseMatch, true);
    assert.equal(check.clean, true);
    assert.equal(check.implementationDiffAllowed, false);
    assert.deepEqual(check.changedPaths, ['unsupported-file.txt']);
    assert.throws(() => assertRepo(check, 'integration-publication'), /implementation checkpoint contains unsupported changes: unsupported-file\.txt/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

const implementationPlanEnabled = process.env.FATES_005A_R5_RUN_IMPLEMENTATION_PLAN === '1';
test('implementation-aware plan passes without creating Attempt 005 runtime state', { skip: implementationPlanEnabled ? false : 'requires explicit remote plan authorization' }, () => {
  const integrationImplementation = gitIn(integrationRoot, ['rev-parse', 'HEAD']);
  const result = spawnSync(process.execPath, [
    liveAcceptanceScript,
    '--plan',
    '--attempt-id', '005',
    '--repos-root', reposRoot,
    '--moirae-implementation-commit', moiraeR5Implementation,
    '--integration-implementation-commit', integrationImplementation,
  ], { cwd: integrationRoot, encoding: 'utf8', shell: false, env: fixedEnvironment() });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'plan');
  assert.equal(output.result, 'NOT_EXECUTED');
  assert.equal(output.implementationEligibility, 'PASS');
  assert.deepEqual(output.implementationCheckpoints, { moiraeCode: moiraeR5Implementation, integration: integrationImplementation });
  assert.equal(output.candidate.status, 'provisional');
  assert.equal(output.evidenceCreated, false);
  assert.equal(output.repositories.find((repository) => repository.name === 'moirae-code').implementationDiffAllowed, true);
  assert.equal(output.repositories.find((repository) => repository.name === 'integration-publication').implementationDiffAllowed, true);
  for (const path of [
    '/run/netns/fates-005a-005',
    '/srv/jailer/firecracker/fates-005a-005',
    '/home/fatesadmin/fates-005a/attempts/fates-005a-005',
    join(integrationRoot, 'docs', 'evidence', 'FATES-005A-live-acceptance-attempt-005.json'),
  ]) assert.equal(existsSync(path), false, path);
});

test('R5 lifecycle fixture path and digest are bound to the retained diagnostic artifact', () => {
  const source = readFileSync(hostControlSourcePath, 'utf8');
  const documentation = readFileSync(acceptanceDesignPath, 'utf8');
  const pathMatch = source.match(/^#define LIFECYCLE_TEST_INITRD "([^"]+)"$/m);
  const digestMatch = source.match(/^#define LIFECYCLE_TEST_INITRD_SHA256 "([0-9a-f]{64})"$/m);
  const documentedFixture = documentation.split(/\r?\n/).find((line) => line.startsWith('| lifecycle-test initrd |'));
  assert.ok(pathMatch, 'helper must declare the lifecycle fixture path');
  assert.ok(digestMatch, 'helper must declare the lifecycle fixture digest');
  assert.equal(pathMatch[1], lifecycleFixturePath);
  assert.equal(digestMatch[1], lifecycleFixtureSha256);
  assert.equal(documentedFixture, `| lifecycle-test initrd | \`${lifecycleFixturePath}\` | \`${lifecycleFixtureSha256}\` |`);
  assert.match(documentation, /byte-for-byte matches a static build of the exact pinned Moirae proposal\s+source at `832d35d3fe14e5539059adfedf43ce1159d2fbd8`/);
});

test('real non-acceptance lifecycle is available only as an explicit root-gated check', { skip: process.platform !== 'linux' || process.env.FATES_005A_R5_RUN_LIVE_LIFECYCLE !== '1' ? 'requires explicit Linux/KVM lifecycle authorization' : false }, () => {
  const result = spawnSync('sudo', ['-n', installedHelper, '--self-test'], { encoding: 'utf8', shell: false, env: fixedEnvironment() });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /live lifecycle: PASS identity=PASS launcher-distinct=PASS pidfile=PASS namespace-object=PASS loopback-only=PASS no-guest-nic=PASS inspect=PASS cleanup=PASS no-survivor=PASS/);
  const json = parseJsonLines(result.stdout);
  const inspected = json.find((value) => value.operation === 'inspect' && value.attemptId === 'fates-r5-lifecycle-test');
  const cleaned = json.find((value) => value.operation === 'cleanup' && value.attemptId === 'fates-r5-lifecycle-test');
  assert.ok(inspected, 'internal lifecycle must emit an inspect record');
  assert.equal(inspected.firecrackerPidAlive, true);
  assert.equal(inspected.firecrackerPid !== inspected.launcherPid, true);
  assert.equal(inspected.netnsMatch, true);
  assert.equal(inspected.linksOnlyLoopback, true);
  assert.equal(inspected.noGuestNic, true);
  assert.equal(inspected.firecrackerUid, 65532);
  assert.equal(inspected.firecrackerGid, 65532);
  assert.ok(cleaned, 'internal lifecycle must emit a cleanup record');
  assert.equal(cleaned.firecrackerStopped, true);
  assert.equal(cleaned.namespaceRemoved, true);
  assert.equal(cleaned.jailRemoved, true);
  assert.equal(existsSync('/run/netns/fates-r5-lifecycle-test'), false);
  assert.equal(existsSync('/srv/jailer/firecracker/fates-r5-lifecycle-test'), false);
  assert.equal(existsSync('/home/fatesadmin/fates-005a/attempts/fates-r5-lifecycle-test'), false);
  assert.equal(existsSync('/run/netns/fates-005a-004'), false);
  assert.equal(existsSync('/srv/jailer/firecracker/fates-005a-004'), false);
  assert.equal(existsSync('/home/fatesadmin/fates-005a/attempts/fates-005a-004'), false);
  assert.equal(existsSync(join(integrationRoot, 'docs', 'evidence', 'FATES-005A-live-acceptance-attempt-004.json')), false);
});

test('governed listener readiness is a bound UDS and the shared stop path closes and unlinks it', { skip: process.platform !== 'linux' || process.arch !== 'x64' || !existsSync(moiraeDist) ? 'requires the Linux host and pinned Moirae build' : false }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fates-005a-r5-listener-'));
  const socketPath = join(directory, 'vsock.sock_7000');
  const readyFile = join(directory, 'host-ready');
  const child = spawn(process.execPath, [hostListenerScript, '--socket', socketPath, '--session-id', 'fates-r5-listener-lifecycle', '--moirae-implementation-commit', 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1', '--workspace-root', reposRoot, '--moirae-root', moiraeRoot, '--durable-state-root', join(directory, 'state'), '--ready-file', readyFile], { cwd: integrationRoot, env: fixedEnvironment(), shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const capture = captureChild(child);
  try {
    assert.equal(await waitForPath(readyFile, 5_000), true, capture.output.stderr);
    const readySocket = await lstat(socketPath);
    assert.equal(readySocket.isSocket(), true);
    assert.equal((await lstat(readyFile)).isFile(), true);
    assert.equal(await stopChild(child, capture, 250), true);
    await capture.completion.catch(() => undefined);
    await assert.rejects(lstat(socketPath));
  } finally {
    await stopChild(child, capture, 100);
    await rm(directory, { recursive: true, force: true });
  }
});

test('shared stop path forces a stubborn child and waits for close', { skip: process.platform === 'win32' ? 'signal semantics differ on Windows' : false }, async () => {
  const child = spawn(process.execPath, ['--input-type=module', '-e', "process.on('SIGTERM', () => {}); process.stdout.write('ready\\n'); setInterval(() => {}, 1000);"], { cwd: integrationRoot, env: fixedEnvironment(), shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const capture = captureChild(child);
  try {
    for (let attempt = 0; attempt < 100 && !capture.output.stdout.includes('ready'); attempt++) await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    assert.match(capture.output.stdout, /ready/);
    assert.equal(await stopChild(child, capture, 50), true);
    const result = await capture.completion;
    assert.equal(result.signal, 'SIGKILL');
    assert.equal(capture.isClosed(), true);
  } finally {
    await stopChild(child, capture, 50);
  }
});
