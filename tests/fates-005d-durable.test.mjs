import test from 'node:test';
import assert from 'node:assert/strict';
import { runGovernedSmoke } from '../scripts/fates-governed-smoke.mjs';

test('FATES-005D crash-after-effect-success recovers without a duplicate effect', async () => {
  const evidence = await runGovernedSmoke({ verifyArtifact: false });
  assert.equal(evidence.candidateId, 'fates-durable-candidate-2026-08-27-r4');
  assert.deepEqual(evidence.runtimePeerSHAs, {
    adrasteia: 'a1c01bf9e6f9d6a126cfdcc1acfacd488b214210',
    ananke: '3d76adb162a0ff07b5630700ae30a823f1419cb4',
    mnemosyne: 'da6a9396d8d84b87724c4c1f96c40fd188ea68b3',
    horae: '3fa39427ca2fd69c8d7b041edb45648f37c1485a',
    'moirae-code': 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1',
  });
  assert.equal(evidence.durability.crashObserved, true);
  assert.equal(evidence.durability.recoveredState, 'completed');
  assert.equal(evidence.durability.effectAttempts, 1);
  assert.equal(evidence.durability.effectSuccesses, 1);
  assert.equal(evidence.negatives.mutatedRequestAfterAuthority.reason, 'PREFLIGHT_SURFACE_HASH_MISMATCH');
  assert.equal(evidence.negatives.mutatedRequestAfterAuthority.effectAttempts, 0);
});
