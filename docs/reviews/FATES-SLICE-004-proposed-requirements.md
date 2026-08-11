# FATES-SLICE-004 — Proposed Requirements

**Status:** PROPOSED / PLANNED ONLY
**Parent design:** [`FATES-SLICE-004-design-gate.md`](../design/FATES-SLICE-004-design-gate.md)
**Activation:** none
**Implementation:** none

These requirements are a design-gate register, not evidence that the
requirements are implemented. The first implementation target is the narrower
FATES-SLICE-004A lifecycle described by the parent design.

| ID | Proposed requirement | Owner | Classification | Validation direction |
| --- | --- | --- | --- | --- |
| POST004-01 | Every selected effect crosses one Ananke authority and adapter chokepoint; direct, fallback, and alternate paths are denied or outside the claim. | Ananke / Integration | PLANNED | Deterministic bypass negatives and one bounded integration route |
| POST004-02 | The decision binds requesting and acting principals, effect, target, scope, purpose, audience, expiry, correlation, and idempotency key to the canonical request. | Ananke | PLANNED | Canonical hash, mutation, replay, audience, expiry tests |
| POST004-03 | Durable approval/intent exists before any dispatch attempt and records that dispatch has not yet occurred. | Ananke | PLANNED | Crash-before-dispatch and durable ordering test |
| POST004-04 | The lifecycle distinguishes `approved_never_dispatched`, `dispatched_confirmed_success`, `dispatched_confirmed_failure`, `dispatched_result_unknown`, `duplicate_or_already_dispatched`, and `reconciliation_completed`. | Ananke / Integration | PLANNED | State-machine transition and evidence assertions |
| POST004-05 | A dispatch marker is durable and unambiguous; a post-marker missing result is indeterminate rather than a confirmed failure or safe retry. | Ananke | PLANNED | Pre/post-dispatch timeout and crash tests |
| POST004-06 | Reuse of an idempotency key and exact effect binding returns the existing record without a second effect call. | Ananke | PLANNED | Concurrent duplicate, replay, and restart tests |
| POST004-07 | Reconciliation is separately authorized, bounded, auditable, and effect-safe; it does not guess or blindly retry an unknown outcome. | Ananke | PLANNED | Reconciliation success/failure/abort tests |
| POST004-08 | Credentials remain in the approved custody/provider boundary and are represented to the caller only by a handle or delegated authority. | Ananke / Integration | PLANNED | Secret-redaction and child/environment boundary tests |
| POST004-09 | Evidence joins request, decision, effect, attempt, dispatch marker, outcome, reconciliation, process/checkpoint, and owner identifiers without secrets or path leakage. | Integration | PLANNED | Portable evidence schema/hash and sanitizer tests |
| POST004-10 | Timeout, cancellation, late result, crash, and restart behavior is bounded and cannot create a second dispatch. | Ananke / Horae | PLANNED | Deterministic bounded-time and late-completion tests |
| POST004-11 | Any Runtime Contracts change must be separately justified as a neutral structural need; existing structural identity/correlation/lifecycle fields must not be treated as authority or persistence. | Runtime Contracts / Integration | GATED | Contract design review and compatibility validation |
| POST004-12 | 004A makes no OS-containment or host-wide bypass claim; any developer-host effect is deferred to 004B after the separately paused 003B proof. | Integration / Moirae | PLANNED | Scope and nonclaim review; 003B prerequisite gate |

## Traceability classifications

All POST004 entries are **PROPOSED / PLANNED**, not proven, implemented, or
live-validated. `POST004-01` and `POST004-02` inherit R1's bounded
application-level identity and canonical binding direction but add no claim of
OS-authenticated process origin. `POST004-12` explicitly preserves the 003B
pause. Any later status change requires a new owner-authorized implementation
and acceptance checkpoint.

## Deferred/decomposed work

- 003B strict host containment remains a separate paused slice.
- 004B host-mediated effects remain deferred until 003B and 004A are accepted.
- Mnemosyne provenance admission, qualified retrieval, and execution-adjacent
  memory use remain separate requirements.
- A shared Runtime Contracts lifecycle/idempotency shape is not assumed; it
  requires its own contract gate if implementation proves a neutral need.

## FATES-SLICE-004A refinement checkpoint

The following refinements remain **PROPOSED / PLANNED** and do not change the
status of POST004-01 through POST004-12:

- **POST004-03A** - Durable approved-intent snapshot is committed before any
  provider call.
- **POST004-03B** - The provider-call ordering test proves that no dispatch is
  possible before the intent transaction commits.
- **POST004-05A** - A unique durable dispatch marker is committed before the
  provider submit.
- **POST004-05B** - A missing result after the marker is indeterminate and is
  never treated as a confirmed failure or safe retry.
- **POST004-06A** - Duplicate handling covers pre-dispatch, in-progress,
  terminal, indeterminate, concurrent, and modified-binding requests.
- **POST004-07A** - Reconciliation is read-only, Ananke-authorized, bounded,
  and based on provider operation evidence; it never blindly resubmits.
- **POST004-09A** - Evidence includes provider operation IDs, transition IDs,
  request/evidence digests, and reconciliation evidence without secrets or
  host paths.
- **POST004-10A** - Late-result joining and crash/restart recovery cannot
  create a second dispatch.
- **POST004-13** - The selected provider exposes an operation receipt/status
  contract that distinguishes accepted, rejected, unknown, duplicate, and
  unresolved states without resubmission. **Classification:** PLANNED;
  provider-contract and independent-sink integration verification.
- **POST004-14** - Conflict and terminal-unresolved states are retained and
  require matching late evidence or explicit owner disposition; they cannot
  be erased or silently retried. **Classification:** PLANNED;
  conflict, retention, operator-review, and evidence-integrity verification.

The preferred 004A effect is the dedicated disposable operation-receipt sink
described in the owner activation package. These refinements are not an
implementation authorization and do not activate the numeric FATES-SLICE-004
matrix row.
