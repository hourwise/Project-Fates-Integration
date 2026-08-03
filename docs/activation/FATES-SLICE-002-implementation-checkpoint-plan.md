# FATES-SLICE-002 implementation checkpoint plan

## Status and gate model

This is a proposed post-activation implementation plan. It does not activate
the slice, create any implementation branch, or authorize runtime work.

The binding order, after a separately authorized activation, is:

1. Integration evidence freeze
2. Ananke bounded adapter checkpoint
3. Horae handoff and relay checkpoint
4. Moirae Code constrained-host checkpoint
5. Integration real three-process proof

A consumer may begin only when its producer has a clean, pushed, hosted-green,
annotated checkpoint and an accepted handoff packet. Adrasteia receives no
implementation branch unless a later approved decision identifies a neutral
portable-contract gap required by at least two runtimes. Mnemosyne is excluded.

## Branch and checkpoint map

| Stage | Repository | Future branch | Base commit | May begin when | Must gate |
| --- | --- | --- | --- | --- | --- |
| Evidence freeze | Project Fates Integration | `codex/slice-002-cross-runtime-proof` | `26b19e97468c0c660ef3ea4ed32f75cec84a4dee` | Explicit activation is recorded | Ananke start |
| Authority/reader | Project Ananke | `codex/slice-002-bounded-read-implementation` | `a1ee37339dbb032f151120f2c342b82c324b0238` | Integration evidence-freeze handoff accepted | Horae start |
| Admission/relay | Project Horae | `codex/slice-002-governed-handoff-implementation` | `b591bc688b64308a28bd958377dfdee2f2441985` | Ananke checkpoint and handoff accepted | Moirae start |
| Constrained host | Project Moirae Code | `codex/slice-002-constrained-host-implementation` | `9a5de8461b96db2cdb7bb85343cb48a60b5e4eb0` | Horae checkpoint and handoff accepted | Final Integration proof |
| Real proof | Project Fates Integration | continue `codex/slice-002-cross-runtime-proof` or a reviewed successor based on its checkpoint | exact evidence-freeze checkpoint | All three owner handoffs accepted | Completion/compatibility review |

The branch names above are authorized candidates only after activation. This
proposal creates none of them except its own documentation branch.

## A. Integration evidence-freeze checkpoint

### Authorized scope

- Freeze the evidence manifest, fixture/schema manifest references, acceptance
  catalogue, correlation and producer-ID assertions, bypass-report format,
  timeout decisions, and expected component-checkpoint inputs.
- Create consumer-driven harness scaffolding only when it remains a test
  controller and cannot act as a runtime, fixture reader, or mock proof.
- Record the architectural Stage-A baseline separately from merged
  implementation branch bases.

### Forbidden scope

- No Ananke, Horae, or Moirae runtime behavior.
- No fixture creation or physical fixture read.
- No mock success presented as three-process evidence.
- No lock, matrix, snapshot, package, protocol, or checkpoint advancement.

### Required tests and review checks

- Validate fixture and request-schema digests from the frozen canonical bytes.
- Validate that every acceptance-matrix case has required correlation,
  producer, checkpoint, route/dispatch, read-count, attachment, and retention
  fields.
- Validate that no expected-evidence path is absolute or peer-local.
- Validate that mocks are marked owner-local only and cannot satisfy
  cross-runtime cases.
- Validate that the harness has no fixture-reader, runtime implementation, or
  direct Moirae-to-Ananke client.

### Checkpoint contract

- Clean worktree; pushed branch; repository tests and hosted CI green.
- Exact evidence manifest and acceptance-test catalogue.
- Recorded baseline commit, Stage-A lock hash, fixture/schema digests,
  attestation decision, timeouts, and branch bases.
- Explicit `runtimeBehaviorImplemented: false` evidence.
- Handoff packet authorizing Ananke to consume only the frozen expectations.
- Rollback: delete/disable scaffolding and return to the baseline without
  changing live state or peer repositories.

## B. Ananke checkpoint

### Authorized scope

- Register only `fates.slice02.inspect-fixed-fixture.v1`.
- Accept only the strict two-field request: `fixtureId` and
  `expectedSha256`.
- Create the immutable Ananke-owned fixture from the approved 43-byte rule.
- Resolve it through an internal constant/allowlist and perform at most one
  physical read.
- Bind canonical action/arguments, trusted principal pair, bounded scope,
  purpose, policy version, validity, origin/schema receipt, expected digest,
  and correlation before adapter invocation.
