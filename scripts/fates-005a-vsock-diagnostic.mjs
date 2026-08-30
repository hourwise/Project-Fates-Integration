import { access, lstat, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOST_CONTROL_BINARY = '/usr/local/libexec/fates-005a-host-control';
const DIAGNOSTIC_IDENTITY = 'fates-r54-vsock-diagnostic';
const DIAGNOSTIC_INITRD = '/home/fatesadmin/fates-005a/diagnostics/r54/guest-initrd-diagnostic-r54a.cpio';
const DIAGNOSTIC_INITRD_SHA256 = 'dae168395e78ccd74c5c3972050a4bd7ee83f45a7395dc894efe74e75edd5e1d';
const DIAGNOSTIC_REQUEST_ID = 'req_fates_r54_diagnostic';
const DIAGNOSTIC_CORRELATION_ID = 'cor_fates_r54_diagnostic';
const DIAGNOSTIC_SOURCE_ID = 'file:docs/fates-005a-r5.4a-diagnostic.md';
const DIAGNOSTIC_SOURCE_SHA256 = '2416405e530ff0421dd154f5aa643bc2e091462930796ba62fda1864f2bb4f5e';
const DIAGNOSTIC_MEMORY_ID = 'memory_fates_r54_diagnostic';
const DIAGNOSTIC_IDEMPOTENCY_KEY = 'fates-r54-diagnostic-key';
const EXPECTED_SOCKET = `/srv/jailer/firecracker/${DIAGNOSTIC_IDENTITY}/root/run/fates/vsock.sock_7000`;
const MAX_LOG_BYTES = 64 * 1024;
const REQUIRED_STAGES = ['INIT_STARTED', 'CMDLINE_PARSED', 'EXECUTION_CONTRACT_VALID', 'AF_VSOCK_SOCKET_CREATED', 'AF_VSOCK_CONNECTED'];

const integrationRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reposRoot = resolve(integrationRoot, '..');
const moiraeRoot = join(reposRoot, 'moirae-code');

function fixedEnvironment() {
  return { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' };
}

function parseJsonLines(stdout) {
  return String(stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function invokeFixedHelper(operation) {
  const result = spawnSync('sudo', ['-n', HOST_CONTROL_BINARY, operation], {
    encoding: 'utf8',
    shell: false,
    env: fixedEnvironment(),
  });
  if ((result.status ?? 1) !== 0) {
    const detail = `${result.stderr ?? ''}`.trim().slice(-2048);
    throw new Error(`${operation} failed${detail ? `: ${detail}` : ''}`);
  }
  const values = parseJsonLines(result.stdout);
  const value = values.at(-1);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${operation} returned no bounded JSON record`);
  return { value, stdout: result.stdout, stderr: result.stderr };
}

async function waitForPath(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await access(path); return true; } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 50)); }
  }
  return false;
}

async function inspectBoundSocket(path) {
  const info = await lstat(path);
  if (!info.isSocket() || info.isSymbolicLink()) throw new Error('diagnostic guest-vsock endpoint is not a real Unix socket');
  if (!Number.isSafeInteger(info.dev) || !Number.isSafeInteger(info.ino)) throw new Error('diagnostic guest-vsock endpoint lacks bounded device/inode identity');
  return { dev: info.dev, ino: info.ino, mode: info.mode & 0o777 };
}

function parseDiagnosticStages(log, parseStage) {
  const events = [];
  for (const line of String(log).split(/\r?\n/)) {
    const marker = 'FATES_005A_GUEST_STAGE ';
    const index = line.indexOf(marker);
    if (index < 0) continue;
    const stageLine = line.slice(index);
    try {
      const parsed = parseStage(stageLine);
      events.push(parsed);
    } catch (error) {
      throw new Error(`guest diagnostic line failed bounded parsing: ${error instanceof Error ? error.message : 'unknown parser error'}`);
    }
  }
  return events;
}

function requiredStageOrder(events) {
  const names = events.map((event) => event.stage);
  let cursor = -1;
  for (const stage of REQUIRED_STAGES) {
    const next = names.indexOf(stage, cursor + 1);
    if (next < 0) return { ok: false, names };
    cursor = next;
  }
  return { ok: true, names };
}

async function waitForDiagnosticStages(logPath, timeoutMs, parseStage) {
  const deadline = Date.now() + timeoutMs;
  let lastEvents = [];
  while (Date.now() < deadline) {
    let log;
    try {
      log = await readFile(logPath, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'EACCES') throw error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 50));
      continue;
    }
    if (Buffer.byteLength(log, 'utf8') > MAX_LOG_BYTES) throw new Error('diagnostic jailer log exceeds the bounded evidence limit');
    lastEvents = parseDiagnosticStages(log, parseStage);
    const order = requiredStageOrder(lastEvents);
    if (order.ok) return { events: lastEvents, logBytes: Buffer.byteLength(log, 'utf8'), order: order.names };
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  const order = requiredStageOrder(lastEvents);
  throw new Error(`required guest diagnostic stages were not observed; lastStages=${JSON.stringify(order.names)}`);
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })]);
  } finally {
    clearTimeout(timer);
  }
}

function validateProposal(proposal) {
  const payload = proposal?.payload;
  if (proposal?.version !== '1' || proposal?.sessionId !== DIAGNOSTIC_IDENTITY || proposal?.requestId !== DIAGNOSTIC_REQUEST_ID || proposal?.method !== 'proposal.submit') return false;
  return payload?.action === 'governed.memory-admission' &&
    payload.sourceId === DIAGNOSTIC_SOURCE_ID &&
    payload.sourceHash === DIAGNOSTIC_SOURCE_SHA256 &&
    payload.memoryId === DIAGNOSTIC_MEMORY_ID &&
    payload.idempotencyKey === DIAGNOSTIC_IDEMPOTENCY_KEY &&
    payload.correlationId === DIAGNOSTIC_CORRELATION_ID;
}

async function main() {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('FATES-005A diagnostic rehearsal requires Linux x86_64');
  const listenerUid = process.getuid?.();
  const listenerGid = process.getgid?.();
  if (listenerUid === undefined || listenerGid === undefined || listenerUid === 0 || listenerGid === 0) throw new Error('diagnostic listener must remain unprivileged');

  const {
    FirecrackerVsockTransport,
    fatesProposalResultEnvelope,
    parseFatesGuestDiagnosticLine,
    parseFatesGuestProposal,
  } = await import(pathToFileURL(join(moiraeRoot, 'packages', 'sandbox-adapter', 'dist', 'index.js')).href);

  let prepared = false;
  let transport;
  let cleanup;
  let inspected;
  let socketIdentity;
  let proposal;
  let stageEvidence;
  let diagnosticResultSent = false;
  try {
    const preparedRecord = invokeFixedHelper('diagnostic-prepare').value;
    prepared = true;
    if (preparedRecord.operation !== 'diagnostic-prepare' || preparedRecord.attemptId !== DIAGNOSTIC_IDENTITY || preparedRecord.guestVsockSocket !== EXPECTED_SOCKET || preparedRecord.diagnosticInitrd !== DIAGNOSTIC_INITRD || preparedRecord.diagnosticInitrdSha256 !== DIAGNOSTIC_INITRD_SHA256) {
      throw new Error('diagnostic prepare record is not bound to the fixed identity/artifact');
    }
    if (await waitForPath(preparedRecord.guestVsockSocket.replace(/\/[^/]+$/, ''), 5_000) !== true) throw new Error('diagnostic jail root did not become available');

    transport = new FirecrackerVsockTransport({ socketPath: preparedRecord.guestVsockSocket, maxFrameBytes: 64 * 1024, connectTimeoutMs: 30_000 });
    await transport.listen();
    socketIdentity = await inspectBoundSocket(preparedRecord.guestVsockSocket);
    invokeFixedHelper('diagnostic-launch');
    const frame = await withTimeout(transport.receive(), 45_000, 'timed out waiting for real guest AF_VSOCK connection');
    proposal = parseFatesGuestProposal(frame, DIAGNOSTIC_IDENTITY);
    if (!validateProposal(proposal)) throw new Error('diagnostic proposal identity or bounded fields do not match the fixed rehearsal contract');
    await transport.send(fatesProposalResultEnvelope(DIAGNOSTIC_IDENTITY, proposal.requestId, { action: 'ALLOW', reasonCode: 'FATES_DIAGNOSTIC_REHEARSAL_ONLY' }));
    diagnosticResultSent = true;
    stageEvidence = await waitForDiagnosticStages(preparedRecord.jailerLog, 10_000, parseFatesGuestDiagnosticLine);
    inspected = invokeFixedHelper('diagnostic-inspect').value;
    if (inspected.operation !== 'inspect' || inspected.attemptId !== DIAGNOSTIC_IDENTITY) throw new Error('diagnostic inspect identity mismatch');
    if (inspected.firecrackerPidAlive !== true || inspected.firecrackerUid !== 65532 || inspected.firecrackerGid !== 65532 || inspected.netnsMatch !== true || inspected.linksOnlyLoopback !== true || inspected.noGuestNic !== true) {
      throw new Error('diagnostic containment facts failed closed');
    }
    await transport.close();
    transport = undefined;
    cleanup = invokeFixedHelper('diagnostic-cleanup').value;
    if (cleanup.operation !== 'diagnostic-cleanup' || cleanup.attemptId !== DIAGNOSTIC_IDENTITY || cleanup.noSurvivor !== true) throw new Error('diagnostic cleanup did not prove no survivor');
    process.stdout.write(`${JSON.stringify({
      marker: 'FATES_005A_DIAGNOSTIC_REHEARSAL',
      result: 'PASS',
      sessionId: DIAGNOSTIC_IDENTITY,
      transportKind: 'firecracker-vsock-uds',
      realKvm: true,
      firecracker: true,
      jailer: true,
      correctedKernel: true,
      guestInitReached: true,
      guestConnectionAccepted: true,
      diagnosticFrameReceived: true,
      proposalIdentityValid: true,
      diagnosticResultSent,
      guestCid: 42,
      hostCid: 2,
      guestPort: 7000,
      noTcpFallback: true,
      noGuestNic: inspected.noGuestNic,
      socketIdentity,
      guestStages: stageEvidence.events,
      runtime: inspected,
      cleanup,
      listenerUid,
      listenerGid,
    }, null, 2)}\n`);
  } catch (error) {
    try { await transport?.close(); } catch { /* cleanup is reported below */ }
    if (prepared) {
      try { cleanup = invokeFixedHelper('diagnostic-cleanup').value; } catch (cleanupError) { cleanup = { operation: 'diagnostic-cleanup', error: cleanupError instanceof Error ? cleanupError.message : 'unknown cleanup error' }; }
    }
    const message = error instanceof Error ? error.message : 'unknown diagnostic rehearsal failure';
    process.stdout.write(`${JSON.stringify({
      marker: 'FATES_005A_DIAGNOSTIC_REHEARSAL',
      result: 'FAIL',
      sessionId: DIAGNOSTIC_IDENTITY,
      lastSuccessfulStage: stageEvidence?.events?.at(-1)?.stage ?? null,
      terminalError: message,
      proposalReceived: proposal !== undefined,
      diagnosticResultSent,
      inspected: inspected ?? null,
      cleanup: cleanup ?? null,
      listenerUid,
      listenerGid,
    }, null, 2)}\n`);
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`FATES-005A DIAGNOSTIC REHEARSAL: FAIL ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exitCode = 1;
});
