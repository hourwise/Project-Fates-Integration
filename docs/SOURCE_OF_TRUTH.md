# The Fates — Integrated Source of Truth

Audited 2026-08-09 from the six allowed repositories. This file records current evidence, not an aspirational architecture.

## Purpose and evidence order

The Fates are a governed AI runtime ecosystem: Ananke governs effects, Mnemosyne governs memory and belief, Horae composes runtime capabilities, Moirae Code is the developer host, Runtime Contracts/Project Adrasteia supplies portable structural contracts, and the Integration repository controls compatible cross-repository slices and evidence.

When sources disagree, this audit prefers accepted non-superseded ADRs, current source/tests and manifests, exact integration locks/checkpoints, then current architecture/roadmaps. Proposed ADRs, research, old assessments, and blueprints do not establish implemented behavior.

## Current integrated baseline

- `fates-lock.json` and the current compatibility snapshot define `fates-slice-002-2026-08-09`: `runtime_validated`, `sealStatus: provisional` at global compatibility-set level. The FATES-SLICE-002 row and slice record are `completed` and `sealed`.
- Runtime Contracts is pinned as `project-runtime-contracts@0.4.0`, protocol current `1.4.0`, minimum `1.0.0`, source commit `124b6aee…`, artifact SHA-256 `11ee062b…`.
- Ananke and Horae have Slice 02 sealed/tagged checkpoints; Mnemosyne, Moirae Code, and Runtime Contracts are unchanged. Moirae Code remains a pushed, untagged checkpoint, so the successor global compatibility set remains provisional.
- All four consumers continue to use the immutable Runtime Contracts artifact through their repository-local dependency/adapters. No sibling source import is the integration authority.
- Slice 02 proves the bounded Ananke/Horae action handoff over a real compiled process boundary, including producer ownership, one dispatch, one physical read, identifier preservation, exact digest, and fail-closed negative paths. It does **not** prove Moirae process participation, live timeout/indeterminate transport loss, wrong-producer induction, qualified memory handoff, durable recovery/idempotency, or shared content preflight.
- `active-slice.json` is idle after Slice 02 completion. The historical activation decision in `docs/decisions/FATES-SLICE-002-activation-decision.json` remains an authorization record and is not treated as final implementation evidence.

## Implemented component state

### Ananke

Implemented: the action gateway pipeline (`classify → policy → approval when required → execute → outcome → audit`), canonical payload hashing and approval binding, authenticated execution context, operator authentication/session handling, deterministic risk policy, typed outcomes, in-memory/SQLite audit, registered executors, stdio MCP connectivity, runtime inspection/compatibility, and opt-in content exposure preflight with approval receipts.

Limits: governance exists only at an exclusive chokepoint. Production identity/credential brokering, broad real-MCP validation, durable idempotency/reconciliation, destination-aware information flow, and production hardening remain incomplete. Slice 02 adds the bounded fixed-fixture adapter and its owner-local read/digest evidence; it does not generalize that mechanism into a proxy or broader fixture service.

### Mnemosyne

Implemented: governed memory schemas, in-memory/SQLite Almanac, workspace guard, onboarding, reliability/retrieval/conflict/decay/session foundations, governed MCP memory surface, project-scoped trusted operation context, classification filtering, selected credential-material rejection, portable vault/import/export, Restart Packs, audit, runtime inspection, and semantic compatibility. Its Ananke bridge is outbound advisory-only and carries sanitized metadata.

Limits: no inbound Ananke decision/grant transport; no receipt-gated provenance admission; claim-level provenance, stale-source re-admission, sensitive export encryption/redaction, correction/deletion lifecycle, and full portable conflict resolution remain incomplete. Notification failure is reported/audited but never widens access or mutates memory.

### Horae

Implemented: canonical peer inspection parsing, semantic protocol negotiation across `1.0.0–1.4.0`, admission, duplicate/identity/readiness checks, local lifecycle and heartbeat freshness, monotonic capability planning, conflict rejection, validation-only composition/session records, session health assessment, and the bounded Slice 02 HTTP handoff/relay. Ananke uses public HTTP inspection and the canonical action endpoint; Mnemosyne stays transport-neutral/callback-based.

Limits: the Slice 02 relay is deliberately narrow and does not own approval, fixture reads, action policy, result authority, memory/context retrieval, credential brokering, provider brokering, durable workflow storage, automatic restart/replan, or Moirae runtime transport. Live timeout and post-dispatch indeterminate behavior were not induced; owner-local tests cover them.

### Moirae Code

Implemented: provider abstractions/adapters, skill registry, policy/result vocabularies, supervisor health/crash logic, sandbox configuration validation/mode selection/evidence previews, Stage-A peer inspection clients, diagnostics, and a placeholder VS Code extension that labels unavailable and ungoverned surfaces. Action/session/memory methods deliberately fail closed.

Limits: no full editor distribution, governed chat/approval/audit UI, live Horae session path, qualified Mnemosyne transport, Ananke action path, governed Git/terminal, enforced process sandbox, extension isolation, network broker enforcement, or production keychain broker. Terminal, Git, debugger/tasks, third-party extensions, direct providers, external CLIs, and normal extension APIs remain bypasses. Sandbox execution returns `Unavailable`; it does not spawn a process.

