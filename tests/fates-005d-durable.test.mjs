import test from 'node:test';
import assert from 'node:assert/strict';
import { runGovernedSmoke } from '../scripts/fates-governed-smoke.mjs';

test('FATES-005D crash-after-effect-success recovers without a duplicate effect', async () => {
  const evidence = await runGovernedSmoke({ verifyArtifact: false });
  assert.equal(evidence.candidateId, 'fates-durable-candidate-2026-08-27-r1');
  assert.deepEqual(evidence.runtimePeerSHAs, {
    adrasteia: 'a1c01bf9e6f9d6a126cfdcc1acfacd488b214210',
    ananke: '3d76adb162a0ff07b5630700ae30a823f1419cb4',
    mnemosyne: '121ec0a3ca29d3a340a660acf12ea744d059ea8a',
    horae: '67a179a748f425e2edc1a5eb6e8a74ef346d2f75',
    'moirae-code': 'b23f723fc5267c95fe9f7eccb2efa32465f8d2f1',
  });
  assert.equal(evidence.durability.crashObserved, true);
  assert.equal(evidence.durability.recoveredState, 'completed');
  assert.equal(evidence.durability.effectAttempts, 1);
  assert.equal(evidence.durability.effectSuccesses, 1);
  assert.equal(evidence.negatives.mutatedRequestAfterAuthority.reason, 'PREFLIGHT_SURFACE_HASH_MISMATCH');
  assert.equal(evidence.negatives.mutatedRequestAfterAuthority.effectAttempts, 0);
});
