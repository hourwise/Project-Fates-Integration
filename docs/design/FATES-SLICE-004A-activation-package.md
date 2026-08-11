# FATES-SLICE-004A — Owner Decision and Activation-Package Preparation

**Status:** ACTIVE CONTROL-PLANE CHECKPOINT
**Date:** 2026-08-11
**Activation:** ACTIVE — CONTROL-PLANE ONLY
**Implementation:** NOT STARTED
**R1:** immutable and sealed
**003B:** paused

This package records the owner-authorized FATES-SLICE-004A activation. The
Integration control-plane now identifies active numeric parent
`FATES-SLICE-004` and active bounded child `FATES-SLICE-004A`; no component
implementation has begun. The activation does not change a component
repository, change the Integration matrix/lock/baseline, create a tag,
generate a credential, start a process, or perform an effect.

Canonical slices are numbered compatibility/control units. Letter-qualified
sub-slices are bounded implementation or acceptance units owned by a canonical
slice. `FATES-SLICE-004A` is therefore represented by
`activeSliceId: FATES-SLICE-004` plus an optional
`activeSubsliceId: FATES-SLICE-004A`; it is not a compatibility-matrix peer.

## 1. Starting state

The accepted starting compatibility set before activation was
`fates-slice-003a-r1-2026-08-11`. The Integration seal is commit
`1ed2a5c45607585fa17d72ceed1be91b5f09881f`, tagged
`fates-slice-003a-r1-v0.1.0-protocol-1.4.0`. The active control state remains
`status: idle`, `activeSliceId: null`, with `FATES-SLICE-004` as the next
recommendation. Following the activation transaction, the active control state is now
`status: active`, `activeSliceId: FATES-SLICE-004`,
`activeSubsliceId: FATES-SLICE-004A`. R1 is CLOSED / SEALED and 003B is
PAUSED.

The exact inspected component checkpoints are:

| Repository | Checkpoint | Worktree |
| --- | --- | --- |
| Ananke | `dde9f74cbcfefea2176a6f0103e1f6b9064f4e64` | clean |
| Horae | `3f531d4f5558a10a36aeae20c3458080eb4468b9` | clean |
| Moirae Code | `bc7b984bd2eb0e0f07a1cd7259a8eab21556f097` | clean |
| Mnemosyne | `f4ab76a9760f856d78908d35facceb068d78c8e5` | clean |
| Runtime Contracts | `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8` | clean |

The current Ananke implementation has generic registered executors, approval
hash binding, SQLite audit, and MCP stdio adapters. Approval storage is
in-memory by default. The existing SQLite audit is durable but is not an
execution-intent state machine and is not sufficient to prove dispatch truth.
Horae's `slice02-relay` already models bounded transport timeout and
indeterminate result projection, but that package and R1 route are sealed
history and must not be repurposed as 004A lifecycle authority.

## 2. Candidate effects

### Candidate A — Existing Ananke-owned fixed-fixture read

- **Description:** Read the immutable Ananke-owned Slice 02 fixture and verify
  its expected digest.
- **Owner/adapter:** Ananke `packages/runtime-core/src/slice02-fixed-fixture.ts`.
- **Authority boundary:** Ananke Gateway and its registered executor; Horae
  remains route/relay only.
- **Credential:** None for the fixture adapter. Route authentication is not a
  provider credential.
- **External side effect:** One physical file read and digest computation;
  no mutation.
- **Idempotency:** Duplicate reads are operationally harmless, but the current
  adapter has no 004A idempotency-key or durable dispatch record.
- **Reconciliation:** A durable Ananke read receipt/digest could be queried;
  re-reading the fixture would not prove what the first attempt did.
- **Testability:** Excellent; existing deterministic tests prove one read,
  digest mismatch, adapter failure, and audit behavior.
- **Live suitability:** Safe and already understood, but weak as a proof of a
  durable effect lifecycle because it is the sealed Slice 02 read path.
- **Cleanup:** None beyond ordinary test teardown.
- **Limitation:** It does not exercise a meaningful provider operation or
  provider-side operation lookup.

### Candidate B — Dedicated disposable operation-receipt sink (preferred)

- **Description:** An independently running, owner-controlled test provider
  accepts one operation record containing an Ananke-generated attempt binding,
  persists a disposable provider operation record, and exposes a read-only
  status lookup by provider operation ID and idempotency key.
