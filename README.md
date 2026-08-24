# Project Fates Integration

A lightweight control repository for the Fates ecosystem. It records exact compatible
checkpoints, vertical integration slices, handoff packets, acceptance evidence, and
anti-drift rules.

**This repository is not a runtime and contains no copied Fate source code.**

> **No peer main branch is authoritative. Only the exact checkpoints in
> `fates-lock.json` are authoritative for integration.**

## Current Compatibility Set

**fates-slice-003a-r1-2026-08-11** — sealed FATES-SLICE-003A-R1 baseline.

The authoritative Integration seal commit is
`1ed2a5c45607585fa17d72ceed1be91b5f09881f`, tagged
`fates-slice-003a-r1-v0.1.0-protocol-1.4.0`. The active-slice slot is idle
(`activeSliceId: null`) and `nextRecommendedSlice` is `FATES-SLICE-004`.

**FATES-SLICE-003A-R1 is CLOSED / SEALED.** Its bounded live-verification
limitations, evidence hashes, component checkpoints, and credential disposition
are authoritative in the sealed records. Historical Slice 001/002 and R1
evidence are not rewritten by later design work.

FATES-SLICE-003B remains PAUSED. Governed execution is not generally available:
the proposed Slice 004 design is documentation-only and recommends a narrower
004A durable governed-effect lifecycle before any 004B host-mediated effect.
See [`docs/design/FATES-SLICE-004-design-gate.md`](docs/design/FATES-SLICE-004-design-gate.md)
and [`slices/004-governed-execution/slice.json`](slices/004-governed-execution/slice.json).

## Key Files

### `fates-lock.json`

The single authoritative record of exact compatible checkpoints across all Fate
repositories. Contains:

- Schema version and compatibility set identifier
- Protocol version (current, minimum, maximum)
- Exact repository URLs, tags, commits, and checkpoint states
- Adrasteia package, artifact URL, and SHA-256
- Snapshot path and timestamp
- Known limits and notes

### `compatibility-matrix.json`

Records completed and planned vertical integration slices with their implementation
status, seal status, integration level, repository roles, and explicit limits.

### `active-slice.json`

Tracks the currently active (or idle) vertical integration slice.

### `compatibility-sets/`

Immutable historical snapshots of each compatibility set. The current lock must
agree with its referenced snapshot.

## Vertical Slice Workflow

1. Define one vertical slice
2. Decide whether Adrasteia changes
3. Implement the owning runtime
4. Create a tested repository checkpoint
5. Produce a handoff packet
6. Update the consumer
7. Run consumer tests
8. Run integration tests
9. Update the lock
10. Seal the slice

Not every Fate needs a commit for every slice.

## Checkpoint Levels

| Level | Requirements |
|-------|-------------|
| Local development commit | Work in progress, may be dirty |
| Repository checkpoint | Validation, clean worktree, pushed commit, green CI, annotated tag, handoff packet |
| Integration checkpoint | Involved repository checkpoints, consumer tests, integration validation, lock update, matrix update |

A pushed but untagged commit is a provisional reference, not a sealed repository checkpoint.

## Ownership

- **Adrasteia** owns portable cross-runtime representation and structural validation.
  It does not own every project-specific data shape.
- **Ananke** owns action authority, policy, approvals, governed execution decisions,
  action outcomes, and authoritative action audit.
- **Mnemosyne** owns memory, provenance, reliability, conflicts, qualified context,
  and authoritative memory audit. It does not own all persistent state or all audit trails.
- **Horae** owns discovery, composition, capability reduction, orchestration state,
  freshness, and degradation coordination.
- **Moirae Code** is the governed host and user-facing integration surface. It does not
  make currently ungoverned terminal, Git, debugger, task, extension, or direct-provider
  paths governed.
- **Project Fates Integration** records compatibility and evidence only.

## Architectural Laws

See `docs/architecture-laws.md` for the complete set of architectural laws governing
the Fates ecosystem.

## Commands

```shell
npm test                 # Run all tests
npm run validate:json    # Validate JSON against schemas (Ajv 2020)
npm run verify:lock      # Verify fates-lock.json
npm run verify:matrix    # Verify compatibility-matrix.json
npm run verify:slices    # Verify slice records
npm run verify:boundaries # Verify hard boundaries
npm run validate         # Run all validation steps including tests

npm run fates:plan       # Discover standalone/integration install and validation paths
npm run fates:report     # Print a safe checkout/compatibility report
npm run fates:install -- mnemosyne --yes
npm run fates:install -- all --yes
```

## Constraints

- No runtime code
- No copied peer source
- No Git submodules
- No local file dependencies
- Zero runtime dependencies; dev dependencies only for control integrity
- British English, UTF-8, LF, final newline

See [docs/operator-guide.md](docs/operator-guide.md) for one-click PowerShell/POSIX
installation, dry-run behaviour, and the report fields available to outside testers.
