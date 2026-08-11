# ACTIVE — FATES-SLICE-002 Horae Governed Handoff/Relay Implementation

## Objective

Implement the bounded Horae consumer/relay step for FATES-SLICE-002 against
the sealed Ananke producer checkpoint.

This task modifies Horae, plus a narrowly scoped superseding Ananke HTTP
transport ingress and the Integration ACTIVE completion record. The current
task instruction explicitly authorizes the superseding Ananke transport
change; the historical producer checkpoint and Slice 02 action authority
remain pinned and unchanged.

It does NOT implement Moirae, alter Runtime Contracts, advance the integration
lock/matrix/snapshot, or claim real three-process acceptance evidence.

## Authoritative inputs

### Activated Stage-A Horae baseline

Repository:
`hourwise/Project-Horae`

Stage-A checkpoint:
`52e14fa574f7427f62747fe84d2789aec25b94e3`

Stage-A tag:
`horae-adrasteia-adoption-v0.1.0-protocol-1.4.0`

### Approved Horae Slice 02 design

Design/main commit:
`b591bc688b64308a28bd958377dfdee2f2441985`

ADR:
`docs/ADR-XXXX-fail-closed-governed-action-handoff-and-result-relay.md`

Verify that the activated Stage-A Horae checkpoint is an ancestor of the
implementation branch.

### Sealed Ananke producer

Repository:
`hourwise/Project-Ananke`

Implementation provenance:
`552686fe6e01e2c0bf41ccb52591076bfa68bc2c`

Sealed checkpoint:
`a54cb481958e5711afc1c92c622673f85e7e0178`

Annotated tag:
`ananke-fates-slice-002-v0.1.0-protocol-1.4.0`

Required handoff:

`slices/002-governed-action-handoff/handoffs/ananke-handoff.json`

Human-readable companion:

`slices/002-governed-action-handoff/handoffs/ananke-producer-handoff.md`

Horae must consume the sealed checkpoint/tag as authority, not a mutable
Ananke branch head.

## Required context

Read:

- Integration root `AGENTS.md`
- `docs/INDEX.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/SYSTEM_MAP.md`
- `docs/INTEGRATION.md`
- `docs/checkpoint-policy.md`
- `slices/002-governed-action-handoff/README.md`
- `slices/002-governed-action-handoff/slice.json`
- `docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md`
- `docs/decisions/FATES-SLICE-002-evidence-freeze.json`
- finalized Ananke handoff files above

Then inspect only the relevant Horae source and its approved Slice 02 ADR.

Do not inspect unrelated projects.

## Exact route

Implement only the bounded route:

Moirae constrained host
-> Horae
-> Ananke
-> Horae
-> Moirae constrained host

For this task only the Horae side is implemented.

Approved topology:

- separate local processes;
- loopback HTTP;
- Horae ingress equivalent to:
  `POST /slice-02/governed-actions`
- Ananke execution via its canonical execution endpoint;
- no sibling runtime package imports as a substitute for process transport.

## Exact action

Horae may relay only:

`fates.slice02.inspect-fixed-fixture.v1`

Arguments are exactly:

