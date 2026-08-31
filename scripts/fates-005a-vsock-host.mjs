import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { access, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runGovernedSmoke } from './fates-governed-smoke.mjs';

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultMoiraeRoot = resolve(dirname(integrationRoot), 'moirae-code');
const SOURCE_ID = 'file:docs/fates-005c.md';
const SOURCE_CONTENT = 'The controlled FATES-005C source is admitted only after authenticated authority and strict provenance verification.';
const SOURCE_HASH = createHash('sha256').update(SOURCE_CONTENT, 'utf8').digest('hex');
const MEMORY_ID = 'memory_fates_005c_001';
const IDEMPOTENCY_KEY = 'fates-005c-idempotency-001';
const HOST_CONNECT_TIMEOUT_MS = 90_000;

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : fallback;
}

function required(name) {
  const value = arg(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function waitForPath(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await access(path); return true; } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 50)); }
  }
  return false;
}

async function waitForSocket(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const info = await lstat(path);
      if (info.isSocket()) return info;
    } catch { /* the jail root or listener endpoint may not exist yet */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  return undefined;
}

async function main() {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('FATES-005A host requires Linux x86_64');
  const listenerUid = process.getuid?.();
  const listenerGid = process.getgid?.();
  if (listenerUid === undefined || listenerGid === undefined || listenerUid === 0 || listenerGid === 0) throw new Error('FATES-005A governed host listener must remain unprivileged');
  const socketPath = required('--socket');
  const sessionId = required('--session-id');
  const moiraeImplementationCommit = required('--moirae-implementation-commit');
  const workspaceRoot = resolve(arg('--workspace-root', resolve(dirname(integrationRoot))));
  const durableStateRoot = resolve(arg('--durable-state-root', join('/run/fates', `005a-${sessionId}`)));
  const moiraeRoot = resolve(arg('--moirae-root', defaultMoiraeRoot));
  const runtimeContractsArtifact = arg('--runtime-contracts-artifact');
  const readyFile = arg('--ready-file');
  if (runtimeContractsArtifact) process.env.FATES_RUNTIME_CONTRACTS_ARTIFACT = resolve(runtimeContractsArtifact);
  const { FirecrackerVsockTransport, parseFatesGuestProposal, fatesProposalResultEnvelope } = await import(pathToFileURL(join(moiraeRoot, 'packages', 'sandbox-adapter', 'dist', 'index.js')).href);
  const transport = new FirecrackerVsockTransport({ socketPath, maxFrameBytes: 64 * 1024, connectTimeoutMs: HOST_CONNECT_TIMEOUT_MS });
  let shutdownRequested = false;
  let closePromise;
  let guestConnectionAccepted = false;
  let proposalReceived = false;
  const requestShutdown = () => {
    shutdownRequested = true;
    closePromise ??= transport.close().catch(() => undefined);
  };
  process.once('SIGTERM', requestShutdown);
  process.once('SIGINT', requestShutdown);
  let proposal;
  try {
    if (!await waitForPath(dirname(socketPath), 60_000)) throw new Error(`Firecracker jail root did not become available: ${dirname(socketPath)}`);
    if (shutdownRequested) return;
    await transport.listen();
    if (!await waitForSocket(socketPath, 5_000)) throw new Error(`governed host listener did not bind a Unix socket: ${socketPath}`);
    if (readyFile) writeFileSync(readyFile, `${socketPath}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    const frame = await transport.receive();
    guestConnectionAccepted = true;
    proposal = parseFatesGuestProposal(frame, sessionId);
    proposalReceived = true;
    const boundedProposal = proposal.payload;
    if (boundedProposal.sourceId !== SOURCE_ID || boundedProposal.sourceHash !== SOURCE_HASH || boundedProposal.memoryId !== MEMORY_ID || boundedProposal.idempotencyKey !== IDEMPOTENCY_KEY) {
      await transport.send(fatesProposalResultEnvelope(sessionId, proposal.requestId, { action: 'DENY', reasonCode: 'FATES_PROPOSAL_BINDING_MISMATCH' }));
      process.stdout.write(`${JSON.stringify({
        marker: 'FATES_005A_HOST_RESULT',
        transportKind: transport.kind,
        guestConnectionAccepted,
        proposalReceived,
        sessionId,
        requestId: proposal.requestId,
        correlationId: boundedProposal.correlationId,
        proposalAction: boundedProposal.action,
        action: 'DENY',
        reasonCode: 'FATES_PROPOSAL_BINDING_MISMATCH',
        directProviderExecution: false,
        listenerUid,
        listenerGid,
      })}\n`);
      process.exitCode = 2;
      return;
    }
    const evidence = await runGovernedSmoke({
      workspaceRoot,
      verifyArtifact: true,
      durableStateRoot,
      proposal: {
        requestId: proposal.requestId,
        correlationId: boundedProposal.correlationId,
        idempotencyKey: boundedProposal.idempotencyKey,
      },
      moiraeImplementationCommit,
    });
    await transport.send(fatesProposalResultEnvelope(sessionId, proposal.requestId, {
      action: 'ALLOW',
      reasonCode: 'FATES_GOVERNED_PATH_COMPLETED',
      candidateId: evidence.candidateId,
      governedState: evidence.horae.state,
      decisionId: evidence.horae.decisionId,
    }));
    process.stdout.write(`${JSON.stringify({
      marker: 'FATES_005A_HOST_RESULT',
      transportKind: transport.kind,
      guestConnectionAccepted,
      proposalReceived,
      sessionId,
      requestId: proposal.requestId,
      proposalAction: boundedProposal.action,
      correlationId: boundedProposal.correlationId,
      action: 'ALLOW',
      reasonCode: 'FATES_GOVERNED_PATH_COMPLETED',
      candidateId: evidence.candidateId,
      governedState: evidence.horae.state,
      decisionId: evidence.horae.decisionId,
      operationId: evidence.operationId,
      correlationId: evidence.correlationId,
      directProviderExecution: evidence.moirae.directProviderExecution,
      listenerUid,
      listenerGid,
    })}\n`);
  } catch (error) {
    if (!shutdownRequested) {
      process.stderr.write(`FATES-005A HOST: FAIL ${error instanceof Error ? error.message : 'unknown error'}\n`);
      if (proposal) {
        try { await transport.send(fatesProposalResultEnvelope(sessionId, proposal.requestId, { action: 'DENY', reasonCode: 'FATES_GOVERNED_PATH_FAILED' })); } catch { /* the guest may have already disconnected */ }
      }
      process.exitCode = 1;
    }
  } finally {
    process.off('SIGTERM', requestShutdown);
    process.off('SIGINT', requestShutdown);
    await (closePromise ?? transport.close());
  }
}

main().catch((error) => {
  process.stderr.write(`FATES-005A HOST: FAIL\n${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
