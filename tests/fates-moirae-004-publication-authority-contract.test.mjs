import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(
  readFileSync(
    new URL('../docs/evidence/FATES-MOIRAE-004-publication-authority-contract.json', import.meta.url),
    'utf8',
  ),
);

test('MC-04-I01 records the exact publication action and fixed source/destination binding', () => {
  assert.equal(manifest.canonicalAction, 'fates.moirae.publish-document.v1');
  assert.equal(manifest.externalOperation, 'publish_document');
  assert.deepEqual(manifest.resource, {
    documentId: 'demo-policy-001',
    expectedSha256: 'f00d46e0cb81f67ed7a3d516939bd86ce5401e6c01321dbc90ca3374899a2d6c',
    destinationId: 'moirae.demo-publication-slot.v1',
  });
  assert.notEqual(manifest.canonicalAction, 'fates.moirae.inspect-document.v1');
  assert.notEqual(manifest.canonicalAction, 'fates.slice02.inspect-fixed-fixture.v1');
});

test('MC-04-I02 records closed schema, authority-only semantics, and replay requirements', () => {
  assert.equal(manifest.requestSchema.additionalProperties, false);
  assert.deepEqual(manifest.requestSchema.required, [
    'documentId',
    'expectedSha256',
    'destinationId',
  ]);
  assert.equal(manifest.effectSemantics.authorityOnly, true);
  assert.equal(manifest.effectSemantics.fatesReadsMoiraeDocument, false);
  assert.equal(manifest.effectSemantics.fatesPublishesMoiraeDocument, false);
  assert.equal(manifest.effectSemantics.moiraePerformsPublication, true);
  assert.equal(manifest.freshnessAndReplay.oneUseReceipt, true);
  assert.equal(manifest.crossRuntimeRoute.claimed, false);
});
