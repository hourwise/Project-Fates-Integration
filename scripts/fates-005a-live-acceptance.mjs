import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { access, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  FATES_005A_PROPOSAL_PROFILE_ID,
  cleanupHostControl,
  fixedAttemptInputPath,
  guestVsockSocketPath,
  inspectHostControl,
  launchHostControl,
  prepareHostControl,
} from './fates-005a-host-control-client.mjs';

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultReposRoot = resolve(homedir(), 'fates-005a', 'repos');
const BASELINE = Object.freeze({
  adrasteia: 'a1c01bf9e6f9d6a126cfdcc1acfacd488b214210',
  ananke: '3d76adb162a0ff07b5630700ae30a823f1419cb4',
  mnemosyne: 'f02df61be147d6fe716a98912d37eaaf1fe89f23',
  horae: '68508f5c37e1cb3b244116d45fa267e689a6e75c',
  moirae: 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1',
  integrationControl: '39f66dcb1a58b8cbc217a987942781f7b77fde7a',
  integrationPublication: '35a00e881df8e5143eb86bf88332292b8baaa13d',
});
const CANDIDATE = 'fates-durable-candidate-2026-08-27-r7';
const SOURCE_ID = 'file:docs/fates-005c.md';
const SOURCE_CONTENT = 'The controlled FATES-005C source is admitted only after authenticated authority and strict provenance verification.';
const SOURCE_HASH = createHash('sha256').update(SOURCE_CONTENT, 'utf8').digest('hex');
const MEMORY_ID = 'memory_fates_005c_001';
const IDEMPOTENCY_KEY = 'fates-005c-idempotency-001';
const SHA1 = /^[0-9a-f]{40}$/;
const ATTEMPT = /^\d{3}$/;
const MAX_OUTPUT_BYTES = 8192;
const FIXED_ARTIFACTS = Object.freeze({
  firecracker: { path: '/usr/local/bin/firecracker', sha256: '2fd0171309af7e24cf8dafc8a6f921c1434c49b5f9349bb996b7ed0a4deb8aa7' },
  jailer: { path: '/usr/local/bin/jailer', sha256: '1f3a0c1fe86212d0001819bfe0819071c01208b3ccc9398c3b3bc1b84cf21edd' },
  guestKernel: { path: '/home/fatesadmin/firecracker-test/vmlinux-6.18.44', sha256: '435466ec838656f59e464ce941e7fe9f3697d5da6a73c5e5dad60dae5ad93ceb' },
  guestRootfs: { path: '/home/fatesadmin/firecracker-test/ubuntu-24.04.ext4', sha256: 'aa36ebaf68f67c1e232eb6575541de9f25763b2ce61f4bd0a062823e3d9fdf50' },
});

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : fallback;
}

function has(name) { return process.argv.includes(name); }