```json
{
  "fixtureId": "fates.slice02.fixed-fixture.v1",
  "expectedSha256": "<64 lowercase hex>"
}
No additional fields.

Request schema:

urn:fates:slice02:inspect-fixed-fixture-request:v1

Schema SHA-256:

db1864fdc4978d6befb4b6d3913461e4f2d2732dd0ca87e076977ab98cf6049c

Fixture digest:

7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8

Horae must never read, resolve, host, copy, or inspect the fixture bytes.

Work
1. Reuse existing Horae composition/admission machinery

Use existing Horae mechanisms for:

runtime inspection;
registration/admission;
compatibility negotiation;
health/readiness;
capability reduction;
freshness;
correlation;
Ananke binding.

Prefer small extensions over parallel architecture.

Do not bypass existing Horae admission/composition logic.

2. Add one bounded Slice 02 route

Implement a Horae-local route/relay surface for the exact action only.

Reject:

unknown action;
missing/extra arguments;
malformed digest;
wrong fixture identifier;
malformed trusted context;
malformed origin/schema receipt;
unbounded scope;
missing purpose;
unsupported producer identity.

Do not create a generic action proxy.

3. Reinspect Ananke immediately before dispatch

Before every dispatch, Horae must freshly inspect the configured Ananke
loopback runtime and validate the sealed producer expectations.

Revalidate as applicable:

runtime identity;
registration;
compatibility/protocol;
health;
readiness;
endpoint;
instance identity;
expected producer/checkpoint/artifact identity available to Horae;
required action/capability availability.

Readiness evidence must be no older than 1,000 ms at dispatch.

Reject before dispatch when:

startup/registration incomplete;
process unavailable;
unhealthy;
required dependency not ready;
readiness stale;
protocol incompatible;
endpoint/instance drifted;
required capability/action absent or drifted.

A cached readiness observation alone is insufficient.

4. Preserve authority boundary

Horae is not the action authority.

Horae must not:

make or replace Ananke policy decisions;
rewrite a denied Ananke outcome;
create approval authority;
physically read the fixture;
retry execution;
fallback directly or indirectly to another execution path.

Ananke remains owner of:

policy;
authority decision;
physical read;
decision ID;
outcome ID;
audit reference;
producer evidence.
5. Create trusted relay receipt

Before dispatch, bind/record the Slice-02-local route evidence required by the
approved design and Ananke handoff, including as applicable:

exact action;
canonical argument digest;
principal pair;
tenant/project/workspace;
bounded resource scope;
purpose;
validity;
Moirae origin runtime/instance/artifact receipt;
request schema ID/digest;
admitted Ananke runtime/instance/endpoint;
negotiated protocol;
fresh readiness observation;
original correlation ID;
distinct Horae routeId;
distinct Horae event ID.

Generate the Ananke origin/schema handoff receipt exactly as required by the
sealed producer contract.

Do not place transport credentials, secrets, filesystem paths, or authority
material into model-visible action arguments.

If satisfying Ananke transport authentication requires inventing a new
cross-repository credential or portable contract, STOP and report.

6. Dispatch once

When all pre-dispatch checks pass:

forward the exact action and exact arguments once;
use Ananke's canonical governed execution endpoint;
preserve trusted context and receipt material through the intended trusted
transport mechanism;
never retry.
7. Relay typed result without rewriting producer evidence

Horae local route states are:

completed
denied
unavailable
stale
incompatible
malformed
timed_out
indeterminate

Rules:

Ananke completed -> Horae completed.
Ananke denied/invalidated -> Horae denied, preserving Ananke evidence.
pre-dispatch unavailable -> unavailable.
stale readiness -> stale.
protocol/identity/endpoint/capability mismatch -> incompatible.
request/origin/schema/context failure -> malformed.
bounded authoritative-result timeout -> timed_out.
transport loss after confirmed dispatch with no authoritative outcome ->
indeterminate.

timed_out and indeterminate are never success.

Horae must preserve:

initiating correlation ID;
Ananke request/decision/outcome/audit references;
Ananke producer evidence.

Horae adds its own route/event IDs and never overwrites producer IDs.

8. Dispatch-state correctness

Record enough local evidence to distinguish:

rejected before dispatch;
dispatch not attempted;
dispatch confirmed;
result received;
result lost/indeterminate;
timed out after dispatch.

Never claim readAttemptCount=0 after a dispatch when Horae cannot know whether
Ananke performed the read.

9. Tests

Add focused Horae owner-local tests covering at least:

valid admitted request dispatches once and relays typed completion;
denied Ananke result is preserved without rewrite;
malformed/extra argument refuses before dispatch;
stale readiness refuses before dispatch;
startup/not-ready refusal;
incompatible protocol refusal;
endpoint/instance/capability drift refusal;
origin/schema mutation refusal;
correlation preserved while Horae adds distinct IDs;
timeout is non-success and not retried;
post-dispatch transport loss becomes indeterminate;
no fixture read code/path exists in Horae Slice 02 implementation;
no second Ananke dispatch occurs for any single request.

Mocks/test servers may prove Horae-local logic only.

Do NOT describe mocked owner-local tests as real three-process acceptance proof.

10. Preserve existing behavior

Run existing Horae test/build/lint/format validation.

Do not regress existing Stage-A inspection/admission/composition behavior.

Keep Slice-specific code bounded and isolated where practical.

Avoid embedding Slice 02 constants and behavior throughout generic Horae
components when a narrow adapter/route can contain them.

Explicit exclusions

Do not implement:

Moirae;
Mnemosyne;
Runtime Contracts changes;
content preflight;
MCP migration;
remote OAuth;
provider routing;
generic HTTP proxying;
arbitrary tools/actions;
retries;
compensation;
persistence;
durable workflow/session recovery;
credential brokering;
fixture access;
global host governance;
Integration real-process harness.

Do not update:

fates-lock.json;
compatibility-matrix.json;
compatibility snapshot;
Slice completion state;
Slice seal state.
Acceptance criteria

Complete when:

Horae exposes only the bounded Slice 02 relay surface.
The exact Ananke sealed checkpoint is pinned as producer authority.
Fresh identity/registration/compatibility/health/readiness reinspection
happens before every dispatch.
Readiness older than 1,000 ms cannot dispatch.
Drift/incompatibility/malformed cases fail before dispatch.
Successful requests dispatch exactly once.
No retry/fallback exists.
Ananke authority/evidence is preserved without Horae reinterpretation.
Correlation is preserved and Horae adds distinct route/event IDs.
Timeout and indeterminate semantics are fail-closed.
Horae never reads or hosts the fixture.
Focused positive/negative owner-local tests pass.
Existing Horae tests/build/lint/format checks pass.
Integration validators remain green.
Runtime Contracts and Integration control-state files remain unchanged.
No Moirae implementation begins.
ACTIVE completion record identifies changed files, tests, limitations, and
exact next permitted step.
Stop conditions

Stop and report rather than expanding scope if:

the sealed Ananke contract cannot be consumed without changing it, unless the
current task explicitly authorizes a narrowly scoped superseding transport
implementation;
a Runtime Contracts change appears necessary;
a new credential protocol would be required;
a generic execution proxy would be required;
the existing Horae admission model cannot represent the required bounded
producer identity/readiness checks without architectural expansion;
the implementation would require Horae to read the fixture;
the implementation would require Moirae work;
the exact Stage-A/design ancestry does not hold.
Completion boundary

Do not commit, push, tag, create a PR, create a handoff packet, or begin Moirae
unless explicitly authorized after review.

## Stop record — 2026-08-09

Status: **STOPPED at an explicit stop condition before Horae implementation.**

The required Stage-A/design ancestry check passed: Horae checkpoint
`52e14fa574f7427f62747fe84d2789aec25b94e3` is an ancestor of the current Horae
design head `b591bc688b64308a28bd958377dfdee2f2441985`.

The sealed Ananke producer checkpoint and handoff were inspected:

- checkpoint: `a54cb481958e5711afc1c92c622673f85e7e0178`;
- tag: `ananke-fates-slice-002-v0.1.0-protocol-1.4.0`;
- canonical execution endpoint: `POST /api/execute`;
- required trusted receipt: `adapterMetadata` containing the exact origin and
  request-schema receipt.

At the sealed checkpoint, Ananke's HTTP route accepts `toolName`, `arguments`,
optional approval/content fields, and optional `purpose`; it derives trusted
execution context from the authenticated workload credential and forwards only
that context to `Gateway.execute`. It does not accept or forward
`adapterMetadata`, and its HTTP correlation headers carry only correlation and
causation identifiers. The sealed Slice 02 validator requires the origin/schema
receipt from `invocation.adapterMetadata`; without it, Ananke returns
`FIXTURE_AUTHORITY_INVALID` before adapter invocation and no fixture read.

Therefore the sealed producer contract cannot be consumed over the approved
separate-process loopback HTTP topology while preserving the required trusted
receipt and authority binding. Proceeding would require changing Ananke's sealed
HTTP contract or inventing a new cross-repository header/credential protocol.
Both are explicit stop conditions, and no such change is authorized for this
task.

Work completed in this task:

- read the required Integration and Slice 02 authority documents;
- verified the Horae Stage-A ancestry requirement;
- inspected the approved Horae ADR and the sealed Ananke handoff;
- inspected the sealed Ananke HTTP route and Slice 02 validator to establish
  the incompatibility;
- updated this ACTIVE stop record.

Horae files changed: none. Runtime Contracts, Ananke, Moirae, lock/matrix/
snapshot, and Slice completion/seal state were unchanged. No implementation,
new transport credential, commit, tag, push, handoff packet, or PR was created.

Checks: no Horae implementation checks were run because the implementation was
not started after the stop condition was reached. Existing Horae worktree
changes were preserved.

Remaining limitation: the bounded Horae relay, focused owner-local tests, and
real three-process proof remain unimplemented. The exact next permitted step is
to resolve the sealed Ananke transport contract through a separately authorized
design/decision; after that, rerun this task against an explicitly consumable
producer contract. Do not begin Moirae or alter Integration control-state files
until that resolution is accepted.

## Revalidation record — 2026-08-09

The stop condition was rechecked after re-reading the required authority
documents and the current Horae/Ananke implementation state. The exact sealed
Ananke checkpoint still resolves to `a54cb481958e5711afc1c92c622673f85e7e0178`.
Its `/api/execute` route accepts the action arguments, optional purpose, and
correlation headers, but does not accept or forward `adapterMetadata`. The
sealed Slice 02 validator still requires that metadata for the origin/schema
receipt and otherwise returns `FIXTURE_AUTHORITY_INVALID` before adapter
invocation.

The Horae Stage-A ancestry check still passes. No Horae implementation was
started, no additional repository was modified, and the previously recorded
stop remains in force.

## Superseding transport implementation record — 2026-08-09

Status: **COMPLETE for the authorized owner-local implementation scope.**

The current task instruction explicitly authorized a superseding Ananke HTTP
transport implementation. The historical stop record above is retained as
audit history, but its transport incompatibility conclusion is superseded for
this run. The sealed Ananke checkpoint remains the producer authority:

- checkpoint: `a54cb481958e5711afc1c92c622673f85e7e0178`;
- tag: `ananke-fates-slice-002-v0.1.0-protocol-1.4.0`;
- implementation provenance: `552686fe6e01e2c0bf41ccb52591076bfa68bc2c`.

Implementation completed:

- Ananke now exposes the authenticated, canonical `POST /api/execute` receipt
  transport for the exact Slice 02 action only. It accepts top-level
  `adapterMetadata`, forwards it to the existing governed execution path, and
  rejects that field for every other action. Runtime inspection identity
  carries the pinned Slice 02 producer attestation when the action is
  registered. The Ananke-owned fixture is explicitly kept LF-normalized so
  its checked bytes hash to the sealed digest.
- Horae now contains the isolated `@horae/slice02-relay` package and the
  equivalent `POST /slice-02/governed-actions` route. It validates the exact
  action, arguments, origin/schema receipt, principals, bounded scope,
  purpose, validity, correlation, pinned Ananke identity/endpoint/producer,
  compatibility, health, readiness, dependencies, and reduced action
  capability immediately before a single dispatch.
- Horae uses the existing `HttpAnankeInspectionBinding`, `RuntimeRegistry`,
  Adrasteia parsers, capability planner, and canonical HTTP execution
  endpoint. No generic proxy, retry, fallback, credential protocol, fixture
  access, persistence, or sibling runtime source import was added.
- Horae relays typed Ananke outcomes and producer evidence without rewriting
  authority fields. It adds distinct route and event IDs, preserves the
  initiating correlation, and maps timeout or post-dispatch transport loss to
  non-success `timed_out` or `indeterminate` states.

Changed files:

- Ananke: `.gitattributes`, `docs/HTTP_API.md`,
  `packages/adrasteia-adapter/src/index.ts`,
  `packages/runtime-core/src/index.ts`,
  `packages/runtime-core/src/routes.ts`,
  `packages/runtime-core/src/slice02-fixed-fixture.ts`,
  `packages/runtime-core/src/slice02-fixed-fixture.test.ts`, and
  `packages/runtime-core/fixtures/fates-slice-002/fates.slice02.fixed-fixture.v1.txt`.
- Horae: `package-lock.json`, `tsconfig.json`, and the new
  `packages/slice02-relay/{package.json,tsconfig.json,src/index.ts,src/index.test.ts}`.
- Integration: this ACTIVE record only. Runtime Contracts, lock/matrix/
  snapshot/seal control state, and all other Fate repositories were not
  modified.

Evidence:

- Ananke `npm.cmd run build`: passed.
- Ananke `npm.cmd run lint`: passed.
- Ananke `npm.cmd test`: 16 files, 131 tests passed.
- Ananke focused Slice 02/runtime inspection tests: 2 files, 14 tests passed.
- Horae `npm.cmd run validate`: passed, including Stage-A baseline
  verification, build, lint, conformance, peer comparators, bench, CLI smoke,
  composition, and 15 tests at aggregate-validation time.
- Horae final `npm.cmd run build`: passed; final `npm.cmd run lint`: passed;
  final `npm.cmd test`: 2 files, 16 tests passed.
- Integration `npm.cmd run validate`: passed; all 55 validator tests passed.
- The Slice 02 relay source contains no filesystem/read API or fixture-byte
  path, verified by a focused source search.
- The required Horae Stage-A ancestry check passed before implementation.

Limitations and deviations:

- The focused Horae tests use owner-local mocks, plus a fake-fetch assertion
  for the exact Ananke HTTP dispatch shape. They are not real three-process
  acceptance evidence. Moirae was not implemented, and no real-process
  Integration harness was added.
- The superseding transport changes the historical Ananke HTTP ingress
  contract only for this bounded action. It does not replace the sealed
  producer action, adapter, fixture authority, or Runtime Contracts.
- No commit, push, tag, pull request, handoff packet, lock/matrix/snapshot
  update, or Slice completion/seal transition was performed.

The exact next permitted step is review and explicit authorization of a
separate real three-process integration/evidence task for the already bounded
route. Do not begin Moirae or alter Integration control-state files as part of
that review.

## Real Slice 02 process acceptance exercise - 2026-08-09

Status: **LIVE ACCEPTANCE EVIDENCE CAPTURED - STOPPED FOR REVIEW.**

The explicitly authorized real-process acceptance exercise was completed over
the owner-local Ananke, Mnemosyne, and Horae process boundaries. The bounded
positive relay succeeded, and representative negative cases remained
fail-closed. This record does not mark Slice 02 complete, sealed, or promoted.

Detailed evidence and reproduction data are in
[FATES-SLICE-002-live-acceptance-2026-08-09.json](../evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json).

Process configuration and topology:

- Ananke was the actual compiled runtime gateway, PID 23556, on port 34102,
  started with `ANANKE_PORT=34102 ANANKE_DEVELOPMENT_MODE=true node
  packages/runtime-core/dist/server.js`. Its live instance was
  `ananke-d9271328-e9a6-4897-9f35-c8f7f65145ba`, protocol `1.4.0`, with the
  pinned checkpoint, tag, repository, and implementation provenance observed
  through runtime inspection. Its registered canonical endpoint was exactly
  `http://localhost:34102/api`, and the action request crossed
  `POST http://localhost:34102/api/execute`.
- Mnemosyne was independently started as the actual compiled runtime, PID
  24608, with instance `mnemosyne-live-instance-1`; it reported healthy and
  ready, with only its optional Ananke advisory integration degraded. The
  authoritative Slice 02 definition explicitly excludes Mnemosyne from this
  handoff path, so it was inspected as an independent required process but was
  not inserted into the relay.
- Horae was the actual compiled `@horae/slice02-relay` in an independent
  external HTTP process, PID 7344, on port 34106. The external boundary was
  `http://127.0.0.1:34106/slice-02/governed-actions`, configured with Ananke
  host base `http://localhost:34102`, expected endpoint
  `http://localhost:34102/api`, the observed Ananke instance ID, and the local
  development execution credential (omitted from evidence).
- Temporary process scripts and the exact commands are retained at
  `C:\Users\USER\AppData\Local\Temp\fates-slice02-live-20260809`. All acceptance
  processes were stopped after the run; ports 34102-34108 had no listeners on
  cleanup.

Live inspection and positive-path evidence:

- Before dispatch, Horae freshly observed HTTP 200 identity, registration,
  compatibility and negotiation (`1.4.0`), health, readiness, dependency
  state, exact canonical endpoint, the pinned producer attestation, the exact
  action metadata, and the required capability. The positive receipt reported
  readiness age `62 ms` against the `1000 ms` limit.
- The successful external request returned HTTP 200 with Horae state
  `completed` and dispatch state `result_received`. It created exactly one
  route identity `route_1174d21e-19db-4e03-9518-bf51a7c56ac0` and one event
  identity `event_66061188-a8ff-46b7-b104-f4a9c245a341`, while preserving
  request ID `live-slice02-request-001` and correlation ID
  `live-slice02-correlation-001` through Ananke.
- Ananke preserved the governed evidence: request
  `request-f3027a0b-ecc8-4942-8f56-9fb5fa9f96b4`, decision
  `05d0d928-8561-4a75-a160-35ebba4cbef4`, outcome
  `26897cc7-7963-4457-bbe9-b854f2448fd0`, and audit
  `43ae488b-de5a-4d01-83e4-60092e587466`. The producer evidence recorded one
  physical read, adapter invocation, policy `ALLOW`, and the exact sealed
  fixture digest `7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8`.
- For the successful correlation there was exactly one Ananke request audit,
  one execution, and one outcome; retry, fallback, alternate endpoint, and
  duplicate execution were false. Horae did not read fixture bytes; the
  physical read evidence came from Ananke's producer path.
- Action-scoped `adapterMetadata` was accepted for the authorized Slice 02
  action. A direct non-Slice action carrying the same field returned HTTP 400
  with `adapterMetadata is only accepted for the bounded Slice 02 action`.

Representative negative-path evidence:

- Extra argument and mutated-origin requests returned HTTP 400, state
  `malformed`, and `rejected_before_dispatch`, with no Ananke audit increment.
- Wrong expected Ananke instance and wrong expected endpoint returned HTTP
  409 `incompatible` (`Ananke identity drifted` and `Ananke endpoint drifted`),
  with no Ananke audit increment.
