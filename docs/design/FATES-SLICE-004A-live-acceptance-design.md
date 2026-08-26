# FATES-SLICE-004A — bounded live-acceptance preparation

**Status:** PREPARATION CHECKPOINT ONLY — no live acceptance executed

**Control state:** `FATES-SLICE-004` / `FATES-SLICE-004A` active, provisional,
unsealed; `FATES-SLICE-003B` paused.

## 1. Objective and claim boundary

The prepared acceptance proves one bounded Ananke-authoritative governed effect
across real process and persistence boundaries:

```text
Gateway.execute -> policy/approval -> durable intent -> dispatch marker
-> independent receipt-sink process -> provider state -> Ananke outcome/audit
```

The mandatory uncertainty case interrupts the Ananke acceptance process after
the independent provider has persisted its operation and before Ananke commits
local success. A fresh Ananke process reopens the same SQLite execution store,
performs read-only provider reconciliation, and must not submit a second
operation.

This is a bounded proof against the disposable receipt-sink contract. It does
not claim exactly-once execution of arbitrary external effects, provider safety
beyond the fixture contract, OS/process-origin authentication, host or
filesystem containment, credential-extraction resistance, or complete
bypass-resistance.

The low-level `executeTool` and `McpAdapter.executorFor` capabilities remain
outside the Gateway claim. The driver and acceptance worker do not import or
invoke either capability. The positive claim is only:

> Governed execution through the supported `Gateway.execute` HTTP entry point
> centrally enforces the durable-effect lifecycle.

## 2. Exact starting checkpoints and preconditions

The future execution preflight requires these exact clean checkpoints:

| Repository | Path | Starting SHA |
| --- | --- | --- |
| Integration | `D:/Users/fleur/Project-Fates-Integration` | `562d7c6545edb4d1a00f93a77f51aa95261da291` |
| Ananke | `D:/Users/fleur/Project Ananke` | `38c43aec29fe3080ff495f5f5f2433adc4632a66` |
| Horae | `D:/Users/fleur/Project Horae` | `3f531d4f5558a10a36aeae20c3458080eb4468b9` |
| Moirae | `D:/Users/fleur/Project Moirae Code` | `bc7b984bd2eb0e0f07a1cd7259a8eab21556f097` |
| Mnemosyne | `D:/Users/fleur/Project Mnemosyne` | `f4ab76a9760f856d78908d35facceb068d78c8e5` |
| Runtime Contracts | `D:/Users/fleur/Project Runtime Contracts` | `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8` |

The driver rechecks `active-slice.json`, the sealed R1 compatibility set,
lock, matrix row, and the recorded 003B pause. It also checks the compiled
Ananke runtime and the SHA-256 digests of the driver, provider fixture, and
acceptance worker. The preparation does not alter the R1 baseline, lock,
matrix, evidence, tag, or sealed history.

## 3. Composition and process/state boundaries

The provider fixture is
`fixtures/slice-004a-receipt-sink/server.mjs`. It is a separate Node process
with an atomic JSON state file and read-only operation/status endpoints. It
accepts only the bounded receipt request, deduplicates the scoped idempotency
key, persists the operation before replying, and never receives a credential.

The acceptance worker is
`fixtures/slice-004a-ananke-process/server.mjs`. It is a separate Node process
that composes the compiled public Ananke `Gateway`, registers exactly one
`EXTERNAL_SEND` receipt-sink consumer, and calls `gateway.start()`. The worker
does not expose a parallel provider callback or low-level execution route. The
driver communicates with it through the existing `/api/execute`, approval, and
runtime-inspection HTTP routes.

Ananke execution truth is held in its own SQLite file. Provider truth is held
in the receipt-sink JSON file. The files are never shared. The Ananke process
is stopped and restarted for recovery cases; the provider process is restarted
independently to prove its persisted operation survives process teardown.

