# The Fates — Requirements and Research Traceability

**Status:** architecture/research baseline; no implementation activated
**Date:** 2026-08-09
**Compatibility baseline:** `fates-slice-002-2026-08-09`
**Scope:** Ananke, Mnemosyne, Horae, Moirae Code, Runtime Contracts, and the Integration evidence layer

This document reconciles the eleven post-Slice-02 research findings against the
actual Fates architecture, accepted decisions, current packages, contracts,
sealed evidence, and roadmap. It is deliberately an Integration artifact. It
does not activate Slice 03 or 003A, change a component repository, change a
contract, or turn a research recommendation into an implementation claim.

## Decision summary

1. Slice 02 remains accepted and sealed at the slice level. Its global
   compatibility status remains `provisional` only because the locked Moirae
   checkpoint is `pushed_untagged`; this assessment does not reopen that state.
2. The bounded Slice 02 route proves a narrow, harmless, fresh-inspection,
   one-dispatch handoff. It does not prove general host governance, general
   value-level information flow, durable recovery, credential brokering, or
   qualified memory admission.
3. No new Fate is needed. Ananke remains the sole action authority; Mnemosyne
   remains memory and provenance authority; Horae remains discovery,
   composition, freshness, and routing authority; Moirae remains the host/UI
   boundary; Runtime Contracts remains the neutral structural contract layer.
4. The largest newly confirmed requirements are:
   - value-level provenance and destination-aware information flow;
   - a session composition invariant derived from the Rule of Two;
   - an explicit separation between process-origin proof and OS containment;
   - a durable authority/effect boundary with indeterminate outcomes;
   - mature credential custody behind handles or delegated authority;
   - memory evidence that can never become execution authority;
   - synchronous minimal effect evidence with asynchronous enrichment.
5. 003A is **YES WITH PREREQUISITES**, but only as a bounded process-origin
   and governed-route proof. The Moirae constrained-host ADR must first state
   that process identity/origin, route governance, and OS containment are
   separate claims. OS containment is a separate 003B-or-later capability and
   is required before any claim of host-wide governed local effects.
6. The recommended future order is 003A route/origin proof, 003B OS
   containment, durable governed effects, value-flow/declassification, memory
   admission and temporal lifecycle, then modern MCP and supply-chain
   hardening. These are proposals only; the active slot remains idle.

## How to read this document

The register uses these status terms:

- **PROVEN** — the stated bounded property is supported by current acceptance
  evidence or repeatable component evidence. The scope is stated explicitly;
  it is not a claim about a larger property.
- **IMPLEMENTED_NOT_INTEGRATION_PROVEN** — code or owner-local tests exist,
  but the cross-Fate or live evidence threshold has not been met.
- **PARTIAL** — a relevant boundary or primitive exists, but the requirement
  is incomplete or has an important unverified path.
- **DOCUMENTED** — the rule is an accepted law, ADR, threat model, or design
  boundary, without the enforcement proof needed to call it implemented.
- **PLANNED** — the requirement is accepted as future work with an owner and
  a bounded validation direction.
- **RESEARCH_REQUIRED** — the requirement needs a design experiment, threat
  model, or decision before implementation is safe.
- **DEFERRED** — intentionally held outside the current slice order.
- **REJECTED** — explicitly excluded from the architecture or from this
  research conclusion.

Evidence is labelled in prose as one of:

- **Source fact** — a fact from a primary external source or a local file.
- **Project claim** — a performance, maturity, or scope claim made by an
  external project; it is not a Fates guarantee.
- **Inference** — a conclusion derived by comparing evidence with Fates
  boundaries.
- **Recommendation** — a proposed Fates decision, not current behavior.

## Current Fates baseline

### Sealed state and control state

The authoritative local records are:

- `docs/SOURCE_OF_TRUTH.md`
- `docs/SYSTEM_MAP.md`
- `docs/INTEGRATION.md`
- `docs/architecture-laws.md`
- `docs/checkpoint-policy.md`
- `fates-lock.json`
- `compatibility-matrix.json`
- `active-slice.json`
- `slices/002-governed-action-handoff/slice.json`
- `docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json`

The current lock is `fates-slice-002-2026-08-09`, with
`integrationLevel: runtime_validated` and `sealStatus: provisional`. The
locked component references are:

| Component | Locked checkpoint | Checkpoint state | Boundary relevant to this register |
|---|---|---|---|
| Adrasteia / Runtime Contracts baseline | `124b6aee2629a3147739934ad5f1b45b32c8ba46`, `adrasteia-adoption-v0.4.0-protocol-1.4.0` | `sealed_tagged` | Structural, portable contracts only |
| Ananke | `52b512885edf3fec7ff7ce4b4dcbd3958b170ba4`, `ananke-fates-slice-002-v0.2.0-protocol-1.4.0` | `sealed_tagged` | Policy, approval, execution, typed outcome, audit |
| Mnemosyne | `f4ab76a9760f856d78908d35facceb068d78c8e5` | `sealed_tagged` | Memory, provenance direction, reliability, retrieval, conflicts |
| Horae | `9566eb2764339d6a6fe143c1630eeb009e00a7bd`, `horae-fates-slice-002-v0.1.0-protocol-1.4.0` | `sealed_tagged` | Discovery, admission, freshness, capability reduction, relay |
| Moirae Code | `a4783db271a61848c66ac4f6652a539bdb515e28` | `pushed_untagged` | Locked compatibility checkpoint; no host implementation |

The post-Slice-02 readiness assessment separately examined Moirae design
checkpoint `bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6`. That clean, pushed,
CI-green documentation checkpoint is not the compatibility lock reference and
does not represent an implemented host runtime.

The active control state is idle: `active-slice.json` has
`status: idle`, `activeSliceId: null`, and `nextRecommendedSlice:
FATES-SLICE-003`. That recommendation is not an activation.

### Current authority map

| Fate | Current responsibility | Explicit non-responsibility |
|---|---|---|
| Ananke | Final policy decision, approval binding, execution chokepoint, typed outcome, producer-owned audit | OS sandbox, general memory retrieval, broad destination-aware flow, production credential custody |
| Mnemosyne | Governed memory, source/reliability/conflict/decay/retrieval semantics, future provenance admission | Action authority, approval, grant minting, credential brokering |
| Horae | Runtime discovery/admission, compatibility, readiness/freshness, composition, capability reduction, bounded relay/workflow scaffolding | Approval, execution authority, memory retrieval, credential minting |
| Moirae Code | Host/UI integration and proposed constrained action host | Claim that an IDE, terminal, extension, child process, or OS is globally governed |
| Runtime Contracts | Portable identity, scope, delegation references, readiness, capabilities, correlation, generic results/events/audit/lifecycle shapes | Policy, authorization, execution, persistence, memory, reliability, credential or flow-label semantics |
| Integration | Compatibility locks, cross-Fate evidence, acceptance scope, sealed-state record | A new policy or runtime authority |

## Requirements traceability register

### RTA-001 — Ananke is the sole action authority and execution chokepoint

- **Lesson / requirement:** Every consequential action must cross Ananke’s
  policy/approval/execution boundary. Mnemosyne may advise, Horae may route
  and reduce capability, and Moirae may present a host action, but none may
  widen authority or execute around Ananke.
- **Threat / failure:** A model, memory result, host surface, gateway, or
  provider can create an unreviewed side effect by invoking a tool or raw
  credential directly.
- **Source / evidence:** Local architecture laws 2, 3, 4, and 5;
  Ananke `ADR-0029-CHOKEPOINT-ENFORCEMENT.md`;
  Ananke `docs/security/deployment-assumptions.md`;
  `docs/SYSTEM_MAP.md`; live Slice 02 evidence showing one canonical Ananke
  dispatch and no Horae fixture read.
- **Owning Fates:** Ananke (authority); Horae and Moirae (route/host
  enforcement); Integration (cross-Fate proof).
- **Invariant:** No successful consequential effect exists without a
  current Ananke decision and the exact bound request reaching the Ananke
  executor. Any alternative path is denied or outside the governed claim.
- **Existing ADR / doc / package:** Ananke `ADR-0029`, `ADR-0028`,
  `APPROVAL_BINDING.md`, `packages/runtime-core`, Horae
  `packages/slice02-relay`, Integration `docs/architecture-laws.md`.
- **Implementation status:** **PROVEN** for the bounded Slice 02 harmless
  fixed-read route; **PARTIAL** as a general deployment property because
  current threat models explicitly list direct terminal, provider, filesystem,
  and extension bypasses outside the implementation.
- **Validation / evidence:** Slice 02 live acceptance: compiled Ananke and
  Horae processes, fresh inspection, one HTTP dispatch, one physical producer
  read, identifier/digest preservation, and fail-closed negatives.
- **Planned slice / future task:** 003A and 003B extend the host/process claim;
  durable governed effects extend the authority/effect record. Do not broaden
  the Slice 02 claim retroactively.
- **Disposition:** **ALREADY COVERED** at the architecture level; keep as a
  cross-Fate acceptance invariant.

### RTA-002 — Approval binds the exact consequential request

- **Lesson / requirement:** Approval must bind the canonical action, server or
  provider, arguments, principals, tenant/project/workspace, resource scope,
  purpose, session, policy version, action ID, expiry, and relevant effect
  controls. Observational correlation fields must not substitute for bound
  fields.
- **Threat / failure:** Approval laundering, argument substitution, confused
  deputy behavior, or replay of a decision for a different destination or
  purpose.
- **Source / evidence:** Ananke `docs/APPROVAL_BINDING.md`; exact canonical
  hash tests; Slice 02 exact action/argument/schema/receipt validation.
- **Owning Fates:** Ananke; Horae preserves the request and receipt; Runtime
  Contracts carries descriptive identity/scope/references only.
- **Invariant:** A change to any bound field invalidates the approval. A
  correlation ID, request ID, or transport session alone never proves
  authority.
- **Existing ADR / doc / package:** Ananke `APPROVAL_BINDING.md`,
  `packages/authority-engine/src/approval-store.ts`,
  `packages/runtime-core`, Runtime Contracts `Delegation` and
  `ExecutionContext` shapes.
- **Implementation status:** **PROVEN** for the current canonical binding
  and bounded handoff; persistent approval consumption and durable replay
  resistance are not yet implemented.
