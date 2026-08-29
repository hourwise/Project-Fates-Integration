import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FATES_005A_PROPOSAL_PROFILE_ID,
  fixedAttemptInputPath,
  guestVsockSocketPath,
  invokeHostControl,
  validateAttemptId,
  validateProposal,
} from '../scripts/fates-005a-host-control-client.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const helperSource = join(root, 'scripts', 'fates-005a-host-control.c');

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
    const failedPrepare = spawnSync(binary, [
      'prepare', '--attempt', 'fates-005a-001',
      '--request-id', 'req_1', '--correlation-id', 'cor_1',
      '--source-id', 'file:docs/fates-005c.md', '--source-sha256', 'a'.repeat(64),
      '--memory-id', 'memory_1', '--idempotency-key', 'key_1', '--initrd-sha256', 'b'.repeat(64),
    ], { encoding: 'utf8', shell: false });
    assert.notEqual(failedPrepare.status, 0);
    assert.match(failedPrepare.stderr, /FATES-005A prepare: (verify fixed artifacts|verify fresh initrd):/);
    assert.doesNotMatch(failedPrepare.stderr, /Success/);
    for (const args of [
      ['launch', '--attempt', '001'],
      ['cleanup', '--attempt', 'fates-005a-../'],
      ['inspect', '--attempt', 'fates-005a-001', '--target', '/'],
      ['unknown', '--attempt', 'fates-005a-001'],
    ]) {
      const rejected = spawnSync(binary, args, { encoding: 'utf8', shell: false });
      assert.notEqual(rejected.status, 0, `unexpectedly accepted ${args.join(' ')}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('proposal-only profile identity is exact and does not imply workload execution', () => {
  assert.equal(FATES_005A_PROPOSAL_PROFILE_ID, 'linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-proposal-v1');
});