### Runtime Contracts / Project Adrasteia

Implemented: portable schemas and validation for identities, dual principals, execution context, bounded scope, correlation/references, delegation descriptors, runtime registration/health/readiness/capabilities, compatibility manifests and negotiation, generic results/events/audit, lifecycle records, isolation/risk/skill records, and model/speech/locale records. The package has adoption fixtures and extensive schema tests.

Limits: schemas do not authenticate, authorize, execute, route, persist, select capabilities/models, enforce lifecycle, or assign domain outcomes. Content-preflight contracts are proposed only. No package/protocol change is approved for Slice 02.

### Integration coordination

Implemented: Stage-A history plus the Slice 02 lock/matrix/snapshot, boundary/schema validators, vertical-slice/checkpoint/handoff rules, owner handoffs, live acceptance evidence, and completed/sealed Slice 02 control state. The active-slice slot is idle and the next slice has not started.

Limits: Integration records compatibility and evidence; it is not a runtime, fixture reader, or mock substitute. The accepted live exercise used compiled Ananke and Horae plus an external Horae request harness; no Moirae process was started, and the global set remains provisional until Moirae has a tagged checkpoint.

## Accepted architectural direction

- Runtime Contracts owns neutral portable representation; domain owners keep authority and behavior.
- Ananke is the final action-policy/approval/execution authority, contingent on a no-bypass deployment chokepoint.
- Mnemosyne memory can supply evidence and safety notifications but never enlarge authority.
- Horae composes and reduces capabilities; discovery, readiness, references, correlation, and state handles are not authority.
- Governed requests distinguish authenticated/delegating and acting agent principals, use bounded scope, purpose, correlation, and validity, and keep credentials outside model/agent content.
- Approval is bound to the exact canonical request and material mutation invalidates it.
- Cross-runtime claims require exact checkpoints, producer-owned evidence, consumer checks, and real process-boundary integration tests.
- The accepted Slice 02 implementation is one harmless fixed read over the bounded `Moirae → Horae → Ananke` route shape, with Ananke as sole physical reader and no retry, memory, provider, network, credential, workflow, or global-host-governance expansion. The live acceptance verified the compiled Ananke/Horae boundary; it did not start Moirae or induce live timeout, indeterminate transport loss, or wrong-producer cases.

## Incomplete and deferred work

Highest-value incomplete integration classes are: qualified Mnemosyne context retrieval; broader governed execution; persistent idempotency/reconciliation/recovery; shared content preflight; and host-wide bypass closure. Slice 02 is completed/sealed at slice level, but its successor global compatibility set remains provisional pending the unchanged Moirae tag and the explicit live limitations recorded in the evidence.

Other major deferrals include production workload identity and credential brokering, host bypass closure, durable Horae workflows, provenance-aware memory admission, audit integrity/joined explanation, cross-server information flow, model/provider fallback governance, MCP-era policy, fleet policy, and production hardening.

## Unresolved gates and discrepancies

1. **The live path is bounded.** Compiled Ananke and Horae were exercised and the producer-owned action completed once; no Moirae process was started, so the record does not claim a live three-process route.
2. **The global successor set is provisional.** The locked Moirae checkpoint has no verified annotated tag. Slice 02 itself is sealed against the tagged Ananke/Horae checkpoints.
3. **Some behaviors were not live-induced.** Timeout, post-dispatch indeterminate transport loss, and missing/wrong producer or capability induction remain owner-local/deterministic test evidence only.
4. **Older Runtime Contracts prose is stale.** `adoption-baseline.md`, `contract-ownership.md`, and related historical text say no immutable baseline or downstream adoption exists. Current tags, artifact pins, manifests, integration lock, and consumer tests show Stage-A adoption occurred later.
5. **Runtime Contracts version prose is stale.** `VERSIONING.md` labels protocol `1.4.0` unreleased even though the immutable `0.4.0`/protocol `1.4.0` artifact is now the adopted baseline.
6. **Horae integration prose drifts from code.** `runtime-integration.md` says compatibility is exact string equality; current registry/adapter code performs semantic range negotiation.
7. **Moirae prose drifts from code.** `governed-path.md` describes broader client methods than the current fail-closed Stage-A implementations expose; Slice 02 did not modify Moirae.
8. **Current checkout heads are not all locked baselines.** Ananke, Horae, and Integration now carry the Slice 02 closure checkpoints, while Moirae and Runtime Contracts remain unchanged references. Integration authority remains the exact lock and snapshot.

The Slice 02 sequencing discrepancy is preserved as historical context in the
workflow, design, readiness checklist, owner-approval review, consistency
review, and implementation-authorization record. The separate activation
decision authorized the bounded implementation order; the later implementation
checkpoints, handoffs, live evidence, and validation now satisfy the acceptance
record. Slice 02 is sealed at slice level, the active slot is idle, and Slice 03
has not started.