function required(name) {
  const value = arg(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sha256Path(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sanitizeDiagnostic(value) {
  return String(value)
    .replace(/[A-Za-z]:[\\/][^\s'"`]+/g, '<host-path>')
    .replace(/\/(?:srv|run|home|tmp|var|opt|Users|mnt)\/[^\s'"`]+/g, '<host-path>');
}

function git(repo, gitArgs) {
  const result = spawnSync('git', ['-C', repo, ...gitArgs], { encoding: 'utf8', shell: false, windowsHide: true });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const ALLOWED_DIRTY_PATHS = {
  'moirae-code': new Set([
    'packages/sandbox-adapter/src/firecracker-profile.ts',
    'packages/sandbox-adapter/src/firecracker-profile.test.ts',
    'packages/sandbox-adapter/src/firecracker-vsock.ts',
    'packages/sandbox-adapter/src/firecracker-vsock.test.ts',
    'packages/sandbox-adapter/src/guest-fates-vsock-proposal-init.c',
    'packages/sandbox-adapter/src/index.ts',
  ]),
  'integration-publication': new Set([
    'package.json',
    'scripts/fates-005a-build-guest-initrd.mjs',
    'scripts/fates-005a-build-host-control.mjs',
    'scripts/fates-005a-host-control-client.mjs',
    'scripts/fates-005a-host-control.c',
    'scripts/fates-005a-live-acceptance.mjs',
    'scripts/fates-005a-vsock-host.mjs',
    'scripts/fates-governed-smoke.mjs',
    'docs/design/FATES-005A-live-acceptance.md',
    'docs/evidence/FATES-005A-live-acceptance-attempt-001.json',
    'docs/evidence/FATES-005A-live-acceptance-attempt-002.json',
    'scripts/verify-boundaries.mjs',
    'tests/fates-005a-host-control.test.mjs',
    'tests/boundaries.test.mjs',
  ]),
};

function checkRepo(name, path, expectedHead, allowDirty = false) {
  const head = git(path, ['rev-parse', 'HEAD']);
  const status = git(path, ['status', '--porcelain=v1', '--untracked-files=all']);
  const actualHead = head.stdout.trim();
  const dirty = status.stdout.split(/\r?\n/).filter(Boolean);
  const allowedPaths = ALLOWED_DIRTY_PATHS[name] ?? new Set();
  const dirtyAllowed = allowDirty && dirty.every((line) => {
    const state = line.slice(0, 2);
    const dirtyPath = line.slice(3).replaceAll('\\', '/');
    return (state === ' M' || state === '??') && allowedPaths.has(dirtyPath);
  });
  return { name, path, expectedHead, actualHead, headMatch: head.status === 0 && actualHead === expectedHead, clean: status.status === 0 && (dirty.length === 0 || dirtyAllowed), dirtyPaths: dirty.map((line) => line.slice(3).replaceAll('\\', '/')), stderr: [head.stderr, status.stderr].filter(Boolean).join('\n').slice(0, 1024) };
}

function assertRepo(check, label) {
  if (!check.headMatch) throw new Error(`${label} checkpoint mismatch: expected ${check.expectedHead}, got ${check.actualHead || 'unavailable'}`);
  if (!check.clean) throw new Error(`${label} worktree is not clean or contains an unsupported change: ${check.dirtyPaths.join(', ')}`);
  if (check.implementationBaseMatch === false) throw new Error(`${label} implementation checkpoint does not descend from the r7 baseline`);
  if (check.implementationDiffAllowed === false) throw new Error(`${label} implementation checkpoint contains unsupported changes: ${check.changedPaths.join(', ')}`);
}

function checkImplementationRepo(name, path, baselineHead, implementationHead) {
  if (!SHA1.test(implementationHead)) throw new Error(`${name} implementation checkpoint must be a full commit SHA`);
  const check = checkRepo(name, path, implementationHead, false);
  const ancestor = git(path, ['merge-base', '--is-ancestor', baselineHead, implementationHead]);
  const changed = git(path, ['diff', '--name-only', `${baselineHead}..${implementationHead}`]);
  const allowedPaths = ALLOWED_DIRTY_PATHS[name] ?? new Set();
  const changedPaths = changed.stdout.split(/\r?\n/).filter(Boolean).map((line) => line.replaceAll('\\', '/'));
  return { ...check, implementationBaseMatch: ancestor.status === 0, implementationDiffAllowed: changed.status === 0 && changedPaths.every((pathName) => allowedPaths.has(pathName)), changedPaths };
}

function captureChild(child) {
  const output = { stdout: '', stderr: '', exitCode: null, signal: null };
  const capture = (target) => (chunk) => { output[target] = `${output[target]}${chunk.toString('utf8')}`.slice(-MAX_OUTPUT_BYTES); };
  child.stdout?.on('data', capture('stdout'));
  child.stderr?.on('data', capture('stderr'));
  const completion = new Promise((resolveCompletion, rejectCompletion) => {
    child.once('error', rejectCompletion);
    child.once('close', (exitCode, signal) => { output.exitCode = exitCode; output.signal = signal; resolveCompletion(output); });
  });
  return { output, completion };
}

async function stopChild(child, capture, graceMs = 2_000) {
  if (!child || child.exitCode !== null) return true;
  try { child.kill('SIGTERM'); } catch { /* process may have exited between the check and signal */ }
  let timer;
  await Promise.race([capture.completion.catch(() => undefined), new Promise((resolveTimeout) => { timer = setTimeout(resolveTimeout, graceMs); })]);
  clearTimeout(timer);
  if (child.exitCode === null) {
    try { child.kill('SIGKILL'); } catch { /* process may have exited between signals */ }
    let killTimer;
    await Promise.race([capture.completion.catch(() => undefined), new Promise((resolveTimeout) => { killTimer = setTimeout(resolveTimeout, 1_000); })]);
    clearTimeout(killTimer);
  }
  return child.exitCode !== null;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { ...options, shell: false, encoding: 'utf8', windowsHide: true });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

async function waitForPath(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await access(path); return true; } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 50)); }
  }
  return false;
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })]); }
  finally { clearTimeout(timer); }
}

