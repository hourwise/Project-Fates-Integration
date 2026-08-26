# POST-003A CODE-GROUNDED REVIEW RECONCILIATION AND REMEDIATION DESIGN

**Status:** documentation-only reconciliation; FATES-SLICE-003B paused; no
implementation, activation, live acceptance, or seal performed by this record.

**Review mode:** `CODE_GROUNDED`

**Reviewer:** Claude (external review evidence)

**Prior Fates context:** confirmed by the owner-provided review record.

**Source basis:** the review was reported as grounded in all six repositories
at the exact sealed/pinned revisions. The Integration reconciliation below
checks the supplied findings against the local sealed evidence, the accepted
ADRs and requirements traceability, and the pinned source revisions named by
the sealed compatibility set. The external report is evidence for
reconciliation, not an automatically authoritative architecture decision.

## Stop-gate result

The CODE_GROUNDED review found material post-seal implementation and evidence
qualifications. They do not reopen or invalidate the historical 003A seal as a
whole. They narrow several descriptive claims and identify work that must be
designed and owner-approved before 003B can be activated.

The sealed control state remains unchanged:

- `fates-lock.json` remains compatibility set
  `fates-slice-003a-2026-08-10`, `sealStatus: sealed`,
  `integrationLevel: runtime_validated`.
- `compatibility-matrix.json`,
  `compatibility-sets/fates-slice-003a-2026-08-10.json`,
  `docs/evidence/FATES-SLICE-003A-live-acceptance-2026-08-10.json`,
  `active-slice.json`, the 003A tag, and all component checkpoints remain
  unchanged.
- `active-slice.json` remains idle. FATES-SLICE-003B is not activated.

The historical acceptance still establishes that a bounded route executed and
that the fixed harmless effect completed once under the recorded harness. The
review requires narrower wording for process-origin authentication,
artifact attestation, reproducibility, development authentication, general
inspection boundedness, and generic producer-result projection.

## External-review bookkeeping and provenance

The owner-provided review record reports the following reviewer-local
deterministic validation:

- Horae: 16/16;
- Ananke: 131/131 after rebuilding the native SQLite binding;
- Moirae: 139/139;
- no skipped or conditional tests.

These are recorded as reported external-review evidence, not as a new
Integration test run in this reconciliation.

The review bookkeeping correction is recorded exactly as directed: the
`NEW_REQUIREMENT` summary contains **eight IDs, not seven**. The owner-approved
material supplies the relevant F-20 text; this document does not reproduce a
complete external report or reconstruct any report material beyond the
directed reconciliations.

The supplied Claude report also contains F-20: “The sealed 003A claim is
accurate but omits the untracked relay host.” Its conclusion is that the
sealed `knownLimits` are candid, Attempt 1 is genuine fail-closed live
evidence, the successful route is broader than reproducible source supports
because it used an untracked `%TEMP%` Horae relay host, and the claim is
narrower than source supports for deterministic no-retry/named-indeterminate
semantics. The review disposition is `VALIDATION_GAP`, which is adopted below.

## Exact pinned source and evidence basis

The sealed component revisions used for this reconciliation are the revisions
in `fates-lock.json`:

| Repository | Pinned revision | Sealed role |
| --- | --- | --- |
| Runtime Contracts / Adrasteia | `124b6aee2629a3147739934ad5f1b45b32c8ba46` (`adrasteia-adoption-v0.4.0-protocol-1.4.0`) | portable structural representation |
| Ananke | `52b512885edf3fec7ff7ce4b4dcbd3958b170ba4` (`ananke-fates-slice-002-v0.2.0-protocol-1.4.0`) | action authority and fixed producer effect |
| Mnemosyne | `f4ab76a9760f856d78908d35facceb068d78c8e5` (`mnemosyne-adrasteia-adoption-v0.1.0-protocol-1.4.0`) | memory and provenance authority; outside the 003A route |
| Horae | `9566eb2764339d6a6fe143c1630eeb009e00a7bd` (`horae-fates-slice-002-v0.1.0-protocol-1.4.0`) | discovery, inspection, admission, relay, and result return |
| Moirae Code | `f9b28fb0099d5d32d5debd4db7376066bfc2ac93` (`moirae-fates-slice-003a-v0.1.0-protocol-1.4.0`) | constrained host and originating route |
| Fates Integration | sealed documentation checkpoint `a73d828` tagged `fates-slice-003a-v0.1.0-protocol-1.4.0`; current additive docs branch is post-seal | lock, compatibility, evidence, and acceptance record |

