# FATES-SLICE-002 — Governed action-decision round-trip (proposal)

Status: proposal only; Slice 02 is not activated and is not approved for implementation.
Planning baseline: Integration `main` at `e2404b2693d8c82443af0ae77125a0518566d707`, with compatibility set `fates-stage-a-2026-07`.

## Objective

Prove one pinned, harmless read-only canonical action request can travel from the Moirae Code host through Horae to Ananke's action-decision boundary and return a typed result. The proof must preserve readiness, origin and schema identity, canonical request binding, correlation, and route-specific bypass evidence from initiation to result.

This is the first runtime round-trip, not a claim that the ecosystem now provides general governed execution.

## Non-goals

- No runtime code begins with this proposal; implementation requires a separate activation decision.
- No deletion, external send, payment, deployment, permission change, credential access, browser automation, unrestricted shell execution, or provider fallback.
- No persistent workflow, retry, compensation, MRTR, MCP Tasks, remote OAuth, Enterprise-Managed Authorization, or imported workflow.
- No untrusted content, Content Surface Preflight, memory retrieval, derived-memory admission, or Mnemosyne authorization.
- No global claim that every Moirae Code, Horae, or system path is governed.
- No lock advancement, checkpoint/tag change, compatibility-set change, `active-slice.json` change, or Slice 02 activation in this proposal.

## Pinned starting baseline

The implementation decision must start from these lock entries, rather than from mutable peer branches:

| Repository | Role in this proposal | Locked checkpoint |
|---|---|---|
| Project Adrasteia | Existing portable representation package only; no change proposed | `124b6aee2629a3147739934ad5f1b45b32c8ba46`, `project-runtime-contracts@0.4.0`, protocol `1.4.0` |
| Project Ananke | Canonical decision, action authority, result/outcome evidence | `dcbb115c5798072221afdd2e4fdd36e786defddf` |
| Project Horae | Readiness, route preservation, correlation propagation | `52e14fa574f7427f62747fe84d2789aec25b94e3` |
| Project Moirae Code | Governed host call surface and result presentation | `a4783db271a61848c66ac4f6652a539bdb515e28` (`pushed_untagged`; baseline remains provisional) |
| Project Fates Integration | Pinned cross-runtime fixture, evidence and consumer-driven proof | `e2404b2693d8c82443af0ae77125a0518566d707` |

Mnemosyne is not involved. The proposal does not use a mutable peer `main` branch as an authority.

## Candidate fixture and tested route

The candidate action is a bounded local read named `fates.slice02.inspect-fixed-fixture.v1`. It reads one immutable, test-owned fixture with a predeclared content digest. It has no network, credential, provider, browser, shell, write, or persistent-workflow capability.

The only path claimed by this slice is:

```text
Moirae Code test host
  → Horae ready route
  → Ananke canonical decision
  → Ananke-controlled fixed-fixture read
  → Horae result relay
  → Moirae Code typed result
```

The fixture is an implementation candidate, not an instruction to create a mock transport. The eventual test must cross real package, process, or runtime boundaries at the locked component checkpoints. A simulated Integration-only hop cannot satisfy this proposal.

## Proposed request, decision and result sequence

1. Moirae Code and Horae publish fresh readiness for the fixed route; Ananke is ready to evaluate the declared action.
2. Moirae Code creates the canonical request with action identity, canonical arguments, both principal roles, tenant/resource/purpose scope, policy/version input, origin identity, schema identity/hash, correlation ID, and validity boundary.
3. Horae accepts the request only while its readiness and route identity are fresh. It preserves the originating runtime identity and correlation ID; it does not approve or expand authority.
4. Ananke canonicalizes the received request, calculates the request/approval fingerprint, compares required fields with the dispatchable request, and records a decision ID. For this low-risk local fixture, the policy may be deterministic and pre-authorized, but the request still receives an Ananke decision.
5. On an allow decision, the Ananke-controlled fixture adapter performs exactly one bounded read of the declared fixture and returns a typed result containing the fixed content digest. On deny, incompatibility, stale readiness, origin/schema drift, or request mutation, no read occurs.
6. Horae relays the typed result without changing the action identity, origin/schema receipt, decision identity, or correlation.
7. Moirae Code presents the result as an Ananke decision/result, not as host authority. Integration joins the request, decision, route, and result evidence by correlation ID while retaining each producer's distinct event/decision ID.