- A wrong-but-valid expected fixture digest traversed the governed Ananke
  path once and returned HTTP 200 with Horae state `denied`; Ananke preserved
  `FAILED/FIXTURE_DIGEST_MISMATCH`, one read attempt, and non-retryable
  evidence. This was a deliberate separate negative dispatch, not a retry of
  the successful request.
- Live timeout, post-dispatch indeterminate transport loss, and missing or
  wrong producer/capability induction were not claimed. Inducing those states
  honestly would require a producer mutation, response-dropping proxy, or
  alternate endpoint outside the authorized owner-local scope. The bounded
  Horae tests cover timeout and indeterminate semantics, including no safe
  retry from unknown execution state.

Post-acceptance validation:

- Ananke focused Slice 02/runtime inspection tests passed: 2 files, 14 tests;
  Ananke build and lint passed. The post-live full Ananke suite completed with
  129/131 tests: the only failures were the unrelated MCP stdio tests
  `surfaces MCP tool errors to gateway executor` and
  `executes stateful create and search tools over stdio` in
  `packages/mcp-adapter/src/mcp-adapter.test.ts`, each timing out at 15 seconds.
  No MCP or unrelated component correction was made.
- Horae aggregate `npm.cmd run validate` passed, including baseline
  verification (Runtime Contracts `project-runtime-contracts@0.4.0`, SHA-256
  `11ee062b079f74d2a4558af315c9b9b12a6aede291d409c48f038d93c416e2c2`), build,
  lint, 16 tests, conformance, peer comparators, bench, CLI smoke, and
  composition. The sandbox initially blocked the documented baseline fetch;
  the same validation passed with approved network access.
- Integration `npm.cmd run validate` passed: all 55 tests and all 9 canonical
  JSON validations passed.

Control-state preservation and deviations:

- Runtime Contracts was not modified. Moirae Code was not modified or
  started. The lock, compatibility matrix, snapshots, seals, fixtures, and
  canonical endpoint requirements were not changed.
- The initial live Horae wrapper was deliberately fail-closed because its
  harness configuration supplied the `/api` path where the HTTP binding
  expects Ananke's host base. The corrected owner-local process configuration
  used `http://localhost:34102` and passed; no product implementation change
  was required.
- No commit, tag, push, pull request, handoff packet, or Slice completion/seal
  transition was performed. Stop here for review; do not start the next phase
  or alter Integration control-state files as part of this acceptance record.

## Pre-seal verification gate - 2026-08-09

Status: **PASSED. Live Slice 02 acceptance remains valid evidence and the
candidate is ready for formal Slice 02 acceptance/sealing review.** This is
not a completion or seal transition. `FATES-SLICE-002` remains active and
provisional; no lock, matrix, snapshot, or seal state was advanced.

### Ananke 129/131 timeout investigation

The two reported failures were investigated without changing Ananke code or
tests:

- `npm.cmd test -- packages/mcp-adapter/src/mcp-adapter.test.ts` passed with
  1 file and 4/4 tests at 21:12:58.
- `npm.cmd test -- packages/mcp-adapter/src/mcp-adapter.test.ts -t
  "surfaces MCP tool errors to the gateway executor"` passed with 1/1
  selected test (3 skipped).
- `npm.cmd test -- packages/mcp-adapter/src/mcp-adapter.test.ts -t
  "executes stateful create and search tools over stdio"` passed with 1/1
  selected test (3 skipped).
- A repeat of `npm.cmd test --
  packages/mcp-adapter/src/mcp-adapter.test.ts` passed with 1 file and 4/4
  tests at 21:13:33.
- The subsequent complete `npm.cmd test` passed with 16 files and 131/131
  tests at 21:13:48. The final validation `npm.cmd test` also passed with 16
  files and 131/131 tests at 21:17:33.

The earlier 129/131 result is therefore classified as a **transient
test-run timeout** in the two real MCP stdio tests
`surfaces MCP tool errors to the gateway executor` and
`executes stateful create and search tools over stdio`. The isolated file,
both affected tests individually, the repeated isolated file, and the full
suite all passed without a code or test change. No unrelated Ananke defect was
found and no unrelated repair was folded into Slice 02.

### Evidence classification and review

The live acceptance candidate at
`docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json` accurately
separates the evidence classes:

- **LIVE VERIFIED:** compiled Ananke, external compiled Horae relay, and an
  independently started Mnemosyne baseline process were observed; the
  Ananke identity/registration/health/readiness/compatibility/action and
  producer attestation checks passed; the positive route completed once over
  `POST http://localhost:34102/api/execute`; the Horae route/event IDs,
  initiating request/correlation IDs, Ananke request/decision/outcome/audit
  IDs, producer digest, `readAttemptCount=1`, dispatch counts, and the
  malformed, origin, identity, endpoint, digest-mismatch, and unauthorized
  metadata negative paths are recorded. Mnemosyne was inspected but is
  explicitly not part of the Slice 02 handoff path.
- **OWNER-LOCAL / DETERMINISTIC TEST VERIFIED:** Horae's six focused relay
  tests cover exact dispatch, typed completion, denied-result preservation,
  malformed/origin/argument rejection, stale/not-ready/protocol/endpoint/
  instance/action drift, timeout, post-dispatch transport loss, and no retry.
  These tests remain owner-local and are not represented as live route proof.
- **NOT LIVE INDUCED:** live timeout, post-dispatch indeterminate transport
  loss, and missing/wrong producer or capability induction were not claimed.
  The evidence candidate states this limitation explicitly; no producer
  mutation, response-dropping proxy, or alternate endpoint was introduced.

The candidate's process roles, endpoints, route/event/correlation identifiers,
producer checkpoint/tag/implementation provenance, schema and fixture
digests, dispatch/read counts, validation outcomes, negative paths, and
limitations are sufficient to reconstruct the exercise. To satisfy the
Integration boundary validator without changing observed facts, the external
temporary directory and command fields in the JSON use the environment form
`%TEMP%\fates-slice02-live-20260809`; the exact resolved directory was
verified as `C:\Users\USER\AppData\Local\Temp\fates-slice02-live-20260809`
and is outside every repository. No evidence claim was added for an unobserved
live behavior.

### Repository-state audit

All repositories have no staged changes. The exact working-tree state and
candidate scope are:

- **Integration** — branch
  `codex/slice-002-owner-approvals` tracking its remote; modified
  `docs/tasks/ACTIVE.md`; untracked
  `docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json` only.
- **Ananke** — branch `codex/slice-002-http-handoff-bridge`; status-listed
  files are `.gitattributes`, `docs/HTTP_API.md`,
  `packages/adrasteia-adapter/src/index.ts`,
  `packages/runtime-core/src/index.ts`,
  `packages/runtime-core/src/routes.ts`,
  `packages/runtime-core/src/slice02-fixed-fixture.ts`,
  `packages/runtime-core/src/slice02-fixed-fixture.test.ts`, and
  `packages/runtime-core/fixtures/fates-slice-002/fates.slice02.fixed-fixture.v1.txt`.
  The fixture text file is status-marked because of the text/EOL attribute
  change, but its worktree and `HEAD` blob hashes match and `git diff` has no
  content delta for that file. The seven other files are the actual content
  diff.
- **Horae** — `main` tracking its remote; modified `package-lock.json` and
  `tsconfig.json`; untracked
  `packages/slice02-relay/package.json`,
  `packages/slice02-relay/tsconfig.json`,
  `packages/slice02-relay/src/index.ts`, and
  `packages/slice02-relay/src/index.test.ts`.
- **Mnemosyne** — `main` tracking its remote; clean.
- **Moirae Code** — branch `codex/slice-002-constrained-host-design` tracking
  its remote; clean and unchanged.
- **Runtime Contracts** — branch
  `codex/slice-002-contract-sufficiency-assessment` tracking its remote;
  clean and unchanged.

The temporary acceptance scripts and logs remain under
`C:\Users\USER\AppData\Local\Temp\fates-slice02-live-20260809`, outside all
repositories, and will not be committed. Repository status contains no
generated logs, process files, local configuration, credentials, or
acceptance scratch files; the Integration evidence JSON is the only new
artifact. Runtime Contracts, Moirae Code, `active-slice.json`,
`fates-lock.json`, `compatibility-matrix.json`, the Stage-A compatibility
snapshot, Slice 02 control state, and seal state remain unchanged. The
canonical `POST /api/execute` endpoint and pinned Ananke producer authority
remain unchanged except for the explicitly authorized Ananke HTTP receipt
implementation. A focused search found no filesystem/read API in Horae's
Slice 02 relay package.

### Final validation

- **Ananke:** `npm.cmd test` passed with 16 files / 131 tests; `npm.cmd run
  build` passed; `npm.cmd run lint` passed.
- **Horae:** `npm.cmd run validate` passed. Runtime Contracts baseline
  verification passed for `project-runtime-contracts@0.4.0` with artifact
  SHA-256 `11ee062b079f74d2a4558af315c9b9b12a6aede291d409c48f038d93c416e2c2`;
  build and lint passed; aggregate tests passed with 2 files / 16 tests;
  conformance passed with 1 file / 10 tests; both peer comparators passed;
  bench passed with 2 files / 16 tests; CLI smoke and composition passed
  (1 file / 10 tests).
- **Integration:** `npm.cmd run validate` passed after the evidence-path
  normalization: all 9 canonical JSON validations passed, boundary/lock/
  matrix/slice checks passed, and all 55 tests passed across 5 suites.

### Eventual commit scope

No commit is being created in this gate. If the candidate proceeds to the
separately authorized commit step, the files currently in scope are:

- **Integration:** `docs/tasks/ACTIVE.md` and
  `docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json`.
- **Ananke:** `.gitattributes`, `docs/HTTP_API.md`,
  `packages/adrasteia-adapter/src/index.ts`,
  `packages/runtime-core/src/index.ts`,
  `packages/runtime-core/src/routes.ts`,
  `packages/runtime-core/src/slice02-fixed-fixture.ts`, and
  `packages/runtime-core/src/slice02-fixed-fixture.test.ts`. The fixture
  text file is not a content-diff candidate unless its status-only EOL state
  is explicitly staged later.
- **Horae:** `package-lock.json`, `tsconfig.json`, and the four new files under
  `packages/slice02-relay/` listed above.
- **Mnemosyne, Moirae Code, and Runtime Contracts:** no files.

Stop here for formal Slice 02 acceptance/seal review. Do not create or modify
a seal, matrix, lock, snapshot, completion state, commit, tag, push, PR, or
Slice 03 work from this task.

## Formal Slice 02 acceptance and seal - 2026-08-09

Status: **FORMALLY ACCEPTED AND SEALED at Slice 02 level.** The current
compatibility set is `fates-slice-002-2026-08-09` at
`integrationLevel: runtime_validated`. Its global `sealStatus` remains
**provisional** under the checkpoint policy because the unchanged locked Moirae
Code checkpoint is still `pushed_untagged`; no Moirae implementation or tag was
introduced as part of Slice 02. This limitation does not reopen the accepted
Slice 02 evidence or its sealed row. Slice 03 has not started.