The exact Integration commit is a historical reference only. This document is
an additive follow-up on the current Integration branch and does not replace
the sealed checkpoint.

The primary code facts used in the reconciliation are:

- `scripts/fates-slice03a-live-acceptance.mjs` launches the three bounded
  child processes with Node `spawn`, `shell: false`, hidden windows, piped
  output, allowlisted environment keys, bounded readiness polling, endpoint
  checks, evidence collection, and cleanup. It references the Horae route host
  at `%TEMP%\fates-slice02-live-20260809\horae-live-server.mjs` and launches
  Ananke with `ANANKE_DEVELOPMENT_MODE: 'true'`.
- `Project Moirae Code/apps/diagnostics-cli/src/slice03a-host.ts` creates an
  origin ID and a SHA-256 origin digest from public request data, then reports
  the actual child PID in host evidence. That digest is a correlation/check
  value, not a runtime-authenticated proof of who launched the process.
- `Project Horae/packages/slice02-relay/src/index.ts` validates the origin,
  schema, receipt, endpoint, and producer annotations, but has no durable
  single-use replay state. Its producer-result parser projects selected fields
  and then spreads the producer value, so an unexpected producer field can
  overwrite a projected field.
- `Project Horae/packages/ananke-binding/src/index.ts` performs inspection
  requests with `Promise.all` and no inspection deadline/cancellation. The
  dispatch path has a timeout, but the pre-dispatch inspection path does not.
- `Project Ananke/packages/runtime-core/src/index.ts` uses development mode
  to enable the bundled local execution authenticator when no explicit
  execution authenticator is supplied; otherwise the non-development default
  denies execution. The live harness explicitly enabled development mode.
- `Project Ananke/packages/runtime-core/src/routes.ts` authenticates the
  request header and derives the execution context from the authenticated
  identity. Request-body principal-like data is not authority-bearing.
- `Project Ananke/packages/runtime-core/src/slice02-fixed-fixture.ts` performs
  fixed-fixture `lstat`, link/type/size checks, a single read, and digest
  verification. Those fixed-action protections remain valid.

## F-01 through F-20 reconciliation

`Review treatment` describes whether the supplied finding is accepted as
source-grounded, qualified, rejected as unsupported for the stated scope, or
unresolved. `Fates disposition` uses the existing routing vocabulary where a
future requirement is indicated. A disposition of `NEW_REQUIREMENT` does not
authorize implementation.

