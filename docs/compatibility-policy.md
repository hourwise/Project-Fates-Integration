# Compatibility Policy

## Purpose

The compatibility policy defines how the Fates ecosystem determines whether
a set of repository checkpoints is mutually compatible.

## Authority

`fates-lock.json` is the single authoritative record of compatibility.
No other source — branch heads, latest releases, documentation claims, or
verbal assurances — overrides the lock.

## Compatibility Sets

A compatibility set is a named collection of exact repository checkpoints
that have been validated to work together. The current set is
`fates-stage-a-2026-07`.

## Adding a New Slice

1. The slice must be defined with explicit scope, owners, and acceptance criteria.
2. Each involved Fate must produce a repository checkpoint.
3. Consumer tests must pass for all downstream Fates.
4. Integration tests must pass.
5. The lock and matrix are updated.
6. The slice is sealed.

## Breaking Changes

If a slice introduces breaking changes to portable contracts:

- Adrasteia must publish a new major or minor contract version.
- All consumer Fates must be updated to the new version.
- The protocol version in `fates-lock.json` must be updated.
- Migration notes must be included in every affected handoff packet.

## Non-Breaking Changes

If a slice does not change portable contracts:

- Not every Fate needs a commit.
- Unchanged Fates remain at their existing checkpoints.
- The protocol version does not change.

## Anti-Drift

The lock must never be updated to a checkpoint that has not passed all required
consumer and integration checks. If a Fate repository moves forward independently,
the lock must not follow until the full integration cycle is repeated.
