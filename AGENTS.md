# The Fates — Agent Instructions

## Scope

This project exists exclusively to develop and integrate The Fates:

- Ananke
- Mnemosyne
- Horae
- Moirae Code
- Runtime Contracts

Do not inspect, modify, or draw project state from unrelated repositories,
chats, memories, or projects unless the active task explicitly requires it.

## Start here

For substantial work:

1. Read `docs/INDEX.md`.
2. Read `docs/tasks/ACTIVE.md`.
3. Read only the system documents and component material relevant to the task.
4. Inspect the current implementation before changing it.

Do not recursively read every Fate repository or all documentation by default.

## Multi-repository rules

- Treat each Fate as a separate component with an explicit responsibility.
- Preserve component boundaries; do not duplicate another Fate's responsibility
  for convenience.
- Runtime Contracts is the authority for shared protocol/contracts where the
  existing architecture assigns it that role.
- Cross-Fate behavioural assumptions must be verified against both sides of
  the integration.
- Before modifying a component repository, read its repository-local
  `AGENTS.md` if one exists.
- Do not silently resolve disagreements between repositories or documents.
  Record the discrepancy and follow the authoritative source identified by
  the system documentation.

## Working rules

- Existing accepted ADRs and source-of-truth decisions override assumptions.
- Do not silently expand task scope.
- Do not begin another phase or component task after completing the active task.
- Prefer existing architecture and contracts over parallel mechanisms.
- Never weaken approval, provenance, audit, memory-trust, permission, secret,
  or execution boundaries merely to make integration easier.
- Do not expose credentials, API keys, private data, or secrets.
- Run relevant tests/checks in every component changed.

## Completion

Before finishing:

1. Verify the acceptance criteria in `docs/tasks/ACTIVE.md`.
2. Run relevant component and integration checks.
3. Update the active task with work completed, evidence, remaining issues,
   cross-component effects, and deviations.
4. Do not start the recommended next task.