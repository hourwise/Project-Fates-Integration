import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, lstat, open } from 'node:fs/promises';
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
export const GUEST_CONNECT_RETRY_BUDGET_MS = 60_000;
export const HOST_CONNECT_TIMEOUT_MS = 90_000;
export const DIAGNOSTIC_RECEIVE_TIMEOUT_MS = HOST_CONNECT_TIMEOUT_MS + 5_000;
export const DIAGNOSTIC_STAGE_OBSERVATION_TIMEOUT_MS = 10_000;
export const DIAGNOSTIC_STAGE_POLL_INTERVAL_MS = 50;
export const MAX_DIAGNOSTIC_STAGE_EVENTS = 32;

const DIAGNOSTIC_LOG_MARKER = 'FATES_005A_GUEST_STAGE ';
const SUCCESSFUL_GUEST_STAGES = new Set([
  'INIT_STARTED',
  'CMDLINE_PARSED',
  'EXECUTION_CONTRACT_VALID',
  'AF_VSOCK_SOCKET_CREATED',
  'AF_VSOCK_CONNECTED',
  'PROPOSAL_SENT',
  'RESULT_RECEIVED',
  'RESULT_ALLOW',
]);
const KERNEL_INDICATORS = Object.freeze({
  sawLinuxVersion: /\bLinux version [0-9]+\.[0-9]+\.[0-9]+(?:[-+~][A-Za-z0-9._+-]+)?\b/,
  sawRunInit: /\bRun (?:\/init|\/sbin\/init) as init process\b/,
  sawKernelPanic: /\bKernel panic - not syncing:/,
  sawNoWorkingInit: /\bNo working init found\b/,
});

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

const READ_ONLY_NOFOLLOW_FLAGS =
  (fsConstants.O_RDONLY ?? 0) | (fsConstants.O_CLOEXEC ?? 0) | (fsConstants.O_NOFOLLOW ?? 0);
const FIXED_LOG_ERROR_REASONS = Object.freeze({
  ENOENT: 'jailer log is not present',
  EACCES: 'jailer log is not readable by the diagnostic observer',
  EPERM: 'jailer log is not readable by the diagnostic observer',
  ELOOP: 'jailer log path is a symlink or contains a symlink',
  INVALID_LOG: 'jailer log is not a regular file',
  LOG_TOO_LARGE: 'jailer log exceeds the bounded evidence limit',
  PARSE_ERROR: 'jailer log contains a rejected diagnostic record',
  OBSERVATION_TIMEOUT: 'bounded jailer-log observation timed out',
  NOT_OBSERVED: 'jailer-log observation has not started',
  UNAVAILABLE: 'jailer log could not be read',
});

function fixedLogError(code) {
  return { code, reason: FIXED_LOG_ERROR_REASONS[code] ?? FIXED_LOG_ERROR_REASONS.UNAVAILABLE };
}

function boundedLogError(error) {
  const code = typeof error?.code === 'string' && FIXED_LOG_ERROR_REASONS[error.code] ? error.code : 'UNAVAILABLE';
  return fixedLogError(code);
}

function unavailableDiagnosticSnapshot(error) {
  const detail = error?.reason && error?.code ? { code: error.code, reason: error.reason } : boundedLogError(error);
  return {
    guestStageObservation: 'LOG_UNAVAILABLE',
    guestStages: [],
    lastSuccessfulStage: null,
    terminalGuestStage: null,
    terminalGuestErrno: null,
    kernelLogReadable: false,
    sawLinuxVersion: false,
    sawRunInit: false,
    sawKernelPanic: false,
    sawNoWorkingInit: false,
    jailerLogBytes: null,
    jailerLogSha256: null,
    stageEvidenceTruncated: false,
    stageLogError: detail,
  };
}

function digestBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function readBoundedDiagnosticLog(logPath, maxBytes = MAX_LOG_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new TypeError('diagnostic log bound is invalid');
  let handle;
  try {
    const pathInfo = await lstat(logPath);
    if (pathInfo.isSymbolicLink() || !pathInfo.isFile()) return { readable: false, error: fixedLogError('INVALID_LOG') };
    if (pathInfo.size > maxBytes) return { readable: false, error: fixedLogError('LOG_TOO_LARGE') };
    handle = await open(logPath, READ_ONLY_NOFOLLOW_FLAGS);
    const openedInfo = await handle.stat();
    if (!openedInfo.isFile()) return { readable: false, error: fixedLogError('INVALID_LOG') };
    const chunks = [];
    let bytes = 0;
    while (bytes <= maxBytes) {
      const buffer = Buffer.alloc(Math.min(8192, maxBytes + 1 - bytes));
      const result = await handle.read(buffer, 0, buffer.length, null);
      if (result.bytesRead === 0) break;
      bytes += result.bytesRead;
      chunks.push(buffer.subarray(0, result.bytesRead));
      if (bytes > maxBytes) return { readable: false, error: fixedLogError('LOG_TOO_LARGE') };
    }
    const content = Buffer.concat(chunks, bytes);
    return { readable: true, bytes, content, sha256: digestBuffer(content) };
  } catch (error) {
    return { readable: false, error: boundedLogError(error) };
  } finally {
    if (handle) await handle.close().catch(() => undefined);
  }
}

export function parseDiagnosticStageEvidence(log, parseStage) {
  if (typeof parseStage !== 'function') throw new TypeError('guest diagnostic parser is required');
  const events = [];
  let markerCount = 0;
  for (const line of String(log).split(/\r?\n/)) {
    const index = line.indexOf(DIAGNOSTIC_LOG_MARKER);
    if (index < 0) continue;
    markerCount++;
    if (markerCount > MAX_DIAGNOSTIC_STAGE_EVENTS) return { events, markerCount, truncated: true };
    const stageLine = line.slice(index);
    let parsed;
    try {
      parsed = parseStage(stageLine);
    } catch {
      throw new Error('guest diagnostic line failed bounded parsing');
    }
    if (!parsed || typeof parsed.stage !== 'string' || !/^[A-Z_]{1,64}$/.test(parsed.stage)) {
      throw new Error('guest diagnostic parser returned an invalid bounded stage');
    }
    const event = { stage: parsed.stage };
    if (parsed.errno !== undefined) {
      if (!Number.isSafeInteger(parsed.errno) || parsed.errno < 0 || parsed.errno > 65535) {
        throw new Error('guest diagnostic parser returned an invalid bounded errno');
      }
      event.errno = parsed.errno;
    }
    events.push(event);
  }
  return { events, markerCount, truncated: false };
}

export function requiredStageOrder(events) {
  const names = events.map((event) => event.stage);
  let cursor = -1;
  for (const stage of REQUIRED_STAGES) {
    const next = names.indexOf(stage, cursor + 1);
    if (next < 0) return { ok: false, names };
    cursor = next;
  }
  return { ok: true, names };
}

function diagnosticStageSummary(stageEvidence) {
  const events = stageEvidence.events;
  const terminal = events.at(-1);
  let lastSuccessfulStage = null;
  for (const event of events) {
    if (SUCCESSFUL_GUEST_STAGES.has(event.stage)) lastSuccessfulStage = event.stage;
  }
  return {
    guestStageObservation: events.length > 0 ? 'OBSERVED' : 'NO_STAGE_MARKERS_PRESENT',
    guestStages: events,
    lastSuccessfulStage,
    terminalGuestStage: terminal?.stage ?? null,
    terminalGuestErrno: Number.isSafeInteger(terminal?.errno) ? terminal.errno : null,
    stageEvidenceTruncated: stageEvidence.truncated,
  };
}