- **Owner/adapter:** Ananke owns the effect adapter and authority decision; a
  dedicated Integration acceptance fixture owns only the disposable provider
  record.
- **Authority boundary:** Only Ananke may submit or reconcile the operation.
  Horae carries the bounded request and projects the result.
- **Credential:** None for the initial sink. The capability is an allowlisted
  provider endpoint/configuration held by Ananke; no raw token is placed in
  arguments, workload data, logs, or evidence.
- **External side effect:** A disposable provider-side operation record, not a
  real-world email, payment, deployment, filesystem mutation, or network
  action. The record is externally observable through an independent query.
- **Idempotency:** The sink must deduplicate the same provider idempotency key
  and return the original provider operation record. This is a property of
  this test sink only, not a general exactly-once claim.
- **Reconciliation:** Query the provider operation record by provider
  operation ID/idempotency key. No second submit is used for reconciliation.
- **Testability:** Strong; the sink can deterministically confirm success,
  confirm failure, persist before dropping a response, delay lookup, return a
  conflict, or remain unresolved.
- **Live suitability:** Strongest bounded proof. It is independently
  observable and disposable while remaining outside the host-containment and
  developer-host effect claims reserved for 003B/004B.
- **Cleanup:** Expire or delete the sink record, stop the sink, retain the
  secret-free operation/evidence record, and verify no duplicate operation was
  created.
- **Limitation:** Requires a new small, reviewed provider fixture and a
  provider-specific reconciliation contract. It proves the lifecycle against
  this sink, not all external providers.

### Candidate C — Disposable filesystem write through the existing MCP demo

- **Description:** Write a known small record to a disposable temporary
  workspace and delete it after verification.
- **Owner/adapter:** Ananke MCP adapter plus the existing filesystem demo.
- **Authority boundary:** Ananke Gateway, then a stdio child provider.
- **Credential:** None.
- **External side effect:** Host filesystem mutation.
- **Idempotency:** The current `write_file` tool is explicitly non-idempotent;
  overwrite/retry behavior is provider-specific.
- **Reconciliation:** Read the target path or inspect a provider receipt.
- **Testability:** High, with existing deterministic MCP tests.
- **Live suitability:** Poor for 004A. It is a host-mediated developer effect
  and would invite a containment/bypass claim that belongs to 003B/004B.
- **Cleanup:** Delete the temporary workspace and verify no residue.
- **Limitation:** Host filesystem/stdio semantics and cleanup are precisely
  the boundary that must not be silently included in 004A.

### Candidate D — Official Everything MCP echo

- **Description:** Invoke the reference server's structured echo tool.
- **Owner/adapter:** Ananke MCP adapter and the test reference server.
- **Credential:** None.
- **External side effect:** None; it is a response exercise, not an effect.
- **Idempotency/reconciliation:** Trivial and not provider-effect evidence.
- **Testability/live suitability:** Excellent for transport smoke testing but
  unsuitable for 004A because it cannot prove an observable effect, provider
  lookup, or indeterminate outcome.
- **Cleanup/limitation:** Process teardown only; reject as the 004A effect.

## 3. Preferred effect decision

The preferred effect is **Candidate B: the dedicated disposable
operation-receipt sink**.

It gives the strongest architectural proof with the least unnecessary real-
world risk. It is not an in-process fake: the provider must be an independent
process or service with its own operation record and status query. It supports
confirmed success, confirmed failure, response loss after provider commit,
late-result joining, conflict/unresolved behavior, and provider-side duplicate
deduplication without requiring a permanent credential or a developer-host
containment claim.

The sink is a test provider, not a generic production provider abstraction.
Its protocol must be explicitly bounded and must not be promoted to a general
exactly-once guarantee.

## 4. Proposed lifecycle/state machine

### Durable records versus transient work

The following durable lifecycle states are proposed:

