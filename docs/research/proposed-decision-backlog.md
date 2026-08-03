# Proposed decision backlog

No ADR is created here. This backlog names the decision question, action type and acceptance criteria so owners can decide deliberately.

## Ordered decision backlog

| ID | Proposed decision/title | Owner/support | Classification | Required action | Acceptance criteria | Blocks next integration slice? |
|---|---|---|---|---|---|---|
| DEC-001 | MCP 2026-07-28 dual-era version-support policy | Horae; Runtime Contracts, Moirae, Integration | MISSING_HIGH_PRIORITY | New ADR or amendment | Feature/version matrix; modern/legacy fallback and downgrade rules; SDK pinning; retirement policy; four-cell tests | Yes |
| DEC-002 | Canonical action and plan approval fingerprint | Ananke; Horae, Runtime Contracts | PARTIALLY_COVERED | ADR amendment | Includes origin/schema/discovery receipt, plan/step, principals/scopes, destination/effect, purpose, policy, provider disclosure, expiry and repetition; lists invalidators | Yes |
| DEC-003 | Persistent idempotency, indeterminate outcome and compensation | Ananke + Horae | DOCUMENTED_NOT_IMPLEMENTED | ADR amendment / integration-slice work | Atomic one-time consumption; provider reconciliation; no blind retry; compensation separately authorized | Yes |
| DEC-004 | Discovery, origin chain and cache invalidation | Horae; Ananke, Runtime Contracts | MISSING_HIGH_PRIORITY | New ADR or amend compatibility ADR | Gateway + downstream identity; scoped receipt/hash; TTL ceiling; permission/schema/origin invalidation; approval binding | Yes |
| DEC-005 | Cross-server information-flow and declassification | Ananke; Mnemosyne, Horae, Runtime Contracts | MISSING_HIGH_PRIORITY | New ADR/design gate | Labels/lineage; destination/purpose policy; default restrictive propagation; narrow declassification receipt; non-verbatim residual risk | Yes |
| DEC-006 | Finalize shared Content Surface Preflight envelope | Runtime Contracts; all Fates | NEEDS_OWNER_DECISION | Decide existing design gate / contract amendment | Neutral fields only; outcomes/receipt/invalidation; no scanner/policy logic; multi-surface fixtures | Yes for untrusted content |
| DEC-007 | Tool/server admission, attestation, behaviour evidence and quarantine | Ananke; Horae, Moirae | MISSING_HIGH_PRIORITY | New ADR or extend admission ADR | Asserted/verified origin; manifest/schema hashes; observed effects; quarantine/revocation propagation; no LLM-only boundary | Yes |
| DEC-008 | Durable workflow/MRTR/Tasks state ownership | Horae; Ananke, Runtime Contracts | DOCUMENTED_NOT_IMPLEMENTED | Amend proposed Horae ADR; contract amendment later | Workflow/execution/step/attempt; input vs approval; resume/restart; state handles; cancellation; durable proof | Yes for workflow/MRTR |
| DEC-009 | Headless workload authorization and credential broker | Ananke; Moirae, Runtime Contracts | MISSING_HIGH_PRIORITY | New ADR or amend ADR-0003/consumer ADR | Workload verification; bounded unattended grants; audience/issuer/resource; no passthrough; rotation/revocation; risk classes | Yes for headless/remote |
| DEC-010 | Deterministic budgets and emergency stop | Ananke + Horae; Runtime Contracts, Moirae | MISSING_HIGH_PRIORITY | New ADR/design gate | Goal-scoped token/cost/time/tool/recursion/spawn/concurrency/rate; atomic counters; restart/fallback continuity; kill scopes/residual effects | Yes for autonomous execution |
| DEC-011 | Derived claim dependencies, ACL lineage and invalidation | Mnemosyne; Ananke | MISSING_HIGH_PRIORITY | Amend existing provenance-admission design gate | Claim/source roles; cycle detection; validity; deletion/revocation/recompute; most-restrictive ACL; memory never authority | Yes for durable derived memory |
| DEC-012 | Retrieval receipt and action-critical freshness | Mnemosyne; Ananke, Horae | MISSING_MEDIUM_PRIORITY | Contract amendment after experiment / test only first | Candidate/selected/omitted evidence; coverage/contradiction; live-source rule; replayability; token truncation evidence | No |
| DEC-013 | Derived-understanding benchmark | Mnemosyne + Integration | EXPERIMENTAL_RESEARCH | Experiment/spike | Compare keyword/hybrid/graph/situation modes on adversarial histories and all required metrics; no schema adoption before results | No |
| DEC-014 | Governance-preserving model/provider fallback | Horae; Ananke, Mnemosyne, Moirae | DOCUMENTED_NOT_IMPLEMENTED | ADR amendment / repository migration later | Pre-authorized provider/region/retention/training/logging; capability proof; budget/idempotency continuity; changed plan invalidates approval | Yes for fallback |
| DEC-015 | Moirae host isolation and bypass closure | Moirae; Ananke, Integration | DOCUMENTED_NOT_IMPLEMENTED | Repository migration / integration-slice work | Terminal/extensions/provider SDK/browser/child processes classified and constrained; secrets brokered; no false chokepoint claim | Yes—consequential host slice |
| DEC-016 | Audit integrity and joined explanation | Ananke; all Fates | MISSING_MEDIUM_PRIORITY | New ADR question / experiment | Tamper-evidence need decided; recall→evidence→decision→effect projection; secret-safe retention/deletion | No |
| DEC-017 | Fleet policy distribution and acknowledgement | Ananke; Horae, Moirae | MISSING_MEDIUM_PRIORITY | Experiment/spike | Versioned policy distribution; runtime acknowledgement; offline/stale policy behaviour; tenant isolation | No |
| DEC-018 | Enterprise-Managed Authorization adapter | Moirae; Ananke, Horae | PRODUCT_LAYER_ONLY | Defer to enterprise product layer | Uses generic verified identity/delegation; separates connect/discover/call/effect permissions; offboarding invalidates caches | No |
| DEC-019 | OpenLore documentation-source adapter/fixture | Mnemosyne; Horae, Integration | EXPERIMENTAL_RESEARCH | Experiment/spike | Read-only/on-demand; pinned hash/revision; preflight; source identity; scoped-cache negatives; no remote instruction trust | No |
| DEC-020 | n8n import adapter and UI | Moirae/Horae | PRODUCT_LAYER_ONLY | Experiment before product work | Pinned workflow normalization handles nodes/edges/credentials/expressions/effects; unknown constructs quarantine; generic model proven across 3 workflow modes | No |
| DEC-021 | Correct stale Stage-A and version documentation | Repository owners + Integration | DOCUMENTED_NOT_IMPLEMENTED | Documentation correction | Horae/Moirae prose matches current code; missing MCP related-decision references resolved; fixture versions labelled historical | No |
| DEC-022 | Preserve Adrasteia implementation-free boundary | Runtime Contracts | COVERED_AND_PROVEN | No action except conformance guard | No policy algorithms, persistence, scanner, reliability or orchestration added; consumers import canonical types | No |
| DEC-023 | New “understanding Fate” | Mnemosyne owner | REJECT_INCOMPATIBLE | Explicit rejection | Derived understanding remains within Mnemosyne; no ownership split or duplicate contracts | No |
| DEC-024 | Gateway as policy authority | Ananke owner | REJECT_INCOMPATIBLE | Explicit rejection | Gateway may enforce defense-in-depth but cannot replace Ananke or erase origin | No |
| DEC-025 | LLM classifier as security boundary | Ananke owner | REJECT_INCOMPATIBLE | Explicit rejection | Deterministic admission, sandbox, flow and action controls remain mandatory | No |
| DEC-026 | Silent provider fallback | Ananke/Horae owners | REJECT_INCOMPATIBLE | Explicit rejection | No fallback without equivalent pre-authorized disclosure/capability/budget policy | Yes if current path permits it |
| DEC-027 | Model summaries as primary evidence | Mnemosyne owner | REJECT_INCOMPATIBLE | Explicit rejection | Derivations preserve primary dependencies and cannot self-corroborate | No |
| DEC-028 | Enterprise dashboard in core contracts | Runtime Contracts owner | PRODUCT_LAYER_ONLY | Explicit rejection/defer | Core emits portable events only; UI/analytics remain optional projections | No |
| DEC-029 | Cross-runtime adversarial proof threshold | Integration; all consumers | MISSING_HIGH_PRIORITY | Integration-slice work after DEC-001–010 | Pinned executable path; required security subset passes; no direct bypass; failure/effect evidence | Yes |

## Recommended ADR consolidation

Avoid an ADR explosion. ADR-0003/0004 already establish dual principals, scoped delegation, version separation and implementation-free contracts. Their consumer ADRs already describe many MCP stateless requirements but are proposed, implementation-pending or superseded. Owners should first resolve status and the missing “MCP 2026-07-28 Stateless Compatibility Architecture” reference, then amend those decisions where scope fits. Only information flow, deterministic budgets/kill, and possibly discovery/origin/cache appear sufficiently distinct to justify new decisions.

## Safest implementation order after review

1. Decide DEC-001 through DEC-010 and resolve stale decision references.
2. Amend only the minimal portable types needed by two or more runtimes; publish conformance fixtures.
3. Close Ananke's execution-time approval, flow, idempotency, grant, token and stop semantics.
4. Implement Horae origin-preserving dual-era discovery and durable workflow propagation.
5. Implement Mnemosyne invalidation/ACL lineage and retrieval receipts; benchmark situation synthesis separately.
6. Protect Moirae credentials and execution surfaces, then add operator projections.
7. Build DEC-029 as a thin vertical slice with adversarial negatives before product dashboards/importers.
