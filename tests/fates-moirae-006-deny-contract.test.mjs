import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../docs/evidence/FATES-MOIRAE-006-deny-contract.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("MC-06-I01 records the exact denied publication binding", () => {
  assert.equal(manifest.canonicalAction, "fates.moirae.publish-document.v1");
  assert.equal(manifest.externalOperation, "publish_document");
  assert.deepEqual(manifest.resource, {
    documentId: "demo-policy-001",
    expectedSha256:
      "f00d46e0cb81f67ed7a3d516939bd86ce5401e6c01321dbc90ca3374899a2d6c",
    destinationId: "moirae.demo-publication-slot.v1",
  });
  assert.equal(manifest.purpose, "moirae.document-publication");
  assert.equal(manifest.policy.decision, "DENY");
  assert.equal(manifest.policy.reason, "INSUFFICIENT_PUBLICATION_SCOPE");
  assert.equal(manifest.restrictedCaller.approvalAuthority, false);
  assert.equal(manifest.restrictedCaller.publicationAuthority, false);
});

test("MC-06-I02 records zero approval and host effect semantics without a cross-runtime claim", () => {
  assert.deepEqual(manifest.effectSemantics, {
    effectSemantics: "AUTHORIZATION_ONLY_NO_PUBLICATION",
    fatesResourceReadAttemptCount: 0,
    fatesPublicationAttemptCount: 0,
    documentPublicationByFates: false,
    moiraeSourceReadCount: 0,
    moiraePublicationExecutorInvocationCount: 0,
    publicationTargetChanged: false,
  });
  assert.equal(manifest.policy.approvalRequestCreated, false);
  assert.equal(manifest.policy.executionAuthorityIssued, false);
  assert.equal(manifest.crossRuntimeRoute.claimed, false);
});