| State | Durable meaning | Allowed next states |
| --- | --- | --- |
| `request_admitted` | Request passed route and authority-input validation; no dispatch permission exists yet. | `approval_bound`, `denied` |
| `approval_bound` | Exact effect/action/principal/scope/purpose/expiry/idempotency binding exists. | `approved_never_dispatched`, `cancelled_before_dispatch`, `denied` |
| `approved_never_dispatched` | The approved intent is durably committed and no dispatch marker exists. | `dispatch_marked`, `cancelled_before_dispatch`, `denied` |
| `cancelled_before_dispatch` | The operation ended before any dispatch marker; no effect may have occurred. | terminal |
| `dispatch_marked` | An exclusive dispatch attempt marker is durably committed. This is the ambiguity boundary. | `dispatched_confirmed_success`, `dispatched_confirmed_failure`, `dispatched_result_unknown` |
| `dispatched_confirmed_success` | Provider evidence and Ananke outcome commit confirm success. | terminal |
| `dispatched_confirmed_failure` | Provider evidence and Ananke outcome commit confirm failure. | terminal unless a separately approved new operation is created |
| `dispatched_result_unknown` | Dispatch may have reached the provider but authoritative result was not committed. | `reconciliation_pending`, `terminal_unresolved` |
| `reconciliation_pending` | A bounded reconciliation request is authorized and in progress. | `reconciled_success`, `reconciled_failure`, `terminal_unresolved` |
| `reconciled_success` | Provider lookup joined to the original attempt and confirms success. | terminal |
| `reconciled_failure` | Provider lookup joined to the original attempt and confirms failure. | terminal |
| `terminal_unresolved` | Bounded reconciliation cannot establish truth or evidence conflicts. No redispatch is allowed. | terminal, or a later late-result closure with no new dispatch |

Transient work states are `dispatch_in_progress` and
`reconciliation_in_progress`. They are represented by a lease/attempt marker,
not as permission to dispatch. A restart that finds either transient state
recovers conservatively to `dispatched_result_unknown` or
`reconciliation_pending` according to the last durable marker.

### Ordering invariants

The required order is:

`approval binding -> durable intent -> dispatch marker -> effect dispatch -> provider outcome/reconciliation`

Specifically:

1. The exact canonical action, principals, scope, purpose, expiry, approval
   binding, and idempotency key are validated before an intent is created.
2. The approved intent and unique idempotency key are committed before any
   provider call.
3. The dispatch marker and attempt ID are committed before the provider call.
4. The provider call occurs outside the SQLite transaction. There is no false
   distributed-transaction or exactly-once claim.
5. A provider response is committed with the original attempt ID. If that
   commit fails, the outcome is indeterminate, not success or failure.
6. A timeout before the dispatch marker is `approved_never_dispatched`; a
   timeout after the marker is `dispatched_result_unknown`.
7. Reconciliation only queries provider evidence and never submits a second
   operation.
8. Audit records describe system decisions/attempts. Provider evidence and
   durable execution state remain distinct sources of truth.

### Crash/restart behavior

| Crash point | Recovery behavior |
| --- | --- |
| Before intent commit | No durable intent; no effect is permitted or inferred. |
| After intent commit, before dispatch marker | Recover `approved_never_dispatched`; no effect is inferred. Dispatch requires the original still-valid binding. |
| After dispatch marker, before provider call | Recover conservatively as `dispatched_result_unknown`; do not infer that no effect occurred. Reconcile the provider key. |
| During provider call | Recover `dispatched_result_unknown`; never blind retry. |
| Provider committed, response lost | Recover `dispatched_result_unknown`; query provider operation status. |
| Provider response received, state commit failed | Recover `dispatched_result_unknown`; provider lookup is authoritative for closure. |
| Outcome commit complete, audit write fails | Retain execution state; record audit degradation and retry/audit-repair without redispatch. |
| During reconciliation | Retain `reconciliation_pending` with attempt count; resume only within the bounded policy. |
| Reconciliation conflict or budget exhausted | Set `terminal_unresolved`; preserve evidence and prohibit redispatch. |

## 5. Idempotency semantics

- **Owner:** Ananke owns the idempotency key namespace and binding.
- **Key rule:** 004A requires a caller-supplied opaque idempotency key. Ananke
  validates its format, binds it to the canonical action, selected sink,
  target, principals, scope, purpose, approval binding, and expiry, and stores
  the resulting binding hash.
- **Scope:** tenant/workspace plus effect name/provider namespace. A key is
  not globally reusable across effects or tenants.
