import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(
  readFileSync(
    new URL('../docs/evidence/FATES-MOIRAE-001A-authority-contract.json', import.meta.url),
    'utf8',
  ),
);

test('FM-001A-I01 records the exact canonical action and Moirae resource binding', () => {
  assert.equal(manifest.canonicalAction, 'fates.moirae.inspect-document.v1');
  assert.equal(manifest.externalOperation, 'inspect_document');
  assert.deepEqual(manifest.resource, {
    documentId: 'demo-policy-001',
    expectedSha256: 'f00d46e0cb81f67ed7a3d516939bd86ce5401e6c01321dbc90ca3374899a2d6c',
  });
  assert.notEqual(manifest.canonicalAction, 'fates.slice02.inspect-fixed-fixture.v1');
  assert.notEqual(manifest.resource.documentId, 'fates.slice02.fixed-fixture.v1');
});

test('FM-001A-I02 records closed schema, authority-only semantics, and no cross-runtime claim', () => {
  assert.equal(manifest.requestSchema.additionalProperties, false);
  assert.deepEqual(manifest.requestSchema.required, ['documentId', 'expectedSha256']);
  assert.equal(manifest.effectSemantics.authorityOnly, true);
  assert.equal(manifest.effectSemantics.fatesReadsMoiraeDocument, false);
  assert.equal(manifest.effectSemantics.fatesReturnsMoiraeDocument, false);
  assert.equal(manifest.transport.endpoint, 'POST /api/execute');
  assert.equal(manifest.crossRuntimeRoute.claimed, false);
});
