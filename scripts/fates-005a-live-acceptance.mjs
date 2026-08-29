import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const SHA256 = /^[0-9a-f]{64}$/;
const SHA1 = /^[0-9a-f]{40}$/;
const ATTEMPT = /^\d{3}$/;
const SAFE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_OUTPUT_BYTES = 8192;

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
    'scripts/fates-005a-live-acceptance.mjs',
    'scripts/fates-005a-vsock-host.mjs',
    'scripts/fates-governed-smoke.mjs',
    'docs/design/FATES-005A-live-acceptance.md',
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
  return {
    name,
    path,
    expectedHead,
    actualHead,
    headMatch: head.status === 0 && actualHead === expectedHead,
    clean: status.status === 0 && (dirty.length === 0 || dirtyAllowed),
    dirtyPaths: dirty.map((line) => line.slice(3).replaceAll('\\', '/')),
    stderr: [head.stderr, status.stderr].filter(Boolean).join('\n').slice(0, 1024),
  };
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

function artifactArgument(pathFlag, hashFlag) {
  const path = required(pathFlag);
  const expected = required(hashFlag).toLowerCase();
  if (!SHA256.test(expected)) throw new Error(`${hashFlag} must be a lowercase SHA-256 digest`);
  if (!path.startsWith('/')) throw new Error(`${pathFlag} must be an absolute Linux path`);
  if (!existsSync(path)) throw new Error(`${pathFlag} is unavailable: ${path}`);
  const actual = sha256Path(path);
  if (actual !== expected) throw new Error(`${pathFlag} digest mismatch: expected ${expected}, got ${actual}`);
  return { path, sha256: actual };
}

function captureChild(child) {
  const output = { stdout: '', stderr: '', exitCode: null, signal: null };
  const capture = (target) => (chunk) => {
    output[target] = `${output[target]}${chunk.toString('utf8')}`.slice(-MAX_OUTPUT_BYTES);
  };
  child.stdout?.on('data', capture('stdout'));
  child.stderr?.on('data', capture('stderr'));
  const completion = new Promise((resolveCompletion, rejectCompletion) => {
    child.once('error', rejectCompletion);
    child.once('close', (exitCode, signal) => {
      output.exitCode = exitCode;
      output.signal = signal;
      resolveCompletion(output);
    });
  });
  return { output, completion };
}

async function stopChild(child, capture, graceMs = 2_000) {
  if (!child || child.exitCode !== null) return true;
  try { child.kill('SIGTERM'); } catch { /* process may have exited between the check and signal */ }
  let timer;
  await Promise.race([
    capture.completion.catch(() => undefined),
    new Promise((resolveTimeout) => { timer = setTimeout(resolveTimeout, graceMs); }),
  ]);
  clearTimeout(timer);
  if (child.exitCode === null) {
    try { child.kill('SIGKILL'); } catch { /* process may have exited between signals */ }
    let killTimer;
    await Promise.race([
      capture.completion.catch(() => undefined),
      new Promise((resolveTimeout) => { killTimer = setTimeout(resolveTimeout, 1_000); }),
    ]);
    clearTimeout(killTimer);
  }
  return child.exitCode !== null;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { ...options, shell: false, encoding: 'utf8', windowsHide: true });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

function namespaceLinks(namespaceName, pid) {
  const processNet = run('readlink', [`/proc/${pid}/ns/net`]);
  const namedNet = run('readlink', [`/run/netns/${namespaceName}`]);
  return { process: processNet.stdout.trim(), named: namedNet.stdout.trim(), match: processNet.status === 0 && processNet.stdout.trim() === namedNet.stdout.trim() };
}

