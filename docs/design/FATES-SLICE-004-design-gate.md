# FATES-SLICE-004 — Governed Execution Design Gate

**Status:** PROPOSED DESIGN / SOURCE-OF-TRUTH RECONCILIATION ONLY
**Date:** 2026-08-11
**Activation:** NOT ACTIVATED
**Implementation:** NOT AUTHORIZED
**003B:** PAUSED and not implicitly authorized

This document defines the owner-review package for the next proposed slice. It
does not activate FATES-SLICE-004, change the active-slice slot, alter the
sealed R1 evidence, or authorize component implementation.

## Decision summary

The existing name “FATES-SLICE-004 — Governed execution” is too broad for one
bounded implementation checkpoint. The recommended design is option C: retain
FATES-SLICE-004 as the design umbrella and decompose implementation into:

1. **FATES-SLICE-004A — Durable governed-effect lifecycle:** a narrow,
   Ananke-authoritative lifecycle for one bounded, non-host-contained effect
   path across the already trusted route. It proves durable pre-dispatch
   evidence, explicit outcome/indeterminate semantics, duplicate handling, and
   reconciliation. It makes no OS-containment or host-wide bypass claim.
2. **FATES-SLICE-003B — Strict host containment:** the separately proposed and
   still-paused Linux x86_64 / KVM / Firecracker / no-guest-NIC /
   constrained-vsock proof profile. It is not a prerequisite for the narrow
   004A effect-lifecycle proof, but it is required before any host-local
   developer effect is admitted as governed.
3. **FATES-SLICE-004B — Host-mediated governed effects:** a later slice, gated
   on 003B and on the 004A lifecycle proof, for effects that cross a contained
   developer-host boundary.

The proposed order is therefore:

`FATES-SLICE-003A-R1 (sealed) → FATES-SLICE-004A → FATES-SLICE-003B → FATES-SLICE-004B`

This is a recommendation, not an activation. The current Integration control
state remains idle with `activeSliceId: null`.

## Starting truth and boundaries

The authoritative current compatibility set is
`fates-slice-003a-r1-2026-08-11`. The Integration seal commit is
`1ed2a5c45607585fa17d72ceed1be91b5f09881f`, the R1 tag is
`fates-slice-003a-r1-v0.1.0-protocol-1.4.0`, and the baseline is
`fates-slice-003a-r1-2026-08-11`. The active slot is idle and the next
recommendation is FATES-SLICE-004. R1 is CLOSED / SEALED; 003B is PAUSED.

The six clean starting checkpoints are:

| Repository | Checkpoint |
| --- | --- |
| Project-Fates-Integration | `1ed2a5c45607585fa17d72ceed1be91b5f09881f` |
| Project Ananke | `dde9f74cbcfefea2176a6f0103e1f6b9064f4e64` |
| Project Horae | `3f531d4f5558a10a36aeae20c3458080eb4468b9` |
| Project Moirae Code | `bc7b984bd2eb0e0f07a1cd7259a8eab21556f097` |
| Project Mnemosyne | `f4ab76a9760f856d78908d35facceb068d78c8e5` |
| Project Runtime Contracts | `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8` |

The current lock, matrix, compatibility snapshot, active-slice record, R1
evidence, and historical tags are authoritative and are not changed by this
design checkpoint.

## Runtime Contracts checkpoint/tag discrepancy

The locked Runtime Contracts checkout is `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8`.
It is a later documentation-only commit (`docs: assess Slice 02 contract
sufficiency`) whose changes are limited to the decisions index and a Slice 02
contract-sufficiency assessment. It does not change the package source,
protocol version, or artifact.

The existing annotated tag
`adrasteia-adoption-v0.4.0-protocol-1.4.0` points to
`124b6aee2629a3147739934ad5f1b45b32c8ba46`, the immutable Project Adrasteia
adoption baseline. Its tag message identifies the package `0.4.0` / protocol
`1.4.0` adoption baseline. Therefore the tag does not peel to the later
documentation HEAD by design: the tag names the published adoption baseline,
not every later documentation assessment.

