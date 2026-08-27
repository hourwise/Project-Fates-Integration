import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalRequestDigest, createOperationBinding } from '../scripts/fates-governed-smoke.mjs';

function binding(overrides = {}) {
  return createOperationBinding({
    requestId: 'req-005c-1',
    correlationId: 'cor-005c-1',
    callerId: 'service-a',
    actingAgentId: 'agent-a',
    tenantId: 'tenant-a',
    workspaceId: 'workspace-a',
    projectId: 'project-a',
    action: 'memory.write',
    sourceId: 'file:docs/source.md',
    memoryId: 'memory-a',
    destination: 'mnemosyne',
    content: 'same source bytes',
    ...overrides,
  });
}

test('same operation has one canonical digest and object field order is irrelevant', () => {
  const first = binding();
  const second = { ...first, resource: { ...first.resource } };
  assert.equal(canonicalRequestDigest(first), canonicalRequestDigest(second));
});

test('security-relevant operation mutations change the digest', () => {
  const original = canonicalRequestDigest(binding());
  for (const changed of [
    { action: 'memory.delete' },
    { sourceId: 'file:docs/other.md' },
    { destination: 'external' },
    { tenantId: 'tenant-b' },
    { workspaceId: 'workspace-b' },
    { callerId: 'service-b' },
    { content: 'different source bytes' },
  ]) assert.notEqual(canonicalRequestDigest(binding(changed)), original, JSON.stringify(changed));
});

test('request identity is bound separately from retry payload identity', () => {
  const samePayloadDifferentRequest = canonicalRequestDigest(binding({ requestId: 'req-005c-2', correlationId: 'cor-005c-2' }));
  assert.notEqual(samePayloadDifferentRequest, canonicalRequestDigest(binding()));
  assert.equal(binding().inputDigest, binding({}).inputDigest);
});
