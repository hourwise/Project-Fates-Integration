# ACTIVE — FATES-SLICE-002 Horae Governed Handoff/Relay Implementation

## Objective

Implement the bounded Horae consumer/relay step for FATES-SLICE-002 against
the sealed Ananke producer checkpoint.

This task modifies Horae only, plus the Integration ACTIVE completion record.

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

the sealed Ananke contract cannot be consumed without changing it;
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
