# Development Workflow

Each vertical integration slice follows this sequence.

## Slice Lifecycle

1. **Define one vertical slice**
   Create a new slice directory under `slices/` with a `slice.json` and `README.md`.
   Define the objective, owners, repositories involved, and acceptance criteria.

2. **Decide whether Adrasteia changes**
   If the slice requires new or changed portable contracts, Adrasteia must be updated
   first. If not, the slice may proceed with the current contract version.

3. **Implement the owning runtime**
   Each Fate implements its role according to the architectural laws. The owning Fate
   for the capability delivers the primary implementation.

4. **Create a tested repository checkpoint**
   For each Fate that changes:
   - All tests pass
   - Worktree is clean
   - Commit is pushed
   - CI is green
   - Annotated tag is created
   - Handoff packet is produced

5. **Produce a handoff packet**
   Create a handoff JSON file in the slice's `handoffs/` directory following the
   handoff schema. Include exact starting and ending commits, surfaces changed,
   and known constraints.

6. **Update the consumer**
   Downstream Fates adopt the new checkpoint and verify their own test suites pass.

7. **Run consumer tests**
   Each consumer Fate runs its test suite against the updated dependencies.
   All consumer tests must pass before the slice proceeds.

8. **Run integration tests**
   Cross-repository integration tests validate that the Fates work together
   correctly at the new checkpoints.

9. **Update the lock**
   Once all checks pass, update `fates-lock.json` with the new exact checkpoints.
   Update `compatibility-matrix.json` to reflect the completed slice.

10. **Seal the slice**
    Mark the slice as `implementationStatus: completed` and `sealStatus: sealed`
    (if all checkpoints are tagged). Record final acceptance evidence and known
    limitations. Update `active-slice.json` to idle.

## Lock Advancement Transaction (Detailed)

1. Active slice approved with explicit scope and acceptance criteria
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

**Not every Fate needs a commit for every slice.** A Fate that is not involved
in a slice's capability remains at its existing checkpoint.

No peer `main` branch is authoritative at any point. Only the exact checkpoints
in `fates-lock.json` are authoritative for integration.
