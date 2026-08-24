import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const anankeDir = option('--ananke-dir') ?? process.env.FATES_ANANKE_DIR;
const horaeDir = option('--horae-dir') ?? process.env.FATES_HORAE_DIR;
const mnemosyneDir = option('--mnemosyne-dir') ?? process.env.FATES_MNEMOSYNE_DIR;
const moiraeDir = option('--moirae-dir') ?? process.env.FATES_MOIRAE_DIR;
if (!anankeDir || !horaeDir || !mnemosyneDir || !moiraeDir) {
  throw new Error('Set --ananke-dir, --horae-dir, --mnemosyne-dir, and --moirae-dir (or the FATES_*_DIR variables).');
}

const importFrom = (root, relativePath) => import(pathToFileURL(join(root, relativePath)).href);
const [anankeRuntime, anankePolicy, horae, horaeRegistry, mnemosyne, moirae] = await Promise.all([
  importFrom(anankeDir, 'packages/runtime-core/dist/index.js'),
  importFrom(anankeDir, 'packages/policy-engine/dist/index.js'),
  importFrom(horaeDir, 'packages/session-orchestrator/dist/index.js'),
  importFrom(horaeDir, 'packages/runtime-registry/dist/index.js'),
  importFrom(mnemosyneDir, 'packages/memory-ingest-engine/dist/index.js'),
  importFrom(moiraeDir, 'integrations/horae-client/dist/index.js'),
]);

const { Ed25519ContentReceiptSigner, SourceAwareContentPreflightAdapter } = anankeRuntime;
const { ContentPolicyEngine } = anankePolicy;
const { ProvenanceAdmissionEngine, RuntimeContractsPreflightReceiptVerifier } = mnemosyne;
const { GovernedExecutionCoordinator, createDevelopmentSessionRequest } = horae;
const { RuntimeRegistry } = horaeRegistry;
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const signer = new Ed25519ContentReceiptSigner('ananke-smoke-key-2026-08-24', privateKey);

const text = 'The Moirae host submitted this source for governed admission through Horae.';
const sessionRequest = createDevelopmentSessionRequest({
  projectId: 'project_fates_mvp',
  profileId: 'profile_fates_mvp',
  task: 'admit a source-backed fact',
  purpose: 'mvp-governed-request',
});
const executionContext = {
  runtimeId: 'ananke',
  runtimeInstanceId: 'ananke-smoke-instance-2026-08-24',
  projectId: sessionRequest.projectId,
  correlation: sessionRequest.correlation,
};
const envelope = moirae.createMoiraeGovernedRequest({
  idempotencyKey: 'moirae-governed-smoke-001',
  sessionRequest,
  source: { sourceId: 'file:docs/governed-mvp.md', canonicalPath: 'docs/governed-mvp.md' },
  content: text,
  contentAccess: {
    requestedExposure: 'SELECTED_CONTENT',
    destination: { runtime: 'mnemosyne' },
    purpose: 'admit source-backed fact',
    selection: { ranges: [{ start: 0, end: text.length }] },
  },
  memoryId: 'memory_governed_smoke_001',
  instanceId: 'moirae-mvp-host-001',
  artifact: 'moirae-governed-mvp-smoke',
});

const scanner = new SourceAwareContentPreflightAdapter({
  sourceTrust: 'OWNED',
  mediaType: 'text/plain',
  sourceId: envelope.source.sourceId,
  canonicalPath: envelope.source.canonicalPath,
  now: () => '2026-08-24T15:00:00.000Z',
});
const policy = new ContentPolicyEngine();
const anankeBinding = {
  async preflight({ request }) {
    const preflight = await scanner.preflight({
      toolName: 'workspace.read',
      tool: { name: 'workspace.read', server: 'workspace', riskClass: 'READ_ONLY', requiredPermissions: [], retryable: false, requiresApproval: false },
      arguments: {},
      data: request.content,
      executionContext,
      request: request.contentAccess,
    });
    const decision = policy.evaluate(preflight.observation, request.contentAccess);
    const receipt = preflight.receiptFactory?.(decision, { executionContext, signer });
    return {
      action: decision.action,
      receipt,
      observationId: preflight.observation.observationId,
      decisionId: decision.binding.bindingHash,
      reasonCode: decision.reasonCode,
      grantedExposure: decision.grantedExposure,
      surface: preflight.surfaces[decision.grantedExposure],
    };
  },
};

