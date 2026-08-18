# Letter-Qualified Sub-slice Sealing Contract

**Decision status:** Accepted as the generic Integration governance contract.

**Scope:** This decision applies to every letter-qualified sub-slice matching
`FATES-SLICE-NNNA`, including future siblings such as `FATES-SLICE-004B`. It
does not seal, close, or activate any particular sub-slice. The current
`FATES-SLICE-004A` record remains provisional until a separate owner-authorized
closure task applies this contract.

## Decision

Letter-qualified sub-slices are bounded implementation or acceptance units
owned by numeric parent slices. They are not compatibility-matrix rows and do
not advance `fates-lock.json` or the active compatibility snapshot by
themselves.

A sub-slice has two independent axes:

- `implementationStatus` is `planned`, `active`, `implemented`, `completed`,
  or `superseded`;
- `sealStatus` is `provisional`, `sealed`, or `superseded`.

The terminal sealed state requires `implementationStatus: completed`,
`sealStatus: sealed`, and `activation.state: closed`. A sealed sub-slice must
reference the exact immutable record
`docs/evidence/FATES-SLICE-NNNA-seal.json` through its `sealRecord` field.
Returning a sealed record to provisional is not allowed without a separate
governance decision.

## Immutable seal record

The dedicated seal record uses
[`schemas/subslice-seal.schema.json`](../../schemas/subslice-seal.schema.json).
It records:

- sub-slice and numeric-parent identity;
- seal timestamp and the accepted terminal classification;
- the successful acceptance attempt, its JSON/journal paths, and both exact
  SHA-256 values;
- optional historical attempt references, including failed attempts;
- final Integration and component checkpoint provenance;
- successful full validation and the successful CI run/commit;
- the deterministic annotated tag name, release version, and protocol version.

The successful acceptance basis must be `PASS_BOUNDED` and must match the
referenced artifact bytes. Historical failures remain audit history and cannot
satisfy the successful basis by themselves. Acceptance artifacts referenced by
a seal become tracked immutable files in the same future seal transaction.
The current Attempt 005 and Attempt 006 artifacts are not tracked by this
contract-definition task.

## Parent and compatibility ownership

For `FATES-SLICE-004A`, the parent remains `FATES-SLICE-004`. Sealing the child
does not seal or complete the parent, and it does not add a child row to
`compatibility-matrix.json`. The parent may remain open/provisional while one
or more children are independently sealed.

No lock or compatibility-snapshot update is required for a sub-slice-only
seal. The seal record carries the exact Integration and component provenance;
the numeric parent remains the compatibility-control owner.

## Active-state behavior

When the currently active child is sealed, the generic closure transaction
keeps the numeric parent active and clears only `activeSubsliceId` to `null`.
It does not select or activate another child. A later child, including 004B,
requires a separate activation authorization and a separate active-state
transaction.

## Tag and version behavior

The Integration tag is annotated and derived from the canonical sub-slice ID:

```text
fates-slice-<lowercase numeric-plus-letter>-v<releaseVersion>-protocol-<protocol>
```

For example, a first 004A seal using release version `0.1.0` and protocol
`1.4.0` would use
`fates-slice-004a-v0.1.0-protocol-1.4.0`. The tag targets the final pushed
Integration source commit that contains the unchanged terminal sub-slice state
and all required seal artifacts, and whose own normal CI has passed. If a later
corrective descendant is required after the commit that first records the
terminal state, the corrective descendant is the tag target when it is the
final validated source state; the earlier state-introduction commit remains
historical provenance and is not retagged. The tag must point to a stable
source commit on the Integration branch, not to a synthetic pull-request merge
ref. A successful CI result for a synthetic merge ref does not by itself
qualify that merge ref or a different source commit as the tag target. Existing
historical tags retain their recorded targets; this rule governs new sub-slice
seal tags only.

The tag is created only after the selected source commit has passed normal CI.
Defining this convention does not create the tag. No npm/package version is
changed; the release version is metadata for the Integration seal tag, with
`0.1.0` as the initial bounded-slice value unless a later decision records
another version.

## Backward compatibility and safety

Existing numeric slice records, lock files, compatibility rows, historical
snapshots, and existing tags retain their current semantics. Existing
provisional sub-slices remain valid without final evidence. The validator
rejects malformed seal records, mismatched parent or attempt identity, hash
mismatches, failed-only acceptance bases, matrix duplication, and an active
sealed child. This contract introduces no runtime behavior and does not
authorize 004A closure or 004B activation.