- **Validation / evidence:** Ananke owner-local suite and Slice 02 live and
  deterministic negatives for malformed arguments, origin, identity,
  endpoint, digest, and unauthorized metadata.
- **Planned slice / future task:** Durable approval/idempotency state belongs
  with the durable governed-effect task, not Runtime Contracts.
- **Disposition:** **ALREADY COVERED**; clarify its relationship to durable
  dispatch evidence in an Ananke ADR amendment when that work is authorized.

### RTA-003 — Fresh runtime identity, endpoint, capability, and readiness

- **Lesson / requirement:** A route must re-verify the runtime identity,
  instance, endpoint, health/readiness, compatibility, capability, and
  producer attestation at the point of a consequential dispatch. Reconnect or
  drift invalidates stale route assumptions.
- **Threat / failure:** Endpoint substitution, stale registration, runtime
  identity drift, capability widening, wrong producer, or dispatch to a
  degraded process.
- **Source / evidence:** Horae
  `docs/ADR-XXXX-fail-closed-governed-action-handoff-and-result-relay.md`;
  `packages/slice02-relay`; Runtime Contracts readiness and registration
  shapes; live Slice 02 evidence.
- **Owning Fates:** Horae (fresh inspection and route); Ananke (authority and
  producer); Integration (compatibility evidence).
- **Invariant:** A fresh, bounded inspection must precede each governed route;
  unknown identity, endpoint, readiness, capability, origin, schema, or
  producer attestation fails closed.
- **Existing ADR / doc / package:** Horae slice02 relay and registry;
  Integration `docs/INTEGRATION.md`; Runtime Contracts protocol 1.4.0.
- **Implementation status:** **PROVEN** for the bounded Slice 02 action. It
  is not a claim that every future MCP feature, remote connector, or host
  process is covered.
- **Validation / evidence:** Live fresh inspection and route; Horae focused
  tests for stale/not-ready/protocol/endpoint/instance/action/capability
  drift; all 55 Integration checks passed at the sealed baseline.
- **Planned slice / future task:** Extend the same receipt discipline to
  modern MCP discovery, cache invalidation, registration changes, and
  reconnect paths only after a feature-version ADR.
- **Disposition:** **ALREADY COVERED** for Slice 02; **CLARIFY EXISTING ADR**
  for the modern MCP migration.

### RTA-004 — Durable indeterminate outcome and no blind retry

- **Lesson / requirement:** A timeout or lost response after dispatch is not
  automatically a failure. The system must represent an indeterminate effect,
  preserve the attempt, and reconcile before any retry. “Exactly once” is not
  a universal property; at-most-one dispatch attempt, idempotency, or
  effectively-once behavior must be stated per effect protocol.
- **Threat / failure:** A network retry duplicates a payment, write, message,
  or other irreversible effect whose first attempt may already have succeeded.
- **Source / evidence:** Horae slice02 relay states
  `timed_out` and `indeterminate`, with no retry; Ananke outcome vocabulary
  includes `TIMED_OUT` and `PARTIAL_SUCCESS` but no durable generic
  `UNKNOWN`; `docs/research/fates-gateway-workflow-assessment.md`;
  `docs/research/fates-capability-gap-matrix.md`.
- **Owning Fates:** Ananke (effect state and outcome authority); Horae
  (transport and route state); Integration (cross-process failure proof).
- **Invariant:** After physical dispatch without a typed result, the state is
  `UNKNOWN`/indeterminate until a trusted reconciliation or provider-specific
  idempotency proof resolves it. No blind automatic retry.
- **Existing ADR / doc / package:** Ananke `OUTCOME_ENVELOPE.md`,
  `OUTCOME_SCHEMA.md`, `packages/runtime-core`; Horae
  `packages/slice02-relay` and fail-closed handoff ADR.
- **Implementation status:** **IMPLEMENTED_NOT_INTEGRATION_PROVEN**. The
  bounded Horae semantics and owner-local tests exist, but the sealed live
  evidence did not induce live timeout or post-dispatch transport loss. The
  generic Ananke outcome model also needs a durable indeterminate state.
- **Validation / evidence:** Deterministic Horae tests cover timeout,
  post-dispatch transport loss, typed denial, and no retry; live acceptance
  deliberately records these fault cases as not induced.
- **Planned slice / future task:** Durable governed effects: write-ahead
  intent, dispatch marker, attempt identity, reconciliation state, and
  provider-specific idempotency/compensation rules.
- **Disposition:** **NEW INVARIANT / TEST ONLY** for the no-blind-retry rule,
  followed by a **FUTURE IMPLEMENTATION TASK** for durable state.

### RTA-005 — Value-level provenance follows data into execution

- **Lesson / requirement:** Provenance and information-flow labels must travel
  with values, claims, tool results, retrieved records, transformed content,
  summaries, planner inputs, and final argument construction. A label visible
  only in a prompt or metadata side-channel is not a security boundary.
- **Threat / failure:** Untrusted instructions embedded in a document, tool
  result, memory record, or summary influence a sensitive read or public write
  after the original source identity has been lost.