The historical pre-seal entry above records the earlier stop condition and is
retained as an audit trail. This section records the subsequently authorized
formal transition.

### Accepted evidence boundary

- **LIVE VERIFIED:** compiled Ananke and Horae processes were started with the
  recorded roles and endpoints; an independently started compiled Mnemosyne
  process was inspected but excluded from the handoff path; Horae freshly
  inspected Ananke; the bounded action crossed the canonical Ananke HTTP
  endpoint once; route/event/request/correlation identifiers were preserved;
  the producer checkpoint and fixture digest matched; dispatch count was one;
  producer physical-read count was one; validation and fail-closed malformed,
  origin, identity, endpoint, digest-mismatch, and unauthorized-metadata
  negatives are recorded.
- **OWNER-LOCAL / DETERMINISTIC TEST VERIFIED:** Horae's focused tests cover
  exact dispatch, typed completion and denial, malformed/origin/argument
  rejection, stale/not-ready/protocol/endpoint/instance/action drift, timeout,
  post-dispatch transport loss, and no retry. These tests are not represented
  as live route proof.
- **NOT LIVE INDUCED:** live timeout, live post-dispatch indeterminate
  transport loss, and live missing/wrong producer or capability induction were
  not performed. No producer mutation, response-dropping proxy, alternate
  endpoint, or other new fault-injection mechanism was introduced.

The canonical evidence record is
`docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json`; it uses
`%TEMP%\fates-slice02-live-20260809` for reconstructable temporary paths and
does not contain an absolute local path. The temporary scripts and logs remain
outside every repository at
`C:\Users\USER\AppData\Local\Temp\fates-slice02-live-20260809` and will not be
committed.

### Final checkpoint and control state

- Ananke checkpoint: commit
  `52b512885edf3fec7ff7ce4b4dcbd3958b170ba4`, annotated tag
  `ananke-fates-slice-002-v0.2.0-protocol-1.4.0`, pushed branch
  `codex/slice-002-http-handoff-bridge`. Required draft PR #3 was opened only
  to obtain branch CI; its checks passed and it was not merged.
- Horae checkpoint: commit
  `9566eb2764339d6a6fe143c1630eeb009e00a7bd`, annotated tag
  `horae-fates-slice-002-v0.1.0-protocol-1.4.0`, pushed on `main`.
- Integration control state: `fates-lock.json` points to
  `compatibility-sets/fates-slice-002-2026-08-09.json`; the Slice 02 matrix
  row and `slices/002-governed-action-handoff/slice.json` are completed and
  sealed; `active-slice.json` is idle with no active slice.
- The compatibility snapshot preserves all five repository entries and the
  unchanged Runtime Contracts/Mnemosyne/Moirae references. Runtime Contracts,
  Mnemosyne, and Moirae Code remain unchanged.
- The Integration closure commit and tag are the final repository checkpoint
  produced by this section; their exact IDs are reported in the final handoff
  report after push verification.

### Final validation and audit result

- Ananke: full suite **16 files / 131 tests passed**, build passed, lint
  passed; the earlier 129/131 result is recorded as a transient timeout after
  isolated, individual, repeated, and subsequent full-suite passes.
- Horae: aggregate `npm.cmd run validate` passed, including baseline
  verification, build, lint, 16 tests, 10 conformance tests, peer comparators,
  benchmark, CLI smoke, and composition.
- Integration: `npm.cmd run validate` passed with **55/55 tests** across five
  suites, all 12 canonical JSON validations, and passing lock, matrix, slice,
  and boundary checks.
- Repository audit confirms no generated logs, transient process files, local
  configuration, credentials, or acceptance scratch files entered a
  repository; no fixture-read path exists in Horae; Runtime Contracts remain
  unchanged; the canonical endpoint and pinned Ananke producer authority are
  unchanged except for the authorized Ananke HTTP implementation; and the
  status-only Ananke fixture-text EOL marker was not staged.

This formal acceptance/seal task is complete. Do not start Slice 03, modify
Runtime Contracts, alter the global seal solely to remove the explicit Moirae
limitation, or create another live three-process acceptance exercise without a
new authorized scope.

## Post-Slice-02 / Pre-Slice-03 readiness assessment - 2026-08-09

Status: **ASSESSMENT COMPLETE - STOPPED FOR OWNER DECISION.** The sealed Slice
02 state remains unchanged and `active-slice.json` remains idle. The detailed
assessment is recorded in
[`docs/tasks/POST_SLICE_002_READINESS.md`](./POST_SLICE_002_READINESS.md).

The exact current Moirae checkpoint
`bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6` is a clean, pushed, CI-green
documentation/design checkpoint for the proposed constrained host, not an
implemented compatibility runtime. It is classified **D - REQUIRES
IMPLEMENTATION**; no tag is created. Global compatibility remains
`provisional` solely because that locked Moirae reference is `pushed_untagged`.

The recommended next bounded work is a new, explicitly activated process-origin
follow-up for Moirae -> Horae -> Ananke -> Horae -> Moirae. Mnemosyne remains
outside that route. The existing roadmap objective “Qualified context
retrieval” remains a later objective and should be split/reordered after the
Moirae host boundary is implemented and independently live-accepted.

This cross-reference records assessment results only. It does not change the
Slice 02 lock, matrix, snapshot, evidence, seal, Runtime Contracts, Moirae
checkpoint, or compatibility status, and it does not activate Slice 03.

## Post-Slice-02 requirements and research traceability - 2026-08-09

Status: **ARCHITECTURE/RESEARCH TRACEABILITY COMPLETE - ACTIVE SLOT REMAINS
IDLE.** The durable reconciliation is recorded in
[`docs/REQUIREMENTS_TRACEABILITY.md`](../REQUIREMENTS_TRACEABILITY.md). It
contains 26 stable register entries covering the eleven research findings,
current implementation evidence, ownership, invariants, ADR classifications,
external comparison, 003A reassessment, future slice order, and the two
required experiments.

### Work completed

- Confirmed the sealed Slice 02 baseline and all current Fate ownership
  boundaries against the Integration authority documents and the locked
  component checkpoints.
- Reconciled value-level provenance, Rule-of-Two composition, Moirae process
  origin versus OS containment, Ananke authority/effect separation,
  credential custody, memory never-authority, indeterminate outcomes, durable
  pre-dispatch evidence, current MCP lifecycle, external primitives, and
  Runtime Contracts scope.
- Classified the current state as proven only where the bounded evidence
  supports it; otherwise used implemented-not-integration-proven, partial,
  documented, planned, research-required, deferred, or rejected status.
- Checked current primary sources for AGT, agentgateway, MCP 2026-07-28, Meta
  Rule of Two, FIDES/CaMeL, policy engines, workload identity, credential
  custody, durable execution, transparency logs, and sandbox primitives.
- Reassessed 003A as **YES WITH PREREQUISITES**: revise the Moirae
  constrained-host ADR to separate process-origin/route proof from OS
  containment, then activate only under a new owner-approved scope. OS
  containment remains a separate 003B-or-later capability.

### Evidence and remaining issues

- No implementation repository was modified. No dependency, contract,
  package, lock, matrix, snapshot, seal, or Slice 02 evidence was modified.
- The report confirms the bounded Slice 02 route is proven, while live timeout,
  live post-dispatch indeterminate transport loss, qualified memory admission,
  durable recovery/idempotency, general value-level information flow,
  production credential custody, and OS-wide host bypass resistance remain
  unproven or unimplemented.
- The active slot is still idle and no Slice 03/003A branch or activation was
  started. The recommended future ordering is recorded as a proposal only.
- Cross-component effects are requirements and acceptance ownership only:
  Ananke remains authority/effect owner, Mnemosyne memory/provenance owner,
  Horae discovery/composition/freshness owner, Moirae host owner, Runtime
  Contracts neutral-shape owner, and Integration evidence owner.

### Validation required for this traceability change

Run Integration-only validation after this append: `npm.cmd run validate`,
`git diff --check`, final diff inspection, and explicit checks that the Slice
02 lock/hash/state and `active-slice.json` idle state are unchanged. No
component suites are required because no component repository changed.

## Moirae constrained-host architecture clarification - 2026-08-09

Status: **DESIGN-ONLY CLARIFICATION COMPLETE - STOPPED FOR OWNER REVIEW.**
The Moirae constrained-host ADR now explicitly separates process-origin
identity, governed route, OS/runtime containment, credential isolation, and
bypass resistance; defines the trust boundary and TCB; records the exact 003A
claims/nonclaims; and describes a future, unimplemented 003B platform-profile
boundary. The ADR also records the credential, Rule-of-Two, and information-
flow ownership interaction and the EMBED/WRAP/STUDY/DEFER technology
assessment.

This is a documentation delta on the Moirae design lineage
`bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6`, not a new implementation
checkpoint. The locked compatibility reference remains
`a4783db271a61848c66ac4f6652a539bdb515e28`; no 003A activation, 003B
implementation, compatibility tag/lock update, matrix/snapshot/seal change,
Runtime Contracts change, or active-slice transition occurred. The active
slot remains idle.

The corresponding history is recorded in
[`docs/REQUIREMENTS_TRACEABILITY.md`](../REQUIREMENTS_TRACEABILITY.md). No
proof status was promoted: 003A remains unactivated and OS containment,
credential custody, and bypass resistance remain future work.

Validation for this clarification is limited to Moirae documentation/ADR
checks and Integration traceability validation. No implementation suite is
expanded by this task. Do not commit or push this documentation-only change
until the owner reviews the boundary and approves the next scope.

## FATES-SLICE-003A activation and constrained host implementation — 2026-08-10

Status: **ACTIVE — 003A LIVE-ACCEPTANCE CANDIDATE; STOP FOR OWNER PRE-SEAL
REVIEW.** The explicit approval for the clarified Moirae constrained-host
architecture authorizes only the bounded `FATES-SLICE-003A` subphase. The
schema-compatible control record is `FATES-SLICE-003` in
[`slices/003-constrained-host-route/slice.json`](../../slices/003-constrained-host-route/slice.json);
the full activation decision is
[`docs/decisions/FATES-SLICE-003A-activation-decision.json`](../decisions/FATES-SLICE-003A-activation-decision.json).

### Activation boundary

The active route is strictly:

```text
independent Moirae process -> Horae /slice-02/governed-actions
-> canonical Ananke /api/execute -> Horae -> Moirae
```

Moirae owns the smallest host/origin boundary and must initiate the fixed
`fates.slice02.inspect-fixed-fixture.v1` action through Horae only. Horae and
Ananke remain the sealed Slice 02 relay and producer/effect authorities. Ananke
remains the sole physical reader. Mnemosyne is outside the route, and Runtime
Contracts is unchanged.

The exact starting baseline remains
`fates-slice-002-2026-08-09`: Ananke
`52b512885edf3fec7ff7ce4b4dcbd3958b170ba4` tagged
`ananke-fates-slice-002-v0.2.0-protocol-1.4.0`, Horae
`9566eb2764339d6a6fe143c1630eeb009e00a7bd` tagged
`horae-fates-slice-002-v0.1.0-protocol-1.4.0`, and the locked Moirae
reference `a4783db271a61848c66ac4f6652a539bdb515e28` retained as
`pushed_untagged`. The Moirae design lineage
`bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6` and approved documentation commit
`1e99a0ca80289253c2fed96c93b42c5230e46a8e` are recorded as lineage only and
are not substituted into the compatibility lock.

