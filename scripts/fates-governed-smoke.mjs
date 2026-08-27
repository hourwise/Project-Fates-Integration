// Bounded FATES-005C governed vertical. This is an in-process integration
// evidence path, not a Firecracker, Qwen, provider, or containment test.

import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  downloadAndVerifyArtifact,
  loadCurrentCandidate,
  peerDefinitions,
  repositoryRoot,
  verifyMaterializedRepository,
} from './fates-checkout-current.mjs';

export const OPERATION_NAME = 'governed.memory-admission';
export const REPLAY_SEMANTICS = 'IDEMPOTENT_SAME_EFFECT';
export const BASE_NOW = '2026-08-27T12:00:00.000Z';
export const REQUIRED_LOOPBACK_ENDPOINT = 'not-used';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function canonicalRequestDigest(binding) {
  return sha256(canonicalize(binding));
}

export function createOperationBinding({ requestId, correlationId, callerId, actingAgentId, tenantId, workspaceId, projectId, action, sourceId, memoryId, destination, content }) {
  return {
    operationId: requestId,
    correlationId,
    caller: { id: callerId, kind: 'service' },
    actingAgent: { id: actingAgentId, kind: 'agent' },
    tenantId,
    workspaceId,
    projectId,
    action,
    resource: { sourceId, memoryId },
    destination,
    inputDigest: sha256(content),
  };
}

const importFrom = (root, relativePath) => import(pathToFileURL(join(root, relativePath)).href);

function workspacePath(workspaceRoot, key) {
  return join(workspaceRoot, peerDefinitions[key].directory);
}

async function verifyCandidateCheckouts({ workspaceRoot, manifest }) {
  const heads = {};
  for (const key of ['adrasteia', ...['ananke', 'mnemosyne', 'horae', 'moirae-code']]) {
    const repository = manifest.repositories[key];
    const result = verifyMaterializedRepository({ directory: workspacePath(workspaceRoot, key), expectedUrl: repository.url, expectedCommit: repository.commit });
    heads[key] = result.head;
  }
  return heads;
}

function requestFor({ createMoiraeGovernedRequest, projectId = 'project_fates_005c', tenantId = 'tenant_fates_005c', workspaceId = 'workspace_fates_005c', requestId = 'req_fates_005c_001', correlationId = 'cor_fates_005c_001', callerId = 'fates-authenticated-service', actingAgentId = 'moirae-controlled-agent', content = 'The controlled FATES-005C source is admitted only after authenticated authority and strict provenance verification.', memoryId = 'memory_fates_005c_001' }) {
  const baseSessionRequest = {
    task: 'admit one source-backed fact',
    purpose: OPERATION_NAME,
    projectId,
    execution: {
      authenticatedPrincipal: { id: callerId, kind: 'service' },
      actingPrincipal: { id: actingAgentId, kind: 'agent' },
      projectId,
      tenantId,
      workspaceId,
      runtimeId: 'horae-fates-005c',
      sessionId: 'session_fates_005c_001',
    },
    scope: { mode: 'bounded', projectId, tenantId, workspaceId, resourceIds: [projectId, 'source:docs/fates-005c.md'] },
    correlation: { requestId, correlationId },
  };
  const source = { sourceId: 'file:docs/fates-005c.md', canonicalPath: 'docs/fates-005c.md', sourceHash: sha256(content) };
  const contentAccess = {
    requestedExposure: 'SELECTED_CONTENT',
    destination: { runtime: 'mnemosyne' },
    purpose: 'admit source-backed fact',
    selection: { ranges: [{ start: 0, end: content.length }] },
  };
  const operationBinding = createOperationBinding({
    requestId,
    correlationId,
    callerId,
    actingAgentId,
    tenantId,
    workspaceId,
    projectId,
    action: 'memory.write',
    sourceId: source.sourceId,
    memoryId,
    destination: 'mnemosyne',
    content,
  });
  const operationBindingDigest = canonicalRequestDigest(operationBinding);
  const envelope = createMoiraeGovernedRequest({
    idempotencyKey: 'fates-005c-idempotency-001',
    sessionRequest: baseSessionRequest,
    source,
    content,
    contentAccess: { ...contentAccess, operationBindingDigest },
    memoryId,
    instanceId: 'moirae-controlled-host-005c',
    artifact: 'moirae-fates-005c-governed-vertical',
  });
  return {
    ...envelope,
    profile: {
      id: 'profile_fates_005c',
      displayName: 'FATES-005C controlled vertical',
      projectId,
      requiredRuntimeCapabilities: [],
      allowedRuntimeCapabilities: [],
      auditDestinations: [],
      capabilityExposure: 'fixed',
    },
    operationBinding,
    operationBindingDigest,
  };
}