- **Source / evidence:** Ananke `ADR-0030-INFORMATION-FLOW-CONTROL.md` is
  **Proposed for future work** and explicitly guarantees no implemented value
  or argument taint/lineage; `docs/research/fates-information-flow-assessment.md`;
  the FIDES information-flow design describes integrity/confidentiality
  labels propagating through tool calls and enforcing policy before sensitive
  tools ([Microsoft FIDES documentation](https://learn.microsoft.com/en-us/agent-framework/agents/security));
  CaMeL describes a protective layer that separates trusted control/data flow
  and uses capabilities for private-data exfiltration control
  ([CaMeL paper](https://arxiv.org/abs/2503.18813)).
- **Owning Fates:** Mnemosyne owns source/claim/derived lineage; Horae owns
  propagation through plans, retries, subagents, and gateways; Ananke owns
  destination, declassification, and action decisions; Moirae explains the
  result; Runtime Contracts may carry only a neutral reference/envelope if a
  cross-runtime need is proven.
- **Invariant:** For every value used to form a consequential argument, the
  runtime can identify the source set, transform/derivation chain, tenant,
  sensitivity/integrity, purpose, destination, and applicable
  declassification. A lossy or unbound chain is not trusted by default.
- **Existing ADR / doc / package:** Ananke `ADR-0030`; Mnemosyne provenance
  admission ADRs and `packages/schema`; Horae information-flow assessment;
  no current Fates package implements the full lattice.
- **Implementation status:** **RESEARCH_REQUIRED**. Current Ananke approval
  hashing binds argument bytes and context, and Slice 02 receipts bind action
  origin/schema, but neither is value provenance.
- **Validation / evidence:** No taint implementation or integration test is
  present. Experiment A below is the required design gate.
- **Planned slice / future task:** Value-flow/declassification slice after
  durable effect evidence; first establish a neutral cross-runtime receipt
  only if the experiment proves that local ownership cannot preserve it.
- **Disposition:** **CLARIFY EXISTING ADR** plus **NEW INVARIANT / TEST ONLY**
  now; do not add a broad taint lattice to Runtime Contracts yet.

### RTA-006 — Unknown, stripped, or conflicting provenance fails closed

- **Lesson / requirement:** Missing, malformed, contradictory, tenant-mismatched,
  or unverifiable lineage must break the trusted flow, quarantine the data,
  require explicit review, or deny the effect. It must never silently become
  “untrusted but usable as trusted.”
- **Threat / failure:** A model paraphrase, compaction summary, cache entry,
  alias, gateway, or connector strips the source label while retaining the
  sensitive value or instruction.
- **Source / evidence:** `docs/research/fates-information-flow-assessment.md`
  specifies restrictive propagation, immutable tenant/destination identity,
  narrow declassification, and fail-closed unknown lineage; Mnemosyne laws
  require provenance but current records have only partial source references.
- **Owning Fates:** Mnemosyne (lineage completeness and quarantine); Horae
  (transport/plan preservation); Ananke (destination/declassification
  decision).
- **Invariant:** Unknown or inconsistent lineage cannot authorize a sensitive
  read, sensitive-to-public flow, or consequential write. A summary is
  admissible only with a verifiable dependency set and conservative joined
  labels.
- **Existing ADR / doc / package:** Mnemosyne `LAWS_OF_MNEMOSYNE.md`,
  provenance admission design gate; Ananke `ADR-0030`; Integration information
  flow assessment.
- **Implementation status:** **DOCUMENTED**. The rule exists as an
  architecture requirement; current retrieval and memory packages do not
  implement the full behavior.
- **Validation / evidence:** No end-to-end canary test exists. Experiment A
  covers stripping, truncation, paraphrase, disagreement, and tenant drift.
- **Planned slice / future task:** Value-flow/declassification and qualified
  memory admission; include a negative-evidence test for every transformation
  boundary.
- **Disposition:** **NEW INVARIANT / TEST ONLY** before implementation; no
  new Fate.

### RTA-007 — Rule-of-Two session composition invariant

- **Lesson / requirement:** A session combining untrusted input, sensitive
  data/systems, and external state change/communication must have a trusted
  mediation, supervision, containment, or fresh-context transition. A literal
  universal “at most two” rule is a useful threat model, not automatically the
  Fates contract.
- **Threat / failure:** An injected instruction in public content causes an
  agent to read private data and exfiltrate it through a consequential sink.
- **Source / evidence:** Meta defines the three properties and requires a
  fresh context or supervision when all three are needed in one session
  ([Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/));
  current Fates already separate source/memory, capability composition,
  approval, and host execution but do not compute this combined invariant.
- **Owning Fates:** Mnemosyne classifies source/evidence; Horae computes
  capability/session composition and safe transitions; Ananke makes the final
  action/declassification decision; Moirae declares or enforces host
  containment/supervision where applicable.
- **Invariant:** A session with all three risk properties must either (a) lose
  one property through a verifiable, one-way transition, (b) pass a trusted
  independent mediation/containment gate, or (c) require human or equivalent
  supervision. Tool declarations or model assertions alone do not satisfy it.
- **Existing ADR / doc / package:** Fates architecture laws; Horae
  capability-reduction and supervision state machine; Ananke approval/policy;
  Moirae constrained-host ADR; no formal Rule-of-Two ADR or session lattice.
- **Implementation status:** **RESEARCH_REQUIRED**. The architecture has the
  owners needed to implement the rule, but no session-level composition check
  or test exists.
- **Validation / evidence:** Experiment A should produce the minimum label and
  capability inputs; a later adversarial session matrix must exercise AB, AC,
  BC, and ABC transitions.
- **Planned slice / future task:** Value-flow/declassification slice, with a
  design gate for the composition invariant before broad autonomous effects.
- **Disposition:** **NEW INVARIANT / TEST ONLY** initially; a new ADR is
  required only if the concrete capability/session model introduces durable
  state or cross-runtime contract fields.

### RTA-008 — IDE/process origin is not OS containment

- **Lesson / requirement:** A constrained process can prove its claimed host
  role, origin, route, expected Horae endpoint, and exact action. That proof
  does not prove that the IDE, terminal, debugger, extension, child process,
  filesystem, network, or OS cannot bypass the route.
- **Threat / failure:** A test-only host receipt is mistaken for a global
  Moirae security boundary; a user or extension invokes a provider, shell,
  file, or network directly.
- **Source / evidence:** Moirae
  `docs/ADR-XXXX-constrained-governed-action-request-and-result-host.md`
  explicitly limits the host to the exact Slice 02 action and says no global
  Moirae governance; `docs/trust-boundaries.md` and
  `docs/extension-security-model.md` enumerate current bypasses.
- **Owning Fates:** Moirae (host claims and OS enforcement); Horae (governed
  route); Ananke (action authority); Integration (separate evidence claims).
- **Invariant:** Every acceptance record names which of these it proves:
  process origin, route governance, identity, OS containment, credential
  isolation, or bypass resistance. No record may infer one from another.
- **Existing ADR / doc / package:** Moirae constrained-host ADR, trust-boundary
  and extension-security docs; the 2026-08-09 ADR clarification; Integration
  post-Slice-02 readiness assessment.
- **Implementation status:** **DOCUMENTED** for the distinction and current
  non-claims; **PLANNED** for enforcement. The locked Moirae checkpoint is
  design-only.
- **Validation / evidence:** The Moirae design proposes a harness that proves
  absent shell/provider/file/direct-Ananke paths. It does not prove an OS
  sandbox or host-wide bypass resistance.
- **Planned slice / future task:** The five-property and TCB clarification is
  recorded in the Moirae ADR; prove OS enforcement separately in 003B or a
  later platform-specific slice.
- **Disposition:** **CLARIFY EXISTING ADR (completed)** before 003A;
  **FUTURE IMPLEMENTATION TASK** for OS containment.

### RTA-009 — Ananke authority decision is separate from effect execution

- **Lesson / requirement:** The decision to authorize an effect and the
  physical dispatch/executor that creates the effect are distinct internal
  security states, even when both remain in Ananke. The boundary must bind
  the exact request, credentials/handle, effect target, attempt, and outcome.
- **Threat / failure:** A stale approval is reused by a worker; a crash leaves
  the system unable to distinguish “not dispatched” from “dispatched but
  result lost”; an effect adapter changes the target after approval.
- **Source / evidence:** Ananke currently has a
  `classify → policy → approval → execute → outcome → audit` pipeline and an
  exclusive execution chokepoint. `packages/runtime-core/src/index.ts`
  records the request before policy and outcome after executor return, but
  has no durable pre-dispatch intent/dispatch marker protocol.
- **Owning Fates:** Ananke owns both authority and physical execution boundary;
  Horae preserves route/attempt evidence; Integration tests the cross-process
  state transitions.
- **Invariant:** A physical effect requires a durable, exact decision record,
  an effect-bound execution attempt, and an explicit completed, failed,
  denied, or indeterminate result. An executor cannot mint authority from a
  route or model request.
- **Existing ADR / doc / package:** Ananke `ADR-0029`, `APPROVAL_BINDING.md`,
  `packages/runtime-core`, `packages/tool-router`; existing lifecycle and
  outcome docs.
- **Implementation status:** **PARTIAL**. The logical stages exist, but the
  crash-consistent durable boundary is not implemented.
- **Validation / evidence:** Owner-local pipeline tests and Slice 02
  one-dispatch evidence prove the logical boundary for the harmless action;
  no crash-window or durable dispatch-marker acceptance exists.
- **Planned slice / future task:** Durable governed effects; decide whether a
  separate effect service is necessary only after the threat model shows an
  isolation need. Do not create a second authority.
- **Disposition:** **CLARIFY EXISTING ADR** and then **FUTURE IMPLEMENTATION
  TASK**.

### RTA-010 — Credential custody uses handles or delegated authority

- **Lesson / requirement:** Models, prompts, memory, Horae, and ordinary host
  UI paths must not receive raw provider credentials. A governed action should
  reference a short-lived, audience-bound handle or delegated authority that
  is resolved at the effect boundary.
- **Threat / failure:** Credential leakage through model context, logs,
  memory, tool results, extension APIs, child processes, or a broad provider
  token that outlives the approved purpose.
- **Source / evidence:** Ananke `ADR-0029` and deployment assumptions prohibit
  raw tool credentials in agents; Runtime Contracts `Delegation` is reference
  metadata and explicitly does not mint, sign, store, validate, revoke, or
  exchange; Mnemosyne rejects high-confidence credential material but is not
  a DLP/key manager; Moirae broker interfaces are only scaffolded.
- **Owning Fates:** Ananke or a dedicated broker owns credential authority and
  effect-time resolution; Moirae owns local containment of the host; Horae
  carries only references; Mnemosyne stores no raw credential material.
- **Invariant:** No model-visible or memory-persisted raw secret; every handle
  is scoped to principal, audience, purpose, resource, action, session,
  expiry, and revocation state; handle use is auditable and fails closed on
  drift.
- **Existing ADR / doc / package:** Runtime Contracts ADR-0003 and
  `Delegation`; Ananke deployment assumptions and authority engine;
  Mnemosyne security model; Moirae trust boundaries.
- **Implementation status:** **PARTIAL**. The architectural prohibition and
  portable reference shapes exist; production credential custody and
  effect-time brokering do not.
- **Validation / evidence:** Current tests verify references and rejection
  paths, not a production vault/broker, handle revocation, or host bypass.
- **Planned slice / future task:** Credential custody design gate followed by
  the durable effect slice; keep raw secret handling out of Runtime Contracts.
- **Disposition:** **FUTURE IMPLEMENTATION TASK** with **RESEARCH_REQUIRED**
  comparison of mature primitives.

### RTA-011 — Memory is evidence and data, never execution authority

- **Lesson / requirement:** Retrieved or remembered content can inform a plan,
  lower confidence, or trigger review. It cannot approve an action, mint a
  grant, satisfy a fresh principal check, or replace Ananke policy and
  approval.
- **Threat / failure:** Memory poisoning, stale approval reuse, an old success
  record treated as authority, or a retrieved “system instruction” widening
  current permissions.
- **Source / evidence:** Mnemosyne `LAWS_OF_MNEMOSYNE.md` Law II,
  `SECURITY_MODEL.md`, `ARCHITECTURE.md`, and
  `docs/integration/ananke-boundary.md`; `shouldAnankeContinue` is metadata,
  not binding authority; Ananke remains the execution chokepoint.
- **Owning Fates:** Mnemosyne (evidence qualification); Ananke (fresh action
  authority); Horae (context transport without authority widening).
- **Invariant:** Every action re-evaluates current identity, scope, purpose,
  destination, policy, and approval at Ananke. No memory record or retrieval
  result can authorize an effect by itself.
- **Existing ADR / doc / package:** Mnemosyne laws/security model and
  Ananke integration boundary; Ananke `ADR-0029`; current retrieval and
  reliability engines.
- **Implementation status:** **PARTIAL**. The boundary is explicit and
  advisory-only integration exists, but end-to-end qualified context and
  action re-evaluation are not live-proven.
- **Validation / evidence:** Current owner-local tests cover advisory bridge,
  reliability, status filtering, restricted classification, and credential
  rejection. There is no live memory-to-Ananke action route in Slice 02.
- **Planned slice / future task:** Qualified memory admission and derived
  dependency work after the durable effect boundary; keep Mnemosyne outside
  the 003A route.
- **Disposition:** **ALREADY COVERED** as an architectural law; add a
  **NEW INVARIANT / TEST ONLY** acceptance to prevent regression.

### RTA-012 — Provenance-aware memory admission and derived lineage

- **Lesson / requirement:** Persistent semantic content should enter memory
  through a receipt-gated admission path with complete source/claim/derivation
  bindings, explicit admission state, and a separation between admission
  trust and later reliability scoring.
- **Threat / failure:** A poisoned or stale source becomes durable memory; a
  summary or derived claim outlives its source; a prior approval is treated as
  portable to changed content.
- **Source / evidence:** Mnemosyne accepted future design gate
  `ADR-00XX-PROVENANCE-ADMISSION-DESIGN-GATE.md` and proposed
  `ADR-XXXX-mnemosyne-provenance-aware-content-ingestion.md`; current
  `MemoryRecord` and `AlmanacStore` have a single source reference, no full
  claim binding, no admission envelope, and no derived dependency graph.
- **Owning Fates:** Mnemosyne; Ananke for any required decision; Horae only
  transports the resulting context/receipt.
- **Invariant:** Only `ADMITTED` content enters normal retrieval; content
  without complete, verifiable provenance is rejected, deferred, or
  quarantined. Admission is never implied by reliability or historical use.
- **Existing ADR / doc / package:** The two Mnemosyne provenance ADRs,
  `packages/schema`, `packages/almanac-store`, `packages/retrieval-engine`,
  and `packages/reliability-engine`.
- **Implementation status:** **PLANNED**. The design is accepted/future, not
  current behavior.
- **Validation / evidence:** No cross-Fate admission receipt or Ananke
  decision gate is implemented; current retrieval remains advisory.
- **Planned slice / future task:** Memory admission slice after value-flow
  vocabulary and durable effect evidence; include claim-level, multi-source,
  derived, quarantine, and source-mutation tests.
- **Disposition:** **FUTURE IMPLEMENTATION TASK**; no Runtime Contracts schema
  until a cross-runtime receipt is justified.

### RTA-013 — Bitemporal history, correction, deletion, and derived invalidation

- **Lesson / requirement:** Memory needs a distinction between world/valid
  time and system/knowledge time. Corrections, withdrawals, deletion/tombstone
  requests, and source changes must affect derived content without erasing
  the audit lineage needed to explain past decisions.
- **Threat / failure:** A current correction rewrites historical meaning; a
  withdrawn source continues to support a derived sensitive action; physical
  deletion removes the evidence needed to investigate an old decision.
- **Source / evidence:** Mnemosyne `memory-lifecycle.md` and roadmap state that
  resolved/archive/delete workflows, tombstones, full derived dependencies,
  and correction/deletion lifecycle are not implemented. Current SQLite
  records have `created_at` and `last_verified_at`, not a bitemporal event
  history.
- **Owning Fates:** Mnemosyne owns temporal and dependency semantics; Ananke
  owns action evidence that references memory; Integration verifies joined
  behavior without defining memory semantics.
- **Invariant:** A correction is a new system-known revision with valid-time
  semantics; a withdrawal/deletion makes affected content ineligible for new
  trust and propagates to derived dependents; historical audit references are
  retained or tombstoned according to a declared retention policy.
- **Existing ADR / doc / package:** Mnemosyne memory lifecycle, roadmap,
  schema, store, reliability engine; no accepted bitemporal ADR yet.
- **Implementation status:** **RESEARCH_REQUIRED**. The requirement is clear,
  but the temporal model, privacy/retention policy, and derived graph need a
  design decision.
- **Validation / evidence:** No current deletion/tombstone/derived invalidation
  integration evidence exists.
- **Planned slice / future task:** Mnemosyne temporal-lifecycle design gate,
  followed by qualified admission and invalidation. This remains outside
  003A.
- **Disposition:** **DEFER** pending a focused temporal model experiment;
  then **NEW ADR REQUIRED** before implementation.

### RTA-014 — Durable pre-dispatch evidence

- **Lesson / requirement:** Before a consequential effect, the system must
  durably record the minimum intent, exact binding, authority decision, target,
  credential/handle reference, and attempt identity. After dispatch it must
  durably capture a minimal result or indeterminate state.
- **Threat / failure:** A crash between approval, dispatch, and audit makes it
  impossible to tell whether an irreversible effect happened or whether a
  retry is safe.
- **Source / evidence:** Ananke `packages/runtime-core/src/index.ts` records
  a requested event and later outcome, but the default approval store is
  in-memory; SQLite audit is clearable and not append-only/tamper-evident; no
  atomic intent/dispatch marker/reconciliation protocol exists.
- **Owning Fates:** Ananke owns the synchronous hot path and durable authority
  evidence; Horae records route/transport facts; Integration verifies crash,
  timeout, and recovery states.
- **Invariant:** No governed effect dispatch is acknowledged until minimum
  pre-dispatch evidence is durable. If the outcome is unavailable, the record
  is durable `UNKNOWN`/indeterminate and blocks unsafe retry.
- **Existing ADR / doc / package:** Ananke runtime-core, outcome/audit docs,
  approval store, threat model; Integration decision backlog DEC-003 and
  DEC-008.
- **Implementation status:** **PLANNED**.
- **Validation / evidence:** Current Slice 02 proves one bounded dispatch, not
  crash consistency or durable recovery. Audit failure is fail-closed in a
  bounded path but is not a complete write-ahead protocol.
- **Planned slice / future task:** Durable governed effects; benchmark with
  synchronous evidence enabled and enrichment disabled in Experiment B.
- **Disposition:** **NEW INVARIANT / TEST ONLY** first; then **FUTURE
  IMPLEMENTATION TASK**.

### RTA-015 — Audit durability is separated from asynchronous enrichment

- **Lesson / requirement:** The synchronous path captures only the evidence
  needed to authorize and reconcile the effect. Rich traces, model
  explanations, memory indexing, analytics, dashboards, and notifications may
  be asynchronous and must not be allowed to silently widen authority.
- **Threat / failure:** Performance pressure moves a required decision or
  outcome audit off the critical path; an asynchronous observer becomes a
  second policy authority; missing telemetry is mistaken for missing effect
  evidence.
- **Source / evidence:** Existing Fates producer-owned audit rule in
  `docs/SYSTEM_MAP.md`; current Ananke audit implementation; Integration
  decision backlog DEC-016 and DEC-029; AGT’s documentation distinguishes
  action governance from outcome/compliance scope, while its reported latency
  values are project claims rather than Fates measurements
  ([AGT limitations](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/LIMITATIONS.md)).
- **Owning Fates:** Ananke owns synchronous authority/effect evidence;
  Integration owns the acceptance record; Horae/Moirae/Mnemosyne may enrich
  only after the minimum evidence is durable.
- **Invariant:** Failure of enrichment cannot authorize an action or erase
  the minimum durable evidence. Failure of required evidence fails closed.
- **Existing ADR / doc / package:** Ananke audit docs and runtime-core;
  Integration `docs/SYSTEM_MAP.md`, `docs/research/fates-security-test-catalogue.md`.
- **Implementation status:** **DOCUMENTED** as an architectural split;
  **PLANNED** as a crash-consistent implementation and benchmark.
- **Validation / evidence:** Current audit tests and Slice 02 evidence cover
  structured events and route joins, not an asynchronous enrichment queue
  with a hard authority boundary.
- **Planned slice / future task:** Durable governed effects and audit-integrity
  slice; publish SLOs only after Experiment B baselines.
- **Disposition:** **CLARIFY EXISTING ADR**; no new audit authority.

### RTA-016 — Transport lifecycle is not execution authority; fresh MCP checks

- **Lesson / requirement:** A protocol or transport session is not a grant.
  MCP registration, discovery, capability, endpoint, authentication, and
  reconnect state must be fresh and scope-bound for consequential calls.
- **Threat / failure:** A stale transport session, token passthrough, cached
  capability, or reconnect path is treated as proof of current authority.
- **Source / evidence:** `docs/research/mcp-2026-07-28-impact-assessment.md`;
  Runtime Contracts `RuntimeSession` explicitly describes logical context, not
  MCP authentication or credential proof; Horae Slice 02 freshly inspects
  Ananke and rejects drift; Ananke `ADR-0028` treats MCP metadata as untrusted.
- **Owning Fates:** Horae (discovery/freshness), Ananke (authorization and
  effect), Runtime Contracts (neutral session/identity shapes), Moirae (host
  presentation only).
- **Invariant:** Transport state can carry correlation and protocol context,
  never authority. A consequential call needs a current scoped receipt and
  fresh Ananke decision; token passthrough is prohibited.
- **Existing ADR / doc / package:** Horae registry/relay, Ananke MCP
  compatibility/chokepoint ADRs, Runtime Contracts session/identity, local
  MCP impact assessment.
- **Implementation status:** **PROVEN** for the bounded Slice 02 route and
  **DOCUMENTED** for the modern MCP posture. The current Ananke adapter is
  legacy SDK/stdio and does not implement every 2026-07-28 feature.
- **Validation / evidence:** Slice 02 fresh inspection and fail-closed route
  negatives; no modern MCP wire migration has been activated.
- **Planned slice / future task:** Feature-version MCP ADR and conformance
  matrix before adopting modern discovery, MRTR, tasks, cache, or routing
  headers.
- **Disposition:** **ALREADY COVERED** for current route; **CLARIFY EXISTING
  ADR** for modern MCP.

### RTA-017 — Current MCP version/features need an explicit migration matrix

- **Lesson / requirement:** MCP’s current feature set must be treated as
  versioned capability input, not as a universal assumption. The 2026-07-28
  specification removes protocol-level sessions, adds MRTR, header routing,
  cache metadata, authorization hardening, and moves Tasks to an extension.
- **Threat / failure:** A gateway or SDK silently downgrades, falls back, or
  interprets session/caching/task state differently across protocol eras.
- **Source / evidence:** MCP’s primary release note says protocol-level
  sessions were dropped, MRTR uses `resultType: input_required`, routing uses
  `Mcp-Method`/`Mcp-Name`, list results carry `ttlMs`/`cacheScope`, and Tasks
  moved to an extension ([MCP 2026-07-28 specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/)).
  Local `mcp-2026-07-28-impact-assessment.md` records SDK/documentation
  inconsistency and the current Fates legacy position.
- **Owning Fates:** Horae owns protocol negotiation/discovery; Ananke owns
  authorization semantics; Runtime Contracts exposes only supported ranges
  and neutral metadata; Integration owns the feature-version evidence.
- **Invariant:** A feature is usable only when both endpoints advertise,
  negotiate, and validate it. Unknown extensions, downgrade ambiguity, cache
  scope ambiguity, or auth issuer drift fail closed for consequential use.
- **Existing ADR / doc / package:** Horae protocol negotiation and registry;
  Ananke `ADR-0028`; Runtime Contracts protocol 1.4.0; local MCP impact
  assessment.
- **Implementation status:** **RESEARCH_REQUIRED**.
- **Validation / evidence:** Current validators cover semantic protocol range
  and Slice 02 readiness, not a 2026-07-28 wire matrix or modern SDK
  integration.
- **Planned slice / future task:** Modern MCP migration design gate after
  durable effect and origin proofs; no changes to Slice 02.
- **Disposition:** **DEFERRED** until a versioned conformance matrix exists.

### RTA-018 — Tool origin, attestation, behavior, and quarantine

- **Lesson / requirement:** Discovery is not trust. A tool/server must have a
  verifiable origin, schema/capability digest, identity, attestation or
  registration evidence, and behavior/drift response. Unknown or changed
  tools are quarantined or reduced until re-admitted.
- **Threat / failure:** Typosquatting, tool poisoning, schema drift, malicious
  gateway substitution, or an unregistered server receives credentials or
  sensitive context.
- **Source / evidence:** Slice 02 binds a fixed producer/action/schema and
  checks producer attestation; Horae registry checks identity, endpoint,
  readiness, compatibility, and capabilities. General tool admission,
  behavior monitoring, quarantine, and cache invalidation remain missing in
  decision backlog DEC-004 and DEC-007. AGT documents MCP security gateway
  and drift-monitoring features as project scope
  ([AGT repository](https://github.com/microsoft/agent-governance-toolkit)).
- **Owning Fates:** Horae (discovery/admission), Ananke (authority and effect),
  Integration (pinned evidence), Moirae (host exposure boundary).
- **Invariant:** Tool identity, origin, schema, capability, and destination
  are bound to the decision; any drift invalidates the route and credentials.
- **Existing ADR / doc / package:** Horae registry/relay and fail-closed ADR;
  Ananke MCP/chokepoint ADRs; Integration DEC-004/007/030.
- **Implementation status:** **PARTIAL**. The narrow fixed producer is
  attested and fresh-checked; general admission/behavior/quarantine is not.
- **Validation / evidence:** Slice 02 producer mismatch and drift negatives;
  no adversarial tool registry or remote supply-chain acceptance exists.
- **Planned slice / future task:** Tool admission/supply-chain slice after
  modern MCP feature matrix and credential custody.
- **Disposition:** **FUTURE IMPLEMENTATION TASK**; no gateway becomes policy
  authority.

### RTA-019 — Runtime Contracts remain small and neutral

- **Lesson / requirement:** Shared contracts should carry stable identity,
  scope, delegation references, readiness, capabilities, correlation, generic
  result/event/audit references, and lifecycle/idempotency envelopes. They
  must not carry Ananke policy semantics, Mnemosyne memory/reliability/flow
  lattices, credential internals, persistence behavior, or authority inference.
- **Threat / failure:** Contract growth duplicates Fate ownership, creates
  portable authority by accident, or couples every component to a policy or
  storage implementation.
- **Source / evidence:** Runtime Contracts README, protocol specification,
  contract-ownership matrix, design gates, ADR-0003, ADR-0004, and ADR-0001;
  current package `project-runtime-contracts@0.4.0`, protocol 1.4.0.
- **Owning Fates:** Runtime Contracts owns only structural shape; each Fate
  owns its semantics; Integration proves compatibility.
- **Invariant:** A schema-valid contract is not an authorization decision,
  execution result, memory admission, credential, or durable guarantee.
- **Existing ADR / doc / package:** Runtime Contracts `README.md`,
  `docs/protocol-specification.md`, `docs/contract-ownership.md`,
  `docs/design-gates.md`, `src/identity`, `src/delegation`, `src/runtime`,
  `src/audit`.
- **Implementation status:** **PROVEN** as the current structural baseline;
  no new contract field is required for the findings at this stage.
- **Validation / evidence:** Locked artifact SHA-256
  `11ee062b079f74d2a4558af315c9b9b12a6aede291d409c48f038d93c416e2c2`;
  baseline verification and Integration validation passed.
- **Planned slice / future task:** If a cross-runtime provenance or flow
  receipt becomes unavoidable, add only neutral references/digests after a
  Runtime Contracts design gate and owner sign-off.
- **Disposition:** **REJECTED** for broad taint/memory/credential semantics;
  **ALREADY COVERED** for the current neutral baseline.

### RTA-020 — Cross-runtime proof must preserve boundaries and exclude bypasses

- **Lesson / requirement:** Integration evidence must prove the intended route,
  exact IDs/digests, producer authority, dispatch count, and negative paths;
  it must not infer properties of processes, hosts, or components outside the
  route.
- **Threat / failure:** A successful route is generalized into a claim that
  the whole IDE, OS, memory system, or deployment is governed.
- **Source / evidence:** Integration `docs/architecture-laws.md`,
  `docs/INTEGRATION.md`, Slice 02 freeze/matrix/evidence, and post-Slice-02
  readiness assessment.
- **Owning Fates:** Integration owns proof scope; component owners own the
  behavior being asserted.
- **Invariant:** Every acceptance claim names the producer, route, transport,
  action, evidence, exclusions, and fault cases that were or were not
  induced. Missing transport or missing process remains missing.
- **Existing ADR / doc / package:** Slice 02 freeze and evidence schemas;
  lock/matrix/slice state; Integration validation suites.
- **Implementation status:** **PROVEN** for the sealed Slice 02 evidence
  discipline.
- **Validation / evidence:** 55/55 Integration tests and all canonical JSON
  validations passed; live evidence distinguishes live verified,
  owner-local deterministic, and not-live-induced cases.
- **Planned slice / future task:** Reuse this proof discipline for 003A,
  003B, durable recovery, value flow, and memory admission; do not mutate the
  historical Slice 02 evidence.
- **Disposition:** **ALREADY COVERED**.

### RTA-021 — Durable workflow, idempotency, reconciliation, and compensation

- **Lesson / requirement:** Long-running plans need durable step/attempt/
  continuation state, explicit idempotency keys, reconciliation, and
  provider-specific compensation. A workflow engine does not itself grant
  action authority.
- **Threat / failure:** Restart/retry duplicates effects, loses a pending
  approval, or treats a timeout as safe to repeat.
- **Source / evidence:** Integration backlog DEC-003 and DEC-008;
  Horae supervision state machine and workflow assessment say durable
  workflow/recovery is not implemented; Ananke approval store is in memory.
- **Owning Fates:** Ananke owns action/effect state and authorization;
  Horae owns route orchestration and degradation; a durable workflow substrate
  may be wrapped but cannot become authority.
- **Invariant:** Every step has a stable action/attempt/idempotency identity;
  retries require a known safe protocol or reconciliation; compensation is a
  new authorized action, not an implicit rollback.
- **Existing ADR / doc / package:** Horae workflow assessment and supervision
  state machine; Ananke outcomes/approval store; Runtime Contracts lifecycle
  and idempotency reference shapes.
- **Implementation status:** **PLANNED**.
- **Validation / evidence:** Current Slice 02 deliberately has one dispatch,
  no retry, no persistence, and no compensation; this is a correct scope
  boundary, not a missing Slice 02 acceptance.
- **Planned slice / future task:** Durable governed effects before retryable
  consequential workflows; evaluate Temporal and Restate as patterns or
  optional wrappers only.
- **Disposition:** **FUTURE IMPLEMENTATION TASK**.

### RTA-022 — Audit integrity and joined explanation

- **Lesson / requirement:** Producer audit must be durable enough for its
  threat model and joinable across route, decision, dispatch, and outcome
  identifiers. A dashboard or asynchronous trace is not the authoritative
  audit.
- **Threat / failure:** Mutable/clearable local logs, missing crash-window
  evidence, or a presentation layer that cannot distinguish decision,
  dispatch, and outcome.
- **Source / evidence:** `docs/SYSTEM_MAP.md` says there is no integrated
  tamper-evident chain; Ananke SQLite audit is structured but clearable and
  not append-only; Integration backlog DEC-016 and DEC-029; Sigstore/Rekor
  describes an append-only, tamper-resistant transparency log for signed
  metadata ([Rekor overview](https://docs.sigstore.dev/logging/overview/)).
- **Owning Fates:** Ananke owns domain audit; Integration owns cross-Fate
  references; Moirae presents explanations; any transparency service is an
  evidence sink, never the policy authority.
- **Invariant:** The authoritative minimal record is durable before the effect
  and cannot be mutated by a UI or enrichment path. External transparency
  anchoring, if used, covers evidence integrity but does not decide authority.
- **Existing ADR / doc / package:** Ananke audit/outcome packages;
  Integration system map, evidence schemas, DEC-016/029.
- **Implementation status:** **PARTIAL**. Join IDs and structured events exist;
  append-only/tamper-evident durability and crash-window coverage do not.
- **Validation / evidence:** Current tests validate event shapes and joins;
  no WORM/transparency or crash recovery acceptance exists.
- **Planned slice / future task:** Audit-integrity slice after durable effect
  evidence; consider a local append-only store first, then optional
  Sigstore/Rekor/Trillian anchoring for artifact/evidence transparency.
- **Disposition:** **FUTURE IMPLEMENTATION TASK**; external transparency is a
  **WRAP** candidate, not a replacement for Ananke audit.

### RTA-023 — OS-level sandbox and bypass resistance

- **Lesson / requirement:** If Moirae claims to govern local consequential
  effects, the host needs enforced OS controls for filesystem, process,
  network, credentials, extensions, and child-process paths. Configuration
  validation or a process receipt is not enforcement.
- **Threat / failure:** A compromised or ordinary extension, terminal, child
  process, direct filesystem/network path, or provider library bypasses the
  governed route.
- **Source / evidence:** Moirae trust-boundary and extension-security docs
  explicitly state current bypasses; sandbox adapter and secret/network broker
  interfaces are scaffolded; Firecracker documents layered microVM/process
  isolation ([Firecracker design](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md));
  gVisor documents an application-kernel sandbox between workloads and host
  ([gVisor docs](https://gvisor.dev/docs/)); Linux Landlock adds restrictions
  and seccomp narrows syscall surface, while Linux explicitly says seccomp is
  not a complete sandbox ([Landlock](https://www.kernel.org/doc/html/latest/security/landlock.html),
  [seccomp](https://docs.kernel.org/userspace-api/seccomp_filter.html)).
- **Owning Fates:** Moirae owns host enforcement; Integration owns platform
  acceptance; Ananke/Horae remain route/authority participants.
- **Invariant:** A bypass test from the claimed threat model cannot reach a
  protected effect or raw credential. Controls are enforced below the process
  and are tested on the target OS; no “sandbox mode” flag alone is evidence.
- **Existing ADR / doc / package:** Moirae constrained-host ADR, sandbox
  adapter, trust-boundary and extension-security docs; Integration readiness
  assessment.
- **Implementation status:** **PLANNED**. No OS-level containment is in the
  locked implementation state.
- **Validation / evidence:** Current evidence is design-only and deliberately
  excludes host-wide bypass resistance.
- **Planned slice / future task:** 003B or a later platform-specific sandbox
  slice after 003A route/origin proof; choose Linux and Windows controls based
  on deployment targets.
- **Disposition:** **NEW IMPLEMENTATION TASK** separate from process-origin
  proof; do not claim it in 003A.

### RTA-024 — Credential primitive selection is a boundary decision

- **Lesson / requirement:** Credential custody, workload identity, delegated
  authority, revocation, and local key protection should use mature primitives
  where they fit. The Fates must not build an ad hoc secret manager inside a
  host, gateway, memory store, or shared contract package.
- **Threat / failure:** Long-lived bearer tokens, ambiguous audience, weak
  workload identity, non-revocable handles, or raw secrets copied across
  Fates.
- **Source / evidence:** Existing Runtime Contracts ADR-0003/0004 and Ananke
  credential-boundary docs; primary project comparisons in the external
  comparison section below.
- **Owning Fates:** Ananke/dedicated broker for effect-time authority; Moirae
  for local secret/OS boundary; Horae for opaque references; Mnemosyne for
  non-secret provenance metadata only.
- **Invariant:** Every credential artifact has an issuer, subject/audience,
  capability/resource, purpose, expiry, revocation/lease state, and audit
  reference; no component infers authority from a descriptive contract.
- **Existing ADR / doc / package:** Runtime Contracts delegation descriptors;
  Ananke authority/approval packages; Moirae broker interfaces; Mnemosyne
  credential rejection guard.
- **Implementation status:** **RESEARCH_REQUIRED**.
- **Validation / evidence:** No production broker, SPIFFE/SPIRE workload
  identity, OpenBao lease, Biscuit attenuation, or OS keyring integration is
  present or claimed.
- **Planned slice / future task:** Credential custody design gate before
  durable consequential effects; select a wrapper boundary and licensing
  obligations before any dependency decision.
- **Disposition:** **STUDY** mature primitives now; **WRAP** later if a
  production threat model requires them; no implementation in this task.

### RTA-025 — Destination-aware content preflight and declassification

- **Lesson / requirement:** Content-sensitive reads and writes need a
  destination-aware preflight that considers source labels, purpose,
  recipient/tenant, transformation, secrets, and the exact effect. Tool
  results are data, not instructions or grants.
- **Threat / failure:** A private or credential-bearing result is copied to a
  public sink, or a model-generated redaction claim is accepted without a
  deterministic policy check.
- **Source / evidence:** Ananke `ADR-0030` identifies content-sensitive reads,
  preflight, secrets, labels/scopes, tool-result poisoning, destination
  restrictions, and audit decisions as future requirements; local information
  flow assessment adds declassification and destination invariants.
- **Owning Fates:** Mnemosyne source/claim labels; Horae transformation and
  destination propagation; Ananke final preflight/declassification decision;
  Moirae explanation.
- **Invariant:** A sensitive-to-public or cross-tenant flow requires an
  explicit, bound declassification decision; redaction/summary/model
  classification is advisory until checked by the policy boundary.
- **Existing ADR / doc / package:** Ananke `ADR-0030`, approval binding,
  threat model; Mnemosyne provenance design gate; no current generic
  preflight contract.
- **Implementation status:** **PLANNED**.
- **Validation / evidence:** No current value-level flow or content preflight
  implementation; Experiment A is the required first evidence.
- **Planned slice / future task:** Value-flow/declassification slice, then
  cross-server information-flow acceptance before public or remote sinks.
- **Disposition:** **FUTURE IMPLEMENTATION TASK**; keep policy local to Ananke
  and provenance local to Mnemosyne unless a neutral receipt is proven needed.

### RTA-026 — Scope guard: no new Fate, authority gateway, or model-only boundary

- **Lesson / requirement:** Preserve the existing component boundaries while
  adding the missing properties. Do not create a new “security Fate,” make a
  gateway the policy authority, make an LLM classifier the security boundary,
  treat a summary as primary evidence, or add an enterprise dashboard to
  Runtime Contracts.
- **Threat / failure:** Responsibility duplication, authority split, model
  bypass, evidence laundering, or contract coupling.
- **Source / evidence:** `docs/architecture-laws.md`, `docs/SYSTEM_MAP.md`,
  Runtime Contracts ownership/design gates, and the explicit rejects in
  `docs/research/proposed-decision-backlog.md`.
- **Owning Fates:** Existing owners; Integration records the rejection.
- **Invariant:** Each proposed control names one existing owner and one
  acceptance boundary. A descriptive layer cannot authorize by itself.
- **Existing ADR / doc / package:** Architecture laws, system map, Runtime
  Contracts ownership, proposed decision backlog.
- **Implementation status:** **REJECTED** for the listed architectural
  expansions.
- **Validation / evidence:** Current repository boundaries and clean component
  states; no new repository or contract was introduced in this assessment.
- **Planned slice / future task:** None; revisit only if an explicit owner
  decision changes the architecture.
- **Disposition:** **REJECTED**.

## Architecture clarification history — 2026-08-09

The Moirae constrained-host ADR at
[`Project Moirae Code/docs/ADR-XXXX-constrained-governed-action-request-and-result-host.md`](../../Project%20Moirae%20Code/docs/ADR-XXXX-constrained-governed-action-request-and-result-host.md)
was clarified at the separate design lineage
`bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6`. This records the requested
pre-003A design gate without rewriting the stable research register.

- **RTA-005 — information flow:** the ADR now records the future interaction
  with value-level provenance and destination-aware authority. No flow labels,
  declassification, or implementation proof was promoted.
- **RTA-007 — Rule of Two:** the ADR now records that containment or mediation
  may satisfy a future trusted transition only when independently enforced;
  Moirae, Horae, Ananke, and Mnemosyne ownership is unchanged. The entry
  remains **RESEARCH_REQUIRED** with no session-composition proof.
- **RTA-008 — process origin versus OS containment:** the disposition's
  existing-ADR clarification is complete at design level. The ADR explicitly
  separates process-origin identity, governed route, OS/runtime containment,
  credential isolation, and bypass resistance. No 003A or OS proof was
  promoted.
- **RTA-010 — credential custody:** the ADR records the opaque capability /
  Ananke-authority / effect-time broker boundary and keeps development
  credentials outside the governed claim. Production custody remains
  **PARTIAL** and a future implementation task.
- **RTA-023 — OS sandbox and bypass resistance:** the ADR records a future
  003B boundary, attack classes, platform-specific profiles, and
  EMBED/WRAP/STUDY/DEFER technology classifications. No OS enforcement or
  bypass-resistance evidence exists.

**Proof/status preservation:** the prior entries, stable IDs, findings,
dispositions, Slice 02 lock, matrix, snapshot, seal, and active-slice state are
unchanged except for RTA-008's explicit completion of the documentation-only
clarification. No implementation source, dependency, Runtime Contracts
artifact, compatibility tag, or sealed evidence was changed.

## Finding-by-finding ADR and decision-gap assessment

The classifications below distinguish “the architecture already says this”
from “the implementation needs a new proof” and from “the implementation is a
later task.”

| Finding | Assessment | Current coverage | Gap classification | Decision |
|---|---|---|---|---|
| 1. Value-level provenance/info flow | ADR-0030 is a future design gate; argument hashes and Slice 02 receipts are not value lineage | Partial/documented | **CLARIFY EXISTING ADR** + **NEW INVARIANT / TEST ONLY** | Run Experiment A; keep the lattice local first |
| 2. Rule of Two | Useful composition threat model, not yet a Fates session invariant | Not implemented | **NEW INVARIANT / TEST ONLY** | Add a bounded composition invariant after capability inputs are defined |
| 3. IDE is not security boundary | Moirae docs already disclaim global governance; process-origin and OS containment are conflated unless clarified | Documented, design-only | **CLARIFY EXISTING ADR**; separate **FUTURE IMPLEMENTATION TASK** | Revise constrained-host ADR before 003A; 003B/later for OS |
| 4. Authority vs effect | Ananke pipeline has the stages; crash-consistent evidence is missing | Partial | **CLARIFY EXISTING ADR** + future implementation | Keep both inside Ananke unless isolation is later justified |
| 5. Credential custody | Reference-only delegation exists; no production broker/custody | Partial | **FUTURE IMPLEMENTATION TASK** + research | Study mature primitives; wrap behind Ananke/Moirae boundary |
| 6. Memory never authority | Mnemosyne laws and Ananke boundary are explicit; admission/derived invalidation incomplete | Documented/partial | **ALREADY COVERED** + **NEW INVARIANT / TEST ONLY** | Add never-authority and source-withdrawal tests |
| 7. Durable indeterminate | Horae bounded route models timeout/indeterminate and no retry; Ananke generic vocabulary lacks durable unknown | Owner-local only | **NEW INVARIANT / TEST ONLY** + future implementation | Add durable unknown/reconciliation before retryable effects |
| 8. Audit durability vs async | Producer-owned audit exists but not crash-consistent append-only minimum evidence | Partial | **CLARIFY EXISTING ADR** + future implementation | Synchronous minimum; async enrichment only after durable evidence |
| 9. MCP lifecycle/fresh verification | Slice 02 is fresh and fail-closed; current MCP wire support is legacy and feature matrix absent | Bounded proof | **ALREADY COVERED** + **DEFER** modern migration | No Slice 02 change; write a versioned migration ADR later |
| 10. External primitives | Useful patterns, none should silently become a Fate or dependency | Research | **RESEARCH_REQUIRED** | Use the comparison below as a shortlist, no dependencies now |
| 11. Runtime Contracts size | Current package is correctly neutral and small | Covered | **ALREADY COVERED** | Add only neutral references/digests if cross-runtime need is proven |

## External comparison: primary-source shortlist

This is an architectural comparison, not a dependency approval. “Adopt” means
adopt the standard or primitive at the appropriate boundary; “wrap” means keep
the existing Fate authority and put the external system behind an adapter;
“embed” means use an OS/library primitive without moving ownership; “study”
means no implementation decision yet; “reject for now” means the mismatch is
known and the option is intentionally out of the current plan.

| Candidate | Primary-source fact | License / legal implication | Classification | Fates implication |
|---|---|---|---|---|
| Microsoft Agent Governance Toolkit (AGT) | Runtime governance toolkit documents policy enforcement, identity, MCP gateway/security, sandboxing, reliability, and multi-language packages ([official repository](https://github.com/microsoft/agent-governance-toolkit), [tutorials](https://microsoft.github.io/agent-governance-toolkit/tutorials/)) | MIT; public preview and project performance numbers are project claims, not Fates guarantees | **STUDY** | Compare policy/IFC/admission primitives; do not replace Ananke authority, Mnemosyne memory semantics, or Integration proof |
| agentgateway | Open-source HTTP/gRPC proxy/data plane with MCP/A2A routing, auth/RBAC, retries, observability, and federation ([official FAQ](https://agentgateway.dev/docs/standalone/latest/faqs/)) | Apache-2.0 | **WRAP** | Optional Horae data-plane substrate; preserve downstream origin and keep Ananke as authority; never treat gateway policy as the Fates decision |
| Cedar | Authorization language/engine evaluates principal/action/resource/context requests and returns allow/deny ([official guide](https://docs.cedarpolicy.com/), [repository](https://github.com/cedar-policy/cedar)) | Apache-2.0 | **STUDY** | Possible Ananke policy adapter if the model maps cleanly; no need to duplicate or externalize Ananke policy now |
| OPA/Rego | General-purpose policy engine decouples policy decisions from enforcement and accepts structured input ([official docs](https://www.openpolicyagent.org/docs)) | Apache-2.0 | **STUDY** | Useful comparison for policy-as-code and testability; adding a second policy language/engine now risks authority duplication |
| SPIFFE/SPIRE | SPIFFE defines workload identities/SVIDs and the Workload API; SPIRE performs node/workload attestation and registration ([SPIFFE concepts](https://spiffe.io/docs/latest/spiffe/concepts/), [SPIRE repository](https://github.com/spiffe/spire)) | SPIRE repository Apache-2.0; review individual components and deployment obligations | **ADOPT** as a workload-identity standard, **WRAP** in implementation | Strong candidate for production process-to-process identity; do not put SVID issuance or attestation semantics in Runtime Contracts |
| Biscuit | Signed bearer authorization tokens carry rights and attenuation constraints verifiable by services ([official introduction](https://doc.biscuitsec.org/getting-started/introduction), [Rust implementation](https://github.com/eclipse-biscuit/biscuit-rust)) | Apache-2.0 for the cited implementation | **STUDY** | Could support attenuable effect handles; must solve revocation, audience, audit, and bearer replay explicitly before wrapping |
| OpenBao | Identity-based secret/encryption management supports authenticated policy, leases, dynamic secrets, renewal, revocation, and audit ([official docs](https://openbao.org/docs/what-is-openbao/), [leases](https://openbao.org/docs/concepts/lease/)) | MPL-2.0; file/notice and modification obligations require review | **WRAP** | Strong candidate behind an Ananke credential broker; raw secrets remain at effect boundary and never enter Horae/Mnemosyne/model context |
| Sigstore / Rekor / Trillian | Sigstore uses short-lived identity-bound signing and Rekor transparency; Rekor provides append-only/tamper-resistant metadata logging; Trillian is a verifiable log store ([Sigstore](https://docs.sigstore.dev/), [Rekor](https://docs.sigstore.dev/logging/overview/), [Trillian](https://github.com/google/trillian)) | Rekor/Trillian repositories Apache-2.0; review Sigstore component notices | **WRAP** | Useful for release/producer/evidence anchoring and audit integrity; never synchronous policy authority and never a substitute for local durable effect state |
| Temporal | Durable execution records workflow state and resumes across failures; activities are the failure/retry boundary ([official docs](https://docs.temporal.io/), [repository/license](https://github.com/temporalio/temporal/blob/main/LICENSE)) | MIT for the cited server repository; deployment/SDK terms still require inventory | **STUDY** | Strong workflow pattern for Horae/Ananke future recovery, but authorization and effect idempotency remain Fates-owned |
| Restate | Durable services/workflows, state, timers, retries, and stated exactly-once workflow semantics ([official docs](https://docs.restate.dev/), [services](https://docs.restate.dev/foundations/services)) | Current repository license is Business Source License 1.1 with a later Apache-2.0 change license ([license](https://github.com/restatedev/restate/blob/main/LICENSE)); BSL is not an open-source license | **STUDY** | Evaluate semantics and license carefully; do not adopt in the current baseline or equate its exactly-once claim with provider effect semantics |
| Firecracker | MicroVMs combine hardware virtualization isolation with layered seccomp, cgroups, namespaces, and privilege dropping ([design](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md)) | Apache-2.0 | **WRAP** | Candidate strong sandbox for untrusted code/local effects; operationally distinct from 003A process-origin proof |
| gVisor | Userspace application kernel and OCI runtime provide a strong host/workload isolation layer ([official docs](https://gvisor.dev/docs/), [security introduction](https://gvisor.dev/docs/architecture_guide/intro/)) | Apache-2.0 for the repository | **WRAP** | Candidate Linux sandbox where microVM cost is unsuitable; requires explicit filesystem/network/credential policy and bypass testing |
| Landlock / seccomp | Landlock adds scoped filesystem/access restrictions; seccomp filters system calls and explicitly is not a complete sandbox ([Landlock kernel docs](https://www.kernel.org/doc/html/latest/security/landlock.html), [seccomp kernel docs](https://docs.kernel.org/userspace-api/seccomp_filter.html)) | Kernel facilities follow the Linux kernel/ABI and implementation licensing; no vendored dependency decision here | **EMBED** | Use as layered Linux enforcement in Moirae 003B/later; combine with namespaces, credential isolation, network policy, and testable process supervision |

### External comparison conclusions

- No external project is adopted as a replacement for a Fate. The closest
  overlaps are AGT with Ananke policy/IFC, agentgateway with Horae data-plane
  routing, SPIFFE/SPIRE with workload identity, OpenBao with credential
  custody, and Temporal/Restate with future durable workflow state.
- The current recommended order is to **study** AGT/FIDES, Cedar/OPA,
  Biscuit, Temporal, and Restate; **wrap** agentgateway, OpenBao,
  Sigstore/Rekor/Trillian, Firecracker, or gVisor only after an owner-approved
  boundary; **adopt** workload identity principles from SPIFFE/SPIRE; and
  **embed** Landlock/seccomp only as part of a tested platform sandbox.
- No package is added, no dependency is updated, and no component repository
  is changed by this document.
- Project claims such as “sub-millisecond,” “exactly once,” “performant,” or
  “production ready” are not used as Fates acceptance criteria. Experiment B
  defines the only acceptable local performance evidence for Fates.

## Information-flow decision

The Fates need value-level flow control, but the design must preserve the
current ownership boundaries.

### Recommended ownership

1. Mnemosyne labels sources, claims, sensitivity, integrity, tenant, ACL
   lineage, and derived dependencies. It owns admission/quarantine and
   authoritative memory evidence.
2. Horae propagates references and labels through retrieval, plans, retries,
   subagents, caches, gateways, and reconnects. It must not invent or widen a
   label.
3. Ananke evaluates source-to-transform-to-destination flows, purpose,
   recipient, declassification, and the final effect. It is the only Fate that
   can turn the result into action authority.
4. Moirae presents the decision and, later, enforces host isolation. It cannot
   make an ungoverned surface governed by displaying a warning or a label.
5. Runtime Contracts may carry a compact, neutral, authenticated flow or
   provenance reference/digest only if Experiment A proves that a cross-runtime
   hop cannot preserve the evidence locally. The lattice, memory schema,
   derivation graph, and policy remain local.

### Required propagation rules

- Labels are bound to values/claims/content hashes and their dependency set,
  not only to prompt text, JSON fields, or UI decorations.
- Restrictive integrity/confidentiality joins are monotonic unless a bounded,
  explicit declassification receipt is present.
- Tenant identity and final destination are immutable across aliases,
  gateways, retries, and summaries.
- Tool results are data. They are never instructions, approvals, grants, or
  identity proofs merely because a model repeats them.
- Loss, disagreement, malformed labels, unsupported transformation, stale
  cache, or unverified compaction causes quarantine, review, or denial.
- A summary is a derived value with a dependency set. It is not primary
  evidence and cannot silently shed the labels of its parents.

## Rule of Two decision

The Meta Rule of Two is adopted as a threat-model lens, not copied as an
universal standalone policy. The useful Fates invariant is:

> A session that simultaneously has untrusted input, access to sensitive data
> or systems, and the ability to change state or communicate externally must
> either lose one property through a verifiable one-way transition, pass a
> trusted mediation/containment gate, or require reliable supervision/fresh
> context before the consequential effect.

The invariant is a new cross-Fate test requirement. Horae should compute the
composition from current capabilities and session state; Mnemosyne supplies
source/evidence labels; Ananke makes the final destination/effect decision;
Moirae supplies host supervision/containment evidence when that is the chosen
control. The system must not accept a model-generated declaration that a
session is safe.

## Memory decision

The current “memory is not authority” law is retained and strengthened with
tests. Mnemosyne remains advisory to Ananke. The future memory path should
separate:

- valid/world time: when a claim is true or asserted to be true;
- system/knowledge time: when Fates learned, revised, withdrew, or admitted
  the claim;
- revision/derivation history: which sources and transformations produced the
  current record;
- lifecycle eligibility: admitted, tentative, stale, contradicted,
  superseded, quarantined, withdrawn, or deleted/tombstoned.

A correction should create a new known revision rather than rewriting the
  old meaning. A source withdrawal makes dependent derived content ineligible
  for new trust. A privacy deletion may remove content while retaining a
  non-content tombstone and the minimum audit reference required by the
  declared retention policy. This model is not current implementation and
  requires a Mnemosyne design gate.

## Credential decision

The current prohibition on raw credentials is correct. The recommended
production shape is:

```text
model / memory / Moirae UI
        │ opaque action + purpose + scope
        ▼
Ananke decision ──> short-lived handle / delegated authority ──> effect broker
                                                        │
                                                        ▼
                                               provider credential use
```

Horae carries references and route evidence only. Mnemosyne stores no raw
secret. Moirae’s host must not expose a keychain or environment secret to an
untrusted extension or child process. Workload identity, secret lease,
attenuation, audience binding, revocation, and audit are broker semantics,
not Runtime Contracts semantics.

## Audit and hot-path decision

The synchronous boundary should be intentionally small:

1. validate identity, scope, purpose, destination, capability, provenance
   requirements, and exact action binding;
2. durably record the intent, decision, effect target, handle reference, and
   attempt identity;
3. dispatch once or enter an explicitly durable pending state;
4. durably record the typed result or `UNKNOWN`/indeterminate state.

Asynchronous enrichment may add traces, explanation, retrieval joins,
analytics, dashboards, notifications, and external transparency anchoring.
Enrichment failure must not widen authority or erase the minimum evidence.
The current Ananke SQLite/in-memory defaults do not yet satisfy this complete
crash-consistent protocol.

## 003A reassessment — explicitly not activated

**Verdict: YES WITH PREREQUISITES.**

003A can be a useful bounded proof if its claim is limited to:

- Moirae host/process origin and trusted local host identity;
- exact constrained action/schema and no arbitrary path, URI, command,
  environment, or model-supplied identity;
- local Moirae → Horae → Ananke → Horae → Moirae route;
- fresh Horae inspection of Ananke endpoint, identity, instance, readiness,
  capability, compatibility, and producer evidence;
- Ananke as sole authority and sole physical reader for the harmless fixture;
- one dispatch, preserved IDs/correlation, typed result, and fail-closed
  direct/fallback negatives;
- no claim that the surrounding IDE, terminal, debugger, extensions, child
  processes, filesystem, network, or credentials are contained.

### Required prerequisite before activation

Revise the Moirae constrained-host ADR so it explicitly distinguishes:

1. process-origin/host identity proof;
2. governed route proof;
3. OS containment;
4. credential isolation;
5. bypass resistance across host surfaces.

The ADR must state which claims 003A proves and which it does not. The
revision is a documentation/design prerequisite, not an implementation in
this task.

### OS sandbox placement

OS containment is a separate **003B or later** slice. It is not required to
prove that a fixed, non-hostile harness emits only the bounded 003A route, but
it is a prerequisite before Moirae claims governed local consequential effects
against a hostile or ordinary host surface. 003B should select platform
controls and prove filesystem, process, network, extension, and credential
bypass resistance. A process receipt must not be reused as OS containment
evidence.

### Component participation

| Component | 003A participation |
|---|---|
| Moirae Code | Inside the constrained host/origin and result-presentation proof; no global IDE claim |
| Horae | Inside the fresh inspection, admission, capability reduction, relay, and result-preservation proof |
| Ananke | Inside as sole authority/producer/effect boundary and fixed-reader proof |
| Mnemosyne | Outside the route; no memory retrieval or qualified context dependency |
| Runtime Contracts | Pinned 0.4.0 / protocol 1.4.0 neutral baseline only; no contract change |
| Integration | Acceptance evidence, exclusions, hashes, and sealed-state preservation |

No 003A branch, activation, lock update, implementation, or live exercise was
started by this assessment.

## Proposed minimal future ordering

This is a candidate owner decision queue, not an activated roadmap change.

1. **003A — constrained route/origin proof:** clarify Moirae ADR, implement
   only the bounded process-origin route, and live-accept the explicit
   exclusions.
2. **003B — OS containment:** implement and adversarially test platform
   controls before claiming local consequential effects; use layered
   Landlock/seccomp/namespaces, gVisor, Firecracker, or platform equivalents
   only where the threat model requires them.
3. **Durable governed effects:** Ananke authority/effect separation, durable
   pre-dispatch evidence, indeterminate outcome, idempotency, reconciliation,
   and credential-handle boundary. This must precede blind retry or durable
   external effects.
4. **Value flow and Rule-of-Two:** run Experiment A, choose the minimum local
   provenance/flow representation, add declassification and session
   composition invariants, and prove private-to-public and tenant boundaries.
5. **Qualified memory lifecycle:** Mnemosyne admission, claim/derived lineage,
   source withdrawal, correction, bitemporal history, deletion/tombstones, and
   never-authority integration tests.
6. **Modern MCP and tool supply chain:** feature-version migration matrix,
   current auth/issuer rules, MRTR/tasks/cache/routing behavior, registration,
   attestation, drift, quarantine, and reconnect evidence.
7. **Audit integrity and transparency:** append-only local durability, joined
   explanation, asynchronous enrichment, and optional transparency anchoring.

The existing roadmap labels for Slice 003–006 should be reconciled by the
owner before any activation; this document does not edit those state files.

## Required experiments

### Experiment A — provenance through transformation and planning

**Question:** Does source provenance survive retrieval, summarization, context
compaction, truncation, planner reasoning, and final argument construction in
a way that Ananke can enforce without trusting model-visible formatting?

**Fixture and transformations:**

- one public/untrusted source containing a canary instruction and a benign
  value;
- one private source containing a distinct canary value;
- one tenant-mismatched source;
- retrieval, ranking, summarization, compaction, truncation, paraphrase,
  planner step, retry, cache, alias/gateway, and final tool-argument stages;
- destinations including private read, same-tenant write, public write, and
  cross-tenant write.

**Evidence to carry:** For every intermediate value, record source IDs,
content/claim hashes, parent dependency set, transform ID/version, tenant,
integrity/confidentiality labels, purpose, destination, and any
declassification receipt. Keep the security label out-of-band and
cryptographically bound; a model-visible copy may aid explanation but cannot
be authoritative.

**Adversarial cases:** label stripping, reordering, fake labels, duplicate
values, paraphrase, encoded canary, summary that omits its parent, disagreement
between sources, cache reuse after revocation, alias/gateway substitution,
tenant mismatch, and a tool result that contains an instruction.

**Acceptance criteria:**

- exact parent lineage is preserved or the derived value carries an explicit,
  reviewable declassification/derivation record;
- restrictive labels are not weakened by retrieval, compaction, or summary;
- unknown, malformed, conflicting, or tenant-mismatched lineage is denied,
  quarantined, or requires review;
- private canary never reaches the public sink;
- tool-result instructions never become authority;
- the final Ananke decision records the source/transform/destination evidence
  it relied on;
- any proposed neutral Runtime Contracts field is justified by a failed local
  ownership alternative, not by convenience.

**Owners:** Mnemosyne, Horae, Ananke; Moirae for presentation; Integration for
cross-runtime proof.

### Experiment B — governance hot-path benchmark

**Question:** What is the measured cost of the minimum synchronous governance
path once durable evidence and provenance checks are included?

**Included:** identity and scope validation, capability/endpoint check,
policy/approval evaluation, exact canonical binding, required provenance
check, optional opaque handle resolution, durable pre-dispatch record, and
dispatch-marker write.

**Excluded from the hot-path measurement:** model inference, memory retrieval,
full summarization, explanation generation, dashboards, telemetry export,
analytics, asynchronous indexing, and transparency-log upload.

**Method:** Use a pinned local harness and record warm/cold startup, p50/p95/p99
latency, throughput, CPU, memory, storage fsync behavior, concurrency, and
failure behavior. Compare in-memory test mode with the intended durable store;
do not call the in-memory mode production evidence. Test allow, deny, stale,
unknown provenance, duplicate idempotency key, timeout, and audit/enrichment
failure. Repeat across the deployment platforms that the owner intends to
support.

**Acceptance criteria:** Establish a measured baseline and an owner-approved
SLO after the first run. Do not import AGT or agentgateway marketing numbers,
or assume Temporal/Restate semantics, as Fates targets. The benchmark must
show that required evidence is still synchronous and fail-closed under load.

**Owners:** Ananke for the hot path; Horae for route/freshness overhead;
Integration for harness and evidence; Moirae only when host enforcement is in
scope.

## Files and state intentionally not changed

This research task changes only this Integration report and the explicit
cross-reference appended to `docs/tasks/ACTIVE.md`. It does not modify:

- Ananke, Horae, Mnemosyne, Moirae Code, or Runtime Contracts source,
  package, tests, lockfiles, ADRs, or tags;
- `fates-lock.json`, `compatibility-matrix.json`,
  `compatibility-sets/fates-slice-002-2026-08-09.json`,
  `slices/002-governed-action-handoff/slice.json`, or
  `docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json`;
- `active-slice.json`, which remains idle;
- any Slice 02 seal, hash, snapshot, or historical evidence.

## Source register

### Local authority and evidence

- `docs/INDEX.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/SYSTEM_MAP.md`
- `docs/INTEGRATION.md`
- `docs/architecture-laws.md`
- `docs/checkpoint-policy.md`
- `docs/compatibility-policy.md`
- `docs/tasks/ACTIVE.md`
- `docs/tasks/POST_SLICE_002_READINESS.md`
- `docs/research/fates-information-flow-assessment.md`
- `docs/research/mcp-2026-07-28-impact-assessment.md`
- `docs/research/fates-source-to-control-matrix.md`
- `docs/research/fates-capability-gap-matrix.md`
- `docs/research/fates-security-test-catalogue.md`
- `docs/research/proposed-decision-backlog.md`
- `docs/research/fates-gateway-workflow-assessment.md`
- Slice 02 freeze, matrix, `slice.json`, and live acceptance evidence.

### Primary external sources checked on 2026-08-09

- [Microsoft Agent Governance Toolkit repository](https://github.com/microsoft/agent-governance-toolkit)
  and [official tutorials](https://microsoft.github.io/agent-governance-toolkit/tutorials/)
- [AGT limitations](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/LIMITATIONS.md)
- [agentgateway FAQ and license](https://agentgateway.dev/docs/standalone/latest/faqs/)
  and [release notes](https://github.com/agentgateway/agentgateway/releases)
- [MCP 2026-07-28 specification announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Meta Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/)
- [Microsoft FIDES documentation](https://learn.microsoft.com/en-us/agent-framework/agents/security)
  and [FIDES repository](https://github.com/microsoft/fides)
- [CaMeL paper](https://arxiv.org/abs/2503.18813)
- [Cedar documentation](https://docs.cedarpolicy.com/) and [repository](https://github.com/cedar-policy/cedar)
- [OPA documentation](https://www.openpolicyagent.org/docs) and [repository](https://github.com/open-policy-agent/opa)
- [SPIFFE concepts](https://spiffe.io/docs/latest/spiffe/concepts/) and [SPIRE repository](https://github.com/spiffe/spire)
- [Biscuit introduction](https://doc.biscuitsec.org/getting-started/introduction) and [implementation](https://github.com/eclipse-biscuit/biscuit-rust)
- [OpenBao documentation](https://openbao.org/docs/what-is-openbao/), [leases](https://openbao.org/docs/concepts/lease/), and [license](https://github.com/openbao/openbao/blob/main/LICENSE)
- [Sigstore overview](https://docs.sigstore.dev/), [Rekor overview](https://docs.sigstore.dev/logging/overview/), [Rekor repository](https://github.com/sigstore/rekor), and [Trillian repository](https://github.com/google/trillian)
- [Temporal documentation](https://docs.temporal.io/) and [license](https://github.com/temporalio/temporal/blob/main/LICENSE)
- [Restate documentation](https://docs.restate.dev/) and [current license](https://github.com/restatedev/restate/blob/main/LICENSE)
- [Firecracker design](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md) and [repository/license](https://github.com/firecracker-microvm/firecracker)
- [gVisor documentation](https://gvisor.dev/docs/) and [repository/license](https://github.com/google/gvisor)
- [Linux Landlock documentation](https://www.kernel.org/doc/html/latest/security/landlock.html)
  and [Linux seccomp documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html)

All external claims in this document are either linked to a primary source or
explicitly labelled as a project claim, inference, or recommendation.