### Approved work and evidence gate

The current Moirae work is limited to fixed request construction, process-origin
evidence tied to request/correlation identifiers, Horae-only transport, a
bounded timeout, typed result receipt, and deterministic fail-closed behavior.
Validation must cover malformed input, origin drift, Horae drift, Ananke denial,
timeout, indeterminate outcome, no retry, no fallback, no alternate endpoint,
and no duplicate dispatch. Relevant Horae and Ananke checks must remain green
against their sealed Slice 02 checkpoints, and Integration must validate the
canonical controls without changing `fates-lock.json`, the compatibility
matrix, the Slice 02 snapshot, evidence, tag, or seal claim.

The owner-local green gate is not live acceptance. After Moirae, Horae, Ananke,
and Integration checks are green, stop for owner review before any formal live
three-process positive or negative exercise. Temporary scripts and logs must
remain outside repositories, and no credentials or local configuration may be
committed.

### Explicit non-scope

This activation does not start 003B. OS filesystem/network/shell/subprocess,
browser, extension, credential, environment-isolation, bypass-resistance,
generic-action, direct-Ananke, alternate-MCP, retry, persistence, recovery,
and memory/context work remains future or separately authorized work. No
component checkpoint, tag, lock, matrix, snapshot, or seal status advances as
part of this activation.

### Work completed, cross-component effects, and deviation note

- Integration activation and the schema-compatible `FATES-SLICE-003` control
  record are present; the Slice 02 lock, matrix, snapshot, evidence, and seal
  state are unchanged.
- Moirae has the narrow host/origin implementation and focused deterministic
  tests on local branch `codex/slice-003a-host-route`. Its owner-local build,
  full 139-test suite, environment/baseline checks, lint, and format check are
  green. Horae has no source changes and its full validation is green.
- Ananke has no source changes. Its build, isolated MCP-adapter tests (4/4),
  and isolated full suite (16 files / 131 tests) are green. The bundled
  `validate:quick` wrapper reproducibly encounters `uv_os_get_passwd` `ENOMEM`
  while launching its stdio child-process tests; this is retained as an
  environment validation limitation, not treated as route evidence.
- Cross-component effect is limited to the Moirae request boundary and
  Integration control/evidence state. Horae, Ananke, Mnemosyne, and Runtime
  Contracts remain at their existing checkpoints and responsibilities.
- Workflow deviation: the smallest Moirae implementation draft existed before
  the separate activation record was written in this task. It remained
  uncommitted and unpushed, and no successful 003A live route occurred before
  the paused harness attempt. The activation record now explicitly bounds and
  governs that draft. No lock, matrix, snapshot, tag, or seal claim was
  advanced.
- The local Integration control branch is
  `codex/slice-003a-activation`. Both 003A branches are intentionally local and
  unpushed pending owner review.

### Paused live-acceptance harness finding — 2026-08-10

ENDPOINT SECURITY INTERACTION — Defender blocked/remediated the initial PowerShell acceptance harness before successful 003A live acceptance. This event is not evidence of Ananke/Horae/Moirae malware and is not being suppressed or bypassed.

The owner-inspected Defender record identified `Trojan:Win32/PowhidSubExec.B`
with remediation succeeded. The affected resource was the large inline
PowerShell acceptance command; no Ananke, Horae, Moirae, or Node
executable/file was identified as the detected resource. The event is retained
as a real acceptance-harness finding, is not classified as a Fates runtime
failure because no 003A live route successfully started, and is not classified
as a confirmed false positive.

The temporary harness was inspected without further execution. Its separate
first-launch defect passed repository script paths containing spaces as
unquoted `Start-Process -ArgumentList` elements, causing Node to receive a
truncated path. The quoting defect and Defender remediation are independent
events. The prior aborted invocation included an execution-policy bypass; no
further invocation will use it, and no Defender control, exclusion, or policy
was changed.

Ports 34212 and 34216 are free, and no matching live acceptance process
remains. The sanitized working evidence is
[`docs/evidence/FATES-SLICE-003A-live-acceptance-2026-08-10.json`](../evidence/FATES-SLICE-003A-live-acceptance-2026-08-10.json).

Before Attempt 2, formal 003A live acceptance remained paused. The proposed replacement is a
small reviewed Node/TypeScript driver using `child_process.spawn` argument
arrays, explicit process bounds, fixed port checks, the same positive and safe
negative route assertions, audit/read-count evidence, and cleanup. Its
owner-approval command is `node scripts/fates-slice03a-live-acceptance.mjs`.
That command was later executed once under the separate approval recorded
below; no second execution or successful live route is claimed. No 003A
completion, lock, matrix, snapshot, tag, or seal claim is made.

### Node-only acceptance attempt — 2026-08-10

The owner-approved direct Node command was executed exactly once after plan and
static review. The driver started the compiled Ananke process, the established
temporary Horae Slice 02 relay wrapper, and an independent Moirae process. The
positive Moirae request reached Horae, but Horae returned HTTP 503 `unavailable`
with `dispatch_not_attempted` and reason `Ananke inspection unavailable`.

The cause was a second acceptance-harness defect: the driver supplied Horae an
Ananke base URL that already ended in `/api`, while the established Horae
inspection binding appends `/api` itself. Horae therefore queried the
non-canonical `/api/api` inspection path. No Ananke governed dispatch or
producer read occurred; the origin-drift and malformed-configuration negatives
were not run. This is a harness failure, not an Ananke, Horae, or Moirae
runtime failure, and it is not live acceptance evidence.

The driver is corrected to pass the Ananke transport base without the `/api`
suffix. No second live run was performed; a new owner approval is required
before using the proposed command again. The sanitized attempted-run record is
[`docs/evidence/FATES-SLICE-003A-live-acceptance-2026-08-10.json`](../evidence/FATES-SLICE-003A-live-acceptance-2026-08-10.json).

### Corrected Node Attempt 2 — successful live-acceptance candidate — 2026-08-10

After the transport-base correction and a new owner approval, the exact direct
command `node scripts/fates-slice03a-live-acceptance.mjs` was executed once.
Plan output explicitly distinguished transport base
`http://127.0.0.1:34212` from canonical registered endpoint
`http://localhost:34212/api`; the local preflight assertion passed.

The independent process roles were Ananke PID 16728, Horae PID 2120, and
positive Moirae PID 3596. Moirae host evidence matched PID 3596 and identified
the approved `moirae-live-origin-1` / `moirae-slice02-live-origin` origin.
Horae reached the exact `/slice-02/governed-actions` route, performed fresh
Ananke inspection, verified the canonical registered endpoint and sealed
producer authority, and returned a typed completion.

Positive live evidence:

- route state `completed`; dispatch state `result_received`;
- one governed Ananke dispatch and one physical producer read;
- producer outcome `COMPLETED`, `readAttemptCount: 1`, and the fixed fixture
  digest matched;
- decision/outcome evidence IDs, route/event IDs, request/correlation IDs, and
  the Moirae → Horae → Ananke → Horae → Moirae chain were preserved;
- retries, fallback, alternate endpoints, duplicate execution, and
  Moirae/Horae fixture-read paths were all zero in the bounded harness.

Safe negatives also passed: origin drift returned `malformed` with
`rejected_before_dispatch`, and malformed Moirae configuration exited nonzero
without starting a route. Cleanup confirmed every tracked child PID absent and
ports 34212 and 34216 free. No new endpoint-security interaction occurred and
no security control changed.

Post-live validation is green: Moirae focused 003A tests (8), full suite (139),
build, format, and lint passed; Horae aggregate validation passed; Ananke build,
lint, full suite (131), and focused MCP/runtime tests (10) passed; Integration
validation passed all 13 JSON files and 55 tests, including lock/matrix/slice/
boundary checks. The existing Ananke `validate:quick` `uv_os_get_passwd` /
`ENOMEM` wrapper limitation remains separately recorded and was not relabeled
as a pass.

003A is now a successful live-acceptance candidate, not a sealed or formally
complete slice. Stop for owner pre-seal review. Do not alter the compatibility
lock, matrix, Slice 02 snapshot, tag, or seal; do not start 003B.

## FATES-SLICE-003A formal seal — 2026-08-10

Status: **SEALED — FATES-SLICE-003A formally accepted and complete.** The
successful Attempt 2 is accepted as bounded live evidence. The complete
Attempt 0/1/2 chronology remains above and in the authoritative evidence
artifact; the earlier harness findings were not rewritten into a clean-history
narrative.

### Final checkpoint and compatibility state

- Moirae implementation checkpoint: commit
  `f9b28fb0099d5d32d5debd4db7376066bfc2ac93`, annotated tag
  `moirae-fates-slice-003a-v0.1.0-protocol-1.4.0`, pushed on
  `codex/slice-003a-host-route`, with completed handoff
  `slices/003-constrained-host-route/handoffs/moirae-code-handoff.json`.
- Integration compatibility set: `fates-slice-003a-2026-08-10`, with sealed
  lock status, runtime-validated integration level, and immutable snapshot
  `compatibility-sets/fates-slice-003a-2026-08-10.json`. The prior
  `fates-slice-002-2026-08-09` lock/snapshot/evidence remains historical and
  unchanged.
- The Integration checkpoint is the tagged
  `fates-slice-003a-v0.1.0-protocol-1.4.0` commit reported in the final
  closeout. The active slot is restored to `status: idle` and
  `activeSliceId: null`.
- The new lock replaces only the prior pushed-untagged Moirae compatibility
  reference. Runtime Contracts, Mnemosyne, Ananke, and Horae responsibilities
  and sealed checkpoints remain unchanged.

### Final validation and security disposition

- Moirae owner-local validation passed: environment 5/5, build, format check,
  11 files / 139 tests, and lint with 23 pre-existing warnings and 0 errors.
  Moirae remote CI passed for the pushed implementation checkpoint.
- Horae aggregate validation and Ananke build/lint/full-suite/focused checks
  remain green against their sealed Slice 02 checkpoints. The known Ananke
  `validate:quick` `uv_os_get_passwd` / `ENOMEM` wrapper limitation remains
  separately recorded and is not acceptance evidence.
- Integration JSON/schema, lock, matrix, slice, boundary, and 55-test checks
  passed before final sealing; the final post-seal validation is recorded with
  the closeout checkpoint and CI result.
- ENDPOINT SECURITY INTERACTION — Defender blocked/remediated the initial PowerShell acceptance harness before successful 003A live acceptance. This event is not evidence of Ananke/Horae/Moirae malware and is not being suppressed or bypassed.
- `credential disposition: provider-side revoked/rotated; former exposed credential set invalid`
- `moirae-slice02-live-origin` is retained as an inherited sealed Horae/Slice 02
  route-origin compatibility identifier, not the new implementation identity;
  the new implementation identity is the Moirae commit/tag above.

### Sealed claim boundary and stop condition