- **Modified arguments:** same key with any changed action, arguments,
  principal, scope, approval, target, or purpose is denied as
  `IDEMPOTENCY_BINDING_MISMATCH`; it never creates a second intent.
- **Before dispatch:** return the existing approved/denied/cancelled record;
  do not create another dispatch.
- **Dispatch in progress:** return the existing attempt and require polling or
  reconciliation; do not start another attempt.
- **After confirmed success/failure:** return the stored terminal result.
- **Indeterminate:** return the indeterminate record and require bounded
  reconciliation; no blind retry.
- **After reconciliation:** return the reconciled terminal result.
- **Concurrent duplicates:** a unique SQLite constraint and transactionally
  serialized claim decide the winner; the loser reads the existing record.
- **Retention:** retain terminal keys for at least 30 days after closure and
  indeterminate/unresolved keys for at least 90 days. The minimum must never
  be shorter than the provider reconciliation window or evidence-retention
  requirement.

These semantics distinguish idempotent admission, Ananke at-most-one governed
dispatch attempt, and provider-side deduplication. They do **not** claim
exactly-once execution of an arbitrary external effect.

## 6. Reconciliation semantics

- **Identifiers:** Ananke `effectAttemptId`, the bound idempotency key, and the
  provider operation ID returned by the sink.
- **Evidence queried:** provider operation status, provider commit timestamp,
  provider request digest, provider result digest, and duplicate status. The
  query must be read-only.
- **Authority:** only Ananke may initiate reconciliation or classify its
  result. Horae may relay the bounded result but cannot reconcile.
- **Budget:** at most three provider queries per reconciliation request, each
  with a two-second timeout and a ten-second total budget. No automatic
  redispatch is permitted.
- **Late result:** join only when provider operation ID, idempotency key, and
  request digest match the original attempt. A late result may close an
  unresolved record but may never create a new dispatch.
- **Conflict:** contradictory provider evidence produces
  `terminal_unresolved`, records both evidence digests, and requires operator
  review. It does not select success or failure by guesswork.
- **No response/evidence:** after the bounded budget, retain
  `terminal_unresolved`; preserve the original dispatch marker and evidence.
- **Audit:** record reconciliation requested, each bounded query, provider
  evidence digest, final classification, conflict, budget exhaustion, and
  operator identity where applicable. No credential or raw secret is recorded.

## 7. Persistence architecture

Existing Ananke persistence is insufficient by itself:

- `ApprovalEngine`/`approval-store.ts` is in-memory.
- `SqliteAuditLog` persists audit events but is not an execution state machine,
  does not atomically claim an idempotency key, and cannot prove that a
  provider effect occurred.
- The existing SQLite content-approval store is for content exposure and
  should not be repurposed as effect state.

The smallest defensible design is a new Ananke-owned SQLite execution-state
store, using the existing `better-sqlite3` dependency, with separate tables
from audit events:

- `effect_intents`: canonical binding, principals/scope/purpose, approval and
  idempotency hashes, expiry, current durable state, and timestamps;
- `effect_attempts`: one unique dispatch marker/attempt per intent, provider
  operation ID, marker time, and dispatch/reconciliation counters;
- `effect_transitions`: append-only local execution-state transitions and
  evidence digests;
- unique index on effect namespace, tenant/workspace, and idempotency key;
- compare-and-swap/transactional state transitions and bounded leases.

The intent store is execution truth for what Ananke durably accepted, marked,
or classified. The audit log remains the audit projection. Where both use one
SQLite database, state and audit writes may share a transaction, but an audit
row must never be treated as independent proof that the provider effect
occurred. A failed audit projection must not cause a second dispatch.

The approved intent stores an immutable snapshot of the approved binding, so a
restart after approval does not depend on the current in-memory approval map.
Pending approvals may remain in-memory until approval; an approval that was
not durably promoted to an intent is not dispatchable after restart.

## 8. Credential and effect custody

The preferred receipt sink requires no provider credential. Its endpoint and
allowed effect name are configuration owned by Ananke. Ananke receives no raw
secret for 004A, and Horae never sees a provider credential, sink environment,
or raw provider response outside the bounded result projection.

If a later sink revision needs authentication, the credential must remain in
Ananke/provider custody and be represented to the adapter by an opaque handle
or delegated capability. It must not enter action arguments, workload argv,
model content, Horae payloads, console output, audit metadata, or evidence.
Rotation/revocation is a provider-custody operation and an expired/revoked
handle fails closed. 004A does not claim hostile-host credential extraction
resistance; that remains a 003B/004B concern.

