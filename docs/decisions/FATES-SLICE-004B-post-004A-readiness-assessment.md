# FATES-SLICE-004B post-004A readiness assessment

**Decision status:** Recorded assessment; no activation or implementation authorization.

**Date:** 2026-08-18

**Scope:** Determine the next authorized work after the sealed
`FATES-SLICE-004A` child without reopening that child or treating its closure
as successor authorization.

**Governance remap:** The host-mediated-effects capability called conceptual
`FATES-SLICE-004B` in this historical assessment is now canonical
`FATES-SLICE-004C`. The containment prerequisite called conceptual
`FATES-SLICE-003B` is now canonical `FATES-SLICE-004B`. This assessment remains
historical source material; the current mapping and activation-versus-
acceptance ordering are governed by
`docs/decisions/FATES-SLICE-004B-004C-governance-remap.md`.

## Disposition

**Classification: `004B_DEFINED_BUT_INCOMPLETE`.**

Accepted Slice 004 material defines 004B conceptually as **host-mediated
governed effects that cross a contained developer-host boundary**. It also
defines its hard ordering: the sealed 004A durable-effect proof must precede a
separately gated and accepted `FATES-SLICE-003B` strict host-containment proof,
which must precede 004B.

This is not an implementation-ready 004B definition. No `FATES-SLICE-004B`
subslice artifact exists, no 004B activation decision exists, and
`active-slice.json` deliberately retains the open numeric parent with
`activeSubsliceId: null`. The closure of 004A neither selects nor authorizes a
later child.

## Authoritative basis

- `slices/004-governed-execution/slice.json` defers host-mediated developer
  effects to 004B **after 003B and 004A**, while retaining the numeric parent
  as planned/provisional.
- `docs/design/FATES-SLICE-004-design-gate.md` defines the order
  `003A-R1 -> 004A -> 003B -> 004B` and states that 003B is required before
  any developer-host effect.
- `docs/reviews/FATES-SLICE-004-proposed-requirements.md` preserves the 003B
  prerequisite gate for 004B and contains no 004B requirement register or
  acceptance matrix.
- `docs/reviews/POST-003A-R1-003B-design-gate.md` contains a proposed strict
  003B profile and explicitly says its proposed requirements are not
  activation or implementation authorization.
- `docs/decisions/FATES-SLICE-004-letter-qualified-subslice-sealing-decision.md`
  requires a separate activation authorization and active-state transaction
  for every later child, including 004B.
- `active-slice.json` confines the accepted authorization to 004A and
  explicitly excludes 003B and 004B.

## What 004A now guarantees

The sealed 004A record proves the bounded Ananke-authoritative durable-effect
lifecycle selected for that child: durable pre-dispatch intent, an unambiguous
dispatch marker, scoped duplicate handling, recovery/reconciliation semantics,
secret-free evidence, an independent receipt sink, and central fail-closed
effect-path enforcement. Its successful acceptance basis is Attempt 006,
`PASS_BOUNDED`, as bound by `docs/evidence/FATES-SLICE-004A-seal.json`.

004A does **not** prove OS containment, hostile-workload isolation, trusted
supervisor launch/channel identity, developer-host credential isolation, or
host-mediated effects. Those exclusions remain material to 004B readiness.

## Dependency map and outstanding gates

| Category | State after 004A | Required before 004B preparation or implementation |
| --- | --- | --- |
| Prerequisite | 004A is sealed. 003B remains paused and is outside Slice 004's activation authority. | A separately authorized 003B activation, implementation, hostile acceptance, and closure under its selected platform profile. |
| Implementation | 004B's purpose is defined only at the capability level. | Select one bounded host-mediated effect, route, target/resource class, and host/guest interaction model without creating a generic host proxy. |
| Component contracts | Ananke owns authority/effect decisions; Horae remains route/freshness only; Moirae is the future contained host participant. | Define exact Ananke/Moirae/Horae handoffs, supervisor/channel identity binding, credential/effect-custody boundary, cancellation/indeterminate semantics, and whether a neutral Runtime Contracts shape is actually needed. |
| Deterministic tests | 004A owner and Integration proof are sealed. | Negative and recovery coverage for profile drift, direct/alternate paths, replay, credential exposure, unavailable containment, cancellation, timeout, post-dispatch indeterminate state, and no implicit retry/fallback. |
| Live acceptance | 004A's sealed Attempt 006 is historical evidence only. | A separately owner-authorized, harmless, process-heavy 003B/004B acceptance plan with independent host-side evidence, explicit cleanup, abort criteria, and no provider-side effect until authorized. |
| Seal criteria | The 004A tag is final and immutable. | A later 004B-specific acceptance basis, component provenance, full validation, successful CI, and a separate deterministic seal transaction. |

The component provenance at the 004A seal is Integration
`6ff2fb068612486064d43b99b2793c048fb37707`; Ananke
`e7b405f3a217db6df31fe9ba7bde376ab666930c`; Horae
`3f531d4f5558a10a36aeae20c3458080eb4468b9`; Moirae Code
`bc7b984bd2eb0e0f07a1cd7259a8eab21556f097`; Mnemosyne
`f4ab76a9760f856d78908d35facceb068d78c8e5`; and Runtime Contracts
`bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8`. These are 004A provenance, not
004B dependency pins. Future pins must be selected by the later activation
transaction. The existing Runtime Contracts tag/HEAD lineage discrepancy also
remains an owner-decision gate before a future compatibility checkpoint; it is
not permission to change the shared contract now.

Mnemosyne has no identified 004B authority role. Prefixity and all unrelated
projects are out of scope. Runtime Contracts remains unchanged unless a
separate neutral structural-contract gate proves a shared need.

## Decisions still required

The accepted sources do not choose among the following material architectural
options, so this assessment does not choose them:

1. The exact first 003B platform/profile and the evidence necessary to accept
   it as the prerequisite containment boundary.
2. The first 004B host-mediated effect, its reversibility/reconciliation
   story, and the permitted target/resource scope.
3. The concrete supervisor/channel and broker boundary that preserves Ananke
   authority while exposing neither ambient credentials nor a generic host
   capability.
4. The precise 004B requirements, deterministic acceptance matrix,
   process-heavy/live-acceptance plan, participating component checkpoints,
   and any neutral Runtime Contracts change.

## Next authorized bounded work

The next executable governance task is **not 004B implementation or
activation**. It is a separately owner-authorized `FATES-SLICE-003B`
activation-decision package that selects and pins its strict containment
profile, requirements, threat/failure model, acceptance matrix, component
scope, starting checkpoints, and stop conditions. It must preserve 004A's
sealed record and the parent 004 state.

Only after 003B is accepted and closed may a separate owner decision authorize
an implementation-ready 004B definition and its own activation transaction.

**GO/NO-GO for beginning 004B implementation: NO-GO.**