003A claims only independent Moirae process-origin participation, bounded
Moirae → Horae routing, fresh Horae inspection, canonical Ananke authority,
exactly one harmless producer-owned effect/read, preserved end-to-end
correlation/evidence, typed result return, bounded fail-closed behavior, and
deterministic coverage for additional non-live failure states. It does not
claim OS filesystem/network/shell/subprocess containment, browser/extension
containment, credential isolation, arbitrary IPC containment, direct-Ananke or
alternate-MCP operating-system prevention, complete bypass resistance, or
full-machine security. FATES-SLICE-003B was not started; stop after this seal.

## Post-Slice-003A readiness and 003B review preparation - 2026-08-10

Status: **DOCUMENTATION PREPARATION ONLY - 003B NOT ACTIVATED.** The final
003A seal and all sealed control-state artifacts remain unchanged. This
additive preparation records a candidate 003B objective, a proposed first
Linux x86_64 profile with a Firecracker-based layered containment TCB subject
to external review and an owner design gate, a host/process/filesystem/
network/credential/IPC bypass register, primitive classifications, timing and
performance requirements, and the credential and Defender lessons without any
secret values.

The readiness assessment is
[`docs/tasks/POST_SLICE_003A_READINESS.md`](POST_SLICE_003A_READINESS.md). The
external-review methodology and prompt packs are:

- [`docs/reviews/POST-003A-external-review-methodology.md`](../reviews/POST-003A-external-review-methodology.md);
- [`docs/reviews/POST-003A-blind-containment-review-prompt.md`](../reviews/POST-003A-blind-containment-review-prompt.md);
- [`docs/reviews/POST-003A-informed-containment-review-prompt.md`](../reviews/POST-003A-informed-containment-review-prompt.md);
- [`docs/reviews/POST-003A-code-grounded-review-brief.md`](../reviews/POST-003A-code-grounded-review-brief.md).

The earlier Claude review is classified `INFORMED` with confirmed prior Fates
context. The earlier Gemini review is `POSSIBLE` prior context unless the
owner's session record establishes otherwise. No review consensus is treated
as proof. No implementation, dependency, component source, lock, matrix,
snapshot, sealed evidence, tag, or `active-slice.json` change is authorized by
this entry. The active integration slot remains idle and the next action is an
owner-operated distribution of the blind prompt, followed by reconciliation of
returned findings and an owner decision on the proposed profile, threat model,
review results, and explicit 003B activation scope. No external model report
is added here before that reconciliation.

## POST-003A CODE-GROUNDED review reconciliation - 2026-08-10

Status: **DOCUMENTATION-ONLY - FATES-SLICE-003B PAUSED.** A CODE_GROUNDED
external review against the exact sealed/pinned repository revisions found
material post-seal implementation and evidence qualifications. The full
additive reconciliation and remediation design is recorded in
[`docs/reviews/POST-003A-code-grounded-reconciliation.md`](../reviews/POST-003A-code-grounded-reconciliation.md).

The record preserves the 003A lock, matrix, compatibility snapshot, live
evidence, tag, hashes, and `active-slice.json`. It narrows process-origin
language to acceptance-harness PID correlation, distinguishes configuration
match/self-report from artifact attestation, records the development-auth
condition, identifies the untracked temporary Horae host and the unbounded
inspection gap, and preserves the positive request-principal, no-direct-client,
fixed-argument, no-retry, fixed-filesystem, and pre-dispatch-failure findings.
The proposed `FATES-SLICE-003A-R1` remediation subphase is
`PROPOSED - OWNER APPROVAL REQUIRED BEFORE ACTIVATION` and is not activated;
there is no implementation, live run, 003B activation, or seal from this
entry. The owner-supplied Claude report's F-20 finding is reconciled as
`VALIDATION_GAP`: it qualifies reproducibility because the successful route
used an untracked `%TEMP%` Horae relay host, but does not invalidate the live
route.

## Final post-003A external-review synthesis and R1/003B design gate - 2026-08-10

Status: **DOCUMENTATION/RESEARCH SYNTHESIS ONLY - R1 AND 003B NOT ACTIVATED.**
The final synthesis and proposed design gate are recorded in:

- [`docs/reviews/POST-003A-final-external-review-synthesis.md`](../reviews/POST-003A-final-external-review-synthesis.md);
- [`docs/reviews/POST-003A-R1-003B-design-gate.md`](../reviews/POST-003A-R1-003B-design-gate.md).

The documents preserve the accepted CODE_GROUNDED checkpoint at
`6906ab6a1cc24825340e241c07221e78f35ef845`, distinguish blind aggregate themes
from solicited/common-prompt findings and substrate alternatives, qualify the
INFORMED Claude review against current primary sources, and retain the exact
F-01 through F-20 reconciliation. They define arbitrary in-domain development
execution as expected, recommend a proposed strict Linux x86_64/KVM/Firecracker
no-guest-NIC/constrained-vsock profile for 003B, and split R1 application-level
replay-safe identity from 003B trusted supervisor/channel identity.

No component source, lock, matrix, compatibility snapshot, sealed evidence,
tag, credential, Defender setting, execution policy, or containment software
is changed. `active-slice.json` remains idle. The proposed R1 scope and
traceability requirements require a further owner activation decision.

The owner accepts the synthesis, proposed R1 scope and requirements,
application-level replay-safe identity, the proposed strict 003B profile and
TCB, the no-IP/vsock sequencing, subordinate credential/effect brokerage,
platform-manifest revalidation, and performance/operator-erosion benchmarking.
The sequencing gate is explicit: after this documentation checkpoint is
committed and pushed, a separate owner decision must activate R1 in the
Integration control state before any R1 implementation begins; after R1
implementation, validation, and acceptance, a separate owner seal/closure
decision is required. R1 remains proposed during this task and 003B remains
paused.

## FATES-SLICE-003A-R1 activation - 2026-08-10

Status: **ACTIVATED - CONTROL-STATE ONLY.** Owner approval authorizes
`FATES-SLICE-003A-R1 - Reproducibility and route-identity remediation` at
accepted checkpoint `b44194d3273ffa708eaf9c5071fd7f7d6f7adeb1`.

The schema-constrained active slot is now `status: active` with
`activeSliceId: FATES-SLICE-003`; the approved R1 subphase and activation
decision are recorded in
[`docs/decisions/FATES-SLICE-003A-R1-activation-decision.json`](../decisions/FATES-SLICE-003A-R1-activation-decision.json).
The five active R1 requirements are recorded in
[`docs/REQUIREMENTS_TRACEABILITY.md`](../REQUIREMENTS_TRACEABILITY.md).

Activation does not run acceptance or modify component source. It excludes
OS-authenticated process origin, Firecracker/KVM, trusted supervisor and
host/guest channel authentication, all containment, provider-network redesign,
credential brokerage, and FATES-SLICE-003B. Historical sealed 003A artifacts
remain immutable. After this activation checkpoint, implementation requires
the separately scheduled R1 implementation task; after implementation,
validation, and acceptance, a separate owner R1 seal/closure decision is
required.

## FATES-SLICE-003A-R1 implementation Batch 1 - 2026-08-10

Status: **IMPLEMENTED IN PROJECT-HORAE - DETERMINISTICALLY VALIDATED; LIVE
ACCEPTANCE PENDING.** Owner approval authorizes Batch 1 only for
`POST003A-R1-01`, `POST003A-R1-03`, and `POST003A-R1-04`. The Project-Horae
implementation commit is
`36e249386f15ff6c1e85fb98d4d8ab393b2880ae`.

Project-Horae now contains a tracked `@horae/slice02-host` package whose Node
HTTP adapter exposes only `POST /slice-02/governed-actions`, requires explicit
loopback/configuration, and delegates to the existing canonical
`createSlice02Route`/`Slice02Relay`. The relay now has one cancellable bounded
pre-dispatch inspection budget with distinct
`timed_out`/`dispatch_not_attempted` fail-closed semantics, and its
producer result projection is an explicit canonical Ananke allowlist that
retains Ananke's open evidence contract without spreading unexpected fields.

Focused and full Horae validation passed, including local HTTP hanging-peer
tests, host route/configuration/shutdown tests, projection tests, build, lint,
conformance, peer comparator, benchmark, CLI, and composition checks. The
historical `%TEMP%` Horae wrapper was read and compared only; it was not
executed, modified, or used as the implementation source.

This batch did not implement production-style authentication acceptance or
replay-safe application identity, did not run live acceptance, and did not
touch Ananke, Moirae Code, Mnemosyne, Runtime Contracts, 003B, the lock,
matrix, compatibility snapshot, sealed evidence, tags, or seal state. A later
owner decision remains required before live acceptance.

## FATES-SLICE-003A-R1 implementation Batch 2 - 2026-08-10

Status: **COMMITTED AND PUSHED - DETERMINISTICALLY VALIDATED; LIVE ACCEPTANCE
PENDING.** This owner-approved Batch 2 covers only `POST003A-R1-02` and
`POST003A-R1-05`. Baselines were Project-Horae
`36e249386f15ff6c1e85fb98d4d8ab393b2880ae`, Project-Moirae-Code
`f9b28fb0099d5d32d5debd4db7376066bfc2ac93`, and Integration
`a06c562f3151eb5d21460532a9a1b0fb20ab195b`. Immutable Batch 2 component
checkpoints are Project-Horae
`1d50b8df9943702a9724ded56a3454c882da8925` and Project-Moirae-Code
`56f3bc84c84e36f75d2a4e46b393f86065a736d3`; both were pushed with successful
ordinary CI. This Integration documentation checkpoint records the final
Batch 2 review state.

The tracked Horae host now requires the raw `ANANKE_EXECUTION_TOKEN` input,
constructs the Ananke bearer header internally, rejects missing or malformed
auth configuration, and never accepts a caller-supplied Horae header as an
Ananke authority override. R1 host startup also requires an absolute configured
replay-ledger path and a host-owned `HORAE_R1_INSTANCE_ID`; the canonical
audience is derived from that instance and the fixed route.

Moirae can explicitly construct the versioned `r1-v2` application request
receipt using the owner-configured `MOIRAE_003A_HORAE_AUDIENCE`. The receipt
binds the audience, schema, origin identity, and short validity window. Horae
claims the receipt synchronously within one Node process and synchronously
persists the consumed identity by atomic file replacement before inspection or
dispatch begins. One authoritative Horae host instance owns one replay ledger
for its configured R1 audience. Ordinary concurrent handlers in one Horae
process cannot both claim the same identity; cross-process shared-ledger
exclusion is not established, so two independently configured Horae hosts
sharing one audience/ledger are outside the bounded R1 profile and are not
solved in Batch 2. A completed persisted claim is loaded and rejected after an
ordinary Horae process restart. Corrupt ledger state fails closed at startup,
and atomic replacement avoids exposing a partially written target ledger. A
crash before replacement cannot lead to an effect because inspection/dispatch
has not begun; a crash after replacement but before dispatch may consume the
request without producing an effect. No automatic retry or resurrection occurs.
R1 application request identity/freshness is not caller authentication,
OS-authenticated process origin, PID proof, launcher identity, containment,
credential isolation, or 003B channel authentication. A separate process able
to reach the Horae R1 route and construct the public/configured v2 receipt
fields may still mint a NEW, previously unseen receipt; replay protection
prevents reuse of a consumed request but does not prove that the creator is the
intended Moirae OS process. Power-loss / kernel-crash stable-storage durability
is not established because this R1 implementation does not fsync the ledger
file and parent directory. R1 therefore claims process-restart-persistent
replay protection within the supported single-authoritative-host profile, not
power-loss durable exactly-once semantics.

