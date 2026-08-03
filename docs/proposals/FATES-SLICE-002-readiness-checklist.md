# FATES-SLICE-002 readiness checklist

Status: review checklist only. Completing this document does not activate Slice 02.

## Baseline and scope

- [ ] `main` is clean, validated, and still resolves to the approved merged baseline.
- [ ] The proposed implementation starts from the exact commits in `fates-lock.json`, not peer branch heads.
- [ ] Slice 01 remains `completed`, `provisional`, and `inspection_only`.
- [ ] `active-slice.json` remains `idle` with no active Slice 02.
- [ ] The candidate is one fixed, harmless local read: `fates.slice02.inspect-fixed-fixture.v1`.
- [ ] The candidate has no network, write, credential, provider, browser, shell, workflow, import, memory, or fallback capability.

## Six gates

- [ ] **Governed route:** Moirae Code → Horae → Ananke → bounded fixture read is the only claimed path.
- [ ] **Bypass evidence:** all relevant direct host, direct Ananke, direct fixture, helper, terminal/script, extension/debugger, and provider/network alternatives are inventoried and classified.
- [ ] **Canonical binding:** action, arguments/digest, principals, scope, purpose, policy/version, origin, schema hash, validity/readiness and correlation are bound before dispatch.
- [ ] **Pinned origin/schema:** locked checkpoints, contract/protocol versions, route identities and request-shape hash are recorded; material drift fails closed.
- [ ] **Readiness:** Moirae Code, Horae route and Ananke readiness are fresh before dispatch; startup race and stale/unavailable cases deny.
- [ ] **Correlation and proof:** one initiating correlation ID joins the route, decision and result while retaining distinct producer IDs; real cross-process/package/runtime positive and negative tests exist.

## Required evidence before activation

- [ ] Explicit owner approval identifies Ananke, Horae, Moirae Code and Integration responsibilities.
- [ ] The actual transport/routing mechanism is identified as implemented at pinned checkpoints or has a separately approved implementation plan.
- [ ] Ananke confirms the exact low-risk policy/approval treatment and mutation invalidators.
- [ ] Horae confirms readiness source, freshness semantics and route identity preservation.
- [ ] Moirae Code confirms the constrained host surface and explicit remaining bypass limitations.
- [ ] Runtime Contracts owners confirm either no portable change is needed or approve a reusable, structural, transport-neutral change.
- [ ] The Integration test plan contains positive read, denial, mutation, stale readiness, origin/schema drift, correlation, and bypass-report cases.
- [ ] Each changed Fate has a clean, pushed, green checkpoint and a handoff packet before any lock advancement.

## Hard stops

- [ ] Stop if the design needs a mock transport claimed as a real cross-runtime path.
- [ ] Stop if a direct or alternative route can reach the bounded read without Ananke authority.
- [ ] Stop if origin/schema/readiness evidence cannot be bound and compared at dispatch.
- [ ] Stop if the candidate expands into remote OAuth, MCP compatibility, workflow persistence, untrusted content, derived memory, provider fallback, unrestricted execution, or external effects.
- [ ] Stop if a proposed Runtime Contracts type is fixture-specific or behavioural.

## Before implementation starts

- [ ] A separate activation decision updates only the permitted slice-planning artifacts.
- [ ] The approved scope, acceptance criteria, starting checkpoints and user authorization are recorded.
- [ ] The active-slice state is changed only as part of that separate approved activation step.
- [ ] No compatibility lock, snapshot, or matrix completion claim is made before consumer and integration evidence exists.