This is a checkpoint/tag lineage and lock-semantics discrepancy, not a
protocol or production-source mismatch. It remains an accepted inherited
condition for this design checkpoint. No tag is moved, recreated, deleted, or
retagged. Before a future implementation checkpoint, the owners must choose
one explicit correction: either lock the exact tagged adoption commit when the
assessment docs are not part of the compatibility claim, or create a new,
separately named Runtime Contracts documentation/checkpoint tag and update the
lock and snapshot in a separately authorized compatibility checkpoint. A
future lock must not silently associate the old adoption tag with `bbf240…`.

## Proposed Slice 004 definition

### Objective

Establish a bounded, auditable governed-effect lifecycle in which an approved
effect is durably recorded before dispatch, dispatched exactly through the
Ananke authority boundary, classified into confirmed or indeterminate outcome
states, and reconciled without blind retry or authority expansion.

### Problem addressed

R1 proves application-level identity, route binding, and bounded process
participation, but not durable effect intent, recovery after a process crash,
duplicate dispatch handling, or reconciliation after transport loss. Existing
component primitives describe idempotency and lifecycle fields but do not by
themselves implement an authority/effect state machine, durable store, or
reconciliation authority. A later effect slice must close that gap without
turning routing, memory, host containment, or structural contracts into
execution authority.

### Effect boundary

004A is limited to one explicitly selected, harmless or owner-approved
non-hostile effect adapter behind Ananke. The effect must be executed only by
the Ananke-controlled adapter/provider boundary. No caller, model, Horae
relay, Moirae host, memory result, or raw credential may perform the effect
directly. The effect definition, provider, side-effect risk, and rollback
characteristics must be named before implementation.

### Principals and trust

- The requesting/delegating principal and acting agent principal remain
  application-level identities with bounded scope, purpose, audience, and
  expiry.
- Ananke is the sole authority for policy, approval, dispatch permission,
  provider/effect selection, and authoritative outcome classification.
- Horae may inspect, compose, freshness-check, route, and relay; it cannot
  approve, mint authority, dispatch around Ananke, or reconcile an effect.
- Moirae is outside 004A's host-containment claim. A trusted channel is not
  authorization.
- Mnemosyne is not an execution authority. Its involvement is excluded unless
  a separate receipt-gated provenance requirement is approved.
- Runtime Contracts provides portable structure only; structural identity,
  correlation, or lifecycle fields are not authentication, authority,
  persistence, or outcome truth.

### Authority, routing, and credential custody

Every 004A request must have one canonical Ananke authority decision bound to
the exact canonical request, effect, target, principals, purpose, scope,
audience, expiry, idempotency key, and correlation identifiers. Horae can
carry the request through the already trusted route but cannot widen it.
Credentials, if needed by the selected adapter, remain in the provider-side or
Ananke-controlled custody boundary and are represented to callers only by
opaque handles or delegated authority. Credential values must not enter model
content, request payloads, argv, URLs, logs, or evidence.

### Durable state and required distinctions

The implementation must distinguish these states; a generic “failed” result is
not sufficient:

| State | Meaning and permitted next step |
| --- | --- |
| `approved_never_dispatched` | Approval and durable intent exist; no dispatch marker exists. It may be cancelled or dispatched once under the same bound. |
| `dispatched_confirmed_success` | The adapter returned an authoritative success. No automatic duplicate dispatch is permitted. |
| `dispatched_confirmed_failure` | The adapter returned an authoritative failure. Retry, if ever allowed, requires a new policy decision and explicit idempotency semantics. |
| `dispatched_result_unknown` | Dispatch may have reached the effect boundary but no authoritative result was received. It must be reconciled or explicitly abandoned; it must not be blindly retried. |
| `duplicate_or_already_dispatched` | A repeated request maps to an existing idempotency key/effect binding. Return the existing terminal result or indeterminate state without a second effect. |
| `reconciliation_completed` | A prior indeterminate record has a separately evidenced authoritative reconciliation outcome. The original dispatch is retained. |