function namespaceLinksIn(namespaceName) {
  const links = run('ip', ['netns', 'exec', namespaceName, 'ip', '-o', 'link', 'show']);
  const names = links.stdout.split(/\r?\n/).filter(Boolean).map((line) => line.match(/^\d+:\s+([^:@]+)[^:]*:/)?.[1]).filter(Boolean);
  const nonLoopback = names.filter((name) => name !== 'lo');
  return { commandStatus: links.status, names, nonLoopback, empty: links.status === 0 && nonLoopback.length === 0, stderr: links.stderr.trim().slice(0, 1024) };
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
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function manifestFor({ artifacts, networkNamespacePath, guestInitrd, sessionId, guestProposal }) {
  return {
    profileId: 'linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-v1',
    firecracker: artifacts.firecracker,
    jailer: artifacts.jailer,
    guestKernel: artifacts.guestKernel,
    guestRootfs: artifacts.guestRootfs,
    workload: artifacts.workload,
    evidenceCollector: artifacts.evidenceCollector,
    guestInitrd,
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
    guestExecutionBinding: {
      contractVersion: 'fates-guest-init-exec-pinned-v1',
      workloadId: 'workload.fixed',
      evidenceCollectorId: 'collector.fixed',
    },
    guestProposal: { ...guestProposal, requestId: guestProposal.requestId || sessionId },
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

function requiredPlanInputs() {
  return [
    '--firecracker-path', '--firecracker-sha256', '--jailer-path', '--jailer-sha256',
    '--guest-kernel-path', '--guest-kernel-sha256', '--guest-rootfs-path', '--guest-rootfs-sha256',
    '--workload-path', '--workload-sha256', '--evidence-collector-path', '--evidence-collector-sha256',
  ].filter((flag) => !arg(flag));
}

async function plan() {
  const attemptId = required('--attempt-id');
  if (!ATTEMPT.test(attemptId)) throw new Error('--attempt-id must be exactly three digits');
  const reposRoot = resolve(arg('--repos-root', defaultReposRoot));
  const checks = repoChecks(reposRoot);
  const inputGaps = requiredPlanInputs();
  const candidate = currentCandidateCheck();
  const result = {
    mode: 'plan',
    result: 'NOT_EXECUTED',
    acceptance: 'FATES-005A',
    candidate,
    attemptId,
    platform: { platform: process.platform, architecture: process.arch, supported: process.platform === 'linux' && process.arch === 'x64' },
    repositories: checks,
    inputGaps,
    namespace: { required: `/run/netns/fates-005a-${attemptId}`, createDuringExecute: true, expectedLinks: ['lo'], networkInterfacesAllowed: false },
    transport: { guest: 'AF_VSOCK -> CID 2:7000', host: 'host AF_UNIX listener at jail-root uds_path_7000', tcpFallback: false },
    governance: { route: 'guest proposal -> host Fates governed.memory-admission -> Ananke/Horae/Mnemosyne smoke', guestSupplies: ['bounded proposal identity and source digest'], guestDoesNotSupply: ['authority', 'credentials', 'provider endpoint', 'host state'] },
    actions: ['verify exact r7 materialisations', 'build a fresh static proposal-agent initrd', 'create and inspect one empty network namespace', 'launch the pinned Firecracker+jailer profile', 'connect over the real Firecracker UDS/vsock bridge', 'prove the governed host response and VMM namespace/no-NIC facts', 'stop the VMM and remove only the fresh namespace/session artifacts'],
    evidenceCreated: false,
    priorJailEvidenceTouched: false,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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
  const namespaceName = arg('--namespace-name', `fates-005a-${attemptId}`);
  if (!SAFE_NAME.test(namespaceName)) throw new Error('--namespace-name is invalid');
  const namespacePath = `/run/netns/${namespaceName}`;
  const checks = repoChecks(reposRoot, { moiraeHead: moiraeImplementationCommit, integrationHead: integrationImplementationCommit });
  for (const check of checks) assertRepo(check, check.name);
  const candidate = currentCandidateCheck();
  const evidencePath = join(integrationRoot, 'docs', 'evidence', `FATES-005A-live-acceptance-attempt-${attemptId}.json`);
  if (existsSync(evidencePath)) throw new Error(`refusing to overwrite existing acceptance evidence: ${evidencePath}`);

  const artifactFlags = {
    firecracker: ['--firecracker-path', '--firecracker-sha256'],
    jailer: ['--jailer-path', '--jailer-sha256'],
    guestKernel: ['--guest-kernel-path', '--guest-kernel-sha256'],
    guestRootfs: ['--guest-rootfs-path', '--guest-rootfs-sha256'],
    workload: ['--workload-path', '--workload-sha256'],
    evidenceCollector: ['--evidence-collector-path', '--evidence-collector-sha256'],
  };
  const artifacts = Object.fromEntries(Object.entries(artifactFlags).map(([key, flags]) => [key, artifactArgument(...flags)]));
  const guestAgentSource = resolve(arg('--guest-agent-source', join(reposRoot, 'moirae-code', 'packages', 'sandbox-adapter', 'src', 'guest-fates-vsock-proposal-init.c')));
  if (!existsSync(guestAgentSource)) throw new Error(`guest agent source is unavailable: ${guestAgentSource}`);
  const tempRoot = resolve(arg('--attempt-runtime-root', join('/run/fates', `005a-${attemptId}`)));
  if (!tempRoot.startsWith('/run/fates/')) throw new Error('--attempt-runtime-root must remain below /run/fates');
  const guestInitrdPath = join(tempRoot, 'guest-initrd.cpio');
  const build = run(process.execPath, [join(integrationRoot, 'scripts', 'fates-005a-build-guest-initrd.mjs'), '--agent-source', guestAgentSource, '--output', guestInitrdPath], { cwd: integrationRoot });
  if (build.status !== 0) throw new Error(`guest initrd build failed: ${build.stderr.trim()}`);
  const guestInitrd = { path: guestInitrdPath, sha256: sha256Path(guestInitrdPath), bytes: Number(run('stat', ['-c', '%s', guestInitrdPath]).stdout.trim()) };
  if (!Number.isSafeInteger(guestInitrd.bytes) || guestInitrd.bytes <= 0) throw new Error(`guest initrd size is invalid: ${guestInitrd.bytes}`);
  const sessionId = `fates-005a-${attemptId}`;
  const guestProposal = {
    requestId: `req_fates_005a_${attemptId}`,
    correlationId: `cor_fates_005a_${attemptId}`,
    sourceId: SOURCE_ID,
    sourceHash: SOURCE_HASH,
    memoryId: MEMORY_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  };
  const manifest = manifestFor({ artifacts, networkNamespacePath: namespacePath, guestInitrd, sessionId, guestProposal });
  const moiraeRoot = join(reposRoot, 'moirae-code');
  const sandbox = await import(pathToFileURL(join(moiraeRoot, 'packages', 'sandbox-adapter', 'dist', 'index.js')).href);
  const supervisor = new sandbox.FirecrackerSupervisor({ killGraceMs: 5_000 });
  const namespaceBefore = run('ip', ['netns', 'list']);
  if (namespaceBefore.stdout.split(/\r?\n/).some((line) => line.startsWith(namespaceName))) throw new Error(`refusing to reuse existing namespace: ${namespaceName}`);
  const namespaceCreate = run('ip', ['netns', 'add', namespaceName]);
  if (namespaceCreate.status !== 0) throw new Error(`network namespace creation failed: ${namespaceCreate.stderr.trim()}`);
  let session;
  let hostChild;
  let hostCapture;
  let terminalError;
  const evidence = {
    acceptance: 'FATES-005A',
    classification: 'INCOMPLETE / NOT ACCEPTED',
    attemptId,
    candidate,
    baseline: BASELINE,
    implementationCheckpoints: { moiraeCode: moiraeImplementationCommit, integration: integrationImplementationCommit },
    repositories: checks.map(({ path: _path, stderr: _stderr, ...check }) => check),
    artifacts: Object.fromEntries(Object.entries({ ...artifacts, guestInitrd }).map(([name, artifact]) => [name, { sha256: artifact.sha256, ...(artifact.bytes === undefined ? {} : { bytes: artifact.bytes }), pathClass: 'external-pinned-artifact' }])),
    sessionId,
    namespaceName,
    namespaceHandle: 'run/netns/<namespace-name>',
    transport: { guest: 'AF_VSOCK', host: 'AF_UNIX listener at Firecracker uds_path_<guest-port>', guestCid: 42, guestPort: 7000, tcpFallback: false },
    guestAgentSource: { pathClass: 'pinned-Moirae-source', sha256: sha256Path(guestAgentSource), implementationCommit: moiraeImplementationCommit },
    guestProposal: { action: 'governed.memory-admission', sourceId: SOURCE_ID, sourceHash: SOURCE_HASH, memoryId: MEMORY_ID, idempotencyKey: IDEMPOTENCY_KEY },
    governance: null,
    runtime: null,
    cleanup: null,
    limitations: ['No model or external provider was run.', 'The guest receives no host credential or authority state.'],
  };
  try {
    const netFacts = namespaceLinksIn(namespaceName);
    netFacts.stderr = sanitizeDiagnostic(netFacts.stderr);
    if (!netFacts.empty) throw new Error(`fresh network namespace is not empty: ${JSON.stringify(netFacts)}`);
    if (existsSync(`/srv/jailer/firecracker/${sessionId}`)) throw new Error(`refusing to reuse an existing jail session: ${sessionId}`);

    // Guest-initiated Firecracker vsock requires the host listener to exist at
    // uds_path_<port>. Start that listener before launching the VMM; it waits
    // for the supervisor's chroot staging directory to appear.
    const guestVsockSocketPath = join('/srv/jailer', basename(artifacts.firecracker.path), sessionId, 'root', 'run', 'fates', `vsock.sock_${manifest.guestVsockPort}`);
    const hostArguments = [
      join(integrationRoot, 'scripts', 'fates-005a-vsock-host.mjs'),
      '--socket', guestVsockSocketPath,
      '--session-id', sessionId,
      '--moirae-implementation-commit', moiraeImplementationCommit,
      '--workspace-root', reposRoot,
      '--moirae-root', moiraeRoot,
      '--durable-state-root', join(tempRoot, 'governed-state'),
    ];
    const runtimeContractsArtifact = arg('--runtime-contracts-artifact');
    if (runtimeContractsArtifact) hostArguments.push('--runtime-contracts-artifact', runtimeContractsArtifact);
    hostChild = spawn(process.execPath, hostArguments, { cwd: integrationRoot, env: { PATH: process.env.PATH, LANG: process.env.LANG }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    hostCapture = captureChild(hostChild);
    session = await supervisor.start(manifest, sessionId);
    if (session.guestVsockSocketPath !== guestVsockSocketPath) throw new Error(`guest-vsock listener path drifted: ${session.guestVsockSocketPath}`);
    if (!await waitForPath(session.guestVsockSocketPath, 60_000)) throw new Error(`host did not bind the Firecracker guest-vsock UDS: ${session.guestVsockSocketPath}`);
    const netBinding = namespaceLinks(namespaceName, session.pid);
    const netFactsAfterLaunch = namespaceLinksIn(namespaceName);
    netFactsAfterLaunch.stderr = sanitizeDiagnostic(netFactsAfterLaunch.stderr);
    const runtimeConfig = JSON.parse(readFileSync(join(session.jailRootPath, 'firecracker-config.json'), 'utf8'));
    const noNic = !Object.hasOwn(runtimeConfig, 'network-interfaces');
    const socketExists = existsSync(session.guestVsockSocketPath);
    const uidResult = run('stat', ['-c', '%u', `/proc/${session.pid}`]);
    const gidResult = run('stat', ['-c', '%g', `/proc/${session.pid}`]);
    const jailerIdentity = { uid: uidResult.stdout.trim(), gid: gidResult.stdout.trim(), expectedUid: String(manifest.jailerUid), expectedGid: String(manifest.jailerGid) };
    evidence.runtime = {
      pid: session.pid,
      jailerPid: session.jailerPid,
      jailRoot: 'srv/jailer/firecracker/<session-id>/root',
      profileDigest: session.profileDigest,
      effectiveConfigSha256: session.effectiveConfigSha256,
      guestVsockSocket: 'srv/jailer/firecracker/<session-id>/root/run/fates/vsock.sock_<guest-port>',
      socketExistsBeforeGuestConnect: socketExists,
      noGuestNic: noNic,
      networkNamespace: { ...netBinding, linksBeforeLaunch: netFacts, linksAfterLaunch: netFactsAfterLaunch },
      jailerIdentity,
    };
    if (!noNic || !netBinding.match || !netFacts.empty || !netFactsAfterLaunch.empty || !socketExists || jailerIdentity.uid !== jailerIdentity.expectedUid || jailerIdentity.gid !== jailerIdentity.expectedGid) throw new Error(`runtime containment facts failed: ${JSON.stringify(evidence.runtime)}`);

    const hostResult = await withTimeout(hostCapture.completion, 60_000, 'host governed process timed out');
    evidence.governance = { hostExitCode: hostResult.exitCode, hostSignal: hostResult.signal, stdout: sanitizeDiagnostic(hostResult.stdout), stderr: sanitizeDiagnostic(hostResult.stderr), allowMarker: hostResult.stdout.includes('FATES_005A_HOST_RESULT') && hostResult.stdout.includes('"action":"ALLOW"'), directProviderExecution: hostResult.stdout.includes('"directProviderExecution":false') };
    if (hostResult.exitCode !== 0 || !evidence.governance.allowMarker || !evidence.governance.directProviderExecution) throw new Error(`host governed path did not accept the guest proposal: ${JSON.stringify(evidence.governance)}`);
    evidence.classification = 'PASS_BOUNDED';
  } catch (error) {
    terminalError = error instanceof Error ? error.message : String(error);
    evidence.error = sanitizeDiagnostic(terminalError);
  } finally {
    const hostStopped = await stopChild(hostChild, hostCapture);
    let vmmStopped = false;
    if (session) {
      try { await session.stop('FATES-005A acceptance cleanup'); } catch (error) { evidence.cleanupError = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); }
      try { await session.wait(); vmmStopped = true; } catch (error) { evidence.cleanupError = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)); }
    }
    const namespaceDelete = run('ip', ['netns', 'del', namespaceName]);
    let stagingRemoved = false;
    if (session && !evidence.cleanupError && session.jailRootPath === `/srv/jailer/firecracker/${sessionId}/root`) {
      rmSync(`/srv/jailer/firecracker/${sessionId}`, { recursive: true, force: true });
      stagingRemoved = true;
    }
    evidence.cleanup = { hostStopped, namespaceDeleted: namespaceDelete.status === 0, namespaceDeleteStderr: sanitizeDiagnostic(namespaceDelete.stderr.trim().slice(0, 1024)), vmmStopped, stagingRemoved };
    if (!hostStopped || (session && (!evidence.cleanup.namespaceDeleted || !vmmStopped || !stagingRemoved))) evidence.classification = 'INCOMPLETE / NOT ACCEPTED';
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }
  if (terminalError) throw new Error(`${evidence.classification}: ${terminalError}`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

const mode = has('--execute') ? 'execute' : has('--plan') ? 'plan' : '';
if (!mode) {
  process.stderr.write('usage: fates-005a-live-acceptance.mjs --plan|--execute --attempt-id NNN [artifact flags]\n');
  process.exitCode = 2;
} else {
  (mode === 'plan' ? plan : execute)().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
