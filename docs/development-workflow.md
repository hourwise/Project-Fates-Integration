# Development Workflow

Each vertical integration slice follows this sequence.

## Slice Lifecycle

1. **Define one vertical slice**
   Create a new slice directory under `slices/` with a `slice.json` and `README.md`.
   Define the objective, owners, repositories involved, and acceptance criteria.

2. **Decide whether Adrasteia changes**
   If the slice requires new or changed portable contracts, Adrasteia must be updated
   first. If not, the slice may proceed with the current contract version.

3. **Activate the slice explicitly**
   Before implementation begins, record a separate activation decision that:
   - names the approved scope, owners, and acceptance criteria;
   - records the exact starting checkpoints and baseline compatibility set from
     `fates-lock.json`;
   - records explicit user authorization to begin implementation; and
   - changes the active-slice state only as part of that decision.

   Planning completion, owner approval, readiness-checklist completion, or an
   implementation-authorization-to-prepare record does not activate a slice.
   The activation decision is the point at which the already-approved bounded
   implementation sequence becomes authorized. It does not advance a
   checkpoint, compatibility lock, matrix, snapshot, or seal status, and it
   does not waive any later evidence requirement.

4. **Implement the owning runtime**
   Each Fate implements its role according to the architectural laws. The owning Fate
   for the capability delivers the primary implementation.

5. **Create a tested repository checkpoint**
   For each Fate that changes:
   - All tests pass
   - Worktree is clean
   - Commit is pushed
   - CI is green
   - Annotated tag is created
   - Handoff packet is produced

6. **Produce a handoff packet**
   Create a handoff JSON file in the slice's `handoffs/` directory following the
   handoff schema. Include exact starting and ending commits, surfaces changed,
   and known constraints.

7. **Update the consumer**
   Downstream Fates adopt the new checkpoint and verify their own test suites pass.

8. **Run consumer tests**
   Each consumer Fate runs its test suite against the updated dependencies.
   All consumer tests must pass before the slice proceeds.

9. **Run integration tests**
   Cross-repository integration tests validate that the Fates work together
   correctly at the new checkpoints.

10. **Update the lock**
   Once all checks pass, update `fates-lock.json` with the new exact checkpoints.
   Update `compatibility-matrix.json` to reflect the completed slice.

11. **Seal the slice**
    Mark the slice as `implementationStatus: completed` and `sealStatus: sealed`
    (if all checkpoints are tagged). Record final acceptance evidence and known
    limitations. Update `active-slice.json` to idle.

## Lock Advancement Transaction (Detailed)

1. Separate explicit activation decision recorded with approved scope,
   acceptance criteria, exact starting lock, and user authorization; this
   authorizes only the bounded implementation sequence
2. Starting lock copied and committed as the reference baseline
3. Owner repository checkpoint produced (tagged, clean, green CI)
4. Handoff packet committed to the slice directory
5. Consumer checkpoints produced for downstream Fates
6. Consumer tests pass
7. Integration tests pass
8. New compatibility-set snapshot created and committed
9. `fates-lock.json` updated to reference the new snapshot
10. Matrix and slice evidence updated
11. Full validation passes
12. Integration checkpoint committed and tagged

Activation is the implementation-authorization boundary. Owner checkpoints,
handoff packets, consumer tests, real integration proof, and acceptance
evidence are produced after activation and remain required before lock or
matrix advancement and before sealing. They must not be treated as
preconditions for the activation decision itself.

**Not every Fate needs a commit for every slice.** A Fate that is not involved
in a slice's capability remains at its existing checkpoint.

No peer `main` branch is authoritative at any point. Only the exact checkpoints
in `fates-lock.json` are authoritative for integration.

## Letter-qualified sub-slice closure

Letter-qualified sub-slices such as `FATES-SLICE-004A` are owned by their
numeric parent and are not compatibility-matrix peers. Their generic closure
contract is defined in
[`docs/decisions/FATES-SLICE-004-letter-qualified-subslice-sealing-decision.md`](decisions/FATES-SLICE-004-letter-qualified-subslice-sealing-decision.md).

For a sub-slice-only closure:

1. Confirm the child has a successful `PASS_BOUNDED` acceptance basis and
   immutable JSON/journal hashes.
2. Track the referenced acceptance artifacts and create the immutable
   `docs/evidence/FATES-SLICE-NNNA-seal.json` record.
3. Set the child to `implementationStatus: completed`, `sealStatus: sealed`,
   and `activation.state: closed`.
4. Keep the numeric parent open unless it independently satisfies its own
   completion contract; do not add a sub-slice row to the compatibility matrix.
5. Keep the numeric parent active with `activeSubsliceId: null` when closing
   the currently active child. Do not activate a later child.
6. Run the normal full validation and CI, then create the deterministic
   annotated sub-slice tag only after CI succeeds.

This is a separate closure transaction from sub-slice activation. It does not
modify runtime behavior, the lock, or the compatibility snapshot.