function cloneRequest(request, changes = {}) {
  const sessionRequest = {
    ...request.sessionRequest,
    ...changes.sessionRequest,
    execution: { ...request.sessionRequest.execution, ...(changes.sessionRequest?.execution ?? {}) },
    scope: { ...request.sessionRequest.scope, ...(changes.sessionRequest?.scope ?? {}) },
    correlation: { ...request.sessionRequest.correlation, ...(changes.sessionRequest?.correlation ?? {}) },
  };
  const content = changes.content ?? request.content;
  const binding = createOperationBinding({
    requestId: sessionRequest.correlation.requestId,
    correlationId: sessionRequest.correlation.correlationId,
    callerId: sessionRequest.execution.authenticatedPrincipal.id,
    actingAgentId: sessionRequest.execution.actingPrincipal.id,
    tenantId: sessionRequest.execution.tenantId,
    workspaceId: sessionRequest.execution.workspaceId,
    projectId: sessionRequest.projectId,
    action: changes.action ?? 'memory.write',
    sourceId: changes.source?.sourceId ?? request.source.sourceId,
    memoryId: changes.memoryId ?? request.memoryId,
    destination: changes.destination ?? 'mnemosyne',
    content,
  });
  const digest = canonicalRequestDigest(binding);
  return {
    ...request,
    ...changes,
    content,
    source: { ...request.source, ...(changes.source ?? {}), sourceHash: sha256(content) },
    memoryId: changes.memoryId ?? request.memoryId,
    sessionRequest,
    contentAccess: { ...request.contentAccess, ...(changes.contentAccess ?? {}), operationBindingDigest: digest },
    operationBinding: binding,
    operationBindingDigest: digest,
  };
}

function makeProfile(request) {
  return {
    id: 'profile_fates_005c',
    displayName: 'FATES-005C controlled vertical',
    projectId: request.sessionRequest.projectId,
    requiredRuntimeCapabilities: [],
    allowedRuntimeCapabilities: [],
    auditDestinations: [],
    capabilityExposure: 'fixed',
  };
}

function expectedContext(request) {
  return {
    projectId: request.sessionRequest.projectId,
    tenantId: request.sessionRequest.execution.tenantId,
    workspaceId: request.sessionRequest.execution.workspaceId,
    purpose: request.contentAccess.purpose,
    destinationRuntime: 'mnemosyne',
    requestId: request.sessionRequest.correlation.requestId,
    correlationId: request.sessionRequest.correlation.correlationId,
  };
}

function makeCandidateMemory(request, contentHash) {
  return {
    id: request.memoryId,
    kind: 'fact',
    statement: request.content,
    importance: 'high',
    source: { artifactId: 'artifact_fates_005c', path: request.source.canonicalPath, contentHash, sourceType: 'adr' },
    locator: 'MNEMOSYNE.FATES.005C.001',
    tags: ['governed', 'fates-005c'],
  };
}

function mutateSurface(surface) {
  if (surface && typeof surface === 'object' && typeof surface.text === 'string') return { ...surface, text: `${surface.text} [mutated-after-authority]` };
  if (surface && typeof surface === 'object' && Array.isArray(surface.ranges)) return { ...surface, ranges: surface.ranges.map((range) => `${range} [mutated-after-authority]`) };
  if (typeof surface === 'string') return `${surface} [mutated-after-authority]`;
  return { tampered: surface };
}

