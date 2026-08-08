# Active Task — Slice 02 Activation Sequencing Correction

Status: complete; Slice 02 remains inactive and no implementation is authorized.

## Objective

Remove the circular sequencing dependency in the approved Slice 02 planning
and activation documents without changing the approved implementation scope,
security boundaries, evidence requirements, checkpoint order, or component
responsibilities.

This task prepares Slice 02 for an explicit activation decision.

It does not activate Slice 02 and does not implement product code.

## Required context

Use `../INDEX.md` to locate only the material relevant to:

- the Stage-A authoritative lock;
- Slice 02 workflow and planning package;
- implementation-authorization record;
- activation requirements;
- approval/evidence requirements;
- checkpoint ordering;
- bypass disclosures and lock protections.

Consult `../SOURCE_OF_TRUTH.md`, `../SYSTEM_MAP.md`, and `../INTEGRATION.md`
only where required to resolve authority or integration questions.

Verify relevant source documents in the component repositories before changing
coordination conclusions.

## Problem to resolve

The current Slice 02 documentation contains a sequencing conflict:

- the workflow requires Slice 02 activation before implementation begins;
- the implementation-authorization material also references implementation
  checkpoints and real proof as prerequisites to a later activation request.

This creates a circular dependency.

## Work

1. Identify the exact documents and clauses responsible for the sequencing
   conflict.
2. Determine the minimum correction that preserves the accepted Slice 02
   architecture and governance model.
3. Make activation clearly authorize the already-approved bounded
   implementation sequence.
4. Preserve all existing requirements for:
   - explicit authorization;
   - evidence and proof;
   - bypass disclosure;
   - checkpoint ordering;
   - repository/component ownership;
   - Stage-A lock integrity;
   - fail-closed behaviour.
5. Update affected coordination/planning documentation consistently.
6. Record why the correction does not broaden implementation authority.

## Acceptance criteria

The task is complete when:

- there is no circular activation/implementation prerequisite;
- the point at which implementation becomes authorized is explicit;
- activation cannot be inferred merely from planning completion;
- post-implementation evidence remains required where originally intended;
- component ownership and checkpoint ordering remain unchanged;
- the exact Stage-A lock remains the activation baseline;
- relevant document/link/coordination validators pass; and
- the resulting package is ready for a separate explicit activation decision.

## Stop conditions

Do not:

- activate Slice 02;
- implement the Ananke fixed-fixture adapter;
- modify component product code;
- change Runtime Contracts;
- weaken approval or evidence requirements;
- alter component ownership;
- advance to another Slice 02 checkpoint;
- treat completion of this task as user authorization.

## Completion record

On completion, record:

- documents changed;
- original circular dependency;
- corrected sequencing model;
- validation performed;
- remaining uncertainties;
- whether the package is ready for an explicit activation decision.

Do not activate Slice 02 or begin implementation.

## Completion record — 2026-08-08

### Documents changed

- `docs/development-workflow.md`
- `docs/checkpoint-policy.md`
- `docs/design/FATES-SLICE-002-runtime-boundary-resolution.md`
- `docs/design/FATES-SLICE-002-owner-approval-checklist.md`
- `docs/proposals/FATES-SLICE-002-readiness-checklist.md`
- `docs/reviews/FATES-SLICE-002-cross-owner-consistency-review.md`
- `docs/decisions/FATES-SLICE-002-implementation-authorization.json`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/INTEGRATION.md`

### Original circular dependency

The general workflow placed implementation after activation, while the Slice
02 design/readiness/authorization package treated owner implementation
checkpoints, handoff packets, real three-process proof, and cross-runtime
acceptance evidence as prerequisites to a later activation request.

### Corrected sequencing model

A separate explicit activation decision is now the only point that authorizes
the already-approved bounded `implementationOrder`. That decision must record
the approved scope, acceptance criteria, owner responsibilities, exact
starting checkpoints from `fates-lock.json`, the `fates-stage-a-2026-07`
baseline, and explicit user authorization to begin implementation. Planning
completion, owner approvals, checklist completion, or the preparation record
cannot activate Slice 02 or authorize implementation.

The existing order remains unchanged: Integration evidence freeze → Ananke
bounded adapter → Horae handoff/relay → Moirae constrained host → Integration
real proof. Checkpoints, handoffs, consumer tests, real proof, bypass evidence,
and the frozen acceptance matrix remain post-activation requirements before
lock/matrix/snapshot advancement or sealing.

### Validation performed

- `npm.cmd run validate` — all JSON, lock, matrix, slice, boundary, and test
  checks passed; 54 tests passed.
- `git diff --check` — passed.
- Markdown link-target scan — passed for the nine affected coordination
  documents plus `docs/INDEX.md`.
- Acceptance assertions — `active-slice.json` remains `idle` with
  `activeSliceId: null`; the Stage-A lock, compatibility matrix, and snapshot
  were not changed; implementation authorization still records
  `activatesSlice: false` and `sliceRemainsInactive: true`.
- Component-side source verification — the Ananke bounded-read ADR, Horae
  handoff ADR/current inspection-only bindings, Moirae constrained-host ADR/
  current fail-closed clients, and Runtime Contracts structural authorities
  were checked. No component repository or product code was modified.

### Remaining uncertainties and cross-component effects

The runtime path is still absent: Ananke has no registered fixed-fixture
adapter, Horae has no dispatch/relay boundary, Moirae has no constrained
request/result host, and Integration has no real three-process proof. Stage A
also remains provisional because the locked Moirae checkpoint is untagged.
These are post-activation implementation/evidence concerns and were not
resolved or broadened by this coordination correction. No cross-component
behaviour or ownership changed, and no Runtime Contracts change is approved.

### Readiness result

The coordination package is ready for a separate explicit activation decision.
This completion record is not that decision, does not activate Slice 02, and
does not authorize implementation.
