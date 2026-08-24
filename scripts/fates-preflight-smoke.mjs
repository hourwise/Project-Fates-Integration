import { pathToFileURL } from 'node:url';

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const anankeDir = option('--ananke-dir') ?? process.env.FATES_ANANKE_DIR;
const mnemosyneDir = option('--mnemosyne-dir') ?? process.env.FATES_MNEMOSYNE_DIR;
if (!anankeDir || !mnemosyneDir) {
  throw new Error('Set --ananke-dir and --mnemosyne-dir (or FATES_ANANKE_DIR/FATES_MNEMOSYNE_DIR) to run the non-fixture preflight smoke.');
}

const importFrom = async (root, relativePath) => import(pathToFileURL(`${root}/${relativePath}`));
const [{ SourceAwareContentPreflightAdapter }, { ContentPolicyEngine }, { ProvenanceAdmissionEngine, RuntimeContractsPreflightReceiptVerifier }] = await Promise.all([
  importFrom(anankeDir, 'packages/runtime-core/dist/index.js'),
  importFrom(anankeDir, 'packages/policy-engine/dist/index.js'),
  importFrom(mnemosyneDir, 'packages/memory-ingest-engine/dist/index.js'),
]);

const text = 'The governed path admits source-backed facts only after Ananke preflight.';
const request = {
  toolName: 'workspace.read',
  tool: { name: 'workspace.read', server: 'workspace', riskClass: 'READ_ONLY', requiredPermissions: [], retryable: false, requiresApproval: false },
  arguments: {},
  data: text,
  request: {
    requestedExposure: 'SELECTED_CONTENT',
    destination: { runtime: 'mnemosyne' },
    purpose: 'admit source-backed fact',
    selection: { ranges: [{ start: 0, end: text.length }] },
  },
};
const scanner = new SourceAwareContentPreflightAdapter({
  sourceTrust: 'OWNED',
  mediaType: 'text/plain',
  canonicalPath: 'docs/governed-path.md',
  now: () => '2026-08-24T15:00:00.000Z',
});
const preflight = await scanner.preflight(request);
const policy = new ContentPolicyEngine();
const decision = policy.evaluate(preflight.observation, request.request);
const receipt = preflight.receiptFactory?.(decision);
if (!receipt) throw new Error('Ananke did not produce a final shared preflight receipt.');

const verifier = new RuntimeContractsPreflightReceiptVerifier({ now: () => '2026-08-24T15:00:01.000Z', maxAgeMs: 120_000 });
const admission = new ProvenanceAdmissionEngine({ now: () => '2026-08-24T15:00:01.000Z' });
const result = admission.admit({
  id: 'memory_preflight_smoke_001',
  kind: 'fact',
  statement: text,
  importance: 'high',
  source: { artifactId: 'artifact_preflight_smoke', path: 'docs/governed-path.md', contentHash: receipt.observation.source.contentHash, sourceType: 'adr' },
  locator: 'MNEMOSYNE.PREFLIGHT.SMOKE.001',
  tags: ['preflight', 'smoke'],
}, {
  ingestionOperation: 'memory.write',
  ingestionPath: 'fates-preflight-smoke',
  correlationId: 'correlation_preflight_smoke_001',
  idempotencyKey: 'idempotency_preflight_smoke_001',
  projectId: 'project_fates_smoke',
  trustDomain: 'project_fates_smoke',
  actor: { id: 'fates-smoke', kind: 'runtime' },
  receipt,
  preflight: verifier,
  authority: { evaluate: () => ({ kind: 'allowed', decisionId: 'decision_ananke_preflight_smoke', policyVersion: 'content-policy-v1' }) },
});

if (result.admission.state !== 'ADMITTED' || !result.memory) throw new Error(`Expected ADMITTED, received ${result.admission.state}`);
process.stdout.write(JSON.stringify({
  result: 'passed',
  path: 'Ananke scanner/policy -> Runtime Contracts receipt -> Mnemosyne verifier/admission',
  observationId: receipt.observation.observationId,
  receiptId: receipt.receiptId,
  admissionId: result.admission.admissionId,
  candidateId: result.admission.candidateId,
  state: result.admission.state,
  persistedMemoryId: result.memory.id,
}, null, 2) + '\n');
