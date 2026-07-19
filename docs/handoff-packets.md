# Handoff Packets

A handoff packet records the exact state of a Fate repository at the completion
of its work within a vertical integration slice.

## Purpose

Handoff packets provide:

- Traceability from slice to exact commits
- Evidence of what changed and what did not
- Known constraints and unavailable surfaces
- Migration notes for consumers
- Test results and CI status

## Schema

Handoff packets follow `schemas/handoff.schema.json`. Required fields:

- `sliceId` — the vertical slice this handoff belongs to
- `repository` — the Fate repository name
- `startingCommit` — the commit before work began (40-character hex)
- `pushStatus` — `pushed` or `not_pushed`

## Location

Handoff packets live in `slices/<slice-dir>/handoffs/`. Each repository involved
in a slice should produce one handoff packet.

## Example

See `slices/_template/handoffs/handoff.example.json` for the expected format.
Note that the example file is template data, not real evidence.

## Evidence Rules

- All paths in handoff packets must be repository-relative
- No absolute local paths (Windows or Unix)
- No references to local worktree paths outside the repository
- Commit IDs must be exact 40-character hexadecimal strings
