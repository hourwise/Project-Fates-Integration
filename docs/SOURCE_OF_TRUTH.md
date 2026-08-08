# The Fates — Integrated Source of Truth

Audited 2026-08-08 from the six allowed repositories. This file records current evidence, not an aspirational architecture.

## Purpose and evidence order

The Fates are a governed AI runtime ecosystem: Ananke governs effects, Mnemosyne governs memory and belief, Horae composes runtime capabilities, Moirae Code is the developer host, Runtime Contracts/Project Adrasteia supplies portable structural contracts, and the Integration repository controls compatible cross-repository slices and evidence.

When sources disagree, this audit prefers accepted non-superseded ADRs, current source/tests and manifests, exact integration locks/checkpoints, then current architecture/roadmaps. Proposed ADRs, research, old assessments, and blueprints do not establish implemented behavior.

## Current integrated baseline

- `fates-lock.json` and the compatibility snapshot define Stage A: compatibility set `fates-stage-a-2026-07`, `inspection_only`, `sealStatus: provisional`.
- Runtime Contracts is pinned as `project-runtime-contracts@0.4.0`, protocol current `1.4.0`, minimum `1.0.0`, source commit `124b6aee…`, artifact SHA-256 `11ee062b…`.
- Ananke, Mnemosyne, and Horae have sealed/tagged Stage-A checkpoints. Moirae Code remains a pushed, untagged checkpoint, so Stage A cannot be sealed.
- All four consumers use the immutable Runtime Contracts artifact through their current Stage-A dependency/adapters. No sibling source import is the integration authority.
- Stage A proves portable representation, inspection, adapters, negotiation, and consumer conformance. It does **not** prove governed execution, qualified memory handoff, durable recovery/idempotency, or shared content preflight.
- `active-slice.json` is idle. Slice 02 is planned and inactive.

## Implemented component state

### Ananke

Implemented: the action gateway pipeline (`classify → policy → approval when required → execute → outcome → audit`), canonical payload hashing and approval binding, authenticated execution context, operator authentication/session handling, deterministic risk policy, typed outcomes, in-memory/SQLite audit, registered executors, stdio MCP connectivity, runtime inspection/compatibility, and opt-in content exposure preflight with approval receipts.

Limits: governance exists only at an exclusive chokepoint. Production identity/credential brokering, broad real-MCP validation, durable idempotency/reconciliation, destination-aware information flow, and production hardening remain incomplete. The Slice 02 fixed-fixture adapter exists only as a proposed ADR; no registered `fates.slice02.inspect-fixed-fixture.v1` implementation or read-count/digest evidence exists in source.

### Mnemosyne

Implemented: governed memory schemas, in-memory/SQLite Almanac, workspace guard, onboarding, reliability/retrieval/conflict/decay/session foundations, governed MCP memory surface, project-scoped trusted operation context, classification filtering, selected credential-material rejection, portable vault/import/export, Restart Packs, audit, runtime inspection, and semantic compatibility. Its Ananke bridge is outbound advisory-only and carries sanitized metadata.

Limits: no inbound Ananke decision/grant transport; no receipt-gated provenance admission; claim-level provenance, stale-source re-admission, sensitive export encryption/redaction, correction/deletion lifecycle, and full portable conflict resolution remain incomplete. Notification failure is reported/audited but never widens access or mutates memory.

### Horae

Implemented: canonical peer inspection parsing, semantic protocol negotiation across `1.0.0–1.4.0`, admission, duplicate/identity/readiness checks, local lifecycle and heartbeat freshness, monotonic capability planning, conflict rejection, validation-only composition/session records, and session health assessment. Ananke uses public HTTP inspection; Mnemosyne stays transport-neutral/callback-based.

Limits: bindings expose inspection only. There is no action dispatch, result relay, approval route, memory/context retrieval, credential broker, provider broker, durable workflow store, automatic restart/replan, or Moirae runtime transport. Session creation does not start or execute anything.

### Moirae Code

Implemented: provider abstractions/adapters, skill registry, policy/result vocabularies, supervisor health/crash logic, sandbox configuration validation/mode selection/evidence previews, Stage-A peer inspection clients, diagnostics, and a placeholder VS Code extension that labels unavailable and ungoverned surfaces. Action/session/memory methods deliberately fail closed.

Limits: no full editor distribution, governed chat/approval/audit UI, live Horae session path, qualified Mnemosyne transport, Ananke action path, governed Git/terminal, enforced process sandbox, extension isolation, network broker enforcement, or production keychain broker. Terminal, Git, debugger/tasks, third-party extensions, direct providers, external CLIs, and normal extension APIs remain bypasses. Sandbox execution returns `Unavailable`; it does not spawn a process.

