import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FATES_005A_PROPOSAL_PROFILE_ID,
  authorizeDiagnosticListenerHostControl,
  authorizeListenerHostControl,
  fixedAttemptInputPath,
  guestVsockSocketPath,
  invokeHostControl,
  validateAttemptId,
  validateProposal,
} from '../scripts/fates-005a-host-control-client.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const helperSource = join(root, 'scripts', 'fates-005a-host-control.c');
const stagedDigestHarness = join(root, 'tests', 'fates-005a-staged-digest.test.c');
const socketPermissionHarness = join(root, 'tests', 'fates-005a-vsock-permission.test.c');

test('host-control client accepts only the fixed attempt identity and proposal fields', () => {
  assert.equal(validateAttemptId('fates-005a-001'), 'fates-005a-001');
  for (const value of ['001', 'fates-005a-01', 'fates-005a-0001', 'fates-005a-../', 'fates-005a-001/other', 'fates-005a-abc']) {
    assert.throws(() => validateAttemptId(value), /attempt ID/);
  }
  const proposal = validateProposal({ requestId: 'req_1', correlationId: 'cor_1', sourceId: 'file:docs/fates-005c.md', sourceHash: 'a'.repeat(64), memoryId: 'memory_1', idempotencyKey: 'key_1' });
  assert.equal(proposal.sourceId, 'file:docs/fates-005c.md');
  assert.throws(() => validateProposal({ ...proposal, sourceId: '/etc/passwd' }), /sourceId/);
  assert.throws(() => validateProposal({ ...proposal, requestId: '../root' }), /requestId/);
  assert.throws(() => validateProposal({ ...proposal, sourceHash: '0' }), /sourceHash/);
  assert.equal(fixedAttemptInputPath('fates-005a-001'), '/home/fatesadmin/fates-005a/attempts/fates-005a-001/guest-initrd.cpio');
  assert.equal(guestVsockSocketPath('fates-005a-001'), '/srv/jailer/firecracker/fates-005a-001/root/run/fates/vsock.sock_7000');
});