- Deny before invocation, verify SHA-256 after the read, and emit typed
  decision/outcome/audit evidence including read-attempt count.
- Add only the fixed loopback execution/readiness endpoint support required by
  the approved local design.

### Forbidden scope

- No general filesystem tool, caller-supplied path/URI, generic MCP substitute,
  retry, workflow, persistence, provider/network, browser, shell, credential,
  child process, or portable-contract change without a new decision.
- No delegation of the physical read to Horae, Moirae, Integration, or a test
  helper.

### Required tests

1. Positive fixed read with exact bytes, byte length, digest, and one-read evidence.
2. Unknown fixture identifier rejected.
3. Malformed expected digest rejected.
4. Wrong digest produces a typed mismatch after one permitted read, never `completed`.
5. Extra argument rejected.
6. Missing or mutated authenticated/acting principal rejected before invocation.
7. Mutated tenant/project/workspace scope or purpose rejected.
8. Mutated policy version rejected.
9. Expired validity rejected.
10. Denial proves adapter invocation false and zero reads.
11. Absent executor fails closed.
12. One-read maximum is enforced under success and failure.
13. Typed decision, result, outcome, and audit references are preserved.
14. Owner-local timeout/fail-closed behavior matches the approved taxonomy.
15. Symlink, junction, hard-link substitution, directory, oversize, and non-regular fixture cases fail closed where the platform can exercise them.

### Checkpoint contract

- Start exactly at `a1ee37339dbb032f151120f2c342b82c324b0238`.
- Clean worktree, pushed branch, all tests green, hosted CI green.
- Warm-local latency/benchmark evidence sufficient to show the owner-local
  work fits the approved total budget; the 1,000 ms p95 remains a test target,
  not a production SLO.
- Reproducible artifact identity and SHA-256; annotated checkpoint tag under
  repository policy.
- Handoff to Horae naming the Integration evidence-freeze checkpoint consumed,
  fixture and schema digests, action registration, endpoint/readiness behavior,
  tests, known limits, and rollback/route-disable procedure.

## C. Horae checkpoint

### Entry gate

Horae work may begin only after the Ananke checkpoint above and its handoff are
clean, pushed, hosted-green, tagged, reviewed, and explicitly accepted for
consumption. Existing unrelated local Horae work must be preserved; activation
is suspended if the branch cannot be created without overwriting it.

### Authorized scope

- One fixed loopback HTTP Moirae-facing handoff and one fixed Ananke-facing
  execution path for the exact Slice 02 action.
- Verify admitted Ananke runtime/instance/artifact/checkpoint, endpoint,
  registration, protocol, capability, health, and readiness.
- Reinspect immediately before dispatch; finish inspection within 750 ms and
  reject an observation older than 1,000 ms.
- Strict action allowlist and request/origin/schema validation.
- Preserve the initiating correlation; add distinct Horae route/event IDs.
- Relay typed Ananke decision/outcome/audit references without rewriting them.
- Enforce no retry and the approved `timed_out`/`indeterminate` semantics.

### Forbidden scope

- No Horae policy authority, fixture read, persistence, workflow, retry,
  direct-package shortcut claimed as runtime proof, cached readiness treated as
  fresh, or false-success timeout handling.

### Required tests

1. Completed Ananke result relayed without rewrite.
2. Ananke denial relayed with its references intact.
3. Startup race fails before dispatch.
4. Stale readiness fails before dispatch.
5. Unhealthy, unregistered, or incomplete Ananke fails before dispatch.
6. Incompatible protocol fails before dispatch.
7. Endpoint, instance, commit, artifact, or attestation drift fails closed.
8. Capability drift fails closed.
9. Schema or origin mutation fails closed.
10. 2,500 ms Ananke request and 5,000 ms total hard timeout behavior is typed and non-retrying.
11. Confirmed-dispatch response loss is `indeterminate`, never a zero-read claim.
12. Initiating correlation is unchanged.
13. Ananke IDs are preserved and Horae route/event IDs remain distinct.
14. Every precondition failure records `dispatch=false`.
15. Horae performs zero fixture reads, including every refusal path.
16. Wrong-capability, wrong-run, stale-nonce, restart, endpoint-rebind, and listener-collision attestation cases fail before dispatch.

### Checkpoint contract

