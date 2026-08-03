# Fates external research assessment

Date: 2026-08-03

Scope: research and architectural triage only

Integration baseline: `9e53d7f97330a7224e11af2d948278c93ed664dd`

## Executive summary

The external material confirms the Fates' central decomposition: evidence is not authority, orchestration is not policy, discovery is not admission, and portable contracts are not implementations. It does not justify a new Fate. It does expose ten concrete gaps that must be closed within the existing owners: an actually unavoidable Ananke chokepoint; deterministic cross-server information-flow control; derived-memory invalidation and ACL lineage; provenance- and behaviour-aware tool admission; durable workflow/idempotency semantics; complete content preflight; deterministic budgets and kill controls; governance-preserving provider fallback; MCP 2026-07-28 dual-era compatibility; and executable cross-runtime adversarial proof.

Several ideas are already accepted or structurally present. Dual-principal context, narrow resource scopes, approval hashing, protocol-version declarations, runtime registration, health/readiness distinction, lifecycle records, evidence-not-authority rules, source reliability, and model/speech capability metadata should be extended and tested rather than duplicated. Existing files that refer to an unlocated “MCP 2026-07-28 Stateless Compatibility Architecture” decision are not evidence that the migration is decided or implemented.

MCP 2026-07-28 is a real breaking release. It removes the protocol handshake and transport session, adds per-request identity/capability metadata, mandatory server-side `server/discover`, header routing, cacheable catalogues, MRTR, and official Tasks/auth extensions. Fates logical sessions, approval scopes, workflow executions, memory conversations, and state handles remain necessary and must stay distinct. No migration should begin until a version-support ADR and dual-era conformance slice are approved.

No implementation, dependency, runtime behaviour, lock, slice, or ADR was changed by this assessment.

## Methodology and confidence

The assessment used five evidence levels:

1. current source and tests at the exact local commits below;
2. accepted/proposed ADRs, explicitly separated from implementation;
3. pinned external repository commits and releases;
4. official specifications, product pages, and paper abstracts/results;
5. inference, labelled as such and never promoted to proof.

`COVERED_AND_PROVEN` is reserved for a contract plus implementation plus tests on the relevant path. A type or document alone is not proof. Product claims are treated as claimed capabilities, not independently verified enforcement. arXiv results are research evidence, not universal guarantees.

## Repository state summary

| Repository | Commit inspected | State relevant to this assessment |
|---|---|---|
| Project Runtime Contracts / Adrasteia | `124b6aee2629a3147739934ad5f1b45b32c8ba46` | Package `0.4.0`, protocol `1.4.0` (range `1.0.0`–`1.4.0`). Canonical structural schemas for dual principals, delegation, scopes, lifecycle, readiness, compatibility, model/speech metadata. No policy, persistence, brokering, orchestration, taint or preflight implementation. |
| Project Ananke | `dcbb115c5798072221afdd2e4fdd36e786defddf` | Approval binding and execution-time decisions exist; MCP metadata is explicitly untrusted. Direct SDK/CLI/shell/browser/extension routes remain possible bypasses. Content preflight is local opt-in; no IFC, persistent idempotency, budgets, admission attestation, or tamper-evident audit. MCP SDK resolves to `1.29.0` and adapter uses legacy connect/list/call assumptions. |
| Project Mnemosyne | `f4ab76a9760f856d78908d35facceb068d78c8e5` | Governed records, source references, reliability, conflicts, classifications, context packs and restart packs exist. Retrieval is keyword-based. No explicit episode/situation/derived-claim layer, claim dependency invalidation, retrieval receipt, most-restrictive derived ACL, or deletion/revocation propagation. Provenance-admission design gate exists but is mostly structural. |
| Project Horae | `52e14fa574f7427f62747fe84d2789aec25b94e3` | Stage-A discovery/admission, readiness, registration, freshness, lifecycle and monotonic capability reduction exist. Session orchestration validates only; there is no durable workflow engine, compensation, MRTR/tasks, deterministic budgets, execution routing, or protocol-era adapter. Some tracked prose remains stale. Pre-existing uncommitted files were not changed. |
| Project Moirae Code | `a4783db271a61848c66ac4f6652a539bdb515e28` | Stage-A inspection host with canonical Adrasteia dependency. Tool/skill manifest validation and warnings exist, but no cryptographic verification or runtime behaviour enforcement. Sandbox is unavailable, secrets are test-only/in-memory, model broker/fallback governance is absent, and terminal/provider/extension paths can bypass Ananke. Some roadmap/readme claims are stale. |
| Project Fates Integration | `9e53d7f97330a7224e11af2d948278c93ed664dd` | Exact commit lock, architectural laws and 53 validator tests exist. It proves pinned metadata consistency, not composed execution or adversarial governance. Active slice was deliberately left untouched. |