| ID | Review treatment and exact source/evidence reconciliation | Fates disposition | Effect on historical 003A | Placement |
| --- | --- | --- | --- | --- |
| F-01 | **Accepted and materially confirmed.** The live route host was an untracked temporary Horae wrapper referenced by the Integration harness, not a tracked/versioned Horae HTTP host. The route semantics may still have been the sealed relay semantics, but its source provenance and reproducibility are weaker than a repository-owned host. | `NEW_REQUIREMENT` | Qualifies reproducibility and route-host provenance. It does not erase the fact that the route executed. | Immediate R1 corrective candidate; a tracked host must preserve one route and no fallback. |
| F-02 | **Accepted with a material claim qualification.** The acceptance driver independently spawned the Moirae child and correlated the returned PID with the host evidence. That is harness process correlation. The Moirae origin receipt/digest and Horae checks are caller-supplied/public values and do not prove that Horae or Ananke authenticated a trusted Moirae process origin. | `NEW_REQUIREMENT` | Replace “runtime-authenticated process origin” wording with “acceptance-harness process correlation.” The bounded route and observed originating child remain historical facts. | Recommend a bounded R1 corrective subphase for trusted supervisor/channel identity; if that expands into full containment, move it to 003B. |
| F-03 | **Accepted as a replay-resistance gap, without extending it beyond the evidence.** The route validates freshness fields, but the pinned Horae relay has no durable single-use or replay ledger. No claim is made here that the fixed harmless read was replayed. | `NEW_REQUIREMENT` | Qualifies any general claim of replay resistance. The recorded single dispatch/read observation remains valid for the run. | R1 design must define replay treatment; durable idempotency and reconciliation remain later work. |
| F-04 | **Accepted with a provenance qualification.** Horae checks producer identity, endpoint, readiness, compatibility, and annotations against expected values. Those values are configuration-match/self-report evidence, not independent artifact measurement or attestation. | `NEW_REQUIREMENT` | Qualifies producer identity/checkpoint language; it does not turn the observed producer result into a false result. | R1 trusted launch/channel design; supply-chain transparency is later. |
| F-05 | **Accepted as a validation gap.** The live Integration driver set `ANANKE_DEVELOPMENT_MODE=true`; Ananke already has a production-style execution authenticator path and fails closed when it is unconfigured, but the sealed route did not exercise that path. This was a development-auth route, not a production-style ephemeral-auth acceptance. | `VALIDATION_GAP` | Historical evidence must say that the authority route used local development authentication. No credential value is recorded. | Immediate R1 acceptance repeat with development mode disabled and ephemeral test auth provisioned out-of-band. No credential brokerage is introduced here. |
| F-06 | **Accepted as already covered.** The pinned Ananke `/execute` route authenticates the request header and derives execution context from the authenticated identity. Request-body principal-like fields are not authority-bearing. | `ALREADY_COVERED` | No material qualification. Preserve this positive finding. | Keep as a positive 003A result; no corrective implementation. |
| F-07 | **Accepted as already covered.** The tracked Moirae 003A host has one fixed outbound Horae route and no direct Moirae-to-Ananke governed-action client in the reviewed source. | `ALREADY_COVERED` | No material qualification. | Keep as a positive 003A boundary result. |
| F-08 | **Accepted as a future boundary finding, not a retroactive 003A failure.** Provider egress/network-broker enforcement is not part of the sealed 003A route and is not implemented by this reconciliation. | `NEW_REQUIREMENT` | No change to the historical claim boundary, which already excludes host-wide network containment. | 003B input; retain NetworkBroker/provider-egress ownership for an owner-approved design. |
| F-09 | **Accepted as a current-state validation gap.** The pinned source contains `IsolationLevel`, `networkPolicyId`, and `ExecutionEnvironment`, but they have zero consumers in Ananke, Horae, Mnemosyne, and Moirae Code. The current factual state is “contract vocabulary exists; no runtime enforcement consumes it.” It must not be cited as containment evidence. | `VALIDATION_GAP` | No historical effect. | Future research may decide how the contracts should be consumed; do not mutate Runtime Contracts now. |
| F-10 | **Accepted as a validation/implementation gap with an explicit 003A exclusion.** Container, MicroVM, and RemoteSandbox modes are not implemented; network policy, allowed paths, secrets policy, process settings, and related fields validate configuration only. The adapter's honest unavailable result is positive evidence discipline, but tests do not prove containment. | `VALIDATION_GAP` | Does not materially qualify 003A because 003A explicitly excluded OS/process containment. | 003B/later sandbox implementation and adversarial validation. |
| F-11 | **Accepted as a current-state validation gap, not a 003A route failure.** Documentation describes OS-keychain custody, while the pinned implementation is only `InMemorySecretBroker`; no platform-specific keychain implementation exists at the pinned revision. | `VALIDATION_GAP` | No new 003A failure because credential isolation was excluded from the 003A claim. Preserve the existing credential-isolation exclusion and disposition phrase only. | Later credential primitive selection and broker/lease integration; no brokerage in R1. |
| F-12 | **Accepted and source-confirmed.** `parseAnankeResult` projects `outcome` and optional `evidence`, then spreads `...value`; unexpected producer fields can therefore overwrite the projected fields. The sealed fixed producer result and one-read observation are still directly evidenced, but a generic allowlist projection guarantee is not. | `NEW_REQUIREMENT` | Qualifies the generic result-projection claim, not the observed bounded result. | Immediate R1 bounded allowlist projection with unexpected-field tests. |
| F-13 | **Qualified and not treated as a fixed Slice 02 adapter defect.** Generic structured executor-error typing is valid hardening, but the supplied finding does not show that the sealed fixed-fixture adapter violated its accepted typed outcomes. | `OUT_OF_SCOPE` | No historical effect. | Later Ananke hardening unless a tiny, coupled corrective change is owner-approved; do not add scope here. |
| F-14 | **Accepted as already covered.** The fixed 003A arguments are broker-owned/copied and the Ananke fixed adapter validates them before its single fixture read. A request-time argument TOCTOU path is not present for this fixed action. | `ALREADY_COVERED` | No material qualification. Preserve this positive finding. | Keep as a positive 003A result. |
| F-15 | **Accepted and materially confirmed.** Horae dispatch has a bounded request timeout, but the pre-dispatch Ananke inspection uses unbounded fetches/`Promise.all`. A peer can accept a connection and never complete inspection, so the general relay boundedness claim is too broad. The external reviewer used `EXPERIMENT_REQUIRED`; the Fates reconciliation promotes this to a remediation requirement because the unbounded path is statically established. | `NEW_REQUIREMENT` | Qualifies general inspection/readiness boundedness. The recorded successful run and existing dispatch timeout remain valid. | Immediate R1 bounded inspection/readiness/action deadlines, cancellation, fail-closed termination, and evidence for timeout states. |
| F-16 | **Accepted as already covered.** The route has no retry/fallback after dispatch and records named timeout/indeterminate states. The live Attempt 1 `/api/api` failure occurred before dispatch and had zero producer reads. | `ALREADY_COVERED` | No material qualification. Preserve the pre-dispatch failure and no-retry evidence. | Keep as a positive 003A result; test new timeout paths in R1. |
| F-17 | **Accepted with scope qualification and a retained requirement.** The reviewer's proposed blanket privileged-Node import ban is too broad because a trusted supervisor may need process launch, IPC, networking, or VM/container lifecycle primitives. The reconciled requirement is: raw privileged host/process/network primitives may be used only inside explicitly designated trusted supervisor/adapter packages; ordinary agent, UI, provider, and untrusted-workload packages must not import or invoke them directly. The exact package boundary and tooling remain subject to the R1/003B design gate. | `NEW_REQUIREMENT` | No 003A failure and no retroactive ban. | Later supervisor architecture, lint/dependency/CI enforcement, and 003B boundary design. |
| F-18 | **Accepted as already covered.** The Ananke fixed-fixture path performs real filesystem type/link/size checks and digest verification for the fixed fixture. This remains a bounded fixed-action protection, not a host-wide filesystem claim. | `ALREADY_COVERED` | No material qualification beyond the existing narrow scope. | Keep as a positive 003A result. |
| F-19 | **Accepted as a validation/evidence-quality gap, not as absence of real-process evidence.** The deterministic Horae/Moirae suites predominantly exercise in-process doubles, fetch stubs, constructed metadata, and configuration validation; they do not independently observe real process, kernel, network, or credential boundaries. Separately, Integration 003A contains real multi-process Attempt 1 and successful Attempt 2 evidence. The finding therefore means component deterministic tests must not be promoted to cross-process or OS enforcement evidence. | `VALIDATION_GAP` | Does not invalidate the separate successful 003A live acceptance. It qualifies how deterministic component tests may be cited. | R1 and 003B evidence-quality rule; require real-process/kernel/network evidence for claims at those boundaries. |
| F-20 | **Accepted as a validation gap.** The finding states that the sealed 003A claim is accurate but omits the untracked relay host: the sealed `knownLimits` are candid, Attempt 1 is genuine fail-closed live evidence, the successful route is broader than reproducible source supports because it used an untracked `%TEMP%` Horae relay host, and the claim is narrower than source supports for deterministic no-retry/named-indeterminate semantics. | `VALIDATION_GAP` | Materially qualifies historical 003A reproducibility but does not erase the successful live route. | Immediate R1 tracked-host/reproducibility remediation and additive post-seal qualification. |

