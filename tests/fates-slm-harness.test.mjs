import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertNoRealSideEffectTools,
  EXPECTED_PINS,
  normalizeProviderEvents,
  parseArgs,
  REQUIRED_BASE_URL,
  summarizeSamples,
  validateLoopbackBaseUrl,
} from '../scripts/fates-slm.mjs';
import { resolveSlmCandidate, verifySlmPeerHeads } from '../scripts/fates-slm-candidate.mjs';
import { LOCAL_SLM_CASES } from '../scripts/fates-slm-corpus.mjs';
import { validateSlmEvidence } from '../scripts/validate-slm-evidence.mjs';

function fakeProvider(events) {
  return {
    manifest: { id: 'fake-provider', locality: 'local' },
    async *createCompletion() { yield* events; },
  };
}

const fakeSdk = {
  captureToolCallProposal(_context, _provider, event) {
    try {
      const parsed = JSON.parse(event.arguments);
      return { status: 'proposed', arguments: parsed, proposalId: 'proposal-1', toolName: event.name };
    } catch {
      return { status: 'malformed', arguments: null, proposalId: 'proposal-1', toolName: event.name };
    }
  },
};

const context = {
  execution: { projectId: 'project-test' },
  scope: { projectId: 'project-test' },
  correlation: { requestId: 'request-test', correlationId: 'correlation-test' },
  purpose: 'local-slm-test',
};

test('accepts only explicit loopback llama.cpp /v1 endpoints', () => {
  assert.equal(validateLoopbackBaseUrl(REQUIRED_BASE_URL).hostname, '127.0.0.1');
  assert.equal(validateLoopbackBaseUrl('http://localhost:8080/v1').hostname, 'localhost');
  assert.equal(validateLoopbackBaseUrl('http://[::1]:8080/v1').hostname, '[::1]');
  for (const endpoint of [
    'https://127.0.0.1:8080/v1',
    'http://192.0.2.10:8080/v1',
    'http://127.0.0.1:8081/v1',
    'http://127.0.0.1:8080/',
    'http://user:pass@127.0.0.1:8080/v1',
  ]) assert.throws(() => validateLoopbackBaseUrl(endpoint), /loopback|Invalid/);
});
test('normalizes a fake provider text, tool, and done stream through proposal capture', async () => {
  const provider = fakeProvider([
    { type: 'text', content: 'safe response' },
    { type: 'tool_call', id: 'tool-1', name: 'fixture.read', arguments: '{"value":"safe"}' },
    { type: 'done', finishReason: 'stop' },
  ]);
  const result = await normalizeProviderEvents(provider, { modelId: 'fake-model' }, context, fakeSdk);
  assert.deepEqual(result.events.map((event) => event.type), ['text', 'tool_call', 'done']);
  assert.equal(result.proposals[0].proposal.status, 'proposed');
  assert.deepEqual(result.proposals[0].proposal.arguments, { value: 'safe' });
  assert.equal(result.proposals[0].normalized.malformed, false);
  assert.equal(result.proposalCaptureMs >= 0, true);
});

test('malformed fake provider tool arguments are captured and never become executable proposals', async () => {
  const provider = fakeProvider([
    { type: 'tool_call', id: 'tool-malformed', name: 'file.delete.propose', arguments: '{' },
    { type: 'done', finishReason: 'stop' },
  ]);
  const result = await normalizeProviderEvents(provider, { modelId: 'fake-model' }, context, fakeSdk);
  assert.equal(result.proposals[0].proposal.status, 'malformed');
  assert.equal(result.proposals[0].normalized.malformed, true);
  assert.equal(result.proposals[0].proposal.arguments, null);
});

test('provider errors are normalized without exposing the provider body', async () => {
  const provider = fakeProvider([{ type: 'error', code: 'PROVIDER_ERROR', message: 'Bearer sk-secret-must-not-escape' }]);
  const result = await normalizeProviderEvents(provider, { modelId: 'fake-model' }, context, fakeSdk);
  assert.deepEqual(result.events, [{ type: 'error', code: 'PROVIDER_ERROR', message: 'Bearer [REDACTED]' }]);
});

test('timing summaries calculate minimum, median, p95, p99, and maximum', () => {
  const summary = summarizeSamples(Array.from({ length: 100 }, (_, index) => index + 1));
  assert.deepEqual(summary, { count: 100, minimum: 1, median: 50, p95: 95, p99: 99, maximum: 100 });
  assert.equal(summarizeSamples([]).p99, null);
});

