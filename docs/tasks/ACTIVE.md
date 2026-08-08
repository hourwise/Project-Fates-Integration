# Active Task — Slice 02 Ananke Bounded Fixture Adapter

Status: ready for implementation.

## Objective

Implement the Ananke-owned portion of FATES-SLICE-002:

`fates.slice02.inspect-fixed-fixture.v1`

This is the first product-code implementation step authorized by the active
Slice 02 sequence.

Implement only the bounded Ananke adapter and its owner-local tests/evidence.

Do not implement Horae, Moirae Code, or cross-runtime Integration behaviour.

## Required context

Use `../INDEX.md` to locate the authoritative Slice 02 material.

Read only what is required from:

- the Slice 02 activation decision;
- the frozen evidence contract;
- the acceptance-evidence matrix;
- the approved runtime-boundary design;
- the Ananke owner approval;
- the Ananke-owned design/ADR for the bounded read;
- the exact activated Stage-A lock/checkpoint.

Before modifying Ananke, read the Ananke repository-local `AGENTS.md` if present
and inspect the existing governed-action runtime and registration patterns.

Do not treat later component branch state as integration authority; the Slice
starts from the exact activated baseline.

## Preconditions

Before implementation, verify:

1. FATES-SLICE-002 remains active.
2. The evidence freeze exists and still matches the activated baseline.
3. The approved action remains only
   `fates.slice02.inspect-fixed-fixture.v1`.
4. Ananke is the sole authority and sole physical fixture reader.
5. Runtime Contracts require no change.
6. No later Slice 02 implementation checkpoint has already begun.

If any precondition fails, record the discrepancy and stop.

## Work

Implement the smallest Ananke-owned adapter required by the approved design.

The implementation must:

1. Register only the approved Slice 02 action.
2. Accept only the approved bounded request shape.
3. Preserve the existing Ananke governance chokepoint.
4. Bind and validate the request according to the approved Slice 02 design.
5. Deny before executor/fixture invocation when governance validation fails.
6. Permit at most one physical fixture read for an allowed request.
7. Verify the fixture digest after the read.
8. Return the approved typed success/failure/denial result shape.
9. Preserve required correlation and Ananke-owned audit evidence.
10. Produce evidence sufficient to distinguish:
    - successful permitted read;
    - policy/governance denial with zero physical reads;
    - invalid/mutated request;
    - fixture/digest mismatch;
    - malformed or unsupported action/request;
    - other Ananke-owned negative cases required by the frozen evidence matrix.
11. Fail closed.
12. Perform no retry.

Reuse existing Ananke action registration, governance, policy, audit, and
result mechanisms rather than introducing a parallel execution path.

## Security boundaries

Do not introduce:

- a general filesystem action;
- caller-supplied filesystem paths, URIs, or commands;
- network/provider/browser/shell capability;
- direct Moirae or Horae-specific authority logic inside Ananke;
- retry or persistence;
- memory dependencies;
- credential handling;
- sibling-repository source imports;
- bypasses around the governed execution chokepoint.

The fixed fixture is an implementation detail of this bounded Slice action,
not a general-purpose read primitive.

## Tests and evidence

Add owner-local tests sufficient to prove the Ananke-owned obligations in the
frozen evidence contract.

Tests must include both positive and negative paths and must verify physical
read count where required.

Mocks/unit tests may prove Ananke-local behaviour.

Do not claim they prove the future real Moirae → Horae → Ananke process route.

Run all relevant Ananke formatting, type/lint/static checks and tests.

Run the Integration validators necessary to confirm that the coordination
baseline remains valid, without advancing the lock.

## Acceptance criteria

The task is complete when:

- the exact approved action is registered and functional inside Ananke;
- execution remains behind Ananke's governed-action chokepoint;
- denied requests perform zero physical fixture reads;
- successful requests perform no more than one physical fixture read;
- fixture digest verification is enforced;
- malformed, unauthorized and mismatched requests fail closed;
- required correlation/audit/result evidence is produced;
- owner-local positive and negative tests pass;
- existing Ananke tests remain green;
- frozen evidence requirements have not been weakened;
- Runtime Contracts are unchanged;
- no Horae or Moirae Code product implementation has occurred;
- `fates-lock.json`, compatibility state and sealing remain unchanged.

## Completion record

Record:

- Ananke files changed;
- action/adapter implementation summary;
- owner-local evidence produced;
- tests/checks run;
- positive and negative cases demonstrated;
- any deviations or unresolved questions;
- exact resulting Ananke commit/checkpoint candidate;
- whether the Ananke step is ready for review/checkpoint/handoff.

Do not create the Horae implementation.

Do not advance the Integration lock or begin the next implementation step.