### Rejected or unsupported generalizations

No supplied finding authorizes the following generalizations, and this record
rejects them for the sealed 003A scope:

- the Defender event is evidence of Ananke, Horae, Moirae, or Node malware;
- the harness PID correlation is runtime-authenticated process identity;
- a public origin hash is an attestation or proof against a caller that can
  mint the same form;
- configuration-match/self-report is artifact measurement or supply-chain
  attestation;
- a development-authenticated route proves production credential custody;
- a successful fixed inspection proves all inspection paths are bounded;
- a fixed fixture's filesystem checks prove host-wide OS containment;
- deterministic component tests alone prove cross-process or OS enforcement.

## What materially qualifies the sealed 003A record

The additive qualification to the historical acceptance should eventually use
the following narrow statements. The original evidence and seal remain
unchanged.

1. **Route execution remains established.** The live Attempt 2 route executed
   from originating Moirae through Horae to canonical Ananke and back, with one
   fixed harmless producer read and the recorded cleanup/negative evidence.
2. **The Horae HTTP host was an untracked temporary artifact.** The route host
   was not a tracked/versioned Horae production entrypoint. This qualifies
   reproducibility and source provenance, not the observed route result.
3. **Process wording is narrowed.** The harness correlated the originating
   Moirae PID because it spawned the child and matched the returned PID. The
   runtime did not cryptographically or OS-authenticate the process origin.
