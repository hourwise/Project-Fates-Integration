# ACTIVE — FATES-SLICE-002 Ananke Producer Handoff

## Objective

Prepare the producer-owned Ananke checkpoint evidence and the bounded
Ananke -> Horae handoff for FATES-SLICE-002.

This task packages and verifies the already-implemented Ananke producer.
It does NOT implement Horae, Moirae, or the cross-runtime route.

## Authoritative producer

Repository:
`hourwise/Project-Ananke`

Branch:
`codex/slice-002-bounded-read-design`

Exact implementation commit:
`552686fe6e01e2c0bf41ccb52591076bfa68bc2c`

Commit message:
`feat: implement Slice 02 bounded fixture adapter`

Do not substitute a later branch head or another Ananke commit.

## Required context

Read only what is necessary from:

- root `AGENTS.md`
- `docs/INDEX.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/SYSTEM_MAP.md`
- `docs/INTEGRATION.md`
- `docs/checkpoint-policy.md`
- `slices/002-governed-action-handoff/README.md`
- `slices/002-governed-action-handoff/slice.json`
- `docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md`
- `docs/decisions/FATES-SLICE-002-evidence-freeze.json`
- `docs/decisions/FATES-SLICE-002-activation-decision.json`

Inspect the Ananke repository at the exact commit above and read its
repo-local `AGENTS.md` if present.

Do not inspect unrelated repositories or projects.

## Starting facts

The Ananke implementation candidate is pushed and its worktree was clean.

Recorded local validation:

- Slice 02 tests: 8/8 passed
- Full serialized Ananke suite: 16 files / 129 tests passed
- Build: passed
- ESLint: passed
- changed-file Prettier: passed
- Integration validators: 55/55 passed

Runtime Contracts, `fates-lock.json`, and the Stage-A compatibility snapshot
were unchanged.

GitHub exposed no CI/status checks or workflow runs for the producer commit
when the candidate was recorded.

Therefore do NOT claim a sealed Ananke repository checkpoint unless the
repository's checkpoint policy is actually satisfied.

## Work

### 1. Verify producer identity

Verify that the exact pushed Ananke commit exists and is the intended
Slice 02 implementation.

Confirm its ancestry from the activated Stage-A Ananke baseline.

Record:

- repository
- branch
- exact commit
- parent/baseline relationship
- worktree/checkpoint state where independently verifiable
- remote availability

### 2. Freeze producer-facing action identity

From the implemented Ananke source, record the exact producer contract for:

`fates.slice02.inspect-fixed-fixture.v1`

Include:

- exact accepted request fields
- fixed `fixtureId`
- expected digest format
- policy/risk treatment
- approval behaviour
- retry behaviour
- authority/binding requirements
- origin/schema receipt requirements
- executor/read bounds
- typed success/failure/denial behaviour

Do not broaden the contract.

### 3. Record fixture identity

Record the exact Ananke-owned fixture:

`packages/runtime-core/fixtures/fates-slice-002/fates.slice02.fixed-fixture.v1.txt`

Verify and record:

- byte length
- SHA-256
- owning producer
- repository commit
- statement that Integration/Horae/Moirae are not authorized fixture readers

The handoff must identify the artifact by digest rather than by trusting an
unverified mutable path alone.

### 4. Record producer evidence guarantees

Using the implementation and owner-local tests, record what Ananke can
currently prove locally, including as applicable:

- allowed request -> exactly one physical read
- denial -> zero physical reads
- malformed/invalid authority -> zero physical reads
- fixture/digest mismatch -> one read then typed non-success
- no retry
- canonical request/binding validation
- correlation/request/decision/outcome/audit identifiers
- audit failure cannot be reported as successful governed read
- audit metadata sanitization remains fail-safe for sensitive material

Do not claim real three-process evidence from owner-local tests.

### 5. Record runtime identity/readiness surface

Capture the Ananke runtime identity, compatibility and readiness information
that Horae is allowed to consume for this slice.

Record exact fields/identifiers and their source.

Do not invent a new Runtime Contracts type or protocol change.

### 6. Produce the Ananke -> Horae handoff packet

Create the Slice 02 handoff directory if required under:

`slices/002-governed-action-handoff/handoffs/`

Prefer both:

- a machine-readable producer handoff record; and
- a concise human-readable companion/readme

Use existing Integration conventions if they exist.

The packet must pin the exact Ananke producer commit and contain enough
information for Horae to consume the producer without reading mutable branch
state as authority.

At minimum include:

- slice ID
- producer and consumer
- exact Ananke commit
- checkpoint state
- action identity
- request contract/schema identity
- fixture identity and SHA-256
- policy/authority expectations
- runtime identity/readiness expectations
- correlation/evidence fields Horae must preserve
- owner-local test evidence
- known limitations
- excluded capabilities
- no-bypass assumptions
- CI/tag/seal status
- references to frozen acceptance evidence

### 7. Evaluate checkpoint status without overstating it

Apply `docs/checkpoint-policy.md` literally.

If remote CI is absent or not green, record that fact.

Do NOT:

- invent CI evidence;
- mark Ananke `sealed_tagged`;
- create or claim an annotated checkpoint tag merely to bypass missing CI;
- advance `fates-lock.json`;
- advance compatibility matrix/snapshot;
- mark Slice 02 completed.

If the only remaining blockers to a sealed producer checkpoint are explicit,
record them precisely.

### 8. Validate

Run the Integration validation relevant to changed Integration artifacts.

Validate all created JSON.

If verifying Ananke locally is necessary, do so without modifying its product
source.

Do not rerun or modify unrelated Fate implementations.

## Acceptance criteria

This task is complete when:

1. The exact Ananke producer commit `552686fe6e01e2c0bf41ccb52591076bfa68bc2c`
   is pinned in the handoff.
2. The exact bounded action contract is recorded without expansion.
3. The 43-byte fixture identity and independently computed SHA-256 are recorded.
4. Ananke's one-read/zero-read and typed failure guarantees are accurately
   separated from future real cross-runtime evidence.
5. Runtime identity/readiness information required by Horae is recorded.
6. A durable Ananke -> Horae handoff packet exists under the Slice 02 handoff
   directory.
7. Known bypasses, exclusions, local-only evidence and CI/tag limitations are
   explicit.
8. No Horae/Moirae product implementation has begun.
9. Runtime Contracts remains unchanged.
10. `fates-lock.json`, compatibility matrix, compatibility snapshot and Slice
    completion/seal status remain unchanged.
11. Integration validation passes.
12. `docs/tasks/ACTIVE.md` records the artifacts produced, validation results,
    and the exact next permitted step.

## Stop conditions

Stop and report instead of guessing if:

- the exact Ananke commit cannot be verified;
- its ancestry conflicts with the activated baseline;
- the implemented action differs materially from the frozen Slice 02 contract;
- fixture identity/digest cannot be independently verified;
- satisfying the handoff would require changing Runtime Contracts;
- a sealed-checkpoint requirement is missing;
- the handoff would require beginning Horae implementation.

## Completion status

Do not mark the Ananke checkpoint sealed unless every checkpoint-policy
requirement is actually satisfied.

The expected outcome of this task may legitimately be:

`handoff prepared; producer checkpoint remains provisional pending <explicit blocker>`

That is acceptable and preferable to overstating evidence.