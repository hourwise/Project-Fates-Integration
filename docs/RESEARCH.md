# The Fates — Research and Evidence Routing

This file routes existing research; it does not promote research, blueprints, proposed ADRs, or external prior art into product truth. Accepted decisions and implemented evidence are routed separately from candidates.

## Accepted architecture informed by research

| Area | Authority to consult |
| --- | --- |
| MCP connectivity versus execution governance and no-bypass chokepoint | Ananke [decision index](../../Project%20Ananke/docs/decisions/README.md), especially ADR-0028/0029 |
| Approval UI and canonical payload binding | Ananke ADR-0031/0032 and [approval binding](../../Project%20Ananke/docs/APPROVAL_BINDING.md) |
| Mnemosyne provenance-admission gate and Stage-A memory boundary | Mnemosyne [decision index](../../Project%20Mnemosyne/docs/decisions/README.md), ADR-00XX and ADR-0035 |
| Horae inspection-only composition boundary | Horae [ADR-0001](../../Project%20Horae/docs/decisions/ADR-0001-project-adrasteia-stage-a-composition-boundary.md) |
| Moirae Stage-A host boundary and accepted-but-pending host delegation responsibilities | Moirae [decision index](../../Project%20Moirae%20Code/docs/decisions/README.md) |
| Portable contracts, dual principals, scope, compatibility, lifecycle, model/speech, and naming | Runtime Contracts [decision index](../../Project%20Runtime%20Contracts/docs/decisions/README.md), ADR-0001 through ADR-0006 |
| Current bounded Slice 02 design direction | Integration [boundary design](design/FATES-SLICE-002-runtime-boundary-resolution.md), [consistency review](reviews/FATES-SLICE-002-cross-owner-consistency-review.md), and owner approvals |

Acceptance does not imply implementation. Dual-principal enforcement is incomplete end to end, Moirae's host-enforcement ADR is implementation-pending, Mnemosyne provenance admission is incomplete, and Slice 02 is inactive.

## Component research and requirements

| Repository | Research/source material | How to use it |
| --- | --- | --- |
| Ananke | [research additions](../../Project%20Ananke/docs/PROJECT_ANANKE_RESEARCH_AND_REQUIREMENTS.md), [independent review](../../Project%20Ananke/docs/INDEPENDENT_ARCHITECTURE_REVIEW.md), [vision](../../Project%20Ananke/docs/VISION.md) | Requirements and review rationale for skills, approval, sandbox/network/credentials, voice/browser risk, and explanation. Verify against accepted ADRs and code. |
| Mnemosyne | [research additions](../../Project%20Mnemosyne/docs/PROJECT_MNEMOSYNE_RESEARCH_AND_REQUIREMENTS.md), [vault specification](../../Project%20Mnemosyne/docs/portable-vault-specification.md), [Almanac model](../../Project%20Mnemosyne/docs/ALMANAC_MODEL.md) | Requirements for memory separation, vaults, Restart Packs, conflict/staleness, and provenance. The vault spec separates guarantees from open questions. |
| Horae | [research additions](../../Project%20Horae/docs/PROJECT_HORAE_RESEARCH_AND_REQUIREMENTS.md), [open questions](../../Project%20Horae/docs/notes/open-design-questions.md), [composition model](../../Project%20Horae/docs/composition-model.md) | Inputs for capability provisioning, lifecycle, cancellation, model/voice/framework support, and unresolved degradation/ranking/identity questions. |
| Moirae Code | [research additions](../../Project%20Moirae%20Code/docs/MOIRAE_CODE_RESEARCH_AND_REQUIREMENTS.md), [proposed blueprint](../../Project%20Moirae%20Code/docs/Moirae%20Code%20%E2%80%94%20proposed%20product%20blue.txt), [extension security](../../Project%20Moirae%20Code/docs/extension-security-model.md) | Product/prior-art input for the editor host, skills, providers, sandboxes, Git, UI, and extensions. The blueprint is aspirational. |
| Runtime Contracts | [research additions](../../Project%20Runtime%20Contracts/docs/PROJECT_RUNTIME_CONTRACTS_RESEARCH_ADDITIONS.md), [roadmap](../../Project%20Runtime%20Contracts/docs/ROADMAP.md), [design gates](../../Project%20Runtime%20Contracts/docs/design-gates.md) | Candidate portable families. Lifecycle and model/speech sketches are superseded by protocol 1.3/1.4; browser, memory vocabulary, and preflight remain candidates. |

## Integrated research assessments

The coordination repository already contains scoped assessments under [`docs/research`](research):

- [source-to-control matrix](research/fates-source-to-control-matrix.md)
- [security test catalogue](research/fates-security-test-catalogue.md)
- [information-flow assessment](research/fates-information-flow-assessment.md)
- [gateway/workflow assessment](research/fates-gateway-workflow-assessment.md)
- [content-preflight assessment](research/fates-content-preflight-assessment.md)
- [capability-gap matrix](research/fates-capability-gap-matrix.md)
- [external research assessment](research/fates-external-research-assessment.md)
- [enterprise control-plane assessment](research/fates-enterprise-control-plane-assessment.md)
- [derived-understanding assessment](research/fates-derived-understanding-assessment.md)
- [MCP 2026-07-28 impact assessment](research/mcp-2026-07-28-impact-assessment.md)
- [proposed decision backlog](research/proposed-decision-backlog.md)

These are evidence and decision-routing aids. Their recommendations require the named owner, an accepted decision where needed, implementation, and tests before becoming current architecture.

## Candidate and deferred ideas

- Shared Content Surface Preflight envelope and cross-Fate routing.
- Persistent idempotency, reconciliation, compensation, and durable Horae workflows.
- Discovery/origin attestation, cache invalidation, and tool/server quarantine.
- Cross-server information flow and narrow declassification.
- Host isolation, extension/terminal/Git enforcement, production secret brokering, and controlled network egress.
- Provenance-aware memory admission, claim dependencies/ACL lineage, retrieval receipts, and derived-understanding benchmarks.
- Governed model/provider fallback, deterministic budgets/emergency stop, headless authorization, fleet policy, and audit integrity.
- Browser-action and shared project-memory record families in Runtime Contracts.
- Product-layer enterprise authorization/dashboard and experimental documentation/workflow import adapters.

None is current product truth merely because it appears in research or a roadmap.

## Rejected or constrained directions

The decision backlog records research outcomes that should not be reintroduced without an explicit owner reversal:

- No new “understanding Fate”; derived understanding stays within Mnemosyne.
- A generic gateway cannot replace Ananke as policy authority or erase origin.
- An LLM classifier is not a security boundary.
- No silent model/provider fallback.
- Model summaries are not primary/self-corroborating evidence.
- Enterprise dashboards do not belong in core portable contracts.

## Research handling rule

For any proposed addition: identify the semantic owner; separate neutral representation from domain behavior; verify at least two sides of a claimed integration; state threat/bypass implications; decide compatibility/version impact; and require tests. Until those steps are complete, classify it as candidate, prior art, experiment, or deferred work—not implemented architecture.
