import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(
  readFileSync(
    new URL('../docs/evidence/FATES-MOIRAE-005-approval-contract.json', import.meta.url),
    'utf8',
  ),
);

test('MC-05-I01 records the exact approval-required publication binding', () => {
  assert.equal(manifest.canonicalAction, 'fates.moirae.publish-document.v1');
  assert.equal(manifest.externalOperation, 'publish_document');
  assert.deepEqual(manifest.resource, {
    documentId: 'demo-policy-001',
    expectedSha256: 'f00d46e0cb81f67ed7a3d516939bd86ce5401e6c01321dbc90ca3374899a2d6c',
    destinationId: 'moirae.demo-publication-slot.v1',
  });
  assert.equal(manifest.policy.initialDecision, 'REQUIRES_APPROVAL');
  assert.equal(manifest.policy.browserMayChooseLifetime, false);
  assert.equal(manifest.operator.productionAuthentication, false);
});

test('MC-05-I02 records closed approval transitions and the authority/effect boundary', () => {
  assert.deepEqual(manifest.transitionSemantics, {
    pending: 'WAITING_FOR_APPROVAL',
    approve: 'APPROVED',
    reject: 'REJECTED',
    expiry: 'EXPIRED',
    approvedExecution: 'fresh one-use authority through POST /api/execute',
    fatesReadsMoiraeDocument: false,
    fatesPublishesMoiraeDocument: false,
    moiraePerformsPublication: true,
  });
  assert.equal(manifest.integrity.canonicalDigestBinding, true);
  assert.equal(manifest.integrity.authenticatedTransportBoundAuthority, true);
  assert.equal(manifest.integrity.signedReceipt, false);
  assert.equal(manifest.crossRuntimeRoute.claimed, false);
});