## 9. Runtime Contracts disposition

Recommend **Disposition A** for the future compatibility control:

> Future compatibility locks identify the immutable tagged protocol/adoption
> baseline `124b6aee2629a3147739934ad5f1b45b32c8ba46`. Later documentation-only
> heads such as `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8` remain outside the
> locked component identity and are recorded only in documentation lineage.

This distinguishes protocol/source identity from documentation identity. The
current R1 lock/tag/snapshot are immutable and are not corrected in this task.
Before a future compatibility update, the lock should be corrected to align
the tagged baseline commit with its tag, while retaining the later assessment
as a non-locked documentation checkpoint. No tag is created or moved here.

## 10. Refined proposed requirements

All requirements remain **PROPOSED / PLANNED**. None is implemented or
verified by this task.

| ID | Refinement | Proposed verification class |
| --- | --- | --- |
| POST004-01 | Keep unchanged in substance: only the selected receipt-sink operation crosses the Ananke authority/adapter chokepoint; no direct, fallback, or alternate submit path. | Static source review; deterministic bypass negatives; bounded integration test |
| POST004-02 | Clarify that the exact action, arguments, principals, scope, purpose, target, expiry, approval binding, and required caller idempotency key are canonicalized together. | Deterministic canonical-hash, mutation, replay, and expiry tests |
| POST004-03 | Split into 03A durable approved-intent snapshot and 03B proof that no provider call occurs before the intent transaction commits. | SQLite transaction/restart tests; provider call-order test |
| POST004-04 | Keep the six accepted distinctions and map them to the explicit durable state machine in this document. | State-transition/property tests; evidence schema assertions |
| POST004-05 | Require a unique durable dispatch marker before provider submission; a post-marker missing result is indeterminate. | Crash injection and pre/post-dispatch timeout tests |
| POST004-06 | Clarify duplicate semantics for pre-dispatch, in-progress, terminal, indeterminate, concurrent, and modified-binding requests. | Concurrent SQLite tests; replay and binding-mismatch tests |
| POST004-07 | Require read-only, bounded, Ananke-authorized reconciliation using provider operation evidence; prohibit blind redispatch. | Provider contract tests; bounded reconciliation/falsifier tests |
| POST004-08 | Keep unchanged in substance: credentials/capabilities stay in Ananke/provider custody and caller sees only a handle or bounded result. | Secret-boundary, log/audit sanitizer, and configuration tests |
| POST004-09 | Add provider operation ID, request/evidence digests, transition IDs, and reconciliation evidence while excluding secrets and host paths. | Portable evidence schema/hash and redaction tests |
| POST004-10 | Clarify bounded cancellation, late-result joining, crash/restart recovery, and no second dispatch after timeout. | Deterministic timing, late-result, restart, and cleanup tests |
| POST004-11 | Keep the Runtime Contracts gate: use local Ananke lifecycle records unless a neutral cross-runtime shape is separately justified. | Contract review; compatibility validation; no-change proof |
| POST004-12 | Keep unchanged: 004A makes no OS-containment or host-wide bypass claim; host-mediated effects remain 004B after 003B. | Scope/nonclaim review; boundary validation |
| POST004-13 | New: the selected provider must expose an operation receipt/status contract sufficient to distinguish accepted, rejected, unknown, duplicate, and unresolved states without resubmission. | Provider contract and deterministic independent-sink tests |
| POST004-14 | New: conflict and terminal-unresolved states must be retained, surfaced, and closed only by later matching evidence or explicit owner disposition; they cannot be erased or silently retried. | Conflict, retention, operator-review, and evidence-integrity tests |

POST004-03 and POST004-05 are intentionally split because approval/intent
durability and dispatch-marker durability have different crash meanings.
POST004-13 and POST004-14 are missing requirements identified by the concrete
effect/reconciliation analysis.

## 11. Exact ownership and expected implementation surfaces

### Ananke — expected owner and source surfaces

The likely 004A implementation surfaces are:

- `packages/authority-engine/src/approval-store.ts` and
  `approval-engine.ts`: durable approved-intent promotion and binding checks;
