# FATES-SLICE-002 runtime boundary resolution

## Status and decision

**Design status:** proposed owner-approval package; no runtime implementation or Slice activation.
**Current integration decision:** the prior review remains BLOCKED_BY_MISSING_RUNTIME_BOUNDARY until owners approve this design and later implementation evidence exists.
**Design classification:** READY_FOR_OWNER_APPROVAL.

READY_FOR_OWNER_APPROVAL means the design specifies one implementable, fail-closed route for explicit owner approval. It does **not** mean that the route is implemented, that a runtime checkpoint is complete, that Slice 02 is active, or that the compatibility baseline may advance.

## Evidence and design inputs

| Source | Commit | Contribution |
| --- | --- | --- |
| Integration evidence merge | f32d5c68f84d90fed3d418bdbdec0363e689b62a | Proposal and blocked owner-feasibility decision on main |
| Ananke owner ADR | 86eb983 | Bounded registered fixture-read adapter design |
| Horae owner ADR | c07b630 | Fail-closed action handoff and typed result relay design |
| Moirae Code owner ADR | bc48c25 | Constrained request/result host design |
| Adrasteia owner assessment | bbf240b | Existing portable-contract sufficiency conclusion |

The locked Stage-A component commits remain the starting evidence only: Ananke dcbb115c5798072221afdd2e4fdd36e786defddf, Horae 52e14fa574f7427f62747fe84d2789aec25b94e3, Moirae Code a4783db271a61848c66ac4f6652a539bdb515e28, and Adrasteia 124b6aee2629a3147739934ad5f1b45b32c8ba46.

## 1. Selected topology and exact boundaries

The selected future topology is **three separate local processes over loopback HTTP**:

~~~text
constrained Moirae host process
  -> Horae loopback handoff process
  -> Ananke loopback authority process
  -> Ananke-owned fixed fixture bytes
~~~

The controlled Slice 02 harness starts or otherwise supplies these independent process artifacts from their approved checkpoints. It records their artifact/commit identities and fixed loopback endpoints. It does not import a sibling package into another runtime as the route, use generic MCP stdio, let Moirae call Ananke directly, or let Integration become runtime code.

The only action is fates.slice02.inspect-fixed-fixture.v1. It carries exactly a closed fixture identifier and expected SHA-256. It cannot convey a free-form path, URI, command, provider, credential, network destination, browser instruction, shell instruction, child-process instruction, workflow, memory request, retry, or fallback.

## 2. Trust boundaries

| Boundary | Trusted responsibility | Explicitly not trusted/allowed |
| --- | --- | --- |
| Moirae constrained host | Obtains host/service and acting-agent identities from the local host boundary; creates initiating correlation; renders typed evidence | Does not authorize, read fixture bytes, call Ananke, or expose a generic host capability |
| Horae handoff | Verifies origin, compatibility, admitted Ananke identity, endpoint, capability and fresh readiness; creates route/event IDs; relays result | Does not approve, execute, read fixture bytes, retry, persist, or turn failure into success |
| Ananke authority | Validates trusted context, policy/version/validity, canonical request, exact adapter, physical read, digest and audit | Does not accept a caller path or delegate the physical read |
| Controlled harness | Pins artifacts/endpoints, disables selected test surfaces, captures evidence | Is not a runtime, policy engine, fixture reader, or substitute for a route |
| Integration | Defines cross-runtime assertions and receives handoff evidence | Does not host or mock the runtime route |

Loopback process attestation/capability establishes local transport identity. It is not an external/action credential and is never supplied as model content or action JSON. The tested action has no resource credential capability.

## 3. Request, readiness, and identity sequence

1. The harness verifies the three approved artifact/checkpoint identities and creates the isolated local test topology.
2. The constrained Moirae host verifies fresh Horae identity, protocol compatibility, endpoint receipt, exact action capability and request-schema receipt. It refuses a stale/not-ready/incompatible Horae before request creation.
3. Moirae obtains trusted dual-principal context from its host boundary, creates one initiating correlation ID, and sends the only allowed request to Horae.
4. Horae validates the strict action/argument shape, Moirae origin receipt, principals, bounded scope, purpose, validity, schema digest and correlation. It creates a distinct route ID and event ID.
5. Immediately before dispatch, Horae re-fetches/revalidates Ananke identity, registration, compatibility, health and readiness. The record is fresh only when it is no more than 1,000 ms old.
6. Horae rejects unregistered, unready, stale, unhealthy, endpoint/instance-drifted, capability-drifted, or protocol-incompatible Ananke. It does not dispatch in those cases.
7. Horae forwards the exact accepted request to the admitted Ananke execution endpoint only.
8. Ananke performs classify, policy/pre-authorised low-risk decision, strict argument/context and validity checks, exact adapter lookup, one bounded physical read, post-read SHA-256 comparison, typed outcome, and audit.
9. Horae relays the Ananke decision/outcome/audit references unchanged, adding only Horae route/event IDs. Moirae renders typed evidence and route limitations.