function manifestFor({ networkNamespacePath, guestInitrd, guestProposal }) {
  return {
    profileId: FATES_005A_PROPOSAL_PROFILE_ID,
    ...FIXED_ARTIFACTS,
    guestInitrd,
    sessionId: networkNamespacePath.split('/').at(-1),
    kvmDevice: '/dev/kvm',
    networkNamespacePath,
    jailerChrootBaseDir: '/srv/jailer',
    guestCid: 42,
    guestVsockPort: 7000,
    hostVsockSocket: '/run/fates/vsock.sock',
    vcpuCount: 1,
    memoryMiB: 256,
    jailerUid: 65532,
    jailerGid: 65532,
    guestProposal,
  };
}

function currentCandidateCheck() {
  const pointer = JSON.parse(readFileSync(join(integrationRoot, 'current-candidate.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(integrationRoot, 'compatibility-sets', 'fates-durable-candidate-2026-08-27-r7.json'), 'utf8'));
  if (pointer.candidate !== CANDIDATE || pointer.manifest !== 'compatibility-sets/fates-durable-candidate-2026-08-27-r7.json' || pointer.status !== 'provisional') throw new Error('current-candidate.json drifted from r7');
  if (manifest.compatibilitySetId !== CANDIDATE || manifest.sealStatus !== 'provisional' || manifest.integrationLevel !== 'partial_runtime') throw new Error('r7 compatibility manifest drifted');
  for (const [key, expected] of Object.entries(BASELINE)) {
    if (key === 'integrationControl' || key === 'integrationPublication') continue;
    if (manifest.repositories[key === 'moirae' ? 'moirae-code' : key]?.commit !== expected) throw new Error(`r7 peer pin drifted for ${key}`);
  }
  return { candidate: pointer.candidate, manifest: manifest.compatibilitySetId, status: pointer.status };
}

function repoChecks(reposRoot, { moiraeHead = BASELINE.moirae, integrationHead = BASELINE.integrationPublication } = {}) {
  return [
    checkRepo('adrasteia', join(reposRoot, 'adrasteia'), BASELINE.adrasteia),
    checkRepo('ananke', join(reposRoot, 'ananke'), BASELINE.ananke),
    checkRepo('mnemosyne', join(reposRoot, 'mnemosyne'), BASELINE.mnemosyne),
    checkRepo('horae', join(reposRoot, 'horae'), BASELINE.horae),
    moiraeHead === BASELINE.moirae ? checkRepo('moirae-code', join(reposRoot, 'moirae-code'), BASELINE.moirae) : checkImplementationRepo('moirae-code', join(reposRoot, 'moirae-code'), BASELINE.moirae, moiraeHead),
    checkRepo('integration-control', join(reposRoot, 'integration-control'), BASELINE.integrationControl),
    integrationHead === BASELINE.integrationPublication ? checkRepo('integration-publication', integrationRoot, BASELINE.integrationPublication) : checkImplementationRepo('integration-publication', integrationRoot, BASELINE.integrationPublication, integrationHead),
  ];
}

async function plan() {
  const attemptId = required('--attempt-id');
  if (!ATTEMPT.test(attemptId)) throw new Error('--attempt-id must be exactly three digits');
  const reposRoot = resolve(arg('--repos-root', defaultReposRoot));
  const checks = repoChecks(reposRoot);
  const candidate = currentCandidateCheck();
  process.stdout.write(`${JSON.stringify({ mode: 'plan', result: 'NOT_EXECUTED', acceptance: 'FATES-005A', candidate, attemptId, profileId: FATES_005A_PROPOSAL_PROFILE_ID, platform: { platform: process.platform, architecture: process.arch, supported: process.platform === 'linux' && process.arch === 'x64' }, repositories: checks, namespace: { required: `/run/netns/fates-005a-${attemptId}`, createDuringExecute: true, expectedLinks: ['lo'], networkInterfacesAllowed: false }, transport: { guest: 'AF_VSOCK -> CID 2:7000', host: 'host AF_UNIX listener at jail-root uds_path_7000', tcpFallback: false }, governance: { route: 'guest proposal -> host Fates governed.memory-admission -> Ananke/Horae/Mnemosyne smoke', guestSupplies: ['bounded proposal identity and source digest'], guestDoesNotSupply: ['authority', 'credentials', 'provider endpoint', 'host state'] }, actions: ['verify exact r7 materialisations', 'build a fresh static proposal-agent initrd', 'prepare and inspect one empty network namespace through the fixed host-control helper', 'launch the pinned Firecracker+jailer profile through the helper', 'connect over the real Firecracker UDS/vsock bridge', 'prove the governed host response and VMM namespace/no-NIC facts', 'stop the VMM and remove only the fresh namespace/session artifacts'], workload: { included: false, reason: 'not part of the documented 005A proposal-channel contract' }, evidenceCreated: false, priorJailEvidenceTouched: false }, null, 2)}\n`);
}

async function execute() {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('INCOMPLETE / NOT ACCEPTED: FATES-005A execute requires a Linux x86_64 host');
  const attemptId = required('--attempt-id');
  if (!ATTEMPT.test(attemptId)) throw new Error('--attempt-id must be exactly three digits');
  const moiraeImplementationCommit = required('--moirae-implementation-commit');
  const integrationImplementationCommit = required('--integration-implementation-commit');
  if (!SHA1.test(moiraeImplementationCommit) || moiraeImplementationCommit === BASELINE.moirae) throw new Error('--moirae-implementation-commit must identify a non-baseline FATES-005A commit');
  if (!SHA1.test(integrationImplementationCommit) || integrationImplementationCommit === BASELINE.integrationPublication) throw new Error('--integration-implementation-commit must identify a non-baseline FATES-005A commit');
  const reposRoot = resolve(arg('--repos-root', defaultReposRoot));
  const checks = repoChecks(reposRoot, { moiraeHead: moiraeImplementationCommit, integrationHead: integrationImplementationCommit });
  for (const check of checks) assertRepo(check, check.name);
  const candidate = currentCandidateCheck();
  const evidencePath = join(integrationRoot, 'docs', 'evidence', `FATES-005A-live-acceptance-attempt-${attemptId}.json`);
  if (existsSync(evidencePath)) throw new Error(`refusing to overwrite existing acceptance evidence: ${evidencePath}`);

  const sessionId = `fates-005a-${attemptId}`;
  const namespacePath = `/run/netns/${sessionId}`;
  const inputDir = resolve(join('/home/fatesadmin/fates-005a/attempts', sessionId));
  const guestInitrdPath = fixedAttemptInputPath(sessionId);
  const guestAgentSource = resolve(arg('--guest-agent-source', join(reposRoot, 'moirae-code', 'packages', 'sandbox-adapter', 'src', 'guest-fates-vsock-proposal-init.c')));
  if (!existsSync(guestAgentSource)) throw new Error(`guest agent source is unavailable: ${guestAgentSource}`);
  const build = run(process.execPath, [join(integrationRoot, 'scripts', 'fates-005a-build-guest-initrd.mjs'), '--agent-source', guestAgentSource, '--output', guestInitrdPath], { cwd: integrationRoot });
  if (build.status !== 0) throw new Error(`guest initrd build failed: ${build.stderr.trim()}`);
  const guestInitrd = { path: guestInitrdPath, sha256: sha256Path(guestInitrdPath), bytes: Number(run('stat', ['-c', '%s', guestInitrdPath]).stdout.trim()) };
  if (!Number.isSafeInteger(guestInitrd.bytes) || guestInitrd.bytes <= 0) throw new Error(`guest initrd size is invalid: ${guestInitrd.bytes}`);
  const guestProposal = { requestId: `req_fates_005a_${attemptId}`, correlationId: `cor_fates_005a_${attemptId}`, sourceId: SOURCE_ID, sourceHash: SOURCE_HASH, memoryId: MEMORY_ID, idempotencyKey: IDEMPOTENCY_KEY };
  const manifest = manifestFor({ networkNamespacePath: namespacePath, guestInitrd, guestProposal });
  const moiraeRoot = join(reposRoot, 'moirae-code');
  const sandbox = await import(pathToFileURL(join(moiraeRoot, 'packages', 'sandbox-adapter', 'dist', 'index.js')).href);
  const evidence = {
    acceptance: 'FATES-005A', classification: 'INCOMPLETE / NOT ACCEPTED', attemptId, candidate,
    baseline: BASELINE, implementationCheckpoints: { moiraeCode: moiraeImplementationCommit, integration: integrationImplementationCommit },
    repositories: checks.map(({ path: _path, stderr: _stderr, ...check }) => check),
    profile: { id: manifest.profileId, contract: 'proposal-channel-only-v1', workloadExecuted: false, evidenceCollectorExecuted: false },
    artifacts: Object.fromEntries(Object.entries({ ...FIXED_ARTIFACTS, guestInitrd }).map(([name, artifact]) => [name, { sha256: artifact.sha256, ...(artifact.bytes === undefined ? {} : { bytes: artifact.bytes }), pathClass: 'fixed-host-or-fresh-attempt-artifact' }])),
    sessionId, namespaceName: sessionId, namespaceHandle: 'run/netns/<attempt-id>',
    transport: { guest: 'AF_VSOCK', host: 'AF_UNIX listener at Firecracker uds_path_<guest-port>', guestCid: 42, guestPort: 7000, tcpFallback: false },
    guestAgentSource: { pathClass: 'pinned-Moirae-source', sha256: sha256Path(guestAgentSource), implementationCommit: moiraeImplementationCommit },
    guestProposal: { action: 'governed.memory-admission', ...guestProposal }, governance: null, runtime: null, cleanup: null,
    limitations: ['No model or external provider was run.', 'The guest receives no host credential or authority state.', '005A certifies proposal-channel containment, not guest workload execution.'],
  };
  let hostChild;
  let hostCapture;
  let prepared = false;
  let launched = false;
  let terminalError;
  try {
    const prepareResult = prepareHostControl(sessionId, guestProposal, guestInitrd.sha256);
    prepared = true;
    const expectedSocket = guestVsockSocketPath(sessionId);
    if (prepareResult.guestVsockSocket !== expectedSocket || prepareResult.profileId !== FATES_005A_PROPOSAL_PROFILE_ID) throw new Error('host-control prepare response drifted from the fixed proposal profile');
    const preflight = await new sandbox.Fates005aProposalProfileVerifier().verify(manifest);
    if (!preflight.ok) throw new Error(`FATES-005A proposal profile preflight failed: ${preflight.reason}`);
    const hostArguments = [join(integrationRoot, 'scripts', 'fates-005a-vsock-host.mjs'), '--socket', expectedSocket, '--session-id', sessionId, '--moirae-implementation-commit', moiraeImplementationCommit, '--workspace-root', reposRoot, '--moirae-root', moiraeRoot, '--durable-state-root', join(inputDir, 'governed-state'), '--ready-file', join(inputDir, 'host-ready')];
    const runtimeContractsArtifact = arg('--runtime-contracts-artifact');
    if (runtimeContractsArtifact) hostArguments.push('--runtime-contracts-artifact', runtimeContractsArtifact);
    hostChild = spawn(process.execPath, hostArguments, { cwd: integrationRoot, env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    hostCapture = captureChild(hostChild);
    if (!await waitForPath(join(inputDir, 'host-ready'), 60_000)) throw new Error('unprivileged governed host listener did not become ready');
    const launchResult = launchHostControl(sessionId);
    launched = true;
    if (launchResult.guestVsockSocket !== expectedSocket) throw new Error('host-control launch socket response drifted');
    if (!await waitForPath(expectedSocket, 60_000)) throw new Error(`host did not bind the Firecracker guest-vsock UDS: ${expectedSocket}`);
    const runtimeFacts = inspectHostControl(sessionId);
    evidence.runtime = {
      pid: runtimeFacts.pid, jailerPid: runtimeFacts.pid, jailRoot: 'srv/jailer/firecracker/<attempt-id>/root', profileDigest: preflight.profileDigest,
      effectiveConfigSha256: runtimeFacts.effectiveConfigSha256, guestVsockSocket: 'srv/jailer/firecracker/<attempt-id>/root/run/fates/vsock.sock_<guest-port>', socketExistsBeforeGuestConnect: existsSync(expectedSocket), noGuestNic: runtimeFacts.noGuestNic,
      networkNamespace: { process: runtimeFacts.processNetns, named: runtimeFacts.namedNetns, match: runtimeFacts.netnsMatch, linksBeforeLaunch: { names: ['lo'], empty: runtimeFacts.linksOnlyLoopback }, linksAfterLaunch: { names: ['lo'], empty: runtimeFacts.linksOnlyLoopback } },
      jailerIdentity: { uid: String(runtimeFacts.uid), gid: String(runtimeFacts.gid), expectedUid: String(runtimeFacts.expectedUid), expectedGid: String(runtimeFacts.expectedGid) }, executableIdentity: runtimeFacts.exe,
    };
    if (!runtimeFacts.pidAlive || !runtimeFacts.noGuestNic || !runtimeFacts.netnsMatch || !runtimeFacts.linksOnlyLoopback || !runtimeFacts.effectiveConfigSha256 || runtimeFacts.uid !== runtimeFacts.expectedUid || runtimeFacts.gid !== runtimeFacts.expectedGid) throw new Error(`runtime containment facts failed: ${JSON.stringify(evidence.runtime)}`);
    const hostResult = await withTimeout(hostCapture.completion, 60_000, 'host governed process timed out');
    let hostMarker;
    try { hostMarker = hostResult.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line)).find((value) => value.marker === 'FATES_005A_HOST_RESULT'); } catch { hostMarker = undefined; }
    evidence.governance = { hostExitCode: hostResult.exitCode, hostSignal: hostResult.signal, stdout: sanitizeDiagnostic(hostResult.stdout), stderr: sanitizeDiagnostic(hostResult.stderr), allowMarker: hostMarker?.action === 'ALLOW', directProviderExecution: hostMarker?.directProviderExecution === false, listenerUid: hostMarker?.listenerUid ?? null, listenerGid: hostMarker?.listenerGid ?? null, listenerUnprivileged: Number.isInteger(hostMarker?.listenerUid) && hostMarker.listenerUid !== 0 && Number.isInteger(hostMarker?.listenerGid) && hostMarker.listenerGid !== 0 };
    if (hostResult.exitCode !== 0 || !evidence.governance.allowMarker || !evidence.governance.directProviderExecution || !evidence.governance.listenerUnprivileged) throw new Error(`host governed path did not accept the guest proposal as an unprivileged listener: ${JSON.stringify(evidence.governance)}`);
    evidence.classification = 'PASS_BOUNDED';
  } catch (error) {
    terminalError = error instanceof Error ? error.message : String(error);
    evidence.error = sanitizeDiagnostic(terminalError);
  } finally {
    const hostStopped = await stopChild(hostChild, hostCapture);
    let cleanupResult;
    if (prepared) {
      try { cleanupResult = cleanupHostControl(sessionId); } catch (error) { evidence.cleanupError = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); }
    }
    let inputRemoved = false;
    try { await rm(inputDir, { recursive: true, force: true }); inputRemoved = true; } catch (error) { evidence.cleanupError = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); }
    evidence.cleanup = { hostStopped, helperCleanup: cleanupResult ?? null, namespaceDeleted: cleanupResult?.namespaceRemoved === true, vmmStopped: launched ? cleanupResult?.jailRemoved === true : true, stagingRemoved: cleanupResult?.jailRemoved === true, inputRemoved };
    if (!hostStopped || (prepared && (!cleanupResult?.namespaceRemoved || !cleanupResult?.jailRemoved || !inputRemoved))) evidence.classification = 'INCOMPLETE / NOT ACCEPTED';
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }
  if (terminalError) throw new Error(`${evidence.classification}: ${terminalError}`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

const mode = has('--execute') ? 'execute' : has('--plan') ? 'plan' : '';
if (!mode) {
  process.stderr.write('usage: fates-005a-live-acceptance.mjs --plan|--execute --attempt-id NNN [implementation checkpoints]\n');
  process.exitCode = 2;
} else {
  (mode === 'plan' ? plan : execute)().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
