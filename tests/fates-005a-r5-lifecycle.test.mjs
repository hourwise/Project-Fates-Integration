import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { lstat, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { captureChild, stopChild, waitForPath } from '../scripts/fates-005a-live-acceptance.mjs';

const integrationRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const hostListenerScript = join(integrationRoot, 'scripts', 'fates-005a-vsock-host.mjs');
const installedHelper = '/usr/local/libexec/fates-005a-host-control';
const reposRoot = resolve(integrationRoot, '..');
const moiraeRoot = join(reposRoot, 'moirae-code');
const moiraeDist = join(moiraeRoot, 'packages', 'sandbox-adapter', 'dist', 'index.js');

function fixedEnvironment() {
  return { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' };
}

function parseJsonLines(stdout) {
  return String(stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

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
    assert.notEqual(child.exitCode, null);
  } finally {
    await stopChild(child, capture, 50);
  }
});