A cached readiness claim, a process-alive-only signal, a registration in progress, or a successful earlier request is not current readiness. Reinspection failure is unavailable or indeterminate, never presumed ready.

## 4. Canonical binding fields

| Field | Producer/owner | Binding point |
| --- | --- | --- |
| Action identity | Ananke registry; Horae allowlist | Strict equality before Horae dispatch and Ananke adapter lookup |
| Fixture ID and expected SHA-256 | Ananke fixture contract | Strict two-field argument schema and canonical digest |
| Authenticated and acting principals | Moirae host boundary; Ananke authenticates execution context | Trusted dual-principal execution context |
| Tenant/project/workspace and bounded scope | Host input, Horae validation, Ananke authority | Existing ResourceScope and execution context validation |
| Purpose and validity | Host declaration, Horae validation, Ananke authority | Canonical authority-relevant context |
| Moirae origin | Moirae host | Runtime/instance/artifact/schema receipt preserved by Horae |
| Horae route receipt | Horae | Route ID/event ID, capability plan, protocol/readiness observation |
| Ananke origin | Horae inspection plus Ananke self-description | Runtime/instance/endpoint/artifact/compatibility receipt |
| Schema identity and SHA-256 | Moirae/Horae local request-schema owners | Required before route dispatch; no portable type introduced |
| Protocol compatibility | Horae | Adrasteia semantic negotiation evidence |
| Readiness/health freshness | Horae | Immediate Ananke inspection; maximum age 1,000 ms |
| Correlation and producers | Moirae initiates; all preserve | One correlation with distinct Moirae/Horae/Ananke identifiers |
| Decision/outcome/audit references | Ananke | Preserved opaque references in Horae relay and Moirae view |

Existing Adrasteia types cover portable identity, principal structure, bounded scope, capability/action identifiers, correlation, readiness, registration, compatibility, references, and generic results. The route receipt, request-schema hash, fixture digest, policy decision body, endpoint check, timeout and UI presentation remain local. No neutral reusable representation gap has been demonstrated.

## 5. Result, failure, timeout, and cancellation semantics

The relay returns one typed route state: completed, denied, unavailable, stale, incompatible, malformed, timed_out, or indeterminate.

- **completed** is possible only when Ananke returns a typed completed outcome.
- **denied** and approval invalidation remain Ananke results; Horae must not rewrite them as transport errors.
- **unavailable**, **stale**, **incompatible**, and **malformed** are fail-closed pre-dispatch outcomes where no Ananke fixture read may occur.
- **timed_out** means no authoritative result arrived within the bounded handoff timeout. It is never success and has no retry.
- **indeterminate** means dispatch may have started but the authoritative result was not received. It is never success; evidence must retain the correlation and dispatch state.
- Cancellation is permitted only before Horae confirms dispatch. Afterwards the host records an authoritative result or timeout/indeterminate evidence; it does not claim that a cancellation prevented a read.

There is no retry, compensation, durable workflow, persistence, MRTR, automatic replanning, provider fallback, or memory fallback.

## 6. Fixture ownership and bypass claim

Ananke owns the immutable fixture bytes, fixed identifier, regular-file/no-symlink property, fixed UTF-8 encoding, maximum 4 KiB size, and physical read. Its adapter resolves the fixture through an internal constant/allowlist, never from caller input. It performs at most one read and compares the SHA-256 after that read. Ananke audit records attempt count, expected/actual digest, decision, correlation and producer-owned references.

Integration owns expected cross-runtime assertions and digest evidence; it does not copy the fixture into a runtime or read it on the route. The harness disables/no-configures direct fixture access, direct Ananke action client, providers/network, shell/terminal/task/child-process facilities, arbitrary IPC, direct sibling package imports, and environment-derived action/location values for the constrained host process.

The following are outside the Slice 02 claim and must be displayed as limitations: ordinary editor terminal, tasks, debugger, extension APIs, Git, third-party extensions, external CLIs, arbitrary SDK use and direct provider routes. Slice 02 cannot claim global Moirae governance.