test('client never supplies a shell, ambient PATH, arbitrary executable, or arbitrary environment', () => {
  let call;
  const output = invokeHostControl('--version', [], {
    binary: '/test-only/host-control',
    spawnImpl: (...args) => {
      call = args;
      return { status: 0, stdout: 'fates-005a-host-control-v1\n', stderr: '' };
    },
  });
  assert.equal(output, 'fates-005a-host-control-v1');
  assert.deepEqual(call[0], 'sudo');
  assert.deepEqual(call[1], ['-n', '/test-only/host-control', '--version']);
  assert.equal(call[2].shell, false);
  assert.deepEqual(call[2].env, { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
  assert.throws(() => invokeHostControl('arbitrary-shell', []), /unsupported/);
});

test('client exposes only the fixed listener authorization operations', () => {
  const calls = [];
  const spawnImpl = (...args) => {
    calls.push(args);
    const operation = args[1][2];
    const response = operation === 'authorize-listener'
      ? { operation, attemptId: 'fates-005a-001', socketUid: 1000, socketGid: 65532, socketMode: 400, socketModeOctal: '0620', socketOtherWritable: false }
      : { operation };
    return { status: 0, stdout: `${JSON.stringify(response)}\n`, stderr: '' };
  };
  const normal = authorizeListenerHostControl('fates-005a-001', { spawnImpl, binary: '/test-only/host-control' });
  const diagnostic = authorizeDiagnosticListenerHostControl({ spawnImpl, binary: '/test-only/host-control' });
  assert.equal(normal.operation, 'authorize-listener');
  assert.equal(diagnostic.operation, 'diagnostic-authorize-listener');
  assert.deepEqual(calls[0][1], ['-n', '/test-only/host-control', 'authorize-listener', '--attempt', 'fates-005a-001']);
  assert.deepEqual(calls[1][1], ['-n', '/test-only/host-control', 'diagnostic-authorize-listener']);
  assert.throws(() => authorizeListenerHostControl('fates-005a-../x', { spawnImpl }), /attempt ID/);
});

test('compiled helper self-test covers jail tree order, bounded modes, malformed values, and digest mismatch', { skip: process.platform !== 'linux' ? 'host-control binary is Linux-only' : false }, () => {
  const compiler = spawnSync('cc', ['--version'], { encoding: 'utf8', shell: false });
  if (compiler.status !== 0) return;
  const directory = mkdtempSync(join(tmpdir(), 'fates-005a-helper-test-'));
  const binary = join(directory, 'fates-005a-host-control');
  try {
    const built = spawnSync('cc', ['-std=c11', '-O2', '-Wall', '-Wextra', '-Werror', '-o', binary, helperSource], { encoding: 'utf8', shell: false });
    assert.equal(built.status, 0, built.stderr);
    const version = spawnSync(binary, ['--version'], { encoding: 'utf8', shell: false });
    assert.equal(version.status, 0);
    assert.equal(version.stdout.trim(), 'fates-005a-host-control-v1');
    const selfTest = spawnSync(binary, ['--self-test'], { encoding: 'utf8', shell: false });
    assert.equal(selfTest.status, 0, selfTest.stderr);
    const largeFixture = Buffer.alloc(743936);
    for (let i = 0; i < largeFixture.length; i++) largeFixture[i] = (i * 31 + 7) & 0xff;
    const digestFixtures = {
      empty: Buffer.alloc(0),
      small: Buffer.from('fates-005a-r4-small\n'),
      multiple64: Buffer.from(Array.from({ length: 64 }, (_, i) => i)),
      large: largeFixture,
    };
    for (const [name, fixture] of Object.entries(digestFixtures)) {
      const digest = createHash('sha256').update(fixture).digest('hex');
      assert.match(selfTest.stdout, new RegExp(`${name}=${digest}`));
    }
    assert.match(selfTest.stdout, /trust-check: metadata=PASS wrong-owner=PASS unsafe-directory=PASS symlink=PASS non-regular=PASS writable=PASS empty=PASS/);
    const failedPrepare = spawnSync(binary, [
      'prepare', '--attempt', 'fates-005a-001',
      '--request-id', 'req_1', '--correlation-id', 'cor_1',
      '--source-id', 'file:docs/fates-005c.md', '--source-sha256', 'a'.repeat(64),
      '--memory-id', 'memory_1', '--idempotency-key', 'key_1', '--initrd-sha256', 'b'.repeat(64),
    ], { encoding: 'utf8', shell: false });
    assert.notEqual(failedPrepare.status, 0);
    assert.match(failedPrepare.stderr, /FATES-005A prepare: verify (fixed|fresh initrd) [^:]+:/);
    assert.doesNotMatch(failedPrepare.stderr, /FATES-005A prepare: verify fresh initrd: Input\/output error/);
    assert.doesNotMatch(failedPrepare.stderr, /Success/);
    for (const args of [
      ['launch', '--attempt', '001'],
      ['cleanup', '--attempt', 'fates-005a-../'],
      ['inspect', '--attempt', 'fates-005a-001', '--target', '/'],
      ['authorize-listener', '--attempt', 'fates-005a-001', '--gid', '0'],
      ['authorize-listener', '--attempt', 'fates-005a-001', '--mode', '0777'],
      ['authorize-listener', '--attempt', 'fates-005a-001', '--path', '/tmp/socket'],
      ['diagnostic-authorize-listener', '--path', '/tmp/socket'],
      ['unknown', '--attempt', 'fates-005a-001'],
    ]) {
      const rejected = spawnSync(binary, args, { encoding: 'utf8', shell: false });
      assert.notEqual(rejected.status, 0, `unexpectedly accepted ${args.join(' ')}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('prepare verifies each staged artifact before creating Firecracker config', () => {
  const source = readFileSync(helperSource, 'utf8');
  const configIndex = source.indexOf('create_config(attempt, request_id');
  assert.notEqual(configIndex, -1);
  for (const [sourcePath, expectedDigest, copyPhase, digestPhase] of [
    ['GUEST_KERNEL_PATH', 'GUEST_KERNEL_SHA256', 'stage kernel', 'verify staged kernel digest'],
    ['GUEST_ROOTFS_PATH', 'GUEST_ROOTFS_SHA256', 'stage rootfs', 'verify staged rootfs digest'],
    ['g_initrd_source', 'initrd_sha256', 'stage guest initrd', 'verify staged guest initrd digest'],
  ]) {
    const call = new RegExp(`copy_and_verify_staged_artifact\\(\\s*${sourcePath},\\s*target,\\s*0644,\\s*${expectedDigest},\\s*"${copyPhase}",\\s*"${digestPhase}",\\s*1\\s*\\)`, 's');
    assert.match(source, call);
    const digestIndex = source.indexOf(`"${digestPhase}"`);
    assert.ok(digestIndex < configIndex, `${digestPhase} must precede config creation`);
  }
  assert.match(source, /open\(path, O_RDONLY \| O_CLOEXEC \| O_NOFOLLOW\)/);
  assert.match(source, /\(info\.st_mode & 0022\) != 0/);
  assert.match(source, /info\.st_uid != 0 \|\| info\.st_gid != 0/);
});

test('listener authorization is fixed, inode-bound, least privilege, and required before launch', () => {
  const source = readFileSync(helperSource, 'utf8');
  assert.match(source, /#define AUTHORIZED_LISTENER_MODE 0620/);
  assert.match(source, /#define JAILER_GID 65532/);
  assert.match(source, /SYS_fchmodat2/);
  assert.match(source, /fchownat\(fd, "", fates_user->pw_uid, \(gid_t\)JAILER_GID, AT_EMPTY_PATH\)/);
  assert.match(source, /socket_identity_same_inode\(&before, &after_path\)/);
  assert.match(source, /after_fd\.mode != \(mode_t\)AUTHORIZED_LISTENER_MODE/);
  assert.match(source, /verify_authorized_listener\(fates_user->pw_uid\)/);
  assert.match(source, /authorize-listener/);
  assert.match(source, /diagnostic-authorize-listener/);
  assert.doesNotMatch(source, /writableAll/);
});

test('staged artifact digest regression blocks mutated source bytes and unsafe destinations', { skip: process.platform !== 'linux' ? 'staged-artifact harness is Linux-only' : false }, () => {
  const compiler = spawnSync('cc', ['--version'], { encoding: 'utf8', shell: false });
  if (compiler.status !== 0) return;
  const directory = mkdtempSync(join(tmpdir(), 'fates-005a-staged-digest-test-'));
  const binary = join(directory, 'staged-digest-regression');
  try {
    const built = spawnSync('cc', [
      '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror', '-Wno-unused-function',
      '-o', binary, stagedDigestHarness,
    ], { encoding: 'utf8', shell: false });
    assert.equal(built.status, 0, built.stderr);
    const result = spawnSync(binary, [], { encoding: 'utf8', shell: false });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /FATES-005A staged artifact digest regression: PASS mutation=PASS kernel=PASS rootfs=PASS guest-initrd=PASS symlink=PASS non-regular=PASS empty=PASS writable=PASS owner=PASS/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('real AF_UNIX permission regression proves the 1000:1000 to 65532:65532 boundary', {
  skip: process.platform !== 'linux' || process.arch !== 'x64' || process.getuid?.() !== 0
    ? 'requires explicit root on Linux for setuid/setgid kernel operations'
    : false,
}, () => {
  const compiler = spawnSync('cc', ['--version'], { encoding: 'utf8', shell: false });
  if (compiler.status !== 0) return;
  const directory = mkdtempSync(join(tmpdir(), 'fates-005a-vsock-permission-test-'));
  const binary = join(directory, 'vsock-permission-regression');
  try {
    const built = spawnSync('cc', ['-std=c11', '-O2', '-Wall', '-Wextra', '-Werror', '-Wno-unused-function', '-o', binary, socketPermissionHarness], { encoding: 'utf8', shell: false });
    assert.equal(built.status, 0, built.stderr);
    const result = spawnSync(binary, [], { encoding: 'utf8', shell: false });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /FATES-005A AF_UNIX permission regression: PASS before=EACCES after=CONNECTED same-inode=PASS owner=1000 group=65532 mode=0620 other-writable=NO/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('proposal-only profile identity is exact and does not imply workload execution', () => {
  assert.equal(FATES_005A_PROPOSAL_PROFILE_ID, 'linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-proposal-v1');
});