export async function runGovernedSmoke({ workspaceRoot = resolve(repositoryRoot, '..'), verifyArtifact = true, durableStateRoot = mkdtempSync(join(tmpdir(), 'fates-005d-smoke-')) } = {}) {
  const { pointer, manifest } = loadCurrentCandidate();
  const heads = await verifyCandidateCheckouts({ workspaceRoot, manifest });
  const artifact = verifyArtifact
    ? await downloadAndVerifyArtifact(manifest.repositories.adrasteia.artifact, process.env.FATES_RUNTIME_CONTRACTS_ARTIFACT)
    : { status: 'DECLARED_ONLY', sha256: manifest.repositories.adrasteia.artifact.sha256 };
  const [anankeRuntime, anankePolicy, horae, horaeRegistry, mnemosyne, moirae] = await Promise.all([
    importFrom(workspacePath(workspaceRoot, 'ananke'), 'packages/runtime-core/dist/index.js'),
    importFrom(workspacePath(workspaceRoot, 'ananke'), 'packages/policy-engine/dist/index.js'),
    importFrom(workspacePath(workspaceRoot, 'horae'), 'packages/session-orchestrator/dist/index.js'),
    importFrom(workspacePath(workspaceRoot, 'horae'), 'packages/runtime-registry/dist/index.js'),
    importFrom(workspacePath(workspaceRoot, 'mnemosyne'), 'packages/memory-ingest-engine/dist/index.js'),
    importFrom(workspacePath(workspaceRoot, 'moirae-code'), 'integrations/horae-client/dist/index.js'),
  ]);
  const { Ed25519ContentReceiptSigner, SourceAwareContentPreflightAdapter, StaticBearerExecutionProfilesAuthenticator } = anankeRuntime;
  const { ContentPolicyEngine } = anankePolicy;
  const { DurableAdmissionHistoryStore, ProvenanceAdmissionEngine, RuntimeContractsPreflightReceiptVerifier } = mnemosyne;
  const { GovernedExecutionCoordinator, GovernedExecutionCrash, FileDurableExecutionStateStore, SessionOrchestrator } = horae;
  const { RuntimeRegistry } = horaeRegistry;
  const { createMoiraeGovernedRequest } = moirae;
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const signer = new Ed25519ContentReceiptSigner('ananke-fates-005c-key', privateKey);
  const policy = new ContentPolicyEngine();
  const baseRequest = requestFor({ createMoiraeGovernedRequest });
  const identityProfile = {
    authenticatedPrincipal: { id: baseRequest.sessionRequest.execution.authenticatedPrincipal.id, kind: 'service' },
    actingPrincipal: { id: baseRequest.sessionRequest.execution.actingPrincipal.id, kind: 'agent' },
    tenantId: baseRequest.sessionRequest.execution.tenantId,
    projectId: baseRequest.sessionRequest.projectId,
    workspaceId: baseRequest.sessionRequest.execution.workspaceId,
    resourceScope: { mode: 'bounded', projectId: baseRequest.sessionRequest.projectId, tenantId: baseRequest.sessionRequest.execution.tenantId, workspaceId: baseRequest.sessionRequest.execution.workspaceId, resourceIds: [baseRequest.sessionRequest.projectId, 'source:docs/fates-005c.md'] },
    sessionId: baseRequest.sessionRequest.execution.sessionId,
  };
  const authenticator = new StaticBearerExecutionProfilesAuthenticator([{ token: 'fates-005c-authenticated-token', profile: identityProfile }]);
  const authenticatedIdentity = await authenticator.authenticate('Bearer fates-005c-authenticated-token');
  if (!authenticatedIdentity) throw new Error('Ananke authentication did not produce an identity');
  const executionContext = {
    runtimeId: 'ananke',
    runtimeInstanceId: 'ananke-fates-005c-instance',
    projectId: authenticatedIdentity.projectId,
    tenantId: authenticatedIdentity.tenantId,
    workspaceId: authenticatedIdentity.workspaceId,
    authenticatedPrincipal: authenticatedIdentity.authenticatedPrincipal,
    actingPrincipal: authenticatedIdentity.actingPrincipal,
    correlation: baseRequest.sessionRequest.correlation,
  };
  const verifier = new RuntimeContractsPreflightReceiptVerifier({
    now: () => BASE_NOW,
    trustedIssuers: [{ keyId: 'ananke-fates-005c-key', publicKey, issuerRuntime: 'ananke', allowedInstanceIds: [executionContext.runtimeInstanceId] }],
  });
  const admissionEngine = new ProvenanceAdmissionEngine({ now: () => BASE_NOW, history: new DurableAdmissionHistoryStore({ filePath: join(durableStateRoot, 'mnemosyne-admission.json'), now: () => BASE_NOW }) });
  const effect = { attempts: 0, successes: 0, effectId: null, digest: null, completed: new Map(), inFlight: false };
  let lastPreflight;
  let lastAdmission;

  async function preflight(request, mode = 'allow') {
    if (mode === 'unauthorized') return { action: 'DENY', reasonCode: 'ANANKE_AUTHENTICATION_REQUIRED', decisionId: 'ananke-auth-deny' };
    if (mode === 'transport_failure') throw new Error('ANANKE_AUTHORITY_TRANSPORT_FAILURE');
    const scanner = new SourceAwareContentPreflightAdapter({ sourceTrust: 'OWNED', mediaType: 'text/plain', sourceId: request.source.sourceId, canonicalPath: request.source.canonicalPath, now: () => BASE_NOW });
    const observed = await scanner.preflight({
      toolName: 'workspace.read',
      tool: { name: 'workspace.read', server: 'workspace', riskClass: 'READ_ONLY', requiredPermissions: [], retryable: false, requiresApproval: false },
      arguments: {},
      data: request.content,
      executionContext: { ...executionContext, projectId: request.sessionRequest.projectId, tenantId: request.sessionRequest.execution.tenantId, workspaceId: request.sessionRequest.execution.workspaceId, correlation: request.sessionRequest.correlation },
      request: request.contentAccess,
    });
    const decision = policy.evaluate(observed.observation, request.contentAccess);
    if (mode === 'deny') {
      lastPreflight = { action: 'DENY', receipt: undefined, observationId: observed.observation.observationId, decisionId: decision.binding.bindingHash, reasonCode: 'ANANKE_POLICY_DENY', grantedExposure: 'NONE', surface: undefined, authority: { kind: 'denied', decisionId: decision.binding.bindingHash, policyVersion: 'content-policy-v1' } };
      return lastPreflight;
    }
    const receipt = observed.receiptFactory?.(decision, { executionContext: { ...executionContext, correlation: request.sessionRequest.correlation }, signer });
    lastPreflight = {
      action: decision.action,
      receipt,
      observationId: observed.observation.observationId,
      decisionId: decision.binding.bindingHash,
      reasonCode: decision.reasonCode,
      grantedExposure: decision.grantedExposure,
      surface: observed.surfaces[decision.grantedExposure],
      authority: { kind: decision.action === 'ALLOW' ? 'allowed' : 'denied', decisionId: decision.binding.bindingHash, policyVersion: 'content-policy-v1' },
    };
    return lastPreflight;
  }

  function admit({ request, preflight, verifierForAdmission = verifier, engine = admissionEngine, surface = preflight.surface }) {
    if (!preflight.receipt) return { state: 'REJECTED', reason: 'PREFLIGHT_RECEIPT_REQUIRED' };
    const sourceContentHash = preflight.receipt.observation.source.contentHash;
    const result = engine.admit(makeCandidateMemory(request, sourceContentHash), {
      ingestionOperation: 'memory.write',
      ingestionPath: OPERATION_NAME,
      correlationId: request.sessionRequest.correlation.correlationId,
      idempotencyKey: request.idempotencyKey,
      projectId: request.sessionRequest.projectId,
      trustDomain: request.sessionRequest.projectId,
      tenantId: request.sessionRequest.execution.tenantId,
      workspaceId: request.sessionRequest.execution.workspaceId,
      requestId: request.sessionRequest.correlation.requestId,
      purpose: request.contentAccess.purpose,
      actor: { id: request.sessionRequest.execution.actingPrincipal.id, kind: 'agent' },
      receipt: preflight.receipt,
      preflightSurface: surface,
      preflight: verifierForAdmission,
      authority: { evaluate: () => preflight.authority ?? { kind: 'allowed', decisionId: preflight.decisionId, policyVersion: 'content-policy-v1' } },
      expectedContext: expectedContext(request),
    });
    lastAdmission = result;
    if (result.admission.state !== 'ADMITTED' || !result.memory) return { state: result.admission.state === 'QUARANTINED' ? 'QUARANTINED' : 'REJECTED', reason: result.admission.reasonCodes?.[0], replayed: result.replayed };
    return { state: 'ADMITTED', admissionId: result.admission.admissionId, candidateId: result.admission.candidateId, memoryId: result.memory.id, replayed: result.replayed };
  }

  function makeCoordinator({ mode = 'allow', engine = admissionEngine, effectSink = effect, verifierForAdmission = verifier, surfaceMutator = false, timeoutMs = 5000, stateFile = 'horae-main.json', faultInjector, effectReconciler = true } = {}) {
    const anankeBinding = { async preflight({ request }) { return preflight(request, mode); } };
    const mnemosyneBinding = {
      async admit({ request, preflight: result }) {
        return admit({ request, preflight: result, engine, verifierForAdmission, surface: surfaceMutator ? mutateSurface(result.surface) : result.surface });
      },
    };
    const coordinator = new GovernedExecutionCoordinator({
      orchestrator: new SessionOrchestrator(new RuntimeRegistry()),
      ananke: anankeBinding,
      mnemosyne: mnemosyneBinding,
      executor: { run: async ({ request, admission, effectId }) => {
        if (admission.state !== 'ADMITTED') throw new Error('effect dispatch requires admitted operation');
        effectSink.attempts += 1;
        effectSink.inFlight = true;
        effectSink.effectId = effectId ?? `controlled-effect:${request.operationBindingDigest}`;
        effectSink.digest = request.operationBindingDigest;
        if (effectSink.completed.has(effectSink.effectId)) throw new Error('duplicate controlled effect invocation');
        effectSink.successes += 1;
        const output = { effect: 'controlled-local-sink', effectId: effectSink.effectId, effectDigest: effectSink.digest };
        effectSink.completed.set(effectSink.effectId, output);
        effectSink.inFlight = false;
        return output;
      } },
      stateStore: new FileDurableExecutionStateStore({ filePath: join(durableStateRoot, stateFile) }),
      effectReconciler: effectReconciler ? { reconcile: async ({ effectId }) => {
        if (effectSink.inFlight) return { status: 'UNKNOWN' };
        const output = effectSink.completed.get(effectId);
        return output ? { status: 'CONFIRMED', output } : { status: 'ABSENT' };
      } } : undefined,
      faultInjector,
      timeoutMs,
      now: () => BASE_NOW,
    });
    return coordinator;
  }

  async function executeGuarded(coordinator, request, signal) {
    return coordinator.execute(request, signal);
  }

  const coordinator = makeCoordinator();
  const positive = await executeGuarded(coordinator, baseRequest);
  if (positive.state !== 'completed') throw new Error(`positive governed path ended in ${positive.state}`);
  const identicalRetry = await executeGuarded(coordinator, baseRequest);
  const changedPayload = cloneRequest(baseRequest, { content: `${baseRequest.content} changed` });
  let changedPayloadError;
  try { await executeGuarded(coordinator, changedPayload); } catch (error) { changedPayloadError = error.message; }
  const differentRequest = cloneRequest(baseRequest, { sessionRequest: { correlation: { requestId: 'req_fates_005c_002', correlationId: 'cor_fates_005c_002' } } });
  let differentRequestError;
  try { await executeGuarded(coordinator, differentRequest); } catch (error) { differentRequestError = error.message; }
  const crossCaller = cloneRequest(baseRequest, { sessionRequest: { execution: { authenticatedPrincipal: { id: 'other-service', kind: 'service' }, actingPrincipal: { id: 'other-agent', kind: 'agent' }, correlation: { requestId: 'req_fates_005c_003', correlationId: 'cor_fates_005c_003' } } } });
  const crossScope = cloneRequest(baseRequest, { sessionRequest: { execution: { tenantId: 'other-tenant', workspaceId: 'other-workspace' }, scope: { tenantId: 'other-tenant', workspaceId: 'other-workspace' }, correlation: { requestId: 'req_fates_005c_004', correlationId: 'cor_fates_005c_004' } } });
  const crossCallerRecord = coordinator.get(crossCaller);
  const crossScopeRecord = coordinator.get(crossScope);
  const replay = admit({ request: baseRequest, preflight: lastPreflight });
  const receiptCrossCaller = admit({ request: crossCaller, preflight: lastPreflight });
  const receiptCrossScope = admit({ request: crossScope, preflight: lastPreflight });

  const negatives = {};
  const negativePreflights = {};
  for (const [name, mode, extra] of [
    ['unauthorized', 'unauthorized', {}],
    ['deny', 'deny', {}],
    ['mutatedRequestAfterAuthority', 'allow', { surfaceMutator: true }],
    ['expiredAuthority', 'allow', {}],
    ['malformedAuthorityResult', 'malformed', {}],
    ['nonSuccessAuthorityTransport', 'transport_failure', {}],
  ]) {
    const scenarioEffect = { attempts: 0, successes: 0, effectId: null, digest: null, completed: new Map(), inFlight: false };
    const scenarioRequest = cloneRequest(baseRequest, { idempotencyKey: `fates-005c-${name}`, sessionRequest: { correlation: { requestId: `req_fates_005c_${name}`, correlationId: `cor_fates_005c_${name}` } } });
    const scenarioCoordinator = makeCoordinator({ mode, effectSink: scenarioEffect, surfaceMutator: extra.surfaceMutator });
    let record;
    if (mode === 'malformed') {
      const malformedAnanke = { async preflight() { return { action: 'ALLOW', reasonCode: 'MALFORMED_AUTHORITY_RESULT' }; } };
      const malformedCoordinator = new GovernedExecutionCoordinator({ orchestrator: new SessionOrchestrator(new RuntimeRegistry()), ananke: malformedAnanke, mnemosyne: { admit: async () => ({ state: 'ADMITTED' }) }, executor: { run: async () => { scenarioEffect.attempts += 1; scenarioEffect.successes += 1; } }, stateStore: new FileDurableExecutionStateStore({ filePath: join(durableStateRoot, 'horae-malformed.json') }), timeoutMs: 5000, now: () => BASE_NOW });
      record = await malformedCoordinator.execute(scenarioRequest);
    } else if (name === 'expiredAuthority') {
      const expiredVerifier = new RuntimeContractsPreflightReceiptVerifier({ now: () => '2026-08-27T12:10:00.000Z', trustedIssuers: [{ keyId: 'ananke-fates-005c-key', publicKey, issuerRuntime: 'ananke', allowedInstanceIds: [executionContext.runtimeInstanceId] }] });
      const expiredCoordinator = makeCoordinator({ engine: new ProvenanceAdmissionEngine({ now: () => '2026-08-27T12:10:00.000Z' }), verifierForAdmission: expiredVerifier, effectSink: scenarioEffect });
      record = await expiredCoordinator.execute(scenarioRequest);
    } else {
      record = await scenarioCoordinator.execute(scenarioRequest);
    }
    negativePreflights[name] = lastPreflight ? { action: lastPreflight.action, surface: lastPreflight.surface } : null;
    negatives[name] = { state: record.state, reason: record.reason, effectAttempts: scenarioEffect.attempts, effectSuccesses: scenarioEffect.successes };
  }

  const assertions = {
    positiveCompleted: positive.state === 'completed',
    effectAfterAdmission: effect.attempts === 1 && effect.successes === 1,
    identicalRetrySameResult: identicalRetry.state === 'completed' && effect.attempts === 1,
    changedPayloadRejected: changedPayloadError === 'IDEMPOTENCY_BINDING_MISMATCH' && effect.attempts === 1,
    sameKeyDifferentRequestRejected: differentRequestError === 'IDEMPOTENCY_BINDING_MISMATCH' && effect.attempts === 1,
    crossCallerNotFound: crossCallerRecord === undefined,
    crossScopeNotFound: crossScopeRecord === undefined,
    receiptReplayIdempotent: replay.state === 'ADMITTED' && replay.replayed === true,
    crossCallerReceiptRejected: receiptCrossCaller.state !== 'ADMITTED',
    crossScopeReceiptRejected: receiptCrossScope.state !== 'ADMITTED',
    allNegativeEffectsBlocked: Object.values(negatives).every(({ effectAttempts, effectSuccesses }) => effectAttempts === 0 && effectSuccesses === 0),
  };
  if (Object.values(assertions).some((value) => !value)) throw new Error(`governed smoke assertion failed: ${JSON.stringify({ assertions, effect, negatives, replay, lastAdmission, negativePreflights })}`);
  const crashRequest = cloneRequest(baseRequest, { idempotencyKey: 'fates-005d-crash-after-effect', sessionRequest: { correlation: { requestId: 'req_fates_005d_crash', correlationId: 'cor_fates_005d_crash' } } });
  const crashEffect = { attempts: 0, successes: 0, effectId: null, digest: null, completed: new Map(), inFlight: false };
  const crashAdmissionState = new DurableAdmissionHistoryStore({ filePath: join(durableStateRoot, 'mnemosyne-crash.json'), now: () => BASE_NOW });
  const crashEngine = new ProvenanceAdmissionEngine({ now: () => BASE_NOW, history: crashAdmissionState });
  let crashObserved = false;
  try {
    await makeCoordinator({ engine: crashEngine, effectSink: crashEffect, stateFile: 'horae-crash.json', faultInjector: (point) => {
      if (point === 'after_effect_success_before_record') throw new GovernedExecutionCrash(point);
    } }).execute(crashRequest);
  } catch (error) {
    crashObserved = error?.name === 'GovernedExecutionCrash';
  }
  const recoveredCrash = await makeCoordinator({ engine: new ProvenanceAdmissionEngine({ now: () => BASE_NOW, history: new DurableAdmissionHistoryStore({ filePath: join(durableStateRoot, 'mnemosyne-crash.json'), now: () => BASE_NOW }) }), effectSink: crashEffect, stateFile: 'horae-crash.json' }).execute(crashRequest);
  const durability = {
    crashObserved,
    recoveredState: recoveredCrash.state,
    effectAttempts: crashEffect.attempts,
    effectSuccesses: crashEffect.successes,
    effectId: recoveredCrash.effectId,
    history: recoveredCrash.history.map((entry) => entry.state),
  };
  if (!crashObserved || durability.recoveredState !== 'completed' || durability.effectAttempts !== 1 || durability.effectSuccesses !== 1) throw new Error(`durable crash recovery assertion failed: ${JSON.stringify(durability)}`);
  return {
    result: 'passed',
    candidateId: pointer.candidate,
    compatibilitySetId: manifest.compatibilitySetId,
    operation: OPERATION_NAME,
    replaySemantics: REPLAY_SEMANTICS,
    runtimePeerSHAs: heads,
    runtimeContractsArtifact: artifact,
    operationId: baseRequest.operationBinding.operationId,
    correlationId: baseRequest.operationBinding.correlationId,
    canonicalRequestDigest: baseRequest.operationBindingDigest,
    callerIdentity: baseRequest.operationBinding.caller,
    actingIdentity: baseRequest.operationBinding.actingAgent,
    horae: { state: positive.state, history: positive.history.map((entry) => entry.state), sessionId: positive.sessionId, decisionId: positive.decisionId, admissionId: positive.admissionId },
    ananke: { authenticatedPrincipal: authenticatedIdentity.authenticatedPrincipal, authority: lastPreflight.authority, receiptId: lastPreflight.receipt?.receiptId ?? null, observationId: positive.observationId },
    mnemosyne: { state: 'ADMITTED', admissionId: positive.admissionId, memoryId: positive.memoryId, replay: replay.state },
    moirae: { origin: baseRequest.origin, directProviderExecution: false },
    effect: { attempts: effect.attempts, successes: effect.successes, effectId: effect.effectId, digest: effect.digest, completed: effect.completed.size, occursAfter: 'ADMITTED' },
    durability,
    negatives,
    assertions,
    limitations: ['bounded local vertical with atomic file-backed governance state', 'controlled local effect reconciliation only; no distributed exactly-once claim', 'no Firecracker/KVM or external provider effect'],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGovernedSmoke({
    workspaceRoot: option('--workspace-root') ? resolve(option('--workspace-root')) : resolve(repositoryRoot, '..'),
  }).then((evidence) => {
    console.log(JSON.stringify(evidence, null, 2));
    console.log('FATES GOVERNED SMOKE: PASS');
  }).catch((error) => {
    console.error(`FATES GOVERNED SMOKE: FAIL\n${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