The durable record must include the dispatch-attempt marker and enough
correlation to distinguish “approved but never dispatched” from “dispatch
possibly occurred”. A pre-dispatch timeout is not dispatch. A timeout after
the dispatch marker is indeterminate unless an authoritative failure/success
is available. Late results must be joined to the original attempt and must not
create a second dispatch.

### Idempotency, crash/restart, and reconciliation

The idempotency key is bound to the exact effect identity and request. A
restarted process must recover the durable record before accepting a new
dispatch. The reconciliation operation must be separately authorized,
bounded, auditable, and safe for the chosen effect; it cannot infer success
from transport success or infer failure from a missing response. Automatic
retry, fallback, compensation, and provider failover are out of 004A unless
each is explicitly designed, authorized, and proven for the selected effect.

### Audit and evidence

The minimum evidence joins request, decision, effect, attempt, dispatch marker,
outcome, reconciliation, process/checkpoint, and operator/owner decision
identifiers. Evidence must be portable, deterministic where claimed,
secret-free, non-overwriting, and sufficient to prove one of the six state
distinctions above. Raw credential values and unrelated host paths are never
retained.

### Explicit nonclaims

004A does not claim OS-authenticated process origin, OS sandboxing, filesystem,
shell, subprocess, browser, extension, network, or terminal governance;
complete host bypass resistance; credential isolation from a hostile host;
Moirae containment; Mnemosyne provenance admission; generic arbitrary effects;
provider-wide exactly-once execution; or that `trusted channel = authorization`.
R1's statement that application-level identity is not OS-authenticated process
origin remains unchanged. Ananke governance is not a host sandbox. Horae
routing is not authority. A Moirae route is not containment.

## Scope and ownership

### In scope for the 004A implementation gate

- One selected, bounded effect adapter behind Ananke.
- Durable pre-dispatch intent and approval evidence.
- Explicit dispatch marker and the six state distinctions above.
- Idempotent duplicate response for the selected effect.
- Crash/restart recovery and one bounded reconciliation path.
- Secret-free audit/evidence and deterministic failure/timeout tests.
- Cross-Fate proof over the already trusted R1 route, without changing R1's
  sealed evidence.

### Explicitly out of scope

- Any 003B implementation or host-containment claim.
- Moirae terminal/Git/browser/extension/local filesystem governance.
- Arbitrary provider or MCP execution, provider failover, blind retry, or
  generic compensation.
- Qualified Mnemosyne retrieval, provenance admission, or memory authority.
- A shared Runtime Contracts change unless a separate contract design gate
  proves a neutral need and all owners approve it.
- R1 amendment, reseal, retag, or reinterpretation.

### Owners and repository roles

| Owner | 004A responsibility | Explicit limit |
| --- | --- | --- |
| Ananke | Authority decision, approval binding, durable effect ledger, dispatch marker, adapter custody, outcome and reconciliation authority | No host containment; no memory authority |
| Horae | Canonical route, fresh admission, bounded relay, result projection | No approval, effect dispatch, or reconciliation authority |
| Integration | Lock/checkpoint policy, cross-Fate requirements, validation, evidence and seal | No runtime or effect execution |
| Runtime Contracts | Only a separately approved neutral shape if proven necessary | No authority, persistence, outcome truth, or idempotency store |
| Moirae | No 004A implementation; later 004B/003B consumer only | No host-governance claim in 004A |
| Mnemosyne | No 004A implementation; future advisory/provenance work only by separate gate | No execution authority |

## Prerequisites and sequencing

1. Owner approval of this design/reconciliation checkpoint and of the narrower
   004A instruction.
2. Resolve the Runtime Contracts tag/HEAD semantics in a separately named
   checkpoint before changing the compatibility lock or claiming a new shared
   contract.
3. Select the effect and provider adapter, including authoritative success,
   authoritative failure, timeout, and reconciliation semantics.
4. Define the durable store failure model, crash boundary, retention, and
   operator reconciliation permissions.
