# Compatibility Sets

Immutable historical snapshots of Fates compatibility sets.

Each file in this directory represents a sealed compatibility set at a specific
point in time. Once created, a compatibility-set snapshot must never be modified
except to correct a verified recording error.

## Current Set

`fates-slice-002-2026-08-09.json` — runtime-validated Slice 02 successor set
with a provisional global seal because the unchanged Moirae baseline remains
untagged. The prior `fates-stage-a-2026-07.json` snapshot is preserved
immutably.

## Rollback

To roll back to a prior compatibility set, restore the corresponding snapshot
as the active lock. Rollback must be a deliberate, reviewed action, not an
automated operation.

## Lock Advancement

When a new vertical slice is completed:

1. A new compatibility-set snapshot is created from the current lock state.
2. The snapshot is validated and committed.
3. `fates-lock.json` is updated to reference the new snapshot.
4. The previous snapshot is preserved immutably for historical reference.

No historical snapshot may be overwritten.