export function summarizeDiagnosticLog(log, parseStage, { logBytes, logSha256 } = {}) {
  const text = String(log);
  const stageEvidence = parseDiagnosticStageEvidence(text, parseStage);
  return {
    ...diagnosticStageSummary(stageEvidence),
    kernelLogReadable: true,
    sawLinuxVersion: KERNEL_INDICATORS.sawLinuxVersion.test(text),
    sawRunInit: KERNEL_INDICATORS.sawRunInit.test(text),
    sawKernelPanic: KERNEL_INDICATORS.sawKernelPanic.test(text),
    sawNoWorkingInit: KERNEL_INDICATORS.sawNoWorkingInit.test(text),
    jailerLogBytes: logBytes ?? Buffer.byteLength(text, 'utf8'),
    jailerLogSha256: logSha256 ?? digestBuffer(Buffer.from(text, 'utf8')),
    stageLogError: null,
  };
}

export async function captureDiagnosticSnapshot(logPath, parseStage, maxBytes = MAX_LOG_BYTES) {
  const result = await readBoundedDiagnosticLog(logPath, maxBytes);
  if (!result.readable) return unavailableDiagnosticSnapshot(result.error);
  return summarizeDiagnosticLog(result.content.toString('utf8'), parseStage, { logBytes: result.bytes, logSha256: result.sha256 });
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })]);
  } finally {
    clearTimeout(timer);
  }
}