## 7. Repository order and proposed implementation branches

1. **Integration evidence freeze** — retain the fixed digest, acceptance matrix and negative-test expectations only. Proposed branch: codex/slice-002-cross-runtime-proof.
2. **Ananke bounded adapter** — exact registered action, strict local arguments, fixed fixture, one read, digest verification, decision/audit evidence. Proposed branch: codex/slice-002-bounded-read-implementation.
3. **Horae handoff/relay** — loopback HTTP endpoint, immediate admission/readiness/identity verification, fail-closed dispatch and typed relay. Proposed branch: codex/slice-002-governed-handoff-implementation.
4. **Moirae constrained host** — one-action request/result process calling Horae only and displaying limitations. Proposed branch: codex/slice-002-constrained-host-implementation.
5. **Integration real proof** — launch/use only the published owner checkpoints and exercise end-to-end positive/negative cases. Proposed branch: codex/slice-002-cross-runtime-proof.

No project may advance its consumer checkpoint until its producer handoff is complete. No compatibility lock, matrix, snapshot, package version, protocol version or active-slice state may advance in this order.

## 8. Owner acceptance and handoff packets

### Owner acceptance criteria

- **Ananke owner:** accepts physical fixture ownership, exact action/arguments, authority/policy/validity binding, one-read maximum, digest mismatch and audit semantics.
- **Horae owner:** accepts the loopback HTTP topology, 1,000 ms readiness bound, endpoint/identity/capability verification, failure taxonomy, timeout and no-authority relay rule.
- **Moirae Code owner:** accepts a host that calls Horae only, trusted host identities, typed presentation, harness limits and explicit global limitations.
- **Adrasteia owner:** accepts the sufficiency assessment and agrees that a new portable type requires reopening under the stated multi-runtime structural criteria.
- **Integration owner:** accepts the test matrix, exact checkpoint ordering, handoff schema, non-activation conditions and sealing rules.

Approval is a decision on the design and its stated obligations, not acknowledgement that a document exists.

### Required producer handoff packet

Each implementation checkpoint must include:

- clean pushed commit and artifact/package identity; immutable tag where the repository's sealing policy requires one;
- branch/commit parent, validation command/results and hosted check reference;
- admitted dependencies and exact consumed producer checkpoint;
- runtime identity, compatibility/protocol, endpoint, health and fresh-readiness evidence;
- action/schema/origin/digest or route evidence owned by that runtime;
- positive and negative test report, timeout/cancellation evidence and bypass limits;
- explicit statement of what remains unimplemented/outside the Slice claim;
- owner acceptance record and rollback/disable procedure.

## 9. Test responsibilities

| Test class | Primary owner | Integration responsibility |
| --- | --- | --- |
| Strict action/argument/context/policy validity and zero read on denial | Ananke | Assert Ananke evidence is consumed intact |
| One physical read, digest mismatch and audit count | Ananke | Assert cross-runtime result/evidence matches expected digest |
| Registration/startup race, freshness, compatibility, endpoint and capability drift | Horae | Exercise against real owner artifact checkpoints |
| Dispatch/relay state, timeout, indeterminate and producer/correlation preservation | Horae | Verify complete route chronology |
| Unsupported action, no direct Ananke fallback, no local fixture read, typed UI and bypass limitations | Moirae Code | Assert host only calls Horae in the harness |
| Positive end-to-end and all declared negative cases | All owners | Run one real process-boundary proof; do not substitute mocks |

## 10. Conditions before activation, lock advancement, and sealing

Slice 02 cannot be activated until all owners approve this design, each implementation has a clean green checkpoint/handoff, the real three-process proof passes, all six gates have evidence, route-specific bypasses are explicit, and the user separately authorizes activation.

No lock or compatibility-state advancement is allowed before all consumer and Integration evidence is accepted. Sealing additionally requires the repository/tag/commit verification required by the Integration lock policy, exact artifact digests, hosted validation references, accepted handoff packets, and proof that the final route did not rely on mutable sibling source or a mock transport.

## 11. Explicit exclusions

This design excludes Mnemosyne, content preflight, remote OAuth, MCP 2026 migration, workflows, persistence, retry, compensation, provider fallback, arbitrary filesystem access, global Moirae governance, and all protocol/package-version changes.

## Non-activation confirmation

This document is a coordinated design only. Slice 02 remains inactive; active-slice.json, the lock, compatibility matrix, snapshots and checkpoints remain unchanged. No runtime code is implemented by this design package.
