# Active Task — Slice 02 Integration Evidence Freeze

Status: completed — Integration evidence baseline frozen; Ananke step not started.

## Objective

Freeze the pre-implementation Integration evidence baseline for
FATES-SLICE-002 before any component implementation begins.

This task establishes the evidence contract against which the subsequent
Ananke, Horae, Moirae Code and cross-runtime implementation work will be
judged.

It does not implement product code.

## Required context

Use `../INDEX.md` to locate only the authoritative material relevant to:

- the Slice 02 activation decision;
- the exact `fates-stage-a-2026-07` starting baseline;
- the approved Slice 02 design and scope;
- the acceptance-evidence matrix;
- the six gates;
- positive and negative cross-runtime cases;
- producer ownership of evidence;
- bypass disclosures;
- checkpoint and handoff requirements.

Read component repositories only where necessary to verify that an evidence
requirement refers to an actual current boundary or planned owner.

## Preconditions

Before freezing evidence, verify that:

1. FATES-SLICE-002 is active.
2. Its activation decision references the exact Stage-A baseline.
3. `fates-lock.json` still matches the activated starting checkpoints.
4. No component implementation for Slice 02 has begun.
5. Runtime Contracts remain unchanged.
6. The approved scope remains only
   `fates.slice02.inspect-fixed-fixture.v1`.

If any precondition fails, record the discrepancy and stop.

## Work

1. Identify the complete evidence set required to judge Slice 02.
2. Freeze the acceptance-evidence matrix before implementation begins.
3. Ensure every required item identifies:
   - the claim being proved;
   - the producing component/owner;
   - the required evidence/artifact;
   - the relevant positive or negative case;
   - whether real process/runtime proof is required;
   - what cannot be substituted by mocks.
4. Preserve explicit evidence for the six approved gates:
   - governed route;
   - bypass evidence;
   - canonical binding;
   - pinned origin/schema;
   - readiness/freshness;
   - correlation and proof obligation.
5. Preserve required negative-path coverage, including denial and fail-closed
   behaviour.
6. Record known exclusions and bypasses so later implementation cannot
   silently broaden the Slice claim.
7. Pin the frozen evidence contract to the activated baseline and Slice 02
   activation record.
8. Update coordination documentation only where necessary to make the frozen
   contract reproducible and unambiguous.

## Acceptance criteria

The task is complete when:

- the pre-implementation evidence contract is explicitly frozen;
- evidence requirements cannot be silently changed to fit later implementation;
- every material claim has a named evidence producer;
- positive and negative cases are defined;
- real cross-process evidence requirements are distinguished from unit/mock
  evidence;
- all six gates have explicit proof obligations;
- known bypasses and exclusions remain visible;
- the frozen evidence contract references the activated Slice 02 baseline;
- no product implementation has occurred;
- no component checkpoint, lock, matrix completion or seal has advanced;
- all relevant Integration validators pass.

## Stop conditions

Do not:

- implement the Ananke adapter;
- modify Ananke, Horae, Moirae Code or Runtime Contracts product code;
- begin any later Slice 02 implementation checkpoint;
- alter the approved scope;
- weaken an evidence requirement because it appears difficult to implement;
- replace required real-process proof with mocks;
- advance `fates-lock.json`, compatibility completion state or sealing.

## Completion record

Record:

- evidence artifacts frozen;
- baseline and activation record used;
- proof obligations and owners;
- positive and negative cases;
- validation performed;
- unresolved evidence questions;
- whether the evidence baseline is ready for the Ananke implementation step.

Do not begin the Ananke implementation step.

## Completion record

Evidence artifacts frozen:

- [`docs/decisions/FATES-SLICE-002-evidence-freeze.json`](../decisions/FATES-SLICE-002-evidence-freeze.json) — normative, machine-readable evidence contract, frozen at `2026-08-08T18:20:34.521Z`.
- [`docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md`](../reviews/FATES-SLICE-002-acceptance-evidence-matrix.md) — human-readable case matrix, explicitly marked frozen and linked to the contract.
- [`docs/INDEX.md`](../INDEX.md), [`docs/INTEGRATION.md`](../INTEGRATION.md), [`docs/SOURCE_OF_TRUTH.md`](../SOURCE_OF_TRUTH.md), and the Slice 02 README now route to the frozen contract.

Baseline and activation record used: activated `FATES-SLICE-002` against
`fates-stage-a-2026-07`; the evidence contract records the exact lock and
snapshot hashes, all five starting checkpoints, activation-record hash, scope,
fixture digest, request-schema digest, and authority-document hashes.

Proof obligations and owners: all six gates are frozen with named producers,
required artifacts, covered cases, real-process requirements, and explicit
mock-substitution rules. Ananke owns authority/read/digest/audit evidence;
Horae owns admission/readiness/dispatch/relay/timing evidence; Moirae Code
owns origin/host/presentation/bypass evidence; the controlled harness owns
attestation, artifact-pinning and file-access evidence; Integration owns
cross-runtime assertions and retention.

Positive and negative cases: 17 cases are frozen — 3 positive/correlation
cases and 14 denial, malformed, drift, timeout, indeterminate, no-fallback,
no-non-Ananke-read, and bypass cases. The contract requires real three-process
proof for route, handoff, attestation, physical-read, correlation, dispatch,
and cross-runtime claims; owner-local mocks may only supplement parsing or
rendering tests.

Validation performed: activation/baseline/scope preconditions passed;
component source contained no Slice 02 implementation markers; the exact
lock/snapshot/checkpoint comparisons passed; `npm.cmd run validate` passed;
the evidence contract parsed with 6 gates and 17 cases; and the protected
lock, compatibility matrix, snapshot, checkpoints and seal claims were not
advanced.

Unresolved evidence questions: none in the frozen contract. Runtime evidence
does not yet exist and remains a post-freeze implementation requirement.

The evidence baseline is ready for the Ananke implementation step. Do not
begin that step as part of this task.
