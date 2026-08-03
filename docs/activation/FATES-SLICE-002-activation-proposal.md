# FATES-SLICE-002 activation proposal

## Status

This package is an activation-readiness proposal only. It does not activate
FATES-SLICE-002, authorize runtime implementation, modify a peer repository,
create an implementation branch, or change any lock, compatibility set,
checkpoint, package version, or protocol version.

The repository baseline for this proposal is
`26b19e97468c0c660ef3ea4ed32f75cec84a4dee`, the merge commit for
[Project-Fates-Integration PR #4](https://github.com/hourwise/Project-Fates-Integration/pull/4).
Local `main` and `origin/main` resolved to that commit after
`git fetch --prune origin`. Hosted CI run
[30834424393](https://github.com/hourwise/Project-Fates-Integration/actions/runs/30834424393)
completed successfully for that exact commit.

## Readiness conclusion

The design, owner approvals, frozen fixture/schema evidence, process
attestation, timeouts, implementation order, and acceptance matrix are
complete. All five owner designs are merged into their default `main`
branches.

Activation is nevertheless **not yet safe**. The formal readiness decision is
`NOT_READY_OTHER` for two blocking reasons:

1. The newest merged implementation authorization says owner implementation
   checkpoints, handoff packets, real three-process proof, and cross-runtime
   evidence are required "before any activation request." That sequencing
   conflicts with this proposal's definition of activation as the transaction
   that permits owner implementation branches to begin. A new explicit owner
   decision must state which sequence is authoritative; this package does not
   silently reinterpret the merged condition.
2. `schemas/slice.schema.json` cannot represent the requested activation
   record honestly: it has no explicit fields for non-goals, required
   handoffs, or activation evidence, and `additionalProperties` is false. A
   local schema amendment and validator tests are required before the future
   live Slice 02 record can be committed. The existing handoff schema also
   needs a local extension for checkpoint artifacts, CI references,
   dependencies, sign-off, and consumer authorization.

Both are documentation/control-plane corrections. They do not require a
Runtime Contracts change or runtime implementation.

## Current state verified

| Check | Verified state |
| --- | --- |
| Repository/default branch | `hourwise/Project-Fates-Integration`, `main` |
| Local and remote baseline | `main` = `origin/main` = `26b19e97468c0c660ef3ea4ed32f75cec84a4dee` |
| Worktree before proposal work | clean |
| Hosted merged-main CI | run 30834424393, `completed/success` |
| Canonical live JSON artifacts | 7 |
| Tests | 54 passed; 0 failed, skipped, or cancelled |
| Lock verification | PASS; `fates-stage-a-2026-07`, provisional, inspection-only, protocol 1.4.0 |
| Matrix verification | PASS; 6 rows |
| Slice and boundary verification | PASS |
| Markdown/classification | PASS through repository validation and the separate activation-package checks |
| Slice 01 | `completed`, `provisional`, `inspection_only` |
| Active slice | `idle`; `activeSliceId: null` |
| Live Slice 02 directory | absent |
| Lock/matrix/snapshot | unchanged at the validated baseline |

The recorded SHA-256 values at baseline are:

- `fates-lock.json`: `92b4c630c10b3182c76ce89cf5c54ca0bd6eb6e77f4d92a4e2bae64d8737cdff`
- `compatibility-matrix.json`: `5cf2c87a5f22c8cd1f6cc28bd77fd5675d495bbccf62eb7f9f3e81202a5bf6a2`
- `compatibility-sets/fates-stage-a-2026-07.json`: `b05e5beb34610f4b2f706051e2da2346363ccc419e0af5251f8fa2641019cd43`

## Authority table

| Decision area | Authoritative merged document | Decision | Classification | Remaining condition |
| --- | --- | --- | --- | --- |
| Topology | `docs/design/FATES-SLICE-002-runtime-boundary-resolution.md` | Three local processes: Moirae -> HTTP -> Horae -> HTTP -> Ananke | `COMPLETE_AND_APPROVED` | Implement only after activation is separately authorized |
| Action identity | Runtime-boundary design and five owner approvals | `fates.slice02.inspect-fixed-fixture.v1` only | `COMPLETE_AND_APPROVED` | Exact allowlists and registrations are implementation evidence |
| Argument schema | `docs/decisions/FATES-SLICE-002-fixture-schema-digest-manifest.json` | Exactly `fixtureId` and `expectedSha256`; no additional properties | `COMPLETE_AND_APPROVED` | Runtime parsers must prove strict rejection |
| Fixture ownership | Fixture/schema manifest and Ananke approval | Ananke owns immutable bytes and is the sole physical reader | `COMPLETE_AND_APPROVED` | Fixture is created only at the Ananke checkpoint |
| Fixture digest | Fixture/schema manifest | `7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8` | `COMPLETE_AND_APPROVED` | Post-read digest evidence required |
| Request-schema digest | Fixture/schema manifest | `db1864fdc4978d6befb4b6d3913461e4f2d2732dd0ca87e076977ab98cf6049c` | `COMPLETE_AND_APPROVED` | Each process must pin and report it |
| Process attestation | `docs/decisions/FATES-SLICE-002-process-attestation-decision.json` | Per-run 256-bit pair capabilities with HMAC-SHA-256 challenge-response and one-shot inherited-pipe delivery | `COMPLETE_AND_APPROVED` | Real process evidence, nonce/restart/drift negatives |
| Readiness freshness | Process-attestation and Horae approval | Ananke observation no older than 1,000 ms at dispatch | `COMPLETE_AND_APPROVED` | Horae must prove immediate reinspection |
| Timeout values | `docs/decisions/FATES-SLICE-002-timeout-decision.json` | 500/750/2,500/5,000 ms boundaries; 1,000 ms freshness and warm p95 target | `COMPLETE_AND_APPROVED` | Owner-local implementation and timing evidence |
| Failure states | Runtime-boundary design and consistency review | `completed`, `denied`, `unavailable`, `stale`, `incompatible`, `malformed`, `timed_out`, `indeterminate` | `COMPLETE_AND_APPROVED` | No false success, retry, or state rewriting |
| Correlation | Consistency review and acceptance matrix | One Moirae-initiated correlation preserved end to end | `COMPLETE_AND_APPROVED` | Real relay evidence |
| Producer IDs | Consistency review and acceptance matrix | Distinct Moirae, Horae, and Ananke IDs; relay adds but never overwrites | `COMPLETE_AND_APPROVED` | Real relay evidence |
| Bypass claim | Runtime-boundary design and Moirae approval | Route-specific only; named host/editor/provider paths remain outside the global claim | `COMPLETE_AND_APPROVED` | Harness evidence and truthful presentation |
| Runtime Contracts | Adrasteia approval and consistency review | Existing contracts sufficient; no package/protocol change | `COMPLETE_AND_APPROVED` | Reopen only for a neutral structural gap required by at least two runtimes |
| Implementation order | Implementation authorization and Integration approval | Evidence freeze -> Ananke -> Horae -> Moirae -> Integration proof | `COMPLETE_AND_APPROVED` | Each producer checkpoint/handoff gates its consumer |
| Acceptance evidence | `docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md` | 17 frozen evidence cases; mocks cannot prove the route | `COMPLETE_AND_APPROVED` | Real checkpointed artifacts required later |
| Owner approvals | Five files under `docs/approvals/FATES-SLICE-002/` | All `APPROVED`; no conditions or unresolved issues | `COMPLETE_AND_APPROVED` | Approval withdrawal is a hard stop |
| Checkpoint requirements | `docs/checkpoint-policy.md` plus owner approvals | Clean, pushed, green, annotated tag, reviewed handoff | `COMPLETE_AND_APPROVED` | No downstream start before producer checkpoint |
| Handoff requirements | `docs/handoff-packets.md` and this package | Canonical packet plus domain evidence attachments | `APPROVED_WITH_IMPLEMENTATION_DETAIL_REMAINING` | Local handoff-schema amendment required before completed packets |
| Lock advancement | Architecture laws, compatibility policy, checkpoint policy | No change until all consumer and Integration evidence passes | `COMPLETE_AND_APPROVED` | Later reviewed lock transaction only |
| Sealing | Checkpoint policy | Separate from completion; all involved repositories must have verified annotated tags | `COMPLETE_AND_APPROVED` | Moirae must be taggable and all final evidence accepted |
| Activation sequencing | Runtime-boundary design section 10 and implementation-authorization conditions | Merged text requires proof before activation, while this proposal defines activation as permission to begin implementation | `CONTRADICTION_BLOCKS_ACTIVATION` | Explicit owner clarification/amendment |
| Live Slice 02 record | `schemas/slice.schema.json` | Current closed schema omits required non-goals, handoffs, and activation-evidence fields | `DOCUMENTATION_ONLY_CORRECTION` | Approve and implement local schema extension before activation |

No owner-design contradiction was found in topology, authority, action,
arguments, fixture, retry, readiness, failure semantics, correlation, or
portable-contract scope. The historical
`BLOCKED_BY_MISSING_RUNTIME_BOUNDARY` decision remains accurate evidence about
Stage A; the subsequently approved owner designs define how that missing
boundary may later be implemented.

## Architectural and implementation baselines

The Stage-A locked commits remain the architectural compatibility baseline.
Implementation branches must instead start from the merged default-branch
commit that contains each approved owner design.

| Repository | Stage-A locked commit | Approved design commit / merge | Proposed implementation branch base | Why |
| --- | --- | --- | --- | --- |
| Project Ananke | `dcbb115c5798072221afdd2e4fdd36e786defddf` | `86eb983fbd16cefb3218f438d2f44a246b27c5d0` / `a1ee37339dbb032f151120f2c342b82c324b0238` | `a1ee37339dbb032f151120f2c342b82c324b0238` | `main` is exactly the design merge; implementation must contain the approved ADR |
| Project Horae | `52e14fa574f7427f62747fe84d2789aec25b94e3` | `c07b6300b1e5e7dcc3f977b1e6638b1f25d60b52` / `b591bc688b64308a28bd958377dfdee2f2441985` | `b591bc688b64308a28bd958377dfdee2f2441985` | `main` is exactly the design merge; unrelated dirty local work must not be overwritten |
| Project Moirae Code | `a4783db271a61848c66ac4f6652a539bdb515e28` | `bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6` / `9a5de8461b96db2cdb7bb85343cb48a60b5e4eb0` | `9a5de8461b96db2cdb7bb85343cb48a60b5e4eb0` | `main` is exactly the design merge; the new checkpoint must be annotatably taggable |
| Project Adrasteia | `124b6aee2629a3147739934ad5f1b45b32c8ba46` | `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8` / `f9eeb25076e0a590f13c7bed6c8de8c9a363ce1b` | no implementation branch | Existing contracts are sufficient; work requires a later approved shared structural gap |
| Project Fates Integration | no peer entry in `fates-lock.json`; control-plane baseline is this repository | `bd1d211ff70a3718504bb171c08e617836cdfcd5` / `a5c35043f420f36e76db8b7c9246a15e025d2a9f`; approval package `203e7036687db775fb199934748f9beed8e2df17` / `26b19e97468c0c660ef3ea4ed32f75cec84a4dee` | `26b19e97468c0c660ef3ea4ed32f75cec84a4dee` | Latest validated `main` contains the design and all approvals |

Mnemosyne remains excluded. No implementation may start from an unmerged
documentation branch.

## Exact future activation transaction

Activation means only that Slice 02 becomes the active implementation slice,
its scope and evidence baseline are frozen, the named owner implementation
branches may be created, and the repository order/checkpoint gates become
binding. It does not claim that a route exists or works.

Subject to resolution of the blockers above, a later, separately authorized
activation commit would:

1. Change `active-slice.json` from `idle`/`null` to
   `active`/`FATES-SLICE-002`, retain
   `baselineCompatibilitySet: fates-stage-a-2026-07`, set
   `nextRecommendedSlice: FATES-SLICE-003`, and replace generic requirements
   with references to the approved scope, order, acceptance matrix, starting
   checkpoints, and the separate user authorization.
2. Create `slices/002-governed-action-round-trip/` containing a live
   `slice.json`, README, acceptance placeholder, and handoff directory. The
   slice begins `implementationStatus: active`, `sealStatus: provisional`,
   and `integrationLevel: null`; `partial_runtime` is not honest until real
   component/runtime evidence exists.
3. Freeze the exact design and approval baseline, evidence manifest, tests,
   branch bases, order, handoffs, stop conditions, and deferred capabilities
   in that live slice package.
4. Authorize later creation of only these implementation branches:
   `codex/slice-002-cross-runtime-proof`,
   `codex/slice-002-bounded-read-implementation`,
   `codex/slice-002-governed-handoff-implementation`, and
   `codex/slice-002-constrained-host-implementation`.

The future activation commit would **not** change `fates-lock.json`,
`compatibility-matrix.json`, the Stage-A compatibility snapshot, any component
checkpoint, package version, protocol version, or peer repository. The matrix
must remain with Slice 02 `planned` until component and Integration evidence
supports a later compatibility transaction; an active-slice record is not a
compatibility claim.

The exact proposed state is recorded in
`FATES-SLICE-002-proposed-state-transition.json` and the non-live drafts under
`docs/activation/drafts/`. Those drafts are wrappers, not discoverable live
state.

## What remains unchanged on activation

- Stage-A remains the compatibility baseline and stays provisional and
  inspection-only until a later proof-backed lock transaction.
- Slice 01 remains completed, provisional, and inspection-only.
- Existing Runtime Contracts and protocol 1.4.0 remain unchanged.
- Adrasteia and Mnemosyne receive no implementation branch.
- Integration remains a control plane and never hosts, reads, or mocks the
  runtime fixture route.
- No runtime capability is complete, sealed, or globally governed.
- No retry, persistence, workflow, browser, shell, provider, credentials,
  memory, fallback, arbitrary IPC, or general filesystem authority is added.

## Evidence frozen before implementation

The first Integration checkpoint must freeze, without executing runtime
behavior:

- baseline commit `26b19e97468c0c660ef3ea4ed32f75cec84a4dee` and the Stage-A lock/matrix/snapshot hashes above;
- all five owner design commits and merge commits;
- all five owner approval records and the `PASS` consistency review;
- action `fates.slice02.inspect-fixed-fixture.v1`;
- fixture ID, 43-byte creation rule, size limit, fixture SHA-256, schema ID,
  canonical schema JSON, and request-schema SHA-256;
- fixed endpoints `127.0.0.1:48201` and `127.0.0.1:48202`, route components,
  HMAC challenge-response design, secret-delivery and redaction rules;
- all approved timeout and freshness values;
- every row in the acceptance-evidence matrix and its required evidence
  fields/retention paths;
- correlation, producer-ID, read-count, no-direct-route, no-non-Ananke-read,
  and bypass-report assertions;
- exact future owner branch bases and required producer-to-consumer handoffs.

## Later compatibility, completion, and sealing gates

Lock advancement may be proposed only after Ananke, Horae, and Moirae have
clean, pushed, hosted-green, reproducibly tagged checkpoints; their handoff
packets are accepted; every consumer test passes; and the real three-process
Integration matrix passes against exact artifacts.

A later compatibility transaction must create a new immutable compatibility
snapshot, update `fates-lock.json`, update the matrix and slice evidence, run
full validation, and receive separate review. It may then consider
`implementationStatus: completed` and
`integrationLevel: runtime_validated`.

Sealing is a later independent decision. It additionally requires verified
annotated tags for every involved checkpoint, exact artifact digests, hosted
validation links, accepted handoffs, reproducibility, and proof that no
mutable sibling source, mock transport, or prohibited bypass supplied the
route. Completion must never imply sealing automatically.

## Required next decision

Before an explicit Slice 02 activation prompt is safe, owners must approve a
documentation/control-plane correction that:

1. confirms activation occurs before owner runtime implementation and replaces
   the circular "proof before activation request" wording; and
2. approves local slice and handoff schema extensions with validator tests for
   the fields specified in this package.

Until then, `active-slice.json` remains idle and no live `slices/002-*`
directory may be created.