The future child environment is the existing bounded runtime allowlist only:
`PATH`, `SystemRoot`, `WINDIR`, `TEMP`, `TMP`, and `USERPROFILE`. Child
spawning uses `shell: false` and argument arrays. No PowerShell, generated
command, execution-policy change, Defender change, or elevation is used.

The selected action is exactly `fates.slice04a.receipt.write`, risk class
`EXTERNAL_SEND`. Its arguments are exactly `idempotencyKey`, `target`, and a
lowercase SHA-256 `payloadDigest`. The provider request carries only bounded
identifiers and digests. The fixed development-mode authentication values are
existing Ananke test composition constants; no credential is generated and no
provider credential exists.

## 4. Acceptance cases

### Case A — normal governed effect and duplicate

The driver sends the first request to `/api/execute`, obtains and approves the
Gateway approval through the operator route, then executes the exact same
bound request. It verifies policy/risk processing, approval binding, durable
intent, pre-provider dispatch marker, one provider receipt, durable confirmed
success, audit/outcome projection, and secret-free evidence. It repeats the
same governed request with a newly issued approval and verifies the stored
result is reused with provider operation count still exactly one.

### Case B — provider committed, Ananke local success interrupted

The acceptance worker is started with the existing `after_provider_call`
failpoint and an explicit bounded crash seam. The request enters through
`/api/execute`; the provider persists one operation; the worker observes the
`dispatch_marked` durable state and exits with the acceptance crash status
before local success is committed. No SQLite file is edited. A new worker
process opens the same SQLite file, recovers the dispatch marker, and performs
read-only lookup by provider operation ID. The case passes only if the result
is `reconciled_success`, provider operation count is one, and no second submit
occurs.

### Case C — bounded unresolved reconciliation

The worker is interrupted after the durable dispatch marker and before provider
submission. The provider state remains empty. Recovery performs the bounded
lookup budget and records `terminal_unresolved`. No success or ordinary
failure is guessed, and no redispatch is attempted.

### Case D — binding/identity mismatch

The provider fixture returns a deliberately mismatched receipt for the one
persisted operation. Ananke records uncertainty, then read-only reconciliation
fails closed to `terminal_unresolved`. The foreign evidence cannot complete the
intent and provider count remains one.

### Case E — central chokepoint negative

The acceptance worker is composed in a separate negative mode with the same
effect-capable metadata but only a generic `setExecutor` callback. The request
still enters through `/api/execute`. Gateway returns the established
fail-closed `FAILED` / `PERMISSION_DENIED` result, the callback marker remains
absent, and the provider operation count is zero. This is a negative proof of
the central chokepoint, not a low-level capability proof.

## 5. Lifecycle, binding, and reconciliation evidence

The expected durable states are the existing Ananke states:

`request_admitted` → `approval_bound` → `approved_never_dispatched` →
`dispatch_marked` → `dispatched_confirmed_success` or
`dispatched_result_unknown` → `reconciliation_pending` →
`reconciled_success` / `reconciled_failure` / `terminal_unresolved`.

The durable binding joins action, exact arguments, principals, resource scope,
purpose, expiry, approval hashes, provider/target, and scoped idempotency key.
Correlation is retained in the durable intent, provider request, and audit
projection as observational trace metadata, but is not semantic binding
material. Provider evidence is joined only when operation ID,
idempotency scope/key, and binding digest match. Reconciliation is read-only,
bounded to three queries at 250 ms each and a one-second total budget in this
acceptance composition. A mismatch or exhausted budget is retained as
unresolved; it never authorizes a new submit.

The evidence schema is
`schemas/slice04a-live-evidence.schema.json` (version 2). Execute mode first
reserves an exclusive append-only `.events.ndjson` journal, records `reserved`
and `started` lifecycle events, and then records case progress and known
facts. After failure or success, the driver creates the terminal JSON exactly
once with exclusive creation. A failure event is persisted before tracked
process cleanup; cleanup state is then included in the terminal record. The
record contains the attempt ID, exact starting checkpoints, driver/fixture/
worker hashes, mode and command, process-start facts, sanitized lifecycle
transitions, provider/durable facts, cleanup disposition, limitations, and
final classification. Unknown values remain explicit null/false/unknown
facts. It contains no tokens, headers, raw provider payloads, environment
secrets, or unnecessary host paths.

