# FATES-SLICE-002 Ananke producer handoff

## Handoff state

This packet finalizes the Ananke-to-Horae handoff for the bounded producer step.
It records a sealed Ananke repository checkpoint while preserving the boundary
that its action evidence is owner-local and not real three-process evidence.

| Field | Value |
| --- | --- |
| Slice | `FATES-SLICE-002` |
| Producer | Ananke — `https://github.com/hourwise/Project-Ananke` |
| Consumer | Horae |
| Branch | `codex/slice-002-bounded-read-design` |
| Exact implementation commit | `552686fe6e01e2c0bf41ccb52591076bfa68bc2c` |
| Immediate parent | `86eb983fbd16cefb3218f438d2f44a246b27c5d0` |
| Activated Stage-A Ananke baseline | `dcbb115c5798072221afdd2e4fdd36e786defddf` |
| Baseline ancestry | Verified: activated baseline is an ancestor of the producer commit |
| Sealed main checkpoint commit | `a54cb481958e5711afc1c92c622673f85e7e0178` |
| Annotated tag | `ananke-fates-slice-002-v0.1.0-protocol-1.4.0` |
| Remote checkpoint verification | `refs/heads/main` and the peeled annotated tag both resolve to `a54cb481958e5711afc1c92c622673f85e7e0178` |
| CI/status | PR CI run [#35](https://github.com/hourwise/Project-Ananke/actions/runs/31314388339) passed against implementation commit `552686fe...`; main push CI run [#36](https://github.com/hourwise/Project-Ananke/actions/runs/31315240975) passed against checkpoint commit `a54cb481...`; both passed `build-and-test (22.12.0)` |
| Checkpoint state | `sealed_tagged` |

The machine-readable packet is [`ananke-handoff.json`](./ananke-handoff.json).
It is `handoffStatus: completed` with the exact sealed main checkpoint and
annotated tag. The implementation commit remains pinned as provenance and must
not be replaced by a mutable branch head.

## Frozen action identity and request contract

The only producer action is:

```text
fates.slice02.inspect-fixed-fixture.v1
```

The accepted request is one plain object with exactly these two properties:

```json
{
  "fixtureId": "fates.slice02.fixed-fixture.v1",
  "expectedSha256": "<64 lowercase hexadecimal characters>"
}
```

Both properties are required. `fixtureId` is a constant equal to
`fates.slice02.fixed-fixture.v1`. `expectedSha256` must match
`^[0-9a-f]{64}$`. Arrays, non-plain objects, missing fields, extra fields, a
different fixture ID, uppercase/non-hex digests, and any other argument shape
are rejected as malformed. The request schema has

```text
schemaId: urn:fates:slice02:inspect-fixed-fixture-request:v1
schemaSha256: db1864fdc4978d6befb4b6d3913461e4f2d2732dd0ca87e076977ab98cf6049c
additionalProperties: false
```

The schema and request arguments are separate from trusted handoff material.
Ananke's adapter expects the following non-argument receipt from the admitted
handoff, with no other receipt keys:

- `originId`: an identifier matching Ananke's bounded identifier pattern.
- `originDigest`: the lowercase SHA-256 canonical-call digest of
  `{originId, schemaId, schemaSha256}`.
- `schemaId` and `schemaSha256`: the exact values above.
- `validity`: `expiresAt` and optional `notBefore`, both parseable timestamps;
  the receipt is valid only when now is after `notBefore` (if present) and
  before `expiresAt`.

The trusted execution context is structurally parsed by Ananke's Adrasteia
adapter. It carries the authenticated and acting principals, optional
represented principal, runtime and instance identity, tenant/project/workspace
scope where present, session, correlation, policy version, resource scope and
purpose. The Slice 02-specific gate requires `runtimeId: "ananke"`, a
non-empty purpose, bounded resource scope, and a scope containing `read`.
The context's correlation and policy material are included in Ananke's
authority binding evidence; they are not established by model-visible request
arguments.

Ananke records a canonical request digest from the exact arguments. When a
valid context and receipt are present it also records an authority-binding
digest covering the action, arguments, principals, scope, purpose, policy
version, correlation, optional tenant/project/workspace/represented principal,
validity and origin receipt.

## Risk, policy, approval, and retry behavior

The registered tool metadata is:

| Field | Exact value |
| --- | --- |
| `server` | `ananke.slice02` |
| `riskClass` | `READ_ONLY` |
| `requiredPermissions` | `[]` |
| `sideEffectType` | `read-only-fixed-fixture` |
| `retryable` | `false` |
| `requiresApproval` | `false` |

The normal Ananke policy default for `READ_ONLY` is `ALLOW`, but the gateway
still evaluates policy before the executor. An explicit policy denial produces
`DENIED` / `POLICY_DENIED`, records `policyDecision: DENY`, invokes no adapter,
and performs zero fixture reads. The owner-local implementation does not claim
that an arbitrary external policy configuration cannot return a different
gateway policy decision; no Slice 02 approval flow is added by this adapter.

The adapter has no retry loop. All adapter failure and digest-mismatch outcomes
are non-retryable. Horae must not retry a dispatch or convert a timeout or
post-dispatch transport loss into success.

## Fixture identity and read bounds

The Ananke-owned artifact is:

```text
packages/runtime-core/fixtures/fates-slice-002/fates.slice02.fixed-fixture.v1.txt
```

Its independently computed identity at the exact producer commit is:

```text
owner: Ananke / hourwise/Project-Ananke
commit: 552686fe6e01e2c0bf41ccb52591076bfa68bc2c
encoding: UTF-8 without BOM
line ending: LF
byte length: 43
sha256: 7b28f52d84b07bed8b49650960607e8f8a9809cac299810aba691f7f52fe9ae8
content: FATES-SLICE-002\nfixed-fixture\nread-only\nv1\n
```

The adapter resolves only its module-relative fixed path. Before reading, it
checks that the path is a regular file, is not a symbolic link, has exactly one
link, and is no larger than `4096` bytes. It then performs one `readFile`,
computes the SHA-256 over the bytes, and compares that digest with the exact
request `expectedSha256`. The returned success data is the UTF-8 fixture text;
the path is never returned as authority.

Integration, Horae, and Moirae Code are not authorized fixture readers. They
must carry the fixture identity and digest only and must not trust a mutable
path without the digest.

## Typed outcomes and local evidence guarantees

The implementation and owner-local tests establish these producer guarantees:

| Case | Typed result and evidence |
| --- | --- |
| Allowed request | `COMPLETED`, exact fixture text, `readAttemptCount=1`, `adapterInvocation=true`, expected and actual digest equal |
| Policy denial | `DENIED` / `POLICY_DENIED`, `readAttemptCount=0`, `adapterInvocation=false`; no `TOOL_EXECUTED` audit |
| Malformed request | `FAILED` / `FIXTURE_REQUEST_MALFORMED`, non-retryable, zero reads and no adapter invocation |
| Invalid context or origin/schema receipt | `FAILED` / `FIXTURE_AUTHORITY_INVALID`, non-retryable, zero reads and no adapter invocation |
| Fixture digest mismatch | `FAILED` / `FIXTURE_DIGEST_MISMATCH`, non-retryable, one read, expected and actual digests retained in typed evidence, never completed |
| Adapter/file failure | `FAILED` / `FIXTURE_ADAPTER_FAILURE`, non-retryable; no success is reported |
| Final audit write failure | `FAILED` / `FIXTURE_ADAPTER_FAILURE` with `auditFailure=true`; the governed read is not reported as successful |

Evidence includes the action, canonical request digest, request schema ID and
hash, expected/actual fixture digest where applicable, read count, adapter
invocation, dispatch state, policy decision, origin receipt fields, authority
binding digest where applicable, request/correlation IDs, decision ID,
outcome ID, and an Ananke audit ID/reference when the audit write succeeds.
Ananke's audit sanitizer redacts raw arguments, returned data, error strings,
unknown/sensitive metadata, and credentials; principal-like fields are
pseudonymized. These are owner-local guarantees only. The tests do not prove a
three-process route, OS-level file-access separation, remote identity
attestation, Horae relay preservation, or real timeout/indeterminate behavior.

Owner-local validation run against the exact commit:

```text
npm.cmd test -- packages/runtime-core/src/slice02-fixed-fixture.test.ts
1 file passed; 8 tests passed
```

The active task's recorded candidate validation additionally lists the full
serialized Ananke suite as 16 files / 129 tests, build, ESLint, changed-file
Prettier, and Integration validators as 55/55. Those records do not elevate
owner-local evidence into cross-runtime proof.

## Runtime identity, compatibility, and readiness surface

Horae may consume Ananke's public, descriptive inspection endpoints. The
implementation exposes these under the configured loopback base URL (default
port `3000`):

- `GET /api/runtime/identity`
- `GET /api/runtime/registration`
- `GET /api/runtime/health`
- `GET /api/runtime/readiness`
- `GET /api/runtime/compatibility`
- `POST /api/runtime/negotiate` with `protocolVersion` and
  `minimumProtocolVersion`
- `GET /api/tools`, which exposes the exact registered Slice 02 tool metadata

The runtime identity generated by the Ananke Adrasteia adapter has:

```text
runtime: ananke
kind: ananke
displayName: Ananke Outcome Gateway
version/packageVersion: 0.1.0
protocolVersion: 1.4.0
minimumProtocolVersion: 1.0.0
supportedProtocolRange: 1.0.0..1.4.0
instanceId: ananke-<runtime UUID>
standalone: true
repositoryUrl: https://github.com/hourwise/Project-Ananke
runtimeContracts: project-runtime-contracts@0.4.0
```

The published capability identifiers are `governed-execution`,
`policy-evaluation`, `approval-lifecycle`, `audit-querying`,
`runtime-inspection`, and `protocol-negotiation`. Capability discovery is
descriptive and is not authority.

Registration includes the identity, capabilities, health, readiness, a
loopback HTTP endpoint ending in `/api`, a local embedded endpoint,
`/api/runtime/health`, `/api/runtime/readiness`, `registeredAt`, the public HTTP
inspection mechanism, `standalone: true`, and degraded modes
`in-memory approvals` and `no persistent idempotency or replay recovery`.

Health reports `healthy: true`, status `healthy`, uptime, warnings, and
`checkedAt`. When execution authentication is not configured it warns that the
gateway is running fail-closed. Readiness reports `ready`, status, an optional
reason code, dependencies, and `checkedAt`. The required dependencies are:

```text
runtime-initialisation       ready
selected-policy              ready
audit-backend                ready
execution-authenticator      ready or not-ready; not-ready means requests deny
adrasteia-adapter            ready
registered-tool-executors    ready or not-ready
```

Horae must treat these snapshots as freshness/identity/compatibility evidence,
not as authentication, approval, or execution authority. The frozen Slice 02
acceptance contract requires immediate reinspection and a maximum readiness age
of 1,000 ms before any future dispatch.

## Exclusions and no-bypass assumptions

This packet does not authorize or claim:

- a Horae implementation, relay, retry, persistence, or orchestration workflow;
- a Moirae constrained host or direct-client prohibition proven in a real host;
- a real three-process route or any Integration runtime behavior;
- fixture reads by Horae, Moirae, Integration, a test harness, or any alternate
  Ananke path;
- Mnemosyne memory/context retrieval or any content-preflight handoff;
- provider fallback, credentials, browser, shell, child process, arbitrary
  filesystem access, network access, workflow, compensation, or global host
  governance;
- a sealed FATES-SLICE-002 integration checkpoint, compatibility lock
  advancement, matrix completion, Stage-A snapshot advancement, or Slice 02
  completion.

The no-bypass assumption for a future route is that Ananke remains the sole
physical reader and policy/outcome/audit authority, Horae is the sole handoff
and relay, Moirae calls Horae only, and Integration remains evidence-only.
These assumptions require the frozen real-process acceptance cases and have not
yet been proved by this packet.

## Frozen references and next permitted step

This handoff is pinned to the frozen acceptance evidence and activation records:

- `docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md`
- `docs/decisions/FATES-SLICE-002-evidence-freeze.json`
- `docs/decisions/FATES-SLICE-002-activation-decision.json`
- `docs/decisions/FATES-SLICE-002-fixture-schema-digest-manifest.json`
- `slices/002-governed-action-handoff/slice.json`

The Ananke producer checkpoint is now sealed at main commit
`a54cb481958e5711afc1c92c622673f85e7e0178` with annotated tag
`ananke-fates-slice-002-v0.1.0-protocol-1.4.0`. The implementation commit
`552686fe6e01e2c0bf41ccb52591076bfa68bc2c` remains the implementation
provenance. Owner-local evidence is still not real three-process evidence, and
the Slice 02 integration checkpoint remains incomplete and unsealed until the
Horae, Moirae, and real Integration proof steps are completed. The next
permitted work is the separately scoped Horae handoff/relay implementation
task against this sealed Ananke checkpoint. No Horae, Moirae, Runtime
Contracts, lock, matrix, snapshot, completion, or integration-seal work was
started by this handoff task.