5. Preserve the R1 sealed baseline and confirm all six starting repositories
   are clean at the checkpoints recorded above.
6. 003B is **not required for 004A** because 004A must not claim a local host
   effect. 003B **is required before 004B** or any developer-host effect.
7. Any Runtime Contracts change, Moirae source change, or Mnemosyne source
   change is a stop-and-re-gate condition, not an implicit expansion.

## Proposed requirements and traceability

The proposed requirement register is in
[`docs/reviews/FATES-SLICE-004-proposed-requirements.md`](../reviews/FATES-SLICE-004-proposed-requirements.md).
The requirements are proposed/planned only and are not current implemented
claims. They must be reviewed against the exact effect selected for 004A.

## Deterministic validation and live acceptance

Before any live acceptance, each owner must run the full relevant validation
at the exact candidate checkpoints. Deterministic tests must cover:

- approval binding and mutation rejection;
- durable intent written before dispatch;
- approved-never-dispatched cancellation and no-effect proof;
- exactly one dispatch marker;
- authoritative success and authoritative failure;
- pre-dispatch timeout versus post-dispatch indeterminate timeout;
- crash before dispatch, after marker, during result, and after result;
- duplicate/replay returns without a second adapter call;
- bounded reconciliation of an indeterminate attempt;
- late result joining without a second dispatch;
- credential-handle-only flow and secret-free evidence;
- direct/fallback/retry/bypass paths denied or outside the governed claim;
- restart recovery and evidence retention.

Integration tests must verify the exact route, producer ownership, correlation,
decision binding, dispatch count, state transitions, clean shutdown, and
portable evidence. Live acceptance, if later authorized, must use one owner-
selected harmless effect, one bounded attempt target, explicit ports/process
cleanup, no automatic retry, and a predeclared abort plan. It must not be
started by this checkpoint.

## Falsifiers, abort, rollback, and sealing

The design is falsified or the implementation must stop if any of the
following occurs:

- a successful effect can occur without the Ananke decision and exact bound;
- a duplicate or restart can cause two effect calls for one idempotency key;
- the record cannot distinguish never-dispatched from possibly-dispatched;
- reconciliation guesses an outcome or performs an unbounded/unauthorized
  effect;
- a credential value reaches the caller, model, argv, URL, log, or evidence;
- Horae, Moirae, Mnemosyne, or Runtime Contracts becomes an unapproved source
  of authority;
- a host-local effect needs 003B or broader bypass claims;
- the selected effect has no trustworthy reconciliation or rollback story;
- a required contract, lock, tag, sealed evidence, or historical checkpoint
  must be rewritten.

Rollback is an administrative abort: stop dispatch, preserve the durable
  attempt/evidence record, revoke any still-valid authorization/handle through
  the approved custody boundary, and leave the active slice idle. Do not erase
  or rewrite an indeterminate record. A completion/seal decision requires
  owner acceptance of the exact effect scope, all six state proofs, duplicate
  and restart evidence, reconciliation evidence, secret-free evidence hashes,
  exact component checkpoints, deterministic validation, any authorized live
  result, known limitations, and a separately updated lock/matrix/snapshot.

## Bounded implementation instruction proposed for approval

> Implement only FATES-SLICE-004A as the first implementation sub-slice under
> the FATES-SLICE-004 design umbrella. Use one selected non-hostile effect
> behind the Ananke authority/adapter boundary. Add durable pre-dispatch intent,
> an explicit dispatch marker, idempotency/duplicate handling, crash/restart
> recovery, one bounded reconciliation path, and secret-free evidence. Keep
> Horae as route/freshness/relay only. Do not modify Moirae, Mnemosyne, or
> Runtime Contracts unless a separate owner-approved gate is opened. Do not
> claim OS-authenticated process origin, host containment, exactly-once
> provider execution, automatic retry, fallback, or memory authority. Do not
> activate the slice, change the lock/matrix/snapshot, create credentials, or
> run live acceptance until a later owner decision explicitly authorizes those
> actions.

This instruction is proposed for owner review. It is not an implementation
authorization.
