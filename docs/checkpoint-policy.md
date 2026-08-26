# Checkpoint Policy

## Definitions

### Local Development Commit

A commit on a developer's local branch. May have a dirty worktree, failing tests,
or incomplete work. Not suitable for integration.

### Repository Checkpoint

A stable point in a single Fate repository suitable for cross-repository reference.

Requirements for a **sealed** repository checkpoint:

- All tests pass
- Worktree is clean (no uncommitted changes)
- Commit is pushed to the remote repository
- CI pipeline is green
- Annotated tag is present
- Handoff packet is produced and reviewed

A **pushed but untagged** commit is a provisional reference, not a sealed repository
checkpoint. It may be used as a starting reference for a slice but cannot seal an
integration checkpoint.

### Integration Checkpoint

A point where all involved Fates are mutually compatible at specific repository
checkpoints.

Requirements for a **sealed** integration checkpoint:

- All involved Fate repositories have sealed repository checkpoints
- Consumer tests pass for all downstream Fates
- Integration validation passes
- `fates-lock.json` is updated with exact checkpoints
- `compatibility-matrix.json` is updated to reflect completed slice status
- Historical compatibility-set snapshot is created and committed

An integration checkpoint with one or more provisional repository checkpoints is
**provisional** — it records compatibility evidence but cannot be considered sealed.

## Checkpoint States

| State | Meaning |
|-------|---------|
| `sealed_tagged` | Repository checkpoint with an annotated tag. Ready to seal an integration checkpoint. |
| `pushed_untagged` | Commit is pushed but no tag exists. Provisional reference only. |
| `planned` | Checkpoint is planned but not yet created. |
| `superseded` | Previously sealed checkpoint that has been replaced by a newer one. |

## Seal Status Model

This repository uses a two-axis status model for compatibility sets and slices:

- **implementationStatus**: `planned` | `active` | `implemented` | `completed` | `superseded`
  — What work has been done.
- **sealStatus**: `provisional` | `sealed` | `superseded`
  — Whether every required checkpoint has a verified annotated tag.
- **integrationLevel**: `inspection_only` | `partial_runtime` | `runtime_validated`
  — The depth of integration validation achieved.

A slice may be `implementationStatus: completed` while `sealStatus: provisional` if
one or more repository checkpoints lack verified annotated tags.

## Current State

- Adrasteia, Ananke, Mnemosyne, and Horae are `sealed_tagged`.
- Moirae Code is `pushed_untagged`. No checkpoint tag has been confirmed for
  Moirae Code in the current compatibility set.
- Stage-A integration checkpoint is `sealStatus: provisional`.

## Lock Advancement Transaction

When a new vertical slice is completed:

1. A separate explicit activation decision records the approved scope,
   acceptance criteria, exact starting lock, and user authorization; this is
   the point at which the bounded implementation sequence becomes authorized
2. Starting lock state is copied as the reference baseline
3. Owner repository checkpoint is produced (tag, clean worktree, green CI)
4. Handoff packet is committed to the slice's handoffs directory
5. Consumer checkpoints are produced for downstream Fates
6. Consumer tests pass against the new checkpoints
7. Integration tests pass
8. New compatibility-set snapshot is created from the current lock state
9. `fates-lock.json` is switched to reference the new snapshot
10. Matrix and slice evidence are updated
11. Full validation passes
12. Integration checkpoint is committed and tagged

Implementation checkpoints, handoff packets, consumer tests, integration proof,
and acceptance evidence are post-activation requirements. They remain required
before lock/matrix advancement and sealing; they are not prerequisites to the
activation decision.

Not every Fate needs a new checkpoint when not involved in the slice.

No peer `main` branch becomes authoritative at any point.

## Letter-Qualified Sub-slice Checkpoints

Letter-qualified sub-slices use the generic closure contract in
[`docs/decisions/FATES-SLICE-004-letter-qualified-subslice-sealing-decision.md`](decisions/FATES-SLICE-004-letter-qualified-subslice-sealing-decision.md).
They remain owned by their numeric parent and do not become rows in
`compatibility-matrix.json` or independent entries in `fates-lock.json`.

A sealed sub-slice is `implementationStatus: completed`,
`sealStatus: sealed`, and `activation.state: closed`, with a referenced
immutable `docs/evidence/FATES-SLICE-NNNA-seal.json` record. The record binds
the successful `PASS_BOUNDED` acceptance artifact pair, exact SHA-256 values,
final checkpoint provenance, full validation, successful CI, and the
deterministically derived annotated tag. Referenced acceptance files become
tracked at the actual seal transaction. A failed historical attempt may be
retained but cannot be the successful acceptance basis.

Closing the active child clears `activeSubsliceId` while retaining the numeric
parent as the active/open owner. It never activates the next child. A separate
activation decision is required for every later letter-qualified sub-slice.

## Rollback

To roll back to a prior compatibility set, copy the corresponding historical
snapshot from `compatibility-sets/` over `fates-lock.json`. Rollback must be a
deliberate, reviewed action with documented rationale.