### Runtime Contracts / Project Adrasteia

Implemented: portable schemas and validation for identities, dual principals, execution context, bounded scope, correlation/references, delegation descriptors, runtime registration/health/readiness/capabilities, compatibility manifests and negotiation, generic results/events/audit, lifecycle records, isolation/risk/skill records, and model/speech/locale records. The package has adoption fixtures and extensive schema tests.

Limits: schemas do not authenticate, authorize, execute, route, persist, select capabilities/models, enforce lifecycle, or assign domain outcomes. Content-preflight contracts are proposed only. No package/protocol change is approved for Slice 02.

### Integration coordination

Implemented: Stage-A lock/matrix/snapshot, boundary/schema validators, vertical-slice/checkpoint/handoff rules, and a detailed Slice 02 design package with owner approvals, a cross-owner consistency pass, local attestation/timeout decisions, and frozen future evidence cases.

Limits: design evidence is not runtime evidence. Slice 02 has no active slice directory, implementation checkpoints, handoff packets, three-process harness, or acceptance artifacts. The integration repository must not become a mock runtime or fixture reader.

## Accepted architectural direction

- Runtime Contracts owns neutral portable representation; domain owners keep authority and behavior.
- Ananke is the final action-policy/approval/execution authority, contingent on a no-bypass deployment chokepoint.
- Mnemosyne memory can supply evidence and safety notifications but never enlarge authority.
- Horae composes and reduces capabilities; discovery, readiness, references, correlation, and state handles are not authority.
- Governed requests distinguish authenticated/delegating and acting agent principals, use bounded scope, purpose, correlation, and validity, and keep credentials outside model/agent content.
- Approval is bound to the exact canonical request and material mutation invalidates it.
- Cross-runtime claims require exact checkpoints, producer-owned evidence, consumer checks, and real process-boundary integration tests.
- The accepted Slice 02 design is one harmless fixed read over `Moirae → Horae → Ananke`, with Ananke as sole physical reader and no retry, memory, provider, network, credential, workflow, or global-host-governance expansion. This direction is approved as design, not implemented or active.

## Incomplete and deferred work

Highest-value incomplete integration classes are: Slice 02 governed action handoff; qualified Mnemosyne context retrieval; broader governed execution; persistent idempotency/reconciliation/recovery; and shared content preflight. These appear in the compatibility matrix as planned slices, not present capabilities.

Other major deferrals include production workload identity and credential brokering, host bypass closure, durable Horae workflows, provenance-aware memory admission, audit integrity/joined explanation, cross-server information flow, model/provider fallback governance, MCP-era policy, fleet policy, and production hardening.

## Unresolved gates and discrepancies

1. **Slice 02 activation sequencing is circular.** The workflow and readiness checklist require a separately approved active slice before implementation. The implementation-authorization record says no implementation is authorized and also lists implementation checkpoints and real proof as prerequisites to a later activation request. This must be reconciled explicitly; the audit does not choose an interpretation.
2. **The runtime path is absent.** Ananke lacks the bounded fixture adapter; Horae lacks dispatch/relay; Moirae lacks the constrained request/result host; Integration lacks real three-process proof.
3. **Stage A is provisional.** The locked Moirae checkpoint has no verified annotated tag.
4. **Older Runtime Contracts prose is stale.** `adoption-baseline.md`, `contract-ownership.md`, and related historical text say no immutable baseline or downstream adoption exists. Current tags, artifact pins, manifests, integration lock, and consumer tests show Stage-A adoption occurred later.
5. **Runtime Contracts version prose is stale.** `VERSIONING.md` labels protocol `1.4.0` unreleased even though the immutable `0.4.0`/protocol `1.4.0` artifact is now the adopted baseline.
6. **Horae integration prose drifts from code.** `runtime-integration.md` says compatibility is exact string equality; current registry/adapter code performs semantic range negotiation.
7. **Moirae prose drifts from code.** `governed-path.md` says the Ananke client can execute/approve/deny/audit and describes Horae client methods, but current Stage-A methods explicitly throw unsupported/unavailable errors.
8. **Ananke README counts lag source/tests.** It advertises 108 tests/13 files; the audited suite discovered 119 tests/15 files. One full run timed out in a real MCP stdio test, then the focused file passed 4/4, indicating timing sensitivity rather than a resolved deterministic failure.
9. **Current checkout state is not the locked baseline.** Ananke, Horae, Moirae Code, Runtime Contracts, and Integration are on later documentation/design branches/heads. Integration authority remains the exact Stage-A lock until a slice advances it.
10. **Pre-existing local state exists.** Horae has a modified IDE cache and three untracked documents. The coordination context files and primary `AGENTS.md` were untracked at audit start. None was treated as accepted product state solely because it was local.