## The six required gates

### A. Governed path and bypass evidence

- Identify the exact path above and the process/package boundary crossed at each hop.
- Prove the positive and denial paths both cross Ananke before the fixture read can occur.
- Inventory every known alternative relevant route: direct host SDK call, direct Ananke call, direct fixture access, Horae-bypassing call, test helper, terminal/script, extension/debugger, and provider/network path.
- Prove those alternatives are either unavailable in the test environment, explicitly rejected, or outside the narrow claim. Record them as limitations; do not claim global closure.

### B. Canonical request and approval binding

The canonical request must bind, at minimum:

| Bound field | Requirement |
|---|---|
| Action | Exact `fates.slice02.inspect-fixed-fixture.v1` identifier |
| Arguments | Canonical fixture identifier and expected content digest; no free-form path |
| Principals | Acting and delegating principal identities, with asserted versus verified state explicit |
| Scope | Tenant, resource, and purpose values for the local fixture |
| Policy inputs | Policy identifier/version and protocol/contract compatibility inputs |
| Origin | Moirae source runtime plus Horae route and Ananke decision target identities |
| Schema | Versioned request-shape identifier and content/schema hash |
| Validity | Fresh readiness evidence and explicit expiry/validity boundary |
| Correlation | Initiating correlation ID, which is evidence only and never authority |

Mutation of the action, fixture ID, digest, principal, scope, purpose, policy version, origin, schema hash, or validity/readiness evidence invalidates the request and prevents the read. Even if no interactive human approval is required, the test must prove that the request evaluated by Ananke is exactly the request later dispatched and reported.

### C. Pinned origin and schema identity

- Record the exact locked producer and consumer checkpoints, package artifact/version, and protocol range in the test fixture and evidence.
- Carry an immutable source runtime identity, canonical action identity, request-shape version, and schema/content hash across the route.
- Reject origin, schema, contract-version, or expected-digest drift between decision and fixture read.
- Do not treat a sibling checkout, mutable branch name, host display name, or correlation ID as origin authority.

### D. Readiness before dispatch

- Require fresh producer, Horae route, and Ananke decision readiness before accepting the request.
- Add a startup-race test where a process exists but registration/readiness is incomplete; dispatch must fail closed.
- Add stale/unavailable readiness cases; no empty, stale, or cached capability view may become success.
- Record readiness source, freshness/expiry, and rejection reason in result evidence.

### E. End-to-end correlation

- Generate one trusted initiating correlation ID at the host boundary.
- Preserve it across the Moirae Code request, Horae route events, Ananke decision/outcome, and returned result.
- Keep producer-owned event IDs and Ananke decision IDs distinct.
- Prove deterministic joining in the Integration evidence without allowing correlation to authorize an action.

### F. Executable round-trip proof

The consumer-driven integration suite must cross a real process, package, or runtime boundary and include:

1. One positive fixed-fixture read with exact digest/result assertion.
2. One denied or incompatible request with proof that the fixture was not read.
3. One canonical-argument or policy/origin/schema mutation rejection.
4. One unready or stale dependency rejection.
5. One origin/schema mismatch rejection between decision and dispatch.
6. One correlation preservation and producer-ID attribution assertion.
7. One explicit bypass inventory report, including what is not covered by the route claim.

## Ownership and repository order

