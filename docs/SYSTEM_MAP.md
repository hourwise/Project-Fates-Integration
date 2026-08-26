# The Fates — System Map

Audited 2026-08-08. This map describes the repositories as implemented; proposed Slice 02 boundaries are not presented as live.

## Responsibilities and boundaries

| Fate | Evidence-backed responsibility | Implemented boundary | Must not own or imply |
| --- | --- | --- | --- |
| **Ananke** | Final policy, approval, governed action execution, action outcomes, and action audit | A TypeScript gateway with tool registry, risk/policy evaluation, hash-bound approval, execution authentication, typed outcomes, audit backends, stdio MCP adapter, runtime inspection, and opt-in read-result content preflight | Routing around its chokepoint; orchestration; memory truth/retrieval; portable protocol ownership; governance over direct tool/credential paths that bypass it |
| **Mnemosyne** | Governed project memory, provenance, reliability, retrieval, conflict/decay, portable vaults, Restart Packs, and memory audit | Scoped runtime facade, in-memory/SQLite Almanac, project guard, retrieval/reliability/conflict engines, MCP memory surface, classification filter, high-confidence credential-material rejection, and portable vault/restart-pack foundations | Action authority, approval/grant creation, credential brokering, orchestration, or treating remembered approvals/references as current authority |
| **Horae** | Peer discovery/admission, local lifecycle/freshness supervision, monotonic capability reduction, composition validation, and session scaffolding | Canonical inspection parsing, semantic protocol negotiation, supervised registration, health/freshness/lifecycle assessment, capability plans, and validation-only sessions; Ananke and Mnemosyne bindings are inspection-only | Approving or executing actions; reading memory or fixture content; minting credentials; rewriting peer health; treating discovery, capabilities, IDs, or references as authority |
| **Moirae Code** | Governed developer host/product surface, provider/skill/sandbox/broker abstractions, user-visible evidence and bypass disclosure | Contract-tested provider and skill layers; sandbox validation/evidence preview; supervisor health/crash logic; Stage-A inspection clients; placeholder VS Code views; fail-closed unsupported action/session/memory calls | Claiming terminal, Git, debugger/task, extension, provider, filesystem, process, or network governance that is not enforced; becoming policy or memory authority |
| **Runtime Contracts / Project Adrasteia** | Canonical portable representation, structural validation, protocol versions/ranges, compatibility helpers, and neutral references | `project-runtime-contracts@0.4.0`, protocol `1.4.0`/minimum `1.0.0`, Zod schemas, conformance tests, and adoption fixtures | Policy, authorization, approval validation, runtime transport, persistence, orchestration, memory semantics, scanner/preflight policy, credential exchange, or domain outcome meaning |
| **Integration coordination** | Exact compatibility checkpoints, vertical-slice lifecycle, cross-owner evidence, handoffs, boundary validation, and integration claims | Stage-A lock/matrix/snapshot and validators; Slice 02 design, approvals, evidence matrix, and non-activation records | Acting as a runtime, transport, fixture reader, policy engine, or substitute for real cross-process proof |

## Current dependency map

```text
Moirae Code --inspection only--> Horae --inspection only--> Ananke
      |                            |
      +--inspection only----------+--> Mnemosyne

Ananke -------- governed actions --------> registered executors / MCP tools
Mnemosyne ------ governed memory ---------> Almanac / portable vault

Ananke, Mnemosyne, Horae, Moirae Code
      \-------- pin Runtime Contracts 0.4.0 / protocol 1.4.0

Integration coordination records exact checkpoints and evidence;
it is not on the runtime data path.
```

The first line is not an end-to-end runtime route. Horae can inspect and compose peer descriptions but cannot dispatch or relay actions. Moirae's Stage-A clients inspect peers and explicitly fail closed for action, session, and qualified-memory operations.

## Ownership laws at security boundaries

| Boundary | Authority and invariant |
| --- | --- |
| Governed execution | Ananke is authoritative only when the action has no alternate path. Raw tool handles and credentials must stay outside the agent/model boundary. Policy denial precedes executor invocation. |
| Approval | Ananke binds approval to canonical action data, principals/scope/session/purpose/policy/expiry. A reference or schema-valid record is not an approval. |
| Identity and scope | Trusted hosts/transports supply distinct authenticated and acting principals plus bounded scope. Model-visible arguments must not establish identity or widen scope. Wildcard scope has no accepted semantics. |
| Orchestration | Horae admits and reduces capabilities using peer evidence; it does not authenticate a peer merely by discovering it and does not gain action or memory authority. |
| Memory trust | Mnemosyne qualifies and filters memory. Reliability, remembered grants, context packs, and state handles can inform a decision but cannot authorize an action. Restricted records are excluded by default; sensitive access needs a trusted evaluator. |
| Credentials/secrets | Contracts carry references only. Ananke or a dedicated broker owns governed credentials; Moirae's current secret broker is test-level and provider constructors can still receive keys directly. Mnemosyne's selected secret-pattern guard is not DLP or key management. |
| MCP/tools | MCP supplies connectivity, not governance. Ananke has a real stdio adapter; Mnemosyne exposes governed memory tools; Horae and Moirae do not yet provide the proposed cross-runtime action transport. |
| Content exposure | Ananke has local opt-in read-result preflight. Shared routing, neutral receipts, Mnemosyne admission, and Moirae UX remain unintegrated/proposed. Safe action classification does not imply safe returned content. |
| Audit/provenance | Each producer owns its domain audit meaning. Shared references/correlation join evidence but do not overwrite producer identity or confer trust. No integrated tamper-evident audit chain exists. |

## Overlap and ambiguity

- **Adrasteia naming:** the shared project/repository is Project Adrasteia, the attached folder is `Project Runtime Contracts`, the package is `project-runtime-contracts`, and `@fates/runtime-contracts` is future intent only.
- **Local versus portable types:** owner-local adapters and domain schemas legitimately remain. Moirae also retains `@moirae/runtime-contracts`; it must not become a competing canonical portable protocol surface.
- **Content preflight:** Ananke owns implemented policy/decision meaning. Runtime Contracts has only a proposed shared contract; Horae routing and Moirae UX are proposed; Mnemosyne receipt-gated admission is designed but incomplete.
- **Dual-principal delegation:** portable structures and architectural direction are accepted, but end-to-end authentication, credential brokering, grant enforcement, and composed tests are incomplete.
- **Gateway terminology:** some diagrams place a generic gateway above Ananke. No separate gateway Fate exists, and discovery/routing infrastructure must not replace Ananke's action authority.
- **Lifecycle/durability:** Runtime Contracts owns record shapes; Horae owns local transition semantics. Durable workflows, persistent idempotency, retry reconciliation, and compensation are not implemented.
