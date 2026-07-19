# Checkpoint Policy

## Definitions

### Local Development Commit

A commit on a developer's local branch. May have a dirty worktree, failing tests,
or incomplete work. Not suitable for integration.

### Repository Checkpoint

A stable point in a single Fate repository suitable for cross-repository reference.

Requirements:

- All tests pass
- Worktree is clean (no uncommitted changes)
- Commit is pushed to the remote repository
- CI pipeline is green
- Annotated tag is present (unless the repository is in `pushed_untagged` state)
- Handoff packet is produced and reviewed

A repository checkpoint may be `sealed_tagged` (tag present, ready for integration)
or `pushed_untagged` (commit pushed but not yet tagged — e.g., Moirae Code in the
current compatibility set).

### Integration Checkpoint

A point where all involved Fates are mutually compatible at specific repository
checkpoints.

Requirements:

- All involved Fate repositories have valid repository checkpoints
- Consumer tests pass for all downstream Fates
- Integration validation passes
- `fates-lock.json` is updated with exact checkpoints
- `compatibility-matrix.json` is updated to reflect the slice status

## Checkpoint States

| State | Meaning |
|-------|---------|
| `sealed_tagged` | Repository checkpoint with an annotated tag. Ready for integration. |
| `pushed_untagged` | Commit is pushed but no tag exists. May be used as a reference point. |
| `planned` | Checkpoint is planned but not yet created. |
| `superseded` | Previously sealed checkpoint that has been replaced by a newer one. |

## Current State

- Adrasteia, Ananke, Mnemosyne, and Horae are `sealed_tagged`.
- Moirae Code is `pushed_untagged`. No checkpoint tag has been confirmed for
  Moirae Code in the current compatibility set.