test('corpus contains every required local-SLM case ID', () => {
  const ids = LOCAL_SLM_CASES.map((testCase) => testCase.id);
  assert.equal(ids.length, 40);
  for (const prefix of ['SET', 'BEN', 'ADV', 'FLT', 'PERF']) {
    const expectedCount = { SET: 5, BEN: 10, ADV: 15, FLT: 5, PERF: 5 }[prefix];
    assert.equal(ids.filter((id) => id.startsWith(`${prefix}-`)).length, expectedCount);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test('synthetic tool inventory proves that the harness has no real effect tool', () => {
  assert.deepEqual(assertNoRealSideEffectTools().realEffects, false);
});

test('current candidate resolves exact runtime peers and a separate harness identity', () => {
  const candidate = resolveSlmCandidate({ verifyCheckouts: false });
  verifySlmPeerHeads(candidate);
  assert.equal(candidate.candidateId, 'fates-pre-qwen-security-2026-08-25');
  assert.deepEqual(candidate.runtimePeerSHAs, {
    adrasteia: '6aba3ef466a16292689d4afaf9f9bc40dc013301',
    ananke: 'f5b071bb3f36a3721ca58811c74af5031c456832',
    mnemosyne: '24f8541ce0e0a2f56171544a249cff56e7b634d1',
    horae: '3a174b3f1bf791b437a22b4cfd41bf9677b9cba9',
    moirae: 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1',
  });
  assert.match(candidate.harnessCommit, /^[0-9a-f]{40}$/);
  assert.notEqual(candidate.harnessCommit, candidate.componentSHAs.integration);
});

test('valid evidence artifacts pass the local-SLM schemas and exact-pin checks', async () => {
  const output = await mkdtemp(join(tmpdir(), 'fates-slm-schema-'));
  try {
    const runId = 'slm-test-run';
    const timestamp = '2026-08-24T20:00:00.000Z';
    const manifest = {
      schemaVersion: '1.0', testSuiteVersion: 'test', runId, timestamp, os: 'test', architecture: 'x64', nodeVersion: 'v24',
      cpuIdentifier: null, memoryBytes: 1, llamaCppEndpoint: REQUIRED_BASE_URL, requestedModelId: 'fake', discoveredModelId: 'fake', discoveredModelIds: ['fake'], modelFileHash: null,
      candidateId: 'fates-pre-qwen-security-2026-08-25', compatibilitySetId: 'fates-pre-qwen-security-2026-08-25', componentSHAs: EXPECTED_PINS,
      harnessCommit: 'a4ee480c6c41007188d86f4c530199d16dcd7aaf', runtimeContractsArtifactSha256: '44139c4cf1ca05ea684e122a2c4d75ff0f1a77e7020a61317e9569ae643dbd86', liveModelOptIn: false, syntheticEffectsOnly: true,
    };
    const summary = { schemaVersion: '1.0', runId, suite: 'fault', generatedAt: timestamp, caseCounts: { PASS: 1 }, usability: {}, security: {}, timing: {}, noRealHostEffects: true };
    const caseRecord = { id: 'FLT-01', category: 'FAULT', mode: 'FAULT_INJECTION', title: 'malformed', startedAt: timestamp, endedAt: timestamp, durationMs: 0, expected: 'malformed', result: 'PASS', observed: {} };
    const timings = { schemaVersion: '1.0', runId, cases: [{ caseId: 'FLT-01', providerModelMs: 0, proposalCaptureMs: 0, anankeMs: 0, horaeMs: 0, mnemosyneMs: 0, fatesGovernanceMs: 0, endToEndMs: 0 }] };
    await writeFile(join(output, 'run-manifest.json'), JSON.stringify(manifest));
    await writeFile(join(output, 'summary.json'), JSON.stringify(summary));
    await writeFile(join(output, 'cases.jsonl'), `${JSON.stringify(caseRecord)}\n`);
    await writeFile(join(output, 'timings.json'), JSON.stringify(timings));
    const result = validateSlmEvidence(output);
    assert.equal(result.valid, true, JSON.stringify(result.failures));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('CLI argument parsing requires the explicit model and evidence output', () => {
  const parsed = parseArgs([
    '--ananke-dir', 'ananke', '--horae-dir', 'horae', '--mnemosyne-dir', 'mnemosyne', '--moirae-dir', 'moirae',
    '--base-url', REQUIRED_BASE_URL, '--model', 'qwen', '--suite', 'fault', '--output', 'evidence',
  ]);
  assert.equal(parsed.suite, 'fault');
  assert.equal(parsed.model, 'qwen');
  assert.throws(() => parseArgs(['--base-url', REQUIRED_BASE_URL]), /Missing required options/);
});