4. **Producer provenance wording is narrowed.** Horae's producer checkpoint,
   identity, and annotations matched expected configuration/self-report. The
   run did not independently attest the executable or artifact that made those
   claims.
5. **Authority authentication is narrowed.** The live authority route used
   local development authentication. No credential value is reproduced here;
   the previously recorded disposition remains exactly:
   `credential disposition: provider-side revoked/rotated; former exposed credential set invalid`.
6. **Inspection boundedness is narrowed.** The successful run had bounded
   readiness and dispatch behavior, but the pre-dispatch inspection binding
   lacked its own deadline/cancellation proof. A hanging inspection is a
   corrective acceptance case, not evidence that the successful run never
   completed.
7. **Projection wording is narrowed.** The fixed result was observed and
   validated, but the generic producer-result projection is not an allowlist
   because the source spreads producer fields after projected fields.
8. **Positive findings remain valid.** Request-body principals did not become
   Ananke authority; no direct Moirae-to-Ananke governed-action client was
   found; fixed arguments resisted request TOCTOU; no retry/fallback occurred;
   fixed filesystem link/size/digest protections held; and the Attempt 1
   `/api/api` failure occurred before dispatch with zero producer reads.

These are qualifications of claim scope, not a declaration that the entire
003A run was invalid.

## Correlation versus authentication

The exact distinction required for subsequent acceptance evidence is:

> **Acceptance-harness process correlation:** the owner-approved driver
> spawned the Moirae child and the PID returned by the operating system matched
> the PID reported in the host evidence.

This does not mean:

> **Runtime-authenticated process origin:** Horae or Ananke cryptographically,
> through a trusted OS supervisor, or through an authenticated private channel
> established that the claimed Moirae artifact and process—not merely any
> caller able to construct the public receipt—originated the request.

The origin ID/digest remains useful for correlation and integrity of the
bounded message shape. It must not be presented as authentication, attestation,
or complete bypass resistance.

## Self-report versus attestation

The sealed route's identity, instance, endpoint, readiness, compatibility, and
producer annotations are **configuration-match/self-report evidence**. They are
not independent executable measurement, signed artifact provenance, a trusted
supervisor decision, or supply-chain attestation. A future design may measure
and pin the executable or container/VM artifact in a trusted supervisor and
bind the result to a private, short-lived channel identity. The review does not
prematurely mandate Sigstore, mTLS, TPM, or a specific attestation technology.