- Start exactly at `b591bc688b64308a28bd958377dfdee2f2441985`.
- Clean worktree, pushed branch, repository tests and hosted CI green.
- Annotated checkpoint tag; reproducible artifact identity/digest.
- Exact Ananke checkpoint and artifact consumed.
- Transport, HMAC identity, freshness, dispatch, failure, correlation, producer,
  and latency evidence.
- Handoff to Moirae Code with known limitations and rollback/route-disable
  procedure.

## D. Moirae Code checkpoint

### Entry gate

Moirae work may begin only after the Horae checkpoint and handoff above are
clean, pushed, hosted-green, tagged, reviewed, and accepted.

### Authorized scope

- A constrained local host/process for the exact action and exact two-field
  request only.
- One fixed Horae-only endpoint; no Ananke client or alternative action route.
- Trusted host and dual-principal context obtained outside model/action content.
- One initiating correlation ID.
- Typed route, authority, decision, digest, correlation, producer-ID, result,
  and limitation presentation.
- Controlled-harness configuration that disables or proves absent the named
  direct fixture, direct Ananke, provider/network, shell/task/child-process,
  arbitrary IPC, and sibling-import surfaces.

### Forbidden scope

- No direct Ananke fallback, local fixture read, arbitrary path/filesystem,
  arbitrary IPC, shell/provider/browser/workflow fallback, environment-derived
  action/location, or global host-governance claim.

### Required tests

1. Positive constrained request through Horae.
2. Unsupported action rejected.
3. Extra argument rejected.
4. Malformed digest rejected.
5. Stale or unavailable Horae fails without fallback.
6. Incompatible Horae fails closed.
7. Direct Ananke fallback is absent.
8. Direct fixture access is absent in the tested process/route.
9. Initiating correlation is preserved.
10. Typed result/route state is displayed without rewriting authority.
11. Distinct producer IDs are displayed.
12. Explicit limitation report names terminal, task runner, debugger,
    extension host, Git, third-party extensions, external CLIs, arbitrary SDKs,
    and direct-provider routes as outside the global claim.
13. Wrong-capability, wrong-run, stale nonce, endpoint drift, restart, and
    secret-leak negatives fail and leave no secret material in payloads/logs.

### Checkpoint contract

- Start exactly at `9a5de8461b96db2cdb7bb85343cb48a60b5e4eb0`.
- Clean worktree, pushed branch, repository tests and hosted CI green.
- Reproducible controlled-host artifact identity/digest and annotated
  checkpoint tag. Inability to create/verify the tag suspends the slice.
- Exact Horae checkpoint consumed.
- Harness restrictions and outside-slice limitations recorded.
- Handoff to Integration with rollback/host-route-disable procedure.

## E. Final Integration checkpoint

### Entry gate

Final proof may begin only after accepted, reproducible, tagged Ananke, Horae,
and Moirae handoffs exist. It must use their published artifacts and public
boundaries, never mutable sibling source imports.

### Required real proof

- Three separate local processes at the fixed loopback endpoints.
- Approved pair-capability/HMAC attestation and one-shot secret delivery.
- Exact commits, checkpoint tags, artifact digests, runtime/instance IDs,
  protocol range, capability, and request-schema digest.
- Positive completed route.
- Denied zero-read route.
- Malformed/extra argument.
- Digest mismatch with one-read evidence.
- Principal, scope, purpose, and policy mutation.
- Stale readiness and startup race.
- Incompatible protocol.
- Endpoint, instance, artifact, capability, and identity drift.
- Origin and schema mutation.
- Timeout and indeterminate post-dispatch loss.
- Correlation and producer-ID preservation.
- One-read positive proof and zero-read denial proof.
- No direct Moirae-to-Ananke path.
- No fixture read by Moirae, Horae, Integration, or test helpers.
- Bypass limitation report.
- Wrong-capability, wrong-run, stale-nonce, restart, rebind, collision, artifact
  drift, and secret-redaction evidence.

### Completion gate

Only after all evidence passes and owners accept it may a separate transaction
consider `implementationStatus: completed`,
`integrationLevel: runtime_validated`, lock advancement, a new compatibility
snapshot, and an Integration checkpoint. Completion and sealing remain
separate decisions; neither occurs in this plan.

## Immediate stop/suspend rule

Any failed entry gate, scope expansion, dirty/unknown repository state,
unreproducible checkpoint, missing tag, prohibited bypass, caller-controlled
path, retry/persistence, or inability to prove identity/readiness returns the
slice to review. It must never be reclassified as success or silently reduce
the evidence standard.