export function createDiagnosticStageObserver(logPath, parseStage, { pollIntervalMs = DIAGNOSTIC_STAGE_POLL_INTERVAL_MS, maxBytes = MAX_LOG_BYTES } = {}) {
  let started = false;
  let stopRequested = false;
  let loopPromise;
  let fatalError;
  let latest = unavailableDiagnosticSnapshot(fixedLogError('NOT_OBSERVED'));

  const sample = async () => {
    try {
      latest = await captureDiagnosticSnapshot(logPath, parseStage, maxBytes);
    } catch (error) {
      fatalError = error instanceof Error ? error : new Error('guest diagnostic observation failed');
      latest = unavailableDiagnosticSnapshot(fixedLogError('PARSE_ERROR'));
    }
  };

  const run = async () => {
    while (!stopRequested) {
      await sample();
      if (stopRequested || fatalError) break;
      await delay(pollIntervalMs);
    }
  };

  return {
    start() {
      if (!started) {
        started = true;
        loopPromise = run();
      }
      return this;
    },
    getSnapshot() {
      return latest;
    },
    async waitForRequiredStages(timeoutMs) {
      if (!started) throw new Error('guest diagnostic stage observer was not started');
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (fatalError) throw new Error('guest diagnostic stage observation failed during bounded parsing');
        const order = requiredStageOrder(latest.guestStages);
        if (latest.guestStageObservation === 'OBSERVED' && !latest.stageEvidenceTruncated && order.ok) return latest;
        await delay(Math.min(pollIntervalMs, Math.max(1, deadline - Date.now())));
      }
      const order = requiredStageOrder(latest.guestStages);
      throw new Error('required guest diagnostic stages were not observed; lastStages=' + JSON.stringify(order.names));
    },
    async stopAndSnapshot(timeoutMs = 2_000) {
      stopRequested = true;
      try { await withTimeout(loopPromise ?? Promise.resolve(), timeoutMs, 'bounded jailer-log observer did not stop'); } catch { /* final snapshot remains fail-closed */ }
      try {
        return await withTimeout(captureDiagnosticSnapshot(logPath, parseStage, maxBytes), timeoutMs, 'bounded jailer-log snapshot timed out');
      } catch {
        return unavailableDiagnosticSnapshot(fixedLogError('OBSERVATION_TIMEOUT'));
      }
    },
  };
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
  let preparedRecord;
  let transport;
  let cleanup;
  let inspected;
  let socketIdentity;
  let proposal;
  let stageObserver;
  let finalStageEvidence = unavailableDiagnosticSnapshot(fixedLogError('NOT_OBSERVED'));
  let diagnosticResultSent = false;
  let guestConnectionAccepted = false;
  let diagnosticFrameReceived = false;
  let proposalReceived = false;
  let runtimeInspectionError = null;
  let failure;

  try {
    preparedRecord = invokeFixedHelper('diagnostic-prepare').value;
    prepared = true;
    if (preparedRecord.operation !== 'diagnostic-prepare' || preparedRecord.attemptId !== DIAGNOSTIC_IDENTITY || preparedRecord.guestVsockSocket !== EXPECTED_SOCKET || preparedRecord.diagnosticInitrd !== DIAGNOSTIC_INITRD || preparedRecord.diagnosticInitrdSha256 !== DIAGNOSTIC_INITRD_SHA256) {
      throw new Error('diagnostic prepare record is not bound to the fixed identity/artifact');
    }
    if (await waitForPath(preparedRecord.guestVsockSocket.replace(/\/[^/]+$/, ''), 5_000) !== true) throw new Error('diagnostic jail root did not become available');

    transport = new FirecrackerVsockTransport({ socketPath: preparedRecord.guestVsockSocket, maxFrameBytes: 64 * 1024, connectTimeoutMs: HOST_CONNECT_TIMEOUT_MS });
    await transport.listen();
    socketIdentity = await inspectBoundSocket(preparedRecord.guestVsockSocket);

    invokeFixedHelper('diagnostic-launch');
    try {
      inspected = invokeFixedHelper('diagnostic-inspect').value;
    } catch (error) {
      runtimeInspectionError = 'diagnostic inspect failed before guest transport observation';
      throw error;
    }
    if (inspected.operation !== 'inspect' || inspected.attemptId !== DIAGNOSTIC_IDENTITY) throw new Error('diagnostic inspect identity mismatch');
    if (inspected.firecrackerPidAlive !== true || inspected.firecrackerUid !== 65532 || inspected.firecrackerGid !== 65532 || inspected.netnsMatch !== true || inspected.linksOnlyLoopback !== true || inspected.noGuestNic !== true) {
      throw new Error('diagnostic containment facts failed closed');
    }

    stageObserver = createDiagnosticStageObserver(preparedRecord.jailerLog, parseFatesGuestDiagnosticLine).start();
    const frame = await withTimeout(transport.receive(), DIAGNOSTIC_RECEIVE_TIMEOUT_MS, 'timed out waiting for real guest AF_VSOCK connection');
    guestConnectionAccepted = true;
    diagnosticFrameReceived = true;
    proposal = parseFatesGuestProposal(frame, DIAGNOSTIC_IDENTITY);
    proposalReceived = true;
    if (!validateProposal(proposal)) throw new Error('diagnostic proposal identity or bounded fields do not match the fixed rehearsal contract');
    await transport.send(fatesProposalResultEnvelope(DIAGNOSTIC_IDENTITY, proposal.requestId, { action: 'ALLOW', reasonCode: 'FATES_DIAGNOSTIC_REHEARSAL_ONLY' }));
    diagnosticResultSent = true;
    await stageObserver.waitForRequiredStages(DIAGNOSTIC_STAGE_OBSERVATION_TIMEOUT_MS);
  } catch (error) {
    failure = error instanceof Error ? error : new Error('unknown diagnostic rehearsal failure');
  } finally {
    try { await transport?.close(); } catch (error) { failure ??= error instanceof Error ? error : new Error('diagnostic transport close failed'); }
    transport = undefined;

    if (preparedRecord) {
      try {
        finalStageEvidence = stageObserver
          ? await stageObserver.stopAndSnapshot()
          : await captureDiagnosticSnapshot(preparedRecord.jailerLog, parseFatesGuestDiagnosticLine);
      } catch (error) {
        finalStageEvidence = unavailableDiagnosticSnapshot(fixedLogError('PARSE_ERROR'));
        failure ??= error instanceof Error ? error : new Error('diagnostic stage snapshot failed');
      }
    }

    if (prepared) {
      try {
        cleanup = invokeFixedHelper('diagnostic-cleanup').value;
        if (cleanup.operation !== 'diagnostic-cleanup' || cleanup.attemptId !== DIAGNOSTIC_IDENTITY || cleanup.noSurvivor !== true) throw new Error('diagnostic cleanup did not prove no survivor');
      } catch {
        cleanup = cleanup ?? { operation: 'diagnostic-cleanup', error: 'diagnostic cleanup failed' };
        failure ??= new Error('diagnostic cleanup failed');
      }
    }
  }

  if (!failure && (finalStageEvidence.guestStageObservation !== 'OBSERVED' || finalStageEvidence.stageEvidenceTruncated || !requiredStageOrder(finalStageEvidence.guestStages).ok)) {
    failure = new Error('final guest diagnostic stage snapshot did not prove the required stage order');
  }

  if (failure) {
    const message = failure instanceof Error ? failure.message : 'unknown diagnostic rehearsal failure';
    process.stdout.write(JSON.stringify({
      marker: 'FATES_005A_DIAGNOSTIC_REHEARSAL',
      result: 'FAIL',
      sessionId: DIAGNOSTIC_IDENTITY,
      transportKind: 'firecracker-vsock-uds',
      realKvm: true,
      firecracker: true,
      jailer: true,
      correctedKernel: true,
      guestConnectionAccepted,
      diagnosticFrameReceived,
      terminalError: message,
      proposalReceived,
      diagnosticResultSent,
      inspected: inspected ?? null,
      runtime: inspected ?? null,
      runtimeInspectionError,
      guestStageObservation: finalStageEvidence.guestStageObservation,
      guestStages: finalStageEvidence.guestStages,
      lastSuccessfulStage: finalStageEvidence.lastSuccessfulStage,
      terminalGuestStage: finalStageEvidence.terminalGuestStage,
      terminalGuestErrno: finalStageEvidence.terminalGuestErrno,
      kernelLogReadable: finalStageEvidence.kernelLogReadable,
      sawLinuxVersion: finalStageEvidence.sawLinuxVersion,
      sawRunInit: finalStageEvidence.sawRunInit,
      sawKernelPanic: finalStageEvidence.sawKernelPanic,
      sawNoWorkingInit: finalStageEvidence.sawNoWorkingInit,
      jailerLogBytes: finalStageEvidence.jailerLogBytes,
      jailerLogSha256: finalStageEvidence.jailerLogSha256,
      stageEvidenceTruncated: finalStageEvidence.stageEvidenceTruncated,
      stageLogError: finalStageEvidence.stageLogError,
      socketIdentity: socketIdentity ?? null,
      cleanup: cleanup ?? null,
      listenerUid,
      listenerGid,
    }, null, 2) + '\n');
    throw failure;
  }

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
    guestStageObservation: finalStageEvidence.guestStageObservation,
    guestStages: finalStageEvidence.guestStages,
    lastSuccessfulStage: finalStageEvidence.lastSuccessfulStage,
    terminalGuestStage: finalStageEvidence.terminalGuestStage,
    terminalGuestErrno: finalStageEvidence.terminalGuestErrno,
    kernelLogReadable: finalStageEvidence.kernelLogReadable,
    sawLinuxVersion: finalStageEvidence.sawLinuxVersion,
    sawRunInit: finalStageEvidence.sawRunInit,
    sawKernelPanic: finalStageEvidence.sawKernelPanic,
    sawNoWorkingInit: finalStageEvidence.sawNoWorkingInit,
    jailerLogBytes: finalStageEvidence.jailerLogBytes,
    jailerLogSha256: finalStageEvidence.jailerLogSha256,
    stageEvidenceTruncated: finalStageEvidence.stageEvidenceTruncated,
    stageLogError: finalStageEvidence.stageLogError,
    runtime: inspected,
    cleanup,
    listenerUid,
    listenerGid,
  }, null, 2)}\n`);
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entryPoint) {
  main().catch((error) => {
    process.stderr.write('FATES-005A DIAGNOSTIC REHEARSAL: FAIL ' + (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  });
}
