# FATES-SLICE-002 acceptance-evidence matrix

## Status

Frozen design evidence requirements. This matrix specifies future runtime
evidence; it does not create a fixture, a runtime route, a checkpoint, or a
Slice activation.

Every record must include: `caseId`, initiating `correlationId`, distinct
Moirae/Horae/Ananke producer IDs as applicable, owner checkpoint commit and
artifact digest, timestamp, route/dispatch state, and evidence attachment
digests. Retain the records under the future Integration handoff artifact set
`evidence/FATES-SLICE-002/<integration-proof-checkpoint>/<caseId>.json` plus
the named producer audit/test artifacts. Integration consumes evidence; it is
never a route runtime or fixture reader.

| Case | Producer -> consumer | Expected result | No-read proof where required | Required correlation/checkpoint evidence | Retention |
| --- | --- | --- | --- | --- | --- |
| `positive-completed-read` | Ananke, Horae, Moirae -> Integration | `completed`; exactly one Ananke read; actual digest equals frozen expected digest | Ananke audit `readAttemptCount=1` | One correlation; all producer IDs; three artifact identities; Ananke decision/outcome/audit refs | Integration set + Ananke audit + Horae relay + Moirae presentation |
| `denied-zero-read` | Ananke -> Horae/Moirae/Integration | Ananke `denied`; Horae relays without rewrite | Ananke adapter-invocation=false and `readAttemptCount=0` | Correlation, Ananke decision/audit refs, owner checkpoints | Integration set + Ananke audit |
| `malformed-extra-argument` | Moirae/Horae/Ananke -> Integration | `malformed` before dispatch or Ananke invocation | Horae dispatch=false; Ananke has no request/audit read | Correlation, rejected canonical-request digest, producer rejection ID | Integration set + rejecting producer trace |
| `digest-mismatch` | Ananke -> Horae/Moirae/Integration | Typed digest mismatch after one permitted read; never `completed` | Ananke `readAttemptCount=1`, expected and actual digests differ | Correlation, fixture artifact identity, decision/outcome/audit refs | Integration set + Ananke audit |
| `principal-scope-purpose-policy-mutation` | Ananke/Horae -> Integration | `denied` or `malformed` before adapter invocation | Ananke `readAttemptCount=0`; Horae dispatch=false when rejected there | Correlation, original and mutation binding digests, policy/decision reference | Integration set + owner rejection evidence |
| `stale-readiness` | Horae -> Moirae/Integration | `stale` before Ananke dispatch | Horae dispatch=false; Ananke `readAttemptCount=0` / no received request | Correlation, readiness observedAt, age >1,000 ms, Ananke checkpoint | Integration set + Horae admission record |
| `startup-race` | Horae -> Moirae/Integration | `unavailable` until registration/readiness is complete | Horae dispatch=false; Ananke no adapter invocation | Correlation, registration state, lifecycle timestamp, process artifact identity | Integration set + Horae admission record |
| `incompatible-protocol` | Horae -> Moirae/Integration | `incompatible` before Ananke dispatch | Horae dispatch=false; Ananke no read | Correlation, offered/required protocol receipts, endpoint/instance identity | Integration set + Horae compatibility record |
| `ananke-identity-endpoint-drift` | Horae -> Moirae/Integration | `incompatible` before Ananke dispatch | Horae dispatch=false; no admitted Ananke read | Correlation, expected/observed runtime, instance, artifact, endpoint and attestation receipts | Integration set + Horae attestation record |
| `schema-origin-mutation` | Moirae/Horae -> Integration | `malformed` before Ananke dispatch | Horae dispatch=false; Ananke no read | Correlation, original/observed schema-or-origin digests, rejection ID | Integration set + rejecting producer record |
| `timeout` | Horae -> Moirae/Integration | `timed_out`, never success and never retry | Dispatch state is retained; if pre-dispatch, `readAttemptCount=0`; if after dispatch, no false zero-read assertion | Correlation, all elapsed values, timeout decision version, dispatch confirmation | Integration set + Horae timing trace + any Ananke audit |
| `indeterminate-post-dispatch-loss` | Horae -> Moirae/Integration | `indeterminate`, never success and never retry | No claim that no read occurred; reconcile against Ananke audit when available | Correlation, confirmed-dispatch marker, transport-loss evidence, producer IDs | Integration set + Horae trace + eventual Ananke audit if produced |
| `correlation-preservation` | Moirae, Horae, Ananke -> Integration | One initiating correlation unchanged end to end | Not applicable | Moirae origin ID, Horae route/event IDs, Ananke request/decision/outcome/audit IDs and checkpoint identities | Integration set + all producer records |
| `producer-id-preservation` | Moirae, Horae, Ananke -> Integration | Producer IDs remain separate; relay adds but never overwrites | Not applicable | Correlation plus raw typed relay envelopes and producer IDs | Integration set + Horae relay log |
| `no-direct-moirae-ananke-fallback` | Moirae harness -> Integration | Direct client absent/disabled; failure does not fallback | No Ananke request or read for the blocked direct attempt | Correlation or harness attempt ID, host artifact, disabled-surface assertion, Ananke zero-request evidence | Integration set + Moirae harness report |
| `no-non-ananke-fixture-read` | Moirae, Horae, Integration harnesses -> Integration | Moirae/Horae/Integration perform no fixture read | OS/harness file-access record is empty for those processes; Ananke is the sole reader | Correlation where request exists; process IDs, artifact digests, fixture identity | Integration set + harness access report |
| `bypass-limitation-report` | Moirae -> Integration | UI/evidence explicitly names terminal, task, debugger, extension host, Git, arbitrary SDK, external CLI, and direct-provider exclusions | Not applicable | Moirae presentation artifact, correlation for a route run, host checkpoint | Integration set + Moirae rendered artifact |

Mocks may be used for owner-local parsing/rendering tests only. They cannot
satisfy any row that claims a three-process route, physical-read count,
identity attestation, handoff, or cross-runtime result.
