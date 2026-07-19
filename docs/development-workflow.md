# Development Workflow

Each vertical integration slice follows this sequence.

## 1. Define One Vertical Slice

Create a new slice directory under `slices/` with a `slice.json` and `README.md`.
Define the objective, owners, repositories involved, and acceptance criteria.

## 2. Decide Whether Adrasteia Changes

If the slice requires new or changed portable contracts, Adrasteia must be updated
first. If not, the slice may proceed with the current contract version.

## 3. Implement the Owning Runtime

Each Fate implements its role in the slice according to the architectural laws.
The owning Fate for the capability delivers the primary implementation.

## 4. Create a Tested Repository Checkpoint

For each Fate that changes:

- All tests pass
- Worktree is clean
- Commit is pushed
- CI is green
- Annotated tag is created
- Handoff packet is produced

## 5. Produce a Handoff Packet

Create a handoff JSON file in the slice's `handoffs/` directory following the
handoff schema. Include exact starting and ending commits, surfaces changed,
and known constraints.

## 6. Update the Consumer

Downstream Fates adopt the new checkpoint and verify their own test suites pass.

## 7. Run Consumer Tests

Each consumer Fate runs its test suite against the updated dependencies.
All consumer tests must pass before the slice proceeds.

## 8. Run Integration Tests

Cross-repository integration tests validate that the Fates work together
correctly at the new checkpoints.

## 9. Update the Lock

Once all checks pass, update `fates-lock.json` with the new exact checkpoints.
Update `compatibility-matrix.json` to reflect the completed slice.

## 10. Seal the Slice

Mark the slice as `completed` in its `slice.json`. Record final acceptance
evidence and known limitations. Update `active-slice.json` to idle.

---

**Not every Fate needs a commit for every slice.** A Fate that is not involved
in a slice's capability remains at its existing checkpoint.
