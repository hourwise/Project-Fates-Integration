import { spawnSync } from 'node:child_process';

export const HOST_CONTROL_BINARY = '/usr/local/libexec/fates-005a-host-control';
export const HOST_CONTROL_VERSION = 'fates-005a-host-control-v1';
export const FATES_005A_PROPOSAL_PROFILE_ID = 'linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-proposal-v1';
export const FATES_005A_ATTEMPT_PATTERN = /^fates-005a-\d{3}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_VALUE = /^[A-Za-z0-9._:-]{1,256}$/;
const SAFE_SOURCE_ID = /^file:[A-Za-z0-9._/-]{1,240}$/;

export function validateAttemptId(attemptId) {
  if (typeof attemptId !== 'string' || !FATES_005A_ATTEMPT_PATTERN.test(attemptId)) {
    throw new TypeError('attempt ID must be exactly fates-005a-NNN');
  }
  return attemptId;
}

function validateValue(name, value) {
  if (typeof value !== 'string' || !SAFE_VALUE.test(value) || value.includes('..')) throw new TypeError(`${name} is malformed`);
  return value;
}

function validateSourceId(sourceId) {
  if (typeof sourceId !== 'string' || !SAFE_SOURCE_ID.test(sourceId) || sourceId.includes('..')) throw new TypeError('sourceId is malformed');
  return sourceId;
}

function validateSha256(name, value) {
  if (typeof value !== 'string' || !SHA256.test(value)) throw new TypeError(`${name} must be lowercase SHA-256`);
  return value;
}

export function validateProposal(proposal) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) throw new TypeError('proposal is required');
  const expected = ['requestId', 'correlationId', 'sourceId', 'sourceHash', 'memoryId', 'idempotencyKey'];
  const actual = Object.keys(proposal).sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected.slice().sort()[index])) throw new TypeError('proposal fields are not the fixed FATES-005A set');
  return {
    requestId: validateValue('requestId', proposal.requestId),
    correlationId: validateValue('correlationId', proposal.correlationId),
    sourceId: validateSourceId(proposal.sourceId),
    sourceHash: validateSha256('sourceHash', proposal.sourceHash),
    memoryId: validateValue('memoryId', proposal.memoryId),
    idempotencyKey: validateValue('idempotencyKey', proposal.idempotencyKey),
  };
}

export function guestVsockSocketPath(attemptId) {
  validateAttemptId(attemptId);
  return `/srv/jailer/firecracker/${attemptId}/root/run/fates/vsock.sock_7000`;
}

export function fixedAttemptInputPath(attemptId) {
  validateAttemptId(attemptId);
  return `/home/fatesadmin/fates-005a/attempts/${attemptId}/guest-initrd.cpio`;
}

function parseHelperOutput(stdout, operation) {
  const line = String(stdout).trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) throw new Error(`${operation} helper returned no response`);
  let response;
  try { response = JSON.parse(line); } catch { throw new Error(`${operation} helper returned invalid JSON`); }
  if (!response || response.operation !== operation) throw new Error(`${operation} helper response operation mismatch`);
  return response;
}

export function invokeHostControl(operation, args = [], { spawnImpl = spawnSync, binary = HOST_CONTROL_BINARY } = {}) {
  const allowed = new Set(['prepare', 'authorize-listener', 'launch', 'inspect', 'cleanup', 'diagnostic-authorize-listener', '--version', '--self-test']);
  if (!allowed.has(operation)) throw new TypeError('unsupported host-control operation');
  const result = spawnImpl('sudo', ['-n', binary, operation, ...args], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
  });
  if ((result.status ?? 1) !== 0) {
    const detail = `${result.stderr ?? ''}`.trim().slice(-2048);
    throw new Error(`${operation} host-control failed${detail ? `: ${detail}` : ''}`);
  }
  if (operation === '--version' || operation === '--self-test') return String(result.stdout ?? '').trim();
  return parseHelperOutput(result.stdout, operation);
}

export function prepareHostControl(attemptId, proposal, initrdSha256, options = {}) {
  validateAttemptId(attemptId);
  const boundedProposal = validateProposal(proposal);
  validateSha256('initrdSha256', initrdSha256);
  return invokeHostControl('prepare', [
    '--attempt', attemptId,
    '--request-id', boundedProposal.requestId,
    '--correlation-id', boundedProposal.correlationId,
    '--source-id', boundedProposal.sourceId,
    '--source-sha256', boundedProposal.sourceHash,
    '--memory-id', boundedProposal.memoryId,
    '--idempotency-key', boundedProposal.idempotencyKey,
    '--initrd-sha256', initrdSha256,
  ], options);
}

export function launchHostControl(attemptId, options = {}) {
  validateAttemptId(attemptId);
  return invokeHostControl('launch', ['--attempt', attemptId], options);
}

export function authorizeListenerHostControl(attemptId, options = {}) {
  validateAttemptId(attemptId);
  return invokeHostControl('authorize-listener', ['--attempt', attemptId], options);
}

export function authorizeDiagnosticListenerHostControl(options = {}) {
  return invokeHostControl('diagnostic-authorize-listener', [], options);
}

export function inspectHostControl(attemptId, options = {}) {
  validateAttemptId(attemptId);
  return invokeHostControl('inspect', ['--attempt', attemptId], options);
}

export function cleanupHostControl(attemptId, options = {}) {
  validateAttemptId(attemptId);
  return invokeHostControl('cleanup', ['--attempt', attemptId], options);
}