1. **Integration:** freeze the fixture, expected evidence schema, negative cases, and acceptance assertions against the baseline. This is planning/evidence work, not a runtime substitute.
2. **Adrasteia:** change only if the implementation inventory proves an existing package shape cannot express a reusable transport-neutral field. Any new type must serve more than this one fixture, remain structural, and have an explicit decision/compatibility review.
3. **Ananke:** owns canonicalization, policy/approval binding, allow/deny decision, and the bounded fixture-read authority/outcome.
4. **Horae:** owns route readiness, transport/routing composition, capability reduction, correlation propagation, and stale/degraded rejection; it does not approve or execute independently.
5. **Moirae Code:** owns the constrained host request surface and presentation of the typed result/limitations; it must not label unrelated terminal, extension, debugger, or direct-provider paths as governed.
6. **Integration:** runs pinned cross-runtime proof after consumer checkpoints and handoff evidence exist.

Mnemosyne remains uninvolved. No repository should be changed solely to make every Fate participate.

## Contract-change assessment

No Runtime Contracts change is currently proposed. The current package already carries the structural concepts needed to assess principals, scope, correlation, version compatibility, lifecycle/readiness vocabulary, and action identifiers. Implementation must first show a genuine reusable representation gap. If it does, the change must be transport-neutral, implementation-free, owned by Adrasteia, independently versioned, compatible with the locked protocol range, and reviewed as a decision before any consumer implementation begins.

Ananke/Horae/Moirae domain-owned request and evidence details must remain in their owning repositories unless two or more runtimes demonstrably require a neutral portable shape.

## Proposed latency and resource budget

This is a non-production planning budget for warm local test processes, not a production SLO:

| Measure | Proposed ceiling |
|---|---|
| End-to-end positive round-trip, p95 | 1,000 ms |
| End-to-end positive round-trip, hard test timeout | 5,000 ms |
| Readiness evaluation | 100 ms per dependency before dispatch |
| Fixed fixture payload | 4 KiB maximum |
| External network/provider calls | 0 |
| Writes, spawned children, retries, persistence | 0 |

Exceeding a timing budget is a typed test failure or explicit inconclusive result, never a reason to bypass readiness, Ananke evaluation, or evidence capture.

## Stop conditions and rollback

Stop rather than activate or implement if any of the following is true:

- the target is no longer the exact approved baseline or a required checkpoint is unavailable;
- the proposed route cannot prove it crosses Ananke before the read;
- a feature requires remote OAuth, untrusted content, workflow persistence, unrestricted host execution, provider fallback, or derived-memory authority;
- the request cannot be canonically bound to origin/schema/readiness evidence;
- an Adrasteia change would be fixture-specific, behavioural, or lacks an explicit owner decision;
- any required negative test needs a simulated transport presented as real runtime evidence.

The future implementation rollback is to disable the Slice 02 route and restore the last known checkpointed runtime packages. Because the allowed fixture has no writes, external calls, credentials, or persistence, it requires no compensation. Rollback evidence must still report any read/result that occurred and must not silently erase decision/audit records.

## Unresolved decisions before activation

1. Which existing Ananke policy mechanism can explicitly allow the fixed read without converting a test fixture into ambient authority?
2. Which current Horae boundary can provide a real, pinned route/readiness proof without claiming unimplemented MCP or durable-workflow transport?
3. Which Moirae Code host path can be constrained to this fixture while exposing rather than hiding terminal, extension, debugger, and direct-provider bypasses?
4. Do existing local schemas already represent the request fingerprint, origin/schema receipt, readiness evidence, and typed returned result, or is a reusable neutral representation actually missing?
5. What exact status is asserted versus independently verified for the local test principals and runtime origins?
6. What consumer checkpoint/tag and handoff evidence is required before a completed Slice 02 can advance the compatibility lock?

## Why this proposal is safe to review but not safe to activate

It identifies a bounded, no-network, no-write, no-credential fixture and makes the evidence obligations explicit. It does not provide owner approval, an implemented route, a tested component checkpoint, a handoff packet, an accepted contract amendment, or user authorization to begin runtime implementation. This proposal does not modify `active-slice.json`, `fates-lock.json`, `compatibility-matrix.json`, compatibility-set snapshots, Slice 01 evidence, or any peer repository. `active-slice.json` therefore remains idle and no `slices/002-*` implementation directory is created by this proposal.