Focused Horae and Moirae tests pass. Ananke source, Mnemosyne, Runtime
Contracts, the lock, matrix, compatibility snapshot, historical sealed 003A
evidence, tags, and 003B remain unchanged. No credential values are present
in source, tests, logs, responses, or documentation. No live acceptance was
run. R1 remains active and unsealed; stop before live acceptance, R1 sealing,
or 003B work.

## FATES-SLICE-003A-R1 Ananke authentication entrypoint remediation - 2026-08-11

Status: **POST003A-R1-02 — ANANKE CANONICAL EXECUTABLE BLOCKER REMEDIATED IN
TRACKED SOURCE; DEVELOPMENT-MODE-DISABLED NON-DEVELOPMENT STATIC BEARER
ENTRYPOINT IMPLEMENTED; DETERMINISTIC VALIDATION PASSED; LIVE ACCEPTANCE STILL
PENDING.**

The approved Ananke remediation is committed and pushed at immutable commit
`7c5cdecb078749acb129ba485daac43d7155ceb6` on
`codex/slice-002-http-handoff-bridge`; ordinary Ananke CI completed
successfully. The tracked canonical server now accepts one raw
`ANANKE_EXECUTION_TOKEN` only when development mode is disabled, constructs a
`StaticBearerExecutionAuthenticator`, and reports the existing non-development
`workload-token` auth method. The server-owned profile remains the Horae relay
service/agent pair with only the bounded fixed-fixture read scope:

```text
authenticated principal: horae-slice02-relay / service
acting principal:       horae-slice02-relay-agent / agent
resource scope:          bounded, fixed-fixture,
                         fates.slice02.fixed-fixture.v1,
                         read only
```

The bearer credential authenticates the configured Horae-to-Ananke credential
holder. It does not authenticate the originating Moirae OS process. Environment
variable custody is bounded R1 plumbing; future credential custody remains
003B/later work. No credential value is recorded in source, tests, logs,
responses, documentation, or acceptance evidence.

Acceptance preparation previously stopped correctly because the old pinned
Ananke server had no supported non-development execution entrypoint. That stop
is not classified as a failed R1 acceptance attempt. No live route was run for
this remediation, and no live acceptance claim is made.

No active-slice, lock, matrix, compatibility snapshot, historical sealed
evidence, tag, or seal state changed. Horae, Moirae Code, Mnemosyne, Runtime
Contracts, and 003B remain unchanged; R1 remains active and unsealed.

## FATES-SLICE-003A-R1 live acceptance preparation resumed - 2026-08-11

Status: **PREPARATION ONLY - LIVE ACCEPTANCE NOT EXECUTED.** Owner approval
authorizes preparation of a safer Node-based driver, not a live route or an R1
seal. The new tracked driver is
[`scripts/fates-slice03a-r1-live-acceptance.mjs`](../../scripts/fates-slice03a-r1-live-acceptance.mjs).
The historical `scripts/fates-slice03a-live-acceptance.mjs` remains unchanged
and is verified by its pre-existing SHA-256 marker in the new driver; no
temporary executable or generated server source is used.

The default `--plan` path started zero child processes and zero timeout
servers. It verified the pinned Ananke, Horae, and Moirae HEADs, required
tracked source/package paths, compiled dist entrypoints, canonical Ananke
static-bearer entrypoint, Horae-derived `r1-v2` audience, Horae replay ledger
configuration, and the unchanged historical driver. The execution preflight
also requires clean component worktrees and free ports before any child is
spawned. A synthetic random redaction canary passed through stdout, stderr,
error, and evidence serialization paths without reproducing its value.

The future driver uses Node `child_process.spawn` with explicit argument arrays,
`shell: false`, separate allowlisted environments, bounded readiness polling,
tracked PIDs, reverse-order exact-PID cleanup, and no PowerShell, bypass,
alternate encoding, retry, fallback, or executable-name termination. The
ephemeral execution credential is generated only in execution mode, supplied
only to Ananke and Horae, and excluded from Moirae, argv, URLs, logs, output,
plan, and evidence. Execution now requires an explicit narrowly validated
`--attempt-id <NNN>` and reserves the corresponding portable target
`docs/evidence/FATES-SLICE-003A-R1-live-acceptance-attempt-<NNN>.json`
exclusively before credential generation or child-process creation. Each target
records its predecessor attempt without overwriting earlier evidence; no PASS
artifact was created by this preparation task.

The planned positive and negative matrix covers r1-v2 success, replay,
wrong-audience, expiry, v1 rejection without downgrade, wrong-token versus
missing-token startup distinction, restart replay, pre-dispatch timeout as
`timed_out`/`dispatch_not_attempted`/HTTP 504, and bounded result projection.
Timeout/projection and request-identity seam cases remain deterministic or
future-live planning only where the current component interfaces do not expose
a safe owner-approved live seam. No component source, active-slice, lock,
matrix, compatibility snapshot, sealed evidence, tag, credential material, or
003B state changed. R1 remains active and unsealed.

credential disposition: provider-side revoked/rotated; former exposed credential set invalid

## FATES-SLICE-003A-R1 live acceptance driver correction - 2026-08-11

Status: **CORRECTION/PREPARATION ONLY - LIVE ACCEPTANCE NOT EXECUTED.** The
owner-approved correction removes self-referential Integration pinning from the
driver. Immutable component checkpoints remain pinned; the future live command
must supply an explicit `--approved-integration-sha <40-hex-sha>` argument and
the driver must require exact equality with the actual clean Integration HEAD
before generating any credential or starting any acceptance process.

The evidence identity is separated into the preparation starting baseline
`07ec80aabe2c62baaa776857fbcefafd154a74d7`, previous preparation checkpoint
`17052be6335cae6081fafb6da7b48c0eef1a3cf3`, actual runtime Integration HEAD,
owner-approved Integration checkpoint, and the SHA-256 of the exact executed
driver. The historical baseline is not used as the execution checkpoint.

The corrected future execution path preserves the real Moirae -> tracked Horae
-> canonical Ananke -> fixed-fixture positive route and adds executable bounded
negative cases for route-level replay, wrong audience, explicit expiry, legacy
v1 rejection, isolated wrong-auth Horae, missing Horae auth configuration,
localhost-only scratch inspection timeout, and process-restart-persistent
replay. Result projection remains **DETERMINISTIC TEST VERIFIED / NOT LIVE
INDUCED**. Driver-generated route-level invalid requests are not represented as
Moirae process-origin evidence. No PowerShell, bypass, development auth,
automatic retry, alternate positive route, component change, live process,
fixed-fixture effect, evidence artifact, commit, push, tag, seal, lock/matrix
change, or 003B work occurred in this correction task.

## FATES-SLICE-003A-R1 remediation batch - 2026-08-11

Status: **REMEDIATION CHECKPOINT - PREPARATION ONLY; LIVE ACCEPTANCE NOT
EXECUTED.** The owner-approved remediation preserves historical attempt 001 as
`FAIL / LIVE ACCEPTANCE INCOMPLETE` and retains its portable derived evidence
at
[`docs/evidence/FATES-SLICE-003A-R1-live-acceptance-attempt-001.json`](../evidence/FATES-SLICE-003A-R1-live-acceptance-attempt-001.json).
The original raw attempt artifact remains outside this repository in the
owner-controlled archive and is not rewritten.

The candidate component checkpoints for a future owner-authorized attempt are:

- Ananke `dde9f74cbcfefea2176a6f0103e1f6b9064f4e64`
- Horae `3f531d4f5558a10a36aeae20c3458080eb4468b9`
- Moirae `bc7b984bd2eb0e0f07a1cd7259a8eab21556f097`
- Mnemosyne `f4ab76a9760f856d78908d35facceb068d78c8e5`
- Runtime Contracts `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8`

The driver now supports explicit attempt IDs, predecessor linkage, atomic
exclusive evidence-target reservation, non-overwriting attempt retention,
portable repository/process evidence, and child-output path sanitization. The
runtime remains Node-only with argument-array spawning, `shell: false`, the
existing runtime child-environment allowlists, tracked-PID cleanup, bounded
readiness, and no security-control changes. Horae's reviewed deterministic
compatibility test is pushed at `3f531d4f5558a10a36aeae20c3458080eb4468b9`;
the Ananke and Moirae remediation checkpoints are the candidate pins above.

No credential was generated, no Fates or scratch process was started, no
fixture effect occurred, and no live acceptance or R1 seal occurred in this
batch. R1 remains active and unsealed; 003B remains paused.

## FATES-SLICE-003A-R1 attempt-002 replay-seed harness remediation - 2026-08-11

Status: **ATTEMPT-002 FAILED / LIVE ACCEPTANCE INCOMPLETE; HARNESS DEFECT
CONFIRMED AND REPAIR VALIDATED LOCALLY.** Attempt-002 remains preserved and
must not be rewritten. Its positive route remains genuine **LIVE VERIFIED**
with one dispatch, one producer read, and the expected fixed-fixture digest;
the negative matrix remains incomplete because the replay seed stopped before
the replay challenge.

The confirmed defect was in the Integration driver’s default R1 receipt
construction: `notBefore = now - 1,000 ms` and `expiresAt = now + 60,000 ms`
created a 61,000 ms total validity interval, which the pinned Horae correctly
rejected against its 60,000 ms maximum. The bounded repair captures one clock
value and emits `notBefore = now - 1,000 ms` plus `expiresAt = now + 58,000 ms`,
for an exact 59,000 ms interval. The R1 origin digest continues to cover the
exact emitted validity values.

Attempt-001 and attempt-002 evidence remain byte-for-byte unchanged. No live
run, credential, fixture effect, component change, R1 seal, tag, or 003B work
is authorized by this repair task. R1 remains active and unsealed; 003B
remains paused.

## FATES-SLICE-003A-R1 portable-evidence sanitizer correction - 2026-08-11

Status: **CORRECTION VALIDATED; LIVE ACCEPTANCE NOT EXECUTED.** The Integration
driver's generic Windows-path sanitizer previously matched an unbounded
`<letter>:/...` substring, which could begin inside protocol, route, or
audience strings. The correction requires a start-of-string, whitespace, or
quote/delimiter boundary and preserves that delimiter while replacing only a
genuine absolute host path. Unix-path sanitization and exact known-path
replacement remain unchanged.

Deterministic regression coverage proves preservation of HTTP/HTTPS endpoints,
route identifiers, the full R1 audience, URNs, logical repository IDs, and
structured Moirae stdout after evidence serialization. It also proves quoted,
key/value, standalone, and diagnostic Windows paths remain sanitized, Unix
paths remain sanitized, secret redaction remains independent, attempt-target
retention remains exclusive, the R1 replay-seed validity remains exactly
59,000 ms, and runtime child environment allowlists remain unchanged.