Attempt IDs are exactly three digits. The driver refuses an existing attempt
target before any process starts and writes evidence with exclusive creation;
failed attempts remain present and are never overwritten. Plan mode creates no
attempt file and reserves no evidence.

## 6. Driver modes and hash gate

`--plan` performs only static/checkpoint/path/port/hash validation and reports
the actions execution would perform. It starts zero processes, performs zero
provider operations, changes no SQLite/provider state, creates no evidence,
and generates no credential.

`--execute` requires a unique `--attempt-id`, exact component checkpoints,
exact SHA-256 values for the driver, sink fixture, and worker, and a separate
`--owner-authorized` input. The mode is deliberately unavailable to this
preparation task; no `--execute` command has been run.

## 7. Abort, cleanup, and final classification

Abort before dispatch if any checkpoint, tree, active-state, R1, 003B, hash,
port, route, or readiness precondition fails. Abort after dispatch on any
duplicate, identity mismatch not represented as unresolved, provider evidence
ambiguity, unbounded reconciliation, missing transition, credential leakage,
or cleanup failure. Stop and classify the attempt as incomplete/failed; never
retry an uncertain submission from the driver.

At completion or failure, retain the known failure/progress event before
stopping tracked processes, then verify no acceptance child remains and create
the exclusive terminal record. Remove only disposable temporary state. The
resulting claim, if all cases pass, is
`PASS_BOUNDED — Gateway-governed durable receipt-sink lifecycle verified with
independent provider persistence and bounded read-only reconciliation`. It is
not a 004A seal and does not update compatibility closure.

## 8. Required later validation and owner gate

Before a later live authorization, rerun Ananke build/test/lint if its
checkpoint changes, the Integration validator and deterministic tests, the
receipt-sink tests, schema validation, boundary tests, and `git diff --check`.
The later execution must be separately authorized. It must not start Horae,
Moirae, Mnemosyne, Runtime Contracts, 003B, 004B, or any third-party provider.

The proposed future command is intentionally not executed here. Attempt `001`
is consumed; a future separately authorized preparation must use `003` and
the post-remediation checkpoints/hashes:

```text
node scripts/fates-slice04a-live-acceptance.mjs --plan --attempt-id 003 --approved-integration-sha <post-remediation-integration-sha> --approved-ananke-sha <post-remediation-ananke-sha> --approved-driver-sha256 <driver-sha256> --approved-sink-sha256 <sink-sha256> --approved-worker-sha256 <worker-sha256> --sink-port 34220 --ananke-port 34221
```

## 9. Attempt 003 readiness remediation

The acceptance process handle returned by `startChild()` is the single object
tracked in `activeChildren`. `startSink()` and `startAnanke()` attach
`baseUrl` to that object and return it; they do not spread or wrap the handle.
The handle retains bounded live stdout/stderr tails and marker observations,
so output emitted after startup remains visible to readiness, marker parsing,
cleanup, and evidence code. Exit completion is recorded once and cleanup
recognizes an already-exited child before entering the bounded wait.

Future evidence records logical `runtime: "node"` and relative `entrypoint`
fields rather than host executable/script paths. Each child retains at most
8 KiB per output stream. Diagnostic values redact bearer/token-shaped values
and common Windows/Unix host paths; output status distinguishes
`not_observed`, `observed_empty`, `observed`, and `unavailable`. Relevant
acceptance marker presence, readiness, exit code, signal, and bounded spawn
errors are retained. Attempt 002 remains governed only by its exact
digest-pinned boundary exception and is not rewritten.