const verifier = new RuntimeContractsPreflightReceiptVerifier({
  now: () => '2026-08-24T15:00:01.000Z',
  trustedIssuers: [{ keyId: 'ananke-smoke-key-2026-08-24', publicKey, issuerRuntime: 'ananke', allowedInstanceIds: [executionContext.runtimeInstanceId] }],
});
const admissionEngine = new ProvenanceAdmissionEngine({ now: () => '2026-08-24T15:00:01.000Z' });
const mnemosyneBinding = {
  async admit({ request, preflight }) {
    if (!preflight.receipt) return { state: 'REJECTED', reason: 'PREFLIGHT_RECEIPT_REQUIRED' };
    const sourceContentHash = preflight.receipt.observation.source.contentHash;
    const result = admissionEngine.admit({
      id: request.memoryId,
      kind: 'fact',
      statement: request.content,
      importance: 'high',
      source: { artifactId: 'artifact_governed_smoke', path: request.source.canonicalPath, contentHash: sourceContentHash, sourceType: 'adr' },
      locator: 'MNEMOSYNE.GOVERNED.SMOKE.001',
      tags: ['governed', 'mvp', 'smoke'],
    }, {
      ingestionOperation: 'memory.write',
      ingestionPath: 'fates-governed-smoke',
      correlationId: request.sessionRequest.correlation.correlationId,
      idempotencyKey: request.idempotencyKey,
      projectId: request.sessionRequest.projectId,
      trustDomain: request.sessionRequest.projectId,
      actor: { id: 'horae-governed-route', kind: 'runtime' },
      receipt: preflight.receipt,
      preflightSurface: preflight.surface,
      preflight: verifier,
      authority: { evaluate: () => ({ kind: 'allowed', decisionId: 'decision_governed_smoke', policyVersion: 'content-policy-v1' }) },
      expectedContext: {
        projectId: request.sessionRequest.projectId,
        purpose: request.contentAccess.purpose,
        destinationRuntime: 'mnemosyne',
        requestId: request.sessionRequest.correlation.requestId,
        correlationId: request.sessionRequest.correlation.correlationId,
      },
    });
    if (result.admission.state !== 'ADMITTED' || !result.memory) {
      return { state: result.admission.state === 'QUARANTINED' ? 'QUARANTINED' : 'REJECTED', reason: result.admission.reasonCodes?.[0] };
    }
    return {
      state: 'ADMITTED',
      admissionId: result.admission.admissionId,
      candidateId: result.admission.candidateId,
      memoryId: result.memory.id,
    };
  },
};

const coordinator = new GovernedExecutionCoordinator({
  orchestrator: new horae.SessionOrchestrator(new RuntimeRegistry()),
  ananke: anankeBinding,
  mnemosyne: mnemosyneBinding,
  executor: { run: async () => ({ runtime: envelope.origin.runtime, route: 'governed-admission-complete' }) },
  timeoutMs: 5_000,
  now: () => '2026-08-24T15:00:02.000Z',
});
const result = await coordinator.execute({
  idempotencyKey: envelope.idempotencyKey,
  sessionRequest: envelope.sessionRequest,
  profile: {
    id: 'profile_fates_mvp',
    displayName: 'Fates MVP',
    projectId: 'project_fates_mvp',
    requiredRuntimeCapabilities: [],
    allowedRuntimeCapabilities: [],
    auditDestinations: [],
    capabilityExposure: 'fixed',
  },
  source: envelope.source,
  content: envelope.content,
  contentAccess: envelope.contentAccess,
  memoryId: envelope.memoryId,
});

if (result.state !== 'completed' || !result.admissionId) throw new Error(`Expected a completed governed route, received ${result.state}`);
process.stdout.write(JSON.stringify({
  result: 'passed',
  path: 'Moirae request -> Horae composition/route -> Ananke scanner/policy -> Runtime Contracts receipt -> Mnemosyne admission',
  state: result.state,
  requestId: result.requestId,
  sessionId: result.sessionId,
  observationId: result.observationId,
  decisionId: result.decisionId,
  admissionId: result.admissionId,
  candidateId: result.candidateId,
  memoryId: result.memoryId,
  history: result.history.map((entry) => entry.state),
}, null, 2) + '\n');