The correction is limited to the Integration driver and its deterministic
tests, with this record updated for traceability. Attempt-001 and attempt-002
evidence remain byte-for-byte unchanged. Full Integration validation passed;
no credential was generated, no Fates or scratch process was started, no
fixture effect occurred, and no live acceptance or R1 seal occurred. R1
remains active and unsealed; 003B remains paused.

## FATES-SLICE-003A-R1 seal and closure - 2026-08-11

Status: **SEALED - PASS / LIVE VERIFIED WITH BOUNDED LIMITATIONS.** Owner
authorization accepted the R1 qualification and the narrow stale-current-state
test alignment. The current sealed compatibility set is
`fates-slice-003a-r1-2026-08-11`, with the additive snapshot at
[`compatibility-sets/fates-slice-003a-r1-2026-08-11.json`](../../compatibility-sets/fates-slice-003a-r1-2026-08-11.json)
and the closure decision at
[`docs/decisions/FATES-SLICE-003A-R1-seal-closure-decision.json`](../decisions/FATES-SLICE-003A-R1-seal-closure-decision.json).

The accepted live record is Attempt 003 at execution checkpoint
`ed21a349e8de4c9c2a89db6380d6d17da90e85ba`, evidence SHA-256
`E573DE1CB599442CCBDD166103841372CEE8C7532B9108CA2CD2EE20ADF98B03`, using
driver SHA-256
`CAEE81C60B131646984B9B5898BAD8CA2D3A0C027A4F32B67CAC811ED361A4C0`.
The current pre-seal Integration checkpoint was
`e6b798764d31e6ae8b7a428d3a2fbf3f9c6d6733`. Attempts 001 and 002 remain
preserved and unchanged. Historical 003A evidence, snapshot, and tag remain
immutable.

The five R1 requirements are closed with their truthful classifications:
R1-01 and R1-02 are LIVE VERIFIED WITH BOUNDED LIMITATIONS; R1-01 is also
STATIC SOURCE VERIFIED; R1-03 and R1-04 are DETERMINISTIC TEST VERIFIED and
NOT LIVE INDUCED; R1-05 is LIVE VERIFIED WITH BOUNDED LIMITATIONS while true
OS-authenticated process origin is OUT OF R1 SCOPE. No credential value is
recorded. The credential disposition remains:

`credential disposition: provider-side revoked/rotated; former exposed credential set invalid`

The Integration control state is `status: idle` with `activeSliceId: null` and
the R1 snapshot as baseline. FATES-SLICE-003B remains paused and requires a
separate owner activation decision. The final Integration seal commit and
annotated R1 tag are recorded after the authorized Git transaction.

## FATES-SLICE-004 design and source-of-truth reconciliation - 2026-08-11

Status: **DESIGN CHECKPOINT ONLY - NOT ACTIVATED; IMPLEMENTATION NOT
AUTHORIZED.** Owner approval accepted the prior NO-GO for direct Slice 004
activation and authorized this bounded reconciliation only.

The current authority is the sealed R1 compatibility set
`fates-slice-003a-r1-2026-08-11`, Integration seal commit
`1ed2a5c45607585fa17d72ceed1be91b5f09881f`, and tag
`fates-slice-003a-r1-v0.1.0-protocol-1.4.0`. `active-slice.json` remains idle
with `activeSliceId: null`; 003B remains paused. No lock, matrix, snapshot,
active-slice state, sealed evidence, or historical tag changed.

The proposed design gate defines FATES-SLICE-004 as an umbrella and recommends
the narrower order `003A/R1 -> 004A -> 003B -> 004B`: 004A is a durable,
Ananke-authoritative effect lifecycle with explicit pre-dispatch,
post-dispatch, indeterminate, duplicate, and reconciliation semantics; 003B
is the separate strict host-containment proof; 004B is later host-mediated
effect work. The detailed definition and proposed implementation instruction
are in [`docs/design/FATES-SLICE-004-design-gate.md`](../design/FATES-SLICE-004-design-gate.md),
with proposed requirements in
[`docs/reviews/FATES-SLICE-004-proposed-requirements.md`](../reviews/FATES-SLICE-004-proposed-requirements.md)
and the non-active planned slice record in
[`slices/004-governed-execution/slice.json`](../../slices/004-governed-execution/slice.json).

## FATES-SLICE-004A owner decision / activation-package preparation - 2026-08-11

Status: **PLAN / DESIGN / INSPECT ONLY - NOT ACTIVATED; IMPLEMENTATION NOT
AUTHORIZED.** Owner approval accepted the FATES-SLICE-004 decomposition and
authorized preparation of the next 004A decision package.

Inspection identified four candidate effects. The preferred effect is a new,
independently running disposable operation-receipt sink with provider status
lookup, deterministic success/failure, response-loss injection, and no
credential requirement. It is the smallest effect that can prove durable
intent, a dispatch marker, provider evidence, indeterminate recovery, and
reconciliation without a real-world side effect or a host-containment claim.

The proposed lifecycle, SQLite execution-intent architecture, idempotency and
reconciliation budgets, custody boundaries, refined POST004-01 through
POST004-14 register, exact likely implementation surfaces, deterministic test
matrix, and future live-acceptance shape are recorded in
[`docs/design/FATES-SLICE-004A-activation-package.md`](../design/FATES-SLICE-004A-activation-package.md).

All requirements remain PROPOSED / PLANNED. Moirae, Mnemosyne, and Runtime
Contracts require zero 004A implementation changes; the existing Slice 02
Horae relay remains sealed and is not repurposed. The Runtime Contracts
recommendation is disposition A: future locks identify the immutable tagged
protocol/adoption baseline, while later documentation heads remain outside
locked component identity.

No component source/test change, matrix/lock/active-slice/snapshot change,
credential, process, port, effect, tag, or R1 modification occurred. Final
recommendation: **NO-GO - PREREQUISITE WORK REQUIRED** before activation.

The Runtime Contracts discrepancy is recorded without corrective tag or lock
mutation: locked HEAD `bbf240...` is a later docs-only assessment, while the
existing adoption tag targets immutable baseline `124b6a...`. This must receive
an explicit future checkpoint decision before any lock update.

No component source was changed, no credentials or live effect were created,
and no Slice 004 acceptance was run. The remaining task is owner review of
the proposed design and decomposition.

## FATES-SLICE-004A bounded sub-slice control-plane representation - 2026-08-11

Status: **CONTROL-PLANE CHECKPOINT COMPLETE - NOT ACTIVATED; IMPLEMENTATION NOT
AUTHORIZED.** The owner accepted the schema-gated NO-GO and authorized an
Integration-only additive representation for bounded child units.

Canonical slices remain numeric compatibility/control units. Letter-qualified
sub-slices are bounded implementation or acceptance units owned by a canonical
slice. The new model preserves numeric `activeSliceId` and adds optional
`activeSubsliceId`; the intended future active representation is
`activeSliceId: FATES-SLICE-004` plus `activeSubsliceId: FATES-SLICE-004A`.

The proposed 004A record is stored at
`slices/004-governed-execution/subslices/004A-durable-governed-effect-lifecycle/subslice.json`
with `implementationStatus: planned`, `sealStatus: provisional`, and
`activation.state: ready_for_activation`. It remains inactive and is not a
compatibility-matrix peer. Parent/child grammar, exact parent matching,
canonical-owner resolution, duplicate detection, missing-child failure, and
activation eligibility are enforced by `scripts/verify-slices.mjs`.

Validation covers historical records without the new optional field, idle and
numeric states, valid 004/004A ownership, malformed identifiers, wrong-parent
relationships, missing/duplicate child records, unresolved owners, and the
dedicated sub-slice schema. No lock, compatibility snapshot, matrix, sealed
R1 evidence, component repository, tag, credential, process, or live effect
changed. A separate owner authorization is still required before activating
004A or beginning Batch 1.

## FATES-SLICE-004A owner activation - 2026-08-11

Status: **ACTIVE CONTROL-PLANE ONLY - IMPLEMENTATION NOT STARTED.** Owner
authorization accepted Integration checkpoint
`ff72abab61e877682f28423d4d5ae4695f01e614` and activated the bounded child
under numeric parent `FATES-SLICE-004`.

The resulting state is:

```json
{
  "status": "active",
  "activeSliceId": "FATES-SLICE-004",
  "activeSubsliceId": "FATES-SLICE-004A"
}
```

The 004A record is now `implementationStatus: active`,
`activation.state: active`, and remains `sealStatus: provisional`. This is a
control-state activation only. Ananke Batch 1, Horae integration, live effects,
credentials, tags, sealing, 003B, and 004B remain unauthorized.

The activation transaction records the exact R1 baseline, component pins, and
activation checkpoint in `active-slice.json`. The numeric compatibility matrix,
lock, R1 snapshot/evidence, and all component repositories remain unchanged.
Integration validation and deterministic tests passed before commit.

## FATES-SLICE-004A Ananke Batch 1 implementation - 2026-08-11

Status: **BATCH 1 IMPLEMENTED - ACTIVE AND PROVISIONAL; NOT SEALED.** Owner
approval authorized the bounded Ananke Batch 1 implementation only. The
Ananke checkpoint is `74beb0d` on `codex/slice-002-http-handoff-bridge`, pushed
for CI verification. No other Fate, Runtime Contracts, Adrasteia, sealed R1
evidence, tag, credential, live effect, 003B, 004B, or control-plane state was
changed.

Ananke now owns a versioned SQLite execution-state store distinct from audit.
It persists approval/action binding digests, durable intent, dispatch markers,
provider outcome or explicit unknown state, reconciliation attempts, and
terminal unresolved state. All lifecycle transitions are explicit, optimistic
version checked, and transactionally paired with transition records. The
coordinator sends only bounded identifiers and digests to a provider client,
suppresses duplicate scoped idempotency keys, exposes deterministic crash
failpoints, converts restart ambiguity to reconciliation, and never
redispatches an uncertain effect. Audit projection uses the existing
sanitizer-facing interface and does not include raw arguments or secrets.

The Integration repository adds the disposable independent receipt-sink
fixture at
[`fixtures/slice-004a-receipt-sink/server.mjs`](../../fixtures/slice-004a-receipt-sink/server.mjs)
and its deterministic process-boundary test. The fixture has its own atomic
JSON provider-state file, duplicate/conflict handling, status lookup, and no
credential or external provider dependency. The test starts, stops, and
restarts the fixture and independently inspects its provider state; it is not
live acceptance evidence.

Validation passed before this checkpoint:

- Ananke build, full test suite (18 files / 148 tests), lint, formatting, and
  focused Batch 1 lifecycle tests (7 tests).
- Integration `npm.cmd run validate` and complete deterministic test suite (80
  tests), including the receipt-sink process/state-separation test.
- `git diff --check` passed for both repositories.

The 004A record remains `implementationStatus: active` and
`sealStatus: provisional`; the numeric compatibility matrix and lock remain at
the sealed R1 baseline. Remaining POST004 requirements that are not classified
by this Batch 1 checkpoint include any future bounded host-mediated/strict
containment work, later provider credential/effect brokerage, cross-Fate
integration, and owner-authorized live acceptance. The next bounded step is a
separate owner review of this checkpoint followed by an explicit Batch 2
authorization; no further implementation begins under this record.
