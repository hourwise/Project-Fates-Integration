import test from 'node:test';
import assert from 'node:assert/strict';
import { runGovernedSmoke } from '../scripts/fates-governed-smoke.mjs';

test('FATES-005D crash-after-effect-success recovers without a duplicate effect', async () => {
  const evidence = await runGovernedSmoke({ verifyArtifact: false });
  assert.equal(evidence.candidateId, 'fates-durable-candidate-2026-08-27-r7');
  assert.deepEqual(evidence.runtimePeerSHAs, {
    adrasteia: 'a1c01bf9e6f9d6a126cfdcc1acfacd488b214210',
    ananke: '3d76adb162a0ff07b5630700ae30a823f1419cb4',
    mnemosyne: 'f02df61be147d6fe716a98912d37eaaf1fe89f23',
    horae: '68508f5c37e1cb3b244116d45fa267e689a6e75c',
    'moirae-code': 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1',
  });
  assert.equal(evidence.durability.crashObserved, true);
  assert.equal(evidence.durability.recoveredState, 'completed');
  assert.equal(evidence.durability.effectAttempts, 1);
  assert.equal(evidence.durability.effectSuccesses, 1);
  assert.equal(evidence.negatives.mutatedRequestAfterAuthority.reason, 'PREFLIGHT_SURFACE_HASH_MISMATCH');
  assert.equal(evidence.negatives.mutatedRequestAfterAuthority.effectAttempts, 0);
  assert.equal(evidence.r1Reconciliation.recoveredState, 'recovery_required');
  assert.equal(evidence.r1Reconciliation.effectStatus, 'unknown');
  assert.equal(evidence.r1Reconciliation.effectAttempts, 0);
  assert.equal(evidence.r1Reconciliation.effectSuccesses, 0);
});