- `packages/authority-engine/src/canonical-hash.ts`: bind idempotency and
  effect identity without weakening existing approval semantics;
- new `packages/runtime-core/src/execution-intent-store.ts`: SQLite intent,
  attempt, transition, unique-key, lease, and recovery operations;
- `packages/runtime-core/src/index.ts`: Ananke-owned lifecycle ordering,
  dispatch boundary, and restart recovery integration;
- `packages/runtime-core/src/routes.ts`: only bounded status/reconciliation
  routes if an owner-approved API surface is required;
- new `packages/runtime-core/src/slice04a-receipt-sink.ts`: selected provider
  adapter contract and bounded provider operation projection;
- `packages/audit-engine/src/audit-log-interface.ts`, `audit-log.ts`, and
  `sqlite-audit-log.ts`: only if typed lifecycle transition audit helpers are
  needed; execution state remains separate;
- `packages/schema/src/index.ts`: conditional only if a new Ananke/Horae
  serialized outcome shape is proven necessary. Such a shared shape is a
  separate contract gate, not an implicit 004A change;
- focused tests beside each changed surface plus a separate independent sink
  fixture/test package.

### Horae — route-only surfaces

The existing sealed `packages/slice02-relay/src/index.ts` and its tests should
remain unchanged. If a new route projection is required, use a new
`packages/slice04a-relay/src/index.ts` and test surface, with any narrowly
required binding change in `packages/ananke-binding/src/index.ts`. Horae may
admit, freshness-check, route, timeout, cancel, and project bounded results;
it must not own intent state, idempotency, provider lookup, approval, or
reconciliation.

### Integration — control and evidence surfaces

This activation checkpoint changes only the active control state, the 004A
activation metadata, and the required Integration task/source-of-truth records.
The numeric matrix owner remains planned/provisional. The following remain
future work after separate authorization:

- Ananke Batch 1 implementation and checkpoint;
- any Horae consumer/integration work;
- a new compatibility snapshot or lock update;
- Ananke/Horae handoffs;
- deterministic Integration tests;
- a bounded acceptance driver and attempt evidence.

No implementation, live acceptance, credential, effect, tag, or seal is
authorized by this activation checkpoint.

### Explicit zero-change components

- **Moirae Code:** zero implementation changes for 004A.
- **Mnemosyne:** zero implementation changes for 004A.
- **Runtime Contracts:** zero source/schema changes for 004A. Any shared
  contract proposal is a separate design gate.

## 12. Proposed formal 004A activation package

- **Sub-slice ID:** `FATES-SLICE-004A` as the owner-facing implementation
  sub-slice, represented beneath canonical `FATES-SLICE-004` by the active
  `activeSubsliceId` field. The numeric owner remains the only
  compatibility-matrix row; do not add or activate a matrix row.
- **Title:** `FATES-SLICE-004A - Durable governed-effect lifecycle`.
- **Objective:** Prove one Ananke-authoritative, durable, bounded governed
  effect with explicit dispatch, outcome, duplicate, indeterminate, and
  reconciliation semantics.
- **Selected effect:** Dedicated disposable operation-receipt sink.
- **Boundary:** Ananke approves, persists intent, marks dispatch, submits and
  reconciles; Horae routes and projects; the sink records only a disposable
  operation; no host-containment claim.
- **Owners:** Ananke primary; Horae route consumer; Integration proof/control;
  provider fixture owner for the sink. Moirae, Mnemosyne, and Runtime
  Contracts are excluded.
- **Prerequisites:** owner acceptance of this package; effect-sink contract;
  SQLite execution-state design; approval/idempotency binding design; explicit
  Runtime Contracts disposition A; exact clean checkpoints; no required
  changes to sealed R1.
- **Implementation stages:** provider contract and independent sink; Ananke
  intent/attempt store; Ananke dispatch/reconciliation; Horae route projection
  in a new 004A surface if necessary; deterministic tests; Integration proof;
  owner review before any live run.
- **Abort conditions:** missing pre-dispatch durability; ambiguous marker;
  duplicate dispatch; blind retry; unbounded reconciliation; provider
  conflict guessed away; credential propagation; need for 003B/host claims;
  required Runtime Contracts/Moirae/Mnemosyne expansion; evidence ambiguity.