## Source inventory

Retrieved 2026-08-03 unless a publication date is shown.

| ID | Source used | Exact revision/date | Use and limitation |
|---|---|---|---|
| S01 | [Twin repository](https://github.com/caribeedu/twin) | commit `a0829b52159c8164bee398260a6c8dbd808d542d`; release `v1.4.0`, 2026-08-02 | Architecture, stated experiment and costs. Repository claims were not treated as independent benchmark proof. |
| S02 | [Twin Project - Demo](https://www.youtube.com/watch?v=A8KyGtWYdNI) | YouTube oEmbed title/publisher retrieved 2026-08-03 | Playback was unavailable to the research fetcher. The pinned README contains the scenario and claims; the video itself was not independently analysed. |
| S03 | [OpenLore](https://github.com/aakarim/go-openlore) and [service page](https://openlore.sh/) | commit `a539d810576a4cbe354d9348b45edc58b0d90fa2`; release `v0.3.0`, 2026-07-14 | Agent-native remote documentation, scoped views, virtual shell, CAS writes and bundles. |
| S04 | [ToolFunnel](https://github.com/Rendeverance/toolfunnel) | commit `678bda87be29508dfebc30b4e4d19fe3381efd51`; release `v0.6.0`, 2026-07-23 | Gateway, progressive tool disclosure, fail-closed hook and dual-era translation claims. Solo-project limitations and hand-rolled protocol risk retained. |
| S05 | [Skull-boy n8n workflow](https://github.com/Skull-boy/n8n_workflows) | commit `a2ab0968e200fdf4a9377a9f6f58a2506399e8a9`; release `Buisness_Automation`, 2026-07-25 | Small human-in-the-loop workflow example; approval-link mutation and credential/side-effect analysis. |
| S06 | [Zie619 n8n collection](https://github.com/zie619/n8n-workflows) | commit `94007c1445d9258a7da116646b79473e7c7c3282`; release `dmca-compliance-2025-08-14`, 2025-08-14 | Large untrusted workflow corpus and importer/search surface; repository claims 4,343 workflows. Historical rewrite shows provenance/licensing instability. |
| S07 | [OptScale AI Agent Control](https://optscale.ai/product/ai-agent-control) | retrieved 2026-08-03 | Product claims for registry, budgets, allowlists, anomaly detection and audit; treated as unverified product claims. |
| S08 | [OptScale announcement](https://hystax.com/optscale-ai-release-ai-governance-platform/) | published 2026-05-29 | Product context and claimed under-50ms routing. Not an independent performance evaluation. |
| S09 | [MCPHunt](https://arxiv.org/abs/2604.27819) | arXiv v1, 2026-04-30 | 3,615 traces; policy-violating cross-boundary propagation 11.5–41.3%; prompt mitigation not sufficient. |
| S10 | [Component Manipulation / Connor](https://arxiv.org/abs/2604.01905) | arXiv v2, 2026-05-19 | 114 malicious servers; component-chain attacks; reported F1 94.6% for evidence-oriented deviation detection. |
| S11 | [MalTool](https://arxiv.org/abs/2602.12194) | arXiv v3, 2026-05-09 | Malicious implementations embedded in apparently benign tools; existing detectors perform poorly. |
| S12 | [When MCP Servers Attack](https://arxiv.org/abs/2509.24272) | arXiv v1, 2025-09-29 | Twelve-category malicious-server taxonomy and scanner limitations. |
| S13 | [FlowGuard](https://arxiv.org/abs/2607.14754) | arXiv v1, 2026-07-16 | Runtime-evidence plus semantic triage; 1,880-case benchmark and reported execution-risk F1 results. |
| S14 | [Hacken Q2 2026 report landing page](https://hacken.io/insights/q2-2026-security-report/) | retrieved 2026-08-03 | Official report overview. Direct 12.5 MB PDF was blocked by Cloudflare and could not be visually inspected. The page-12 Grok/Bankr incident was corroborated by [contemporaneous reporting](https://beincrypto.com/grok-wallet-bankr-drb-prompt-injection/) and [Ledger's incident analysis](https://www.ledger.com/academy/topics/agentic-ai/agentic-ai-security-guide). |
| S15 | [MCP 2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28), [release post](https://blog.modelcontextprotocol.io/posts/2026-07-28/), and [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) | released 2026-07-28 | Current protocol baseline and migration delta from 2025-11-25. |
| S16 | [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials) | retrieved 2026-08-03 | Headless workload authentication extension. Authentication is not action authority. |
| S17 | [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) | retrieved 2026-08-03 | IdP-mediated server access and revocation. Connection permission is not tool/effect approval. |
| S18 | [MCP authorization security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations) | retrieved 2026-08-03 | Audience/resource binding, token-passthrough prohibition, PKCE, issuer and SSRF controls. |
| S19 | [Anthropic MCP documentation URL](https://docs.anthropic.com/en/docs/agents-and-tools/mcp) | retrieved 2026-08-03; redirects to current MCP 2026-07-28 introduction | Confirms documentation consolidation onto the current MCP site. |

## Findings by source

### Twin: derived understanding is valuable, but remains experimental

Twin supplies a useful pipeline hypothesis—artifact → percept → correlation → situation → understanding → governed context—and a concrete Slack/GitHub example. Fates should not copy its ontology. Mnemosyne needs a benchmarkable boundary between source evidence and durable derived claims, with explicit dependency edges, temporal validity, claim-specific authority, uncertainty, review state, ACL lineage and recomputation. Generated summaries must remain derivations, never independent supporting sources. Merged code must not imply deployment; a coherent narrative must not imply truth. Status: `EXPERIMENTAL_RESEARCH` for situation models; `MISSING_HIGH_PRIORITY` for dependency invalidation and ACL propagation.

### OpenLore: useful source surface, not a trust upgrade

OpenLore demonstrates a compact way to publish versioned documentation through a virtual filesystem with identity-scoped views and safe, atomic writes. Fates may consume such a surface through a normal source adapter, but must pin revision/content hash, preflight returned content, preserve source identity and fetch on demand where freshness matters. It must not pipe remote “teach” or skill text into trusted instructions. No generic contract should depend on SSH, shell syntax or OpenLore. Status: `EXPERIMENTAL_RESEARCH` for an adapter/fixture; core knowledge-server UI is `PRODUCT_LAYER_ONLY`.

### ToolFunnel: strong gateway lessons, incompatible as the policy authority

Progressive tool disclosure, fail-closed pre-call hooks, readiness/backoff, and dual-era protocol translation are valuable patterns. Its transparent identity mirroring creates a Fates-specific concern: the gateway must preserve both gateway identity and immutable downstream origin, not become invisible in audit or approval. Live tool toggles and protocol translation require catalogue receipts and approval invalidation. ToolFunnel's hook is not a replacement for Ananke's semantic decision, and hand-rolled wire compatibility is not evidence suitable for direct adoption. Status: `PARTIALLY_COVERED`; adopting a separate gateway policy authority is `REJECT_INCOMPATIBLE`.

### n8n collections: imports are executable supply-chain input

The small workflow shows the exact mutation hazard: a click resumes a workflow whose repository state, proposed patch, credentials or destination may have changed. The large collection demonstrates scale, dynamic expressions, triggers and provenance volatility; “100% import success” says nothing about safety. Imported workflows need static normalization, content preflight, node/edge capability extraction, source hash/signature, credential reference inventory, unresolved-expression flags, composition-risk analysis, approval boundaries, idempotency/compensation declarations and quarantine. The importer/editor is a product feature; the portable plan/step/continuation shapes belong in Runtime Contracts only if more than n8n requires them. Status: `MISSING_HIGH_PRIORITY` for governance semantics; `PRODUCT_LAYER_ONLY` for an n8n-specific importer.

### OptScale: validates operational primitives, not a dashboard mandate

The product reinforces registration, ownership, allowlists, cost/time/token/recursion limits, goal-level anomaly signals and fleet audit. Fates already has registration, lifecycle, health and readiness shapes; enforcement is incomplete. Hard deterministic ceilings and an emergency stop are core controls. Dashboards, leaderboards, alert feeds, billing analytics and fleet visualization belong in Moirae/enterprise operations. Behavioural anomaly scores are detection signals and cannot authorize or deny high-value actions alone. Status ranges from `PARTIALLY_COVERED` to `MISSING_HIGH_PRIORITY`; dashboards are `PRODUCT_LAYER_ONLY`.

### MCPHunt: flow topology is a security boundary

The measured cross-server leakage confirms that per-tool permission is insufficient. Fates needs deterministic labels and lineage across tool results, memory, context packs, model calls and outgoing arguments, plus destination/purpose/recipient policy and explicit declassification receipts. A simple “most restrictive wins” rule is a safe default, not a complete solution for sanitization, aggregation or semantic leakage. Ananke owns flow decisions; Mnemosyne carries evidence labels and derived ACL lineage; Horae propagates labels through composition; Runtime Contracts carries transport-neutral labels/receipts; Integration proves them. Status: `MISSING_HIGH_PRIORITY`.

### Malicious MCP research: admission plus runtime evidence

The papers consistently show that descriptions and schemas can be malicious, implementation behaviour can diverge from declared intent, component chains evade single-point scanning, and current scanners have false negatives. Required layers are deterministic identity/origin checks, immutable catalogue/schema hashes, preflight, sandboxing, observed-effect envelopes, behaviour-versus-intent evidence, quarantine/revocation and Ananke enforcement. Probabilistic classifiers may prioritize review but must not be the sole boundary. Status: `MISSING_HIGH_PRIORITY`.

### Hacken incident: Fates would limit some steps, but prevention is unproven

The reported Grok/Bankr chain was: an NFT expanded transfer capability; attacker-controlled Morse content was decoded; the output was treated as an authenticated command; Bankr signed and broadcast roughly 3 billion DRB tokens; the destination/value were not independently confirmed. Ananke's stated laws would reject external content as authority and bind approval to canonical arguments, but current bypasses, opt-in preflight and absence of a composed signing test mean Fates cannot claim prevention. A high-value transaction must require fresh live-state revalidation, destination/value binding, risk-class policy, bounded delegation or live independent approval, and a signer outside the model/tool context. Status: `COVERED_BUT_UNPROVEN` at the design level and `MISSING_HIGH_PRIORITY` for end-to-end proof.

### MCP 2026-07-28: deliberate compatibility programme required

The release is verified and materially affects Horae discovery/negotiation, Ananke request canonicalization and identity trust, Moirae client behaviour, Integration fixtures, and portable compatibility declarations. Runtime `RuntimeSession` is documented as application context and should remain; it must never be mapped to `Mcp-Session-Id`. Per-request `clientInfo`/`serverInfo`, cache metadata and discovery are self-asserted and cannot establish identity, authority or freshness. MRTR inputs are new requests; changed material fields invalidate approval. Headless OAuth proves workload identity, not permission. See [the dedicated impact assessment](./mcp-2026-07-28-impact-assessment.md). Status: `MISSING_HIGH_PRIORITY`, but it does not block research or documentation work.

## Cross-cutting architectural answers

1. **Single chokepoint?** Architecturally required, operationally unproven. Direct SDK, terminal, provider, extension, browser and local-process paths remain.
2. **Bypasses?** All listed paths can bypass today unless individually wrapped: direct SDK, nested agents, local tools, shell, gateway calls, legacy sampling, jobs, resume/retry, generated scripts, extensions, imports, browser actions and callbacks.
3. **Plan mutation?** Current approval hashing protects a single Ananke request, but no durable plan object or mutation proof covers multi-step workflows.
4. **Approval fingerprint?** Server, tool, canonical arguments, dual/represented principals, tenant/project/workspace/resource scope, purpose, session, policy/action IDs and expiry. Add discovery/schema/origin receipt, workflow/step, state-handle digest where material, provider/model/disclosure class and bounded repeat policy.
5. **Invalidating changes?** Identity, tenant/scope, destination, amount, tool/origin/schema, arguments, purpose, policy, provider/model disclosure posture, capability set, plan graph, input round, live-state assumptions, expiry/revocation and idempotency disposition.
6. **Remembered fact causing execution?** Forbidden by law, not yet proven end to end. Live source and Ananke revalidation are required.
7. **Permissions through derivation/context packs?** Classification filtering exists; source ACL lineage and most-restrictive derived permissions do not.
8. **Deletion/revocation propagation?** No complete dependency graph, tombstone propagation or cache invalidation exists.
9. **Self-supporting summaries?** Not deterministically prevented; a derivation-cycle rule and source-role distinction are needed.
10. **Authority versus reliability?** Conceptually separate, but claim-specific authority is incomplete.
11. **Claim-specific authority?** Not fully. Current source-level reliability is too coarse for all derived claims.
12. **State distinctions?** Source/status fields cover some distinctions; said/intended/committed/merged/deployed/runtime-observed/inferred/uncertain are not a complete tested vocabulary.
13. **Dangerous harmless-tool composition?** Not currently detected.
14. **Cross-server flow tracking?** Not currently enforced.
15. **Identity through aliases/gateways?** Not guaranteed; downstream origin needs an immutable chain.
16. **Drift?** Yes. Freshness exists for runtime registration, not immutable tool-schema/catalogue receipts tied to approval.
17. **Deterministic budgets?** Only a structural session budget subset exists; no unavoidable enforcement.
18. **Operator explanations?** Individual audit/context artifacts help, but no joined explanation proves recall + permit + evidence across runtimes.
19. **Contracts implementation-free?** Current Adrasteia boundary is correct; proposed additions must remain structural.
20. **Complete executable demonstration?** No. Integration validates metadata and locks, not a composed governed action under attack.

## Rejected ideas

- A new “understanding Fate”: `REJECT_INCOMPATIBLE`; Mnemosyne owns evidence and belief.
- An MCP gateway as final policy authority: `REJECT_INCOMPATIBLE`; every consequential call still crosses Ananke.
- LLM-only prompt-injection or malicious-tool classification: `REJECT_INCOMPATIBLE`.
- Model summaries as independent evidence: `REJECT_INCOMPATIBLE`.
- Silent model/provider fallback: `REJECT_INCOMPATIBLE`.
- Copying MCP-specific sessions, headers or SDK types into generic contracts: `REJECT_INCOMPATIBLE`.
- Enterprise dashboards, rankings and billing UI in Runtime Contracts: `PRODUCT_LAYER_ONLY`.
- Assuming an MCP transport session was ever an approval or identity session: `REJECT_INCOMPATIBLE`.

## Recommended next decisions

1. Approve or reject an MCP 2026-07-28 dual-era/version-support ADR before any SDK migration.
2. Amend the existing provenance-admission design gate with derivation dependencies, ACL lineage, invalidation and cycle rules; do not create a new Fate.
3. Decide a transport-neutral information-flow label/declassification receipt model.
4. Decide the canonical action/workflow fingerprint and plan-mutation rules.
5. Decide the minimum deterministic budget/kill contract and owner split.
6. Finalize Content Surface Preflight shared envelopes and receipt invalidation.
7. Decide server/tool admission receipts, origin chains, quarantine and revocation.
8. Authorize a research-only benchmark for derived understanding before schema adoption.
9. Define the next Integration slice as proof of one governed side effect across all relevant runtimes, but keep it paused until review of this research.

## Blocking assessment and safest order

No finding blocks continued documentation, local refactoring that preserves behaviour, or research in any repository. Consequential execution, remote/headless MCP enablement, imported workflow execution, durable derived-memory admission, and claims of a non-bypassable governed product **are blocked** until their corresponding controls and tests exist. The next cross-runtime execution slice should wait for owner decisions on the MCP era, action fingerprint, idempotency and origin/discovery receipts.

Safest order: decisions and vocabulary → portable structural amendments → Ananke deterministic enforcement/idempotency → Horae durable propagation → Mnemosyne invalidation/ACL lineage → Moirae protected host/broker UI → Integration adversarial proof → optional product dashboards and adapters.
