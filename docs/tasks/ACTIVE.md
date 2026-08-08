# Active Task — Slice 02 Activation Decision

Status: awaiting explicit user-authorized activation decision.

## Objective

Perform the bounded activation of FATES-SLICE-002 against the exact
`fates-stage-a-2026-07` baseline.

This task may update only the coordination/planning artifacts necessary to
record activation.

It does not implement any component product code.

## Authorization

The user explicitly authorizes activation of FATES-SLICE-002 for the approved
bounded implementation sequence described by the existing Slice 02 design and
implementation-authorization package.

This authorization applies only if all existing activation requirements remain
satisfied at execution time.

## Required context

Use `../INDEX.md` to locate the authoritative:

- Stage-A lock and compatibility-set baseline;
- Slice 02 approved design;
- owner approvals;
- cross-owner consistency review;
- implementation-authorization record;
- readiness requirements;
- activation workflow;
- checkpoint policy.

Read only the material required to verify and record activation.

## Required pre-activation verification

Before changing activation state, verify that:

1. Slice 02 is still inactive.
2. `fates-stage-a-2026-07` remains the authoritative starting baseline.
3. Starting component checkpoints still exactly match `fates-lock.json`.
4. The five owner approval records remain present and applicable.
5. Cross-owner consistency remains PASS.
6. The approved scope remains only
   `fates.slice02.inspect-fixed-fixture.v1`.
7. No Runtime Contracts/package/protocol change has become necessary.
8. No hard-stop condition in the approved readiness/design package is present.
9. The provisional untagged Moirae checkpoint is recorded as a known baseline
   limitation and is not represented as sealed.

If any requirement is no longer satisfied, do not activate the Slice. Record
the blocker and stop.

## Activation work

If all pre-activation requirements pass:

1. Create/update only the coordination artifacts required by the established
   activation workflow.
2. Record:
   - Slice ID `FATES-SLICE-002`;
   - exact `fates-stage-a-2026-07` starting baseline;
   - exact starting checkpoints from `fates-lock.json`;
   - approved bounded scope and acceptance criteria;
   - owner responsibilities;
   - approved implementation order;
   - explicit user authorization;
   - known provisional Moirae checkpoint limitation.
3. Change the active-slice planning state from idle to the appropriate active
   Slice 02 state.
4. Preserve the existing compatibility lock, compatibility-set snapshot and
   completion/seal claims unchanged.
5. Record that activation authorizes implementation only in this order:

   Integration evidence freeze →
   Ananke bounded adapter →
   Horae handoff/relay →
   Moirae constrained host →
   Integration real proof.

## Acceptance criteria

The task is complete when:

- Slice 02 is explicitly and unambiguously active;
- activation is traceable to this user authorization;
- the exact starting lock/checkpoints are recorded;
- scope and acceptance criteria remain unchanged;
- no product implementation has occurred;
- no Runtime Contracts change has occurred;
- no lock/matrix/snapshot completion or sealing claim has advanced;
- the provisional Stage-A/Moirae status remains accurately disclosed;
- all coordination validators pass.

## Stop conditions

Do not:

- implement the Ananke adapter;
- modify any component repository;
- begin Horae or Moirae implementation;
- advance repository checkpoints;
- advance `fates-lock.json`;
- mark Slice 02 implemented/completed;
- seal Stage A or Slice 02;
- alter Runtime Contracts;
- broaden the approved action or capability set.

## Completion record

Record:

- activation decision and timestamp;
- exact baseline/checkpoints;
- files changed;
- validation performed;
- remaining known limitations;
- first authorized implementation task.

Do not begin that implementation task.