- **Rollback/recovery:** stop dispatch, preserve the intent/attempt and
  indeterminate record, cancel or revoke still-valid authority through Ananke,
  reconcile within budget, and leave unresolved records retained. Never erase
  or rewrite lifecycle truth.
- **Evidence:** canonical binding hash, idempotency key hash, intent/attempt
  IDs, provider operation ID, dispatch marker, provider evidence digests,
  state-transition log, reconciliation results, checkpoints, test results,
  cleanup proof, and secret-free hashes.
- **Nonclaims:** no exactly-once external effect, OS-authenticated origin,
  host containment, arbitrary provider safety, generic retry/fallback,
  credential extraction resistance, memory authority, or shared-contract
  authority.
- **Completion criteria:** all state transitions, crash points, duplicates,
  reconciliation, conflict/unresolved handling, custody, route projection,
  and evidence tests pass at exact checkpoints; no bypass or second dispatch.
- **Seal criteria:** separate owner seal decision, exact component checkpoints,
  deterministic validation, authorized bounded live evidence if required,
  retained limitations, updated compatibility control, and no reinterpretation
  of R1.

## 13. Proposed deterministic test matrix

| Area | Required cases |
| --- | --- |
| Binding/admission | Exact action binding, changed arguments, changed principal/scope/purpose, expired approval, malformed/missing idempotency key |
| Intent durability | Intent commit before provider call; cancellation/denial before marker; restart recovery |
| Dispatch boundary | Unique marker, crash after marker, provider call count, no fallback/alternate adapter |
| Provider outcomes | Confirmed success, confirmed failure, provider rejection, provider timeout, malformed provider response |
| Indeterminate | Response loss after provider commit, response loss before provider commit, late-result joining, terminal unresolved |
| Idempotency | Duplicate before dispatch, in progress, after success/failure, indeterminate, after reconciliation, concurrent duplicate, modified binding |
| Reconciliation | Success, failure, no evidence, delayed evidence, conflicting evidence, query budget, timeout budget |
| Persistence | SQLite restart, corrupt state, transaction rollback, unique constraint, lease expiry, audit projection failure |
| Route | Horae freshness/admission, bounded timeout/cancel, exact correlation, projection allowlist, no Horae authority |
| Custody/evidence | No raw credential, no provider secret, path sanitization, evidence hash stability, operation/attempt join |
| Cleanup | Sink record expiry/deletion, no duplicate records, no temporary provider process/port residue |

## 14. Proposed future live acceptance

Only after separate owner authorization:

1. Preflight exact Integration and component checkpoints, clean trees, sink
   configuration, and required ports.
2. Start one independently tracked disposable receipt sink and verify its
   status endpoint without submitting an operation.
3. Start the bounded Ananke/Horae route using no generated credential.
4. Execute one approved success operation and verify one provider operation,
   one Ananke dispatch marker, one outcome, and exact correlation.
5. Execute separately authorized failure and response-loss cases using
   predeclared sink controls; never retry an indeterminate submit.
6. Reconcile by provider lookup and verify the original operation ID, no second
   provider record, and the correct terminal state.
7. Stop/clean all tracked processes and disposable sink data.
8. Retain portable secret-free evidence and stop for owner review; do not seal
   automatically.

No live process, port, credential, or effect was created in this preparation.

## 15. Residual risks and non-claims

- The receipt sink proves the lifecycle against one intentionally bounded
  provider contract, not arbitrary provider behavior.
- A provider can still misbehave outside the sink contract; Ananke cannot
  infer exactly-once external execution from its own state.
- SQLite durability and host storage integrity remain deployment assumptions;
  004A does not claim tamper-proof audit or host containment.
- A transport channel can be authenticated without being authorization.
- Ananke governance remains contingent on exclusive routing; direct provider,
  CLI, terminal, IDE, browser, or extension paths remain outside the claim.
- R1 application identity remains distinct from OS-authenticated process origin.
- 003B and 004B remain separate future work.

## Final recommendation

**ACTIVE — CONTROL-PLANE ONLY.** The owner-authorized activation is complete at
Integration checkpoint `ff72abab61e877682f28423d4d5ae4695f01e614` plus this
activation transaction. 004A remains unimplemented and provisional. A separate
owner authorization is required before Ananke Batch 1 implementation begins.