## Replay recommendation

The next bounded design should treat origin and handoff evidence as
single-use, audience-bound, and channel-bound before any consequential
non-read effect. A reasonable R1 direction is:

- a trusted supervisor measures or pins the exact launched artifact and
  provisions a short-lived handoff identity/capability for the intended
  Horae channel;
- the handoff carries a nonce or attempt identity, audience/channel binding,
  expiry/not-before bounds, and an explicit single-use/replay decision;
- Horae rejects replay before dispatch and records a named denial or
  indeterminate state;
- the acceptance harness proves duplicate, stale, wrong-audience, and
  wrong-channel cases without putting any secret or credential value into
  source, logs, or evidence.

This is a recommendation, not an instruction to add a caller-mintable hash,
cosmetic signature, or unreviewed credential broker. Durable idempotency,
crash recovery, reconciliation, and consequential-effect semantics remain
later design work.

## Immediate corrective design before 003B

### Proposed corrective ID and name

**Proposed documentation subphase:** `FATES-SLICE-003A-R1 — Reproducibility
and route-identity remediation`.

**Status:** `PROPOSED — OWNER APPROVAL REQUIRED BEFORE ACTIVATION`.

This is a proposed subphase label only. It does not activate the slot. The
existing `active-slice.json` schema uses the parent-shaped ID
`FATES-SLICE-003`; no state-file mutation or new active ID is authorized by
this document.

### Bounded candidate scope

1. Add a tracked/versioned Horae HTTP host around the existing sealed relay
   semantics. Do not promote the temporary wrapper by copying it blindly, and
   do not add a fallback or second route.
2. Repeat live acceptance with `ANANKE_DEVELOPMENT_MODE` disabled and an
   ephemeral test execution authenticator provisioned out-of-band. Record only
   non-secret identifiers and disposition evidence.
3. Add a bounded allowlist projection for producer result fields. Unexpected
   producer fields must not overwrite projected `outcome`, `evidence`, or
   other broker-owned fields.
4. Add explicit inspection, readiness, dispatch, and action deadlines with
   cancellation. If inspection accepts a connection and never completes, the
   route must fail closed and terminate the bounded child/process set.
5. Define trusted origin/channel identity and replay treatment. The design
   should distinguish harness correlation from runtime authentication and
   should not rely on a public caller-mintable digest.
6. Reproduce the real process route and collect the same bounded evidence,
   port checks, one-dispatch/one-read assertions, negative cases, and cleanup.
7. Add the qualification as an additive post-seal record; never rewrite the
   historical evidence or its hashes.

### Recommendation on F-02 placement

Implement a bounded corrective identity subphase before 003B if it can remain
within the existing route and process boundaries: a tracked host, trusted
supervisor-mediated launch, private/short-lived channel identity, and explicit
replay handling. If the required trust anchor is OS containment, VM/container
lifecycle, or a broad platform TCB, stop the subphase at design and move that
portion to 003B. A public hash or signature minted by the caller is not an
acceptable corrective result.

### Explicitly deferred from R1

Provider egress/NetworkBroker, OS secret brokerage, general sandbox execution,
host-wide process/filesystem/network containment, broad privileged-import
linting, supply-chain transparency, and generic Ananke executor error taxonomy
remain 003B or later inputs unless an owner-approved scope decision makes one
of them a minimal dependency of the tracked route.

The privileged-import rule remains qualified rather than absolute:

> Raw privileged host primitives may exist only inside designated trusted
> supervisor/adapter packages; ordinary agent, UI, provider, and
> untrusted-workload packages may not import or invoke raw privileged
> host/process/network primitives directly.

If adopted, this becomes a later architecture/lint/CI rule after the trusted
supervisor boundary is designed. It is not a retroactive violation of 003A.

## Proposed post-seal qualification mechanism

The Integration documents contain an immutability/supersession principle, but
no dedicated post-seal erratum schema was found. The proposed mechanism is
therefore additive Markdown documentation:

- this file, `docs/reviews/POST-003A-code-grounded-reconciliation.md`, is the
  reconciliation/qualification record;
- `docs/tasks/ACTIVE.md` carries a short cross-reference and stop-state entry;
- the record explicitly qualifies or supersedes descriptive claims by
  reference to `docs/evidence/FATES-SLICE-003A-live-acceptance-2026-08-10.json`
  without changing that JSON, its hashes, the lock, the matrix, or the
  snapshot;
- any future accepted R1 or 003B result is a new revision/evidence artifact
  with its own owner approval and compatibility decision.

This mechanism is proposed for owner approval. It does not mutate schemas or
pretend that a later note is part of the historical seal.

## Current compatibility classification

The control-state classification remains `sealStatus: sealed` and
`integrationLevel: runtime_validated`. It must not be changed merely because
the descriptive claim boundary is now narrower.

The additive qualification should classify the affected claims as follows:

| Claim area | Additive qualification |
| --- | --- |
| bounded route execution and fixed one-read result | retained within recorded run |
| acceptance-harness originating PID | `QUALIFIED` / correlation only |
| runtime process-origin authentication | not proven; `VALIDATION_GAP` |
| producer identity/checkpoint | configuration-match/self-report only |
| artifact/executable attestation | not proven; `VALIDATION_GAP` |
| development-authenticated authority route | confirmed historical condition; repeat required |
| pre-dispatch inspection deadline | `VALIDATION_GAP` |
| generic producer-result allowlist | `VALIDATION_GAP` |
| OS/process/network/credential containment | existing 003A exclusion; 003B input |

The historical compatibility set therefore remains a valid bounded runtime
classification, but not evidence for the stronger claims listed above.

## Temporary material and credential disposition

The original recorded Horae wrapper path is currently present:

`%TEMP%\fates-slice02-live-20260809\horae-live-server.mjs`

Its presence does not make it tracked, reviewed, reproducible, or suitable as
the R1 implementation source. The recorded acceptance harness path

`%TEMP%\fates-slice03a-live-20260810-run\run.ps1`

is not currently present at that exact path. No temporary file is used as
acceptance authority by this document, and no temporary file is copied into a
repository.

Credential evidence remains limited to the exact approved disposition:

`credential disposition: provider-side revoked/rotated; former exposed credential set invalid`

No credential value, key material, hash, partial value, or reconstruction is
included here.

## Required owner decisions before any next action

The following approvals are required in order; none is implied by this
reconciliation:

1. Confirm the external-review metadata, the `NEW_REQUIREMENT` count of eight,
   and the corrected F-20 `VALIDATION_GAP` source handling.
2. Approve the additive post-seal qualification mechanism without editing the
   historical evidence, lock, matrix, snapshot, tag, or hashes.
3. Approve or reject the proposed subphase ID/name:
   `FATES-SLICE-003A-R1 — Reproducibility and route-identity remediation`.
4. Approve the tracked Horae host boundary and its owning repository/source
   location.
5. Approve the development-mode-disabled acceptance design with ephemeral
   out-of-band test authentication and no secret-bearing evidence.
6. Decide whether trusted supervisor/channel identity and replay treatment are
   bounded R1 work or must be designed as part of 003B.
7. Approve the inspection timeout/cancellation and result-allowlist contract
   changes before implementation.
8. Approve the revised reproducible acceptance command and owner-operated live
   gate. The command must not use ExecutionPolicy Bypass, Defender changes,
   alternate encodings, or evasion-oriented execution changes.
9. After R1 design/implementation/review, make a separate explicit decision
   on 003B activation. No 003B work starts from this record.

## Files and validation

This reconciliation is documentation-only. The intended repository changes
are limited to:

- this new review record;
- an additive `docs/tasks/ACTIVE.md` cross-reference and stop-state entry.

No component source, package, test, lockfile, tag, compatibility snapshot,
sealed evidence, or active-slice state is changed. Validation for this change
is limited to Integration documentation/schema checks, diff whitespace checks,
protected-file status checks, and confirmation that `active-slice.json` remains
idle. The reported external component test totals above are not relabeled as
new local validation.
