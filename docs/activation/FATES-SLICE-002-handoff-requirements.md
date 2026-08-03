# FATES-SLICE-002 handoff requirements

## Status

This document defines future checkpoint handoffs only. It creates no live
handoff packet, checkpoint, tag, implementation branch, or consumer
authorization.

## Schema assessment

The existing `schemas/handoff.schema.json` can carry the basic checkpoint
envelope but cannot carry the complete Slice 02 evidence contract because it
sets `additionalProperties: false`.

The recommended design is:

1. extend the **local Integration handoff schema** with generic checkpoint,
   artifact, dependency, validation, approval, and attachment-reference fields;
2. keep detailed Ananke, Horae, Moirae, and Integration evidence in
   repository-owned domain attachments whose paths and SHA-256 values are
   referenced from the local packet; and
3. make no Runtime Contracts change. These records are control-plane evidence,
   not neutral runtime messages.

The local schema extension is proposed, not implemented here. Completed
handoff packets must not be created until it is approved and validator tests
exist.

## Common field mapping

| Required information | Classification | Existing/proposed representation |
| --- | --- | --- |
| Slice ID | `EXISTING_SCHEMA` | `sliceId` |
| Repository | `EXISTING_SCHEMA` | `repository` |
| Role | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `role` |
| Starting commit | `EXISTING_SCHEMA` | `startingCommit` |
| Finishing commit | `EXISTING_SCHEMA` | `endingCommit` |
| Branch | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `branch` |
| Checkpoint tag | `EXISTING_SCHEMA` | `tag`; completed packet requires a non-empty tag |
| Artifact identity and digest | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed structured `artifacts[]` with identity, path/reference, SHA-256, build command, and reproducibility status |
| Design/ADR reference | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `designReferences[]` |
| Scope implemented | `EXISTING_SCHEMA` plus `LOCAL_SCHEMA_EXTENSION_REQUIRED` | `publicSurfacesAddedOrChanged`; proposed explicit `scopeImplemented[]` |
| Scope explicitly not implemented | `EXISTING_SCHEMA` | `explicitlyUnavailableSurfaces` and `knownConstraints` |
| Tests run | `EXISTING_SCHEMA` | `testsRun` |
| Test results | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed structured `testResults` summary plus attachment digest |
| Hosted CI status | `EXISTING_SCHEMA` plus `LOCAL_SCHEMA_EXTENSION_REQUIRED` | `ciStatus`; proposed run URL, head SHA, conclusion, and completed timestamp |
| Dependency/checkpoint consumed | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `dependenciesConsumed[]` |
| Protocol/package compatibility | `EXISTING_SCHEMA` | `protocol`, `contractsUsed`, `breakingChanges`, `migrationNotes` |
| Readiness/health behavior | `DOMAIN_ATTACHMENT` | owner evidence attachment referenced by digest; concise limitation also in `knownConstraints` |
| Timeout values | `DOMAIN_ATTACHMENT` | owner timing attachment referencing the approved timeout decision |
| Security and bypass limitations | `EXISTING_SCHEMA` plus `DOMAIN_ATTACHMENT` | `explicitlyUnavailableSurfaces`, `knownConstraints`, and signed/digested bypass report |
| Changed files/packages | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `changedFilesOrPackages[]` |
| Rollback procedure | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `rollbackProcedure` |
| Worktree state | `EXISTING_SCHEMA` | `worktreeState` |
| Push state | `EXISTING_SCHEMA` | `pushStatus` |
| Known issues | `EXISTING_SCHEMA` plus `LOCAL_SCHEMA_EXTENSION_REQUIRED` | `knownConstraints`; proposed structured `knownIssues[]` |
| Owner sign-off | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `ownerSignOff` with identity, decision, timestamp, and evidence reference |
| Consumer authorization | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `consumerAuthorization` with consumer, accepted checkpoint, decision, and timestamp |
| Domain evidence attachments | `LOCAL_SCHEMA_EXTENSION_REQUIRED` | proposed `attachments[]` with kind, producer, repository-relative path/reference, SHA-256, and media type |
| Runtime wire format | `PORTABLE_CONTRACT_NOT_REQUIRED` | handoffs are Integration control-plane evidence, not runtime protocol objects |

## Proposed local schema amendment

The future amendment should add the following optional fields and require the
appropriate subset when `handoffStatus` is `completed`:

- `role`
- `branch`
- `artifacts`
- `designReferences`
- `scopeImplemented`
- `testResults`
- `hostedCI`
- `dependenciesConsumed`
- `changedFilesOrPackages`
- `rollbackProcedure`
- `knownIssues`
- `ownerSignOff`
- `consumerAuthorization`
- `attachments`

It must preserve the existing completed-handoff requirements: exact 40-byte
hex commits, pushed state, passing CI, clean worktree, non-empty annotated tag,
tests run, no local absolute paths, and canonical JSON. New validator-negative
fixtures must reject missing artifact digests, CI/head mismatches, unsigned
owner handoffs, consumer acceptance of another commit, and absolute paths.

## Common completed-packet contract

Every future owner handoff must contain or reference:

- `FATES-SLICE-002`, repository, owner role, starting and finishing commits,
  branch, annotated checkpoint tag, and exact artifact identity/digest;
- approved design/ADR and the Integration evidence-freeze checkpoint consumed;
- implemented scope and explicitly excluded scope;
- exact commands, test counts/results, hosted CI run/status/head, clean
  worktree, and pushed state;
- exact producer dependency/checkpoint consumed and compatibility/protocol
  statement;
- endpoint, readiness/health, timeout, failure, security, and bypass behavior;
- changed files/packages, migration/breaking-change statement, rollback/disable
  procedure, and known issues;
- repository-relative attachment paths and digests;
- explicit owner sign-off; and
- explicit authorization by the named downstream consumer to use that exact
  checkpoint. Silence or branch availability is not authorization.

## Ananke attachment requirements

The Ananke packet must additionally provide:

- exact action registration and strict request-schema validation evidence;
- fixture ID `fates.slice02.fixed-fixture.v1`, 43-byte creation identity,
  fixture SHA-256, request-schema ID and request-schema SHA-256;
- regular-file/no-substitution and internal-allowlist evidence;
- decision/policy/validity binding treatment;
- positive one-read, denial zero-read, digest-mismatch one-read, and
  adapter-not-invoked evidence;
- typed decision/outcome/audit examples with correlation and producer IDs;
- fixed endpoint/readiness self-description and the artifact identity against
  which it is verified;
- rollback that disables the exact action and leaves other authority behavior
  unchanged.

These details are `DOMAIN_ATTACHMENT`; their references/digests belong in the
extended Integration packet. They do not require portable runtime types.

## Horae attachment requirements

The Horae packet must additionally provide:

- exact Ananke checkpoint, artifact, runtime/instance, endpoint, capability,
  protocol, schema, and readiness identity consumed;
- pair-capability/HMAC attestation implementation and redaction evidence;
- 750 ms inspection limit and 1,000 ms freshness enforcement at dispatch;
- route/event ID generation, correlation preservation, and producer-ID
  preservation;
- typed completed/denied/unavailable/stale/incompatible/malformed/timed-out/
  indeterminate relay evidence;
- no-dispatch evidence for all precondition failures and no fixture reads;
- timeout chronology and confirmed-dispatch state;
- rollback that disables the Slice 02 route without creating a direct Ananke
  fallback.

These details are `DOMAIN_ATTACHMENT` and `PORTABLE_CONTRACT_NOT_REQUIRED`.

## Moirae Code attachment requirements

The Moirae packet must additionally provide:

- exact Horae checkpoint, artifact, runtime/instance, endpoint, capability,
  protocol, schema, and readiness identity consumed;
- proof that the exposed surface accepts the exact action/request only;
- proof that host/principal context and attestation secrets do not come from
  model content, action arguments, environment-derived locations, or logs;
- proof that direct Ananke, direct fixture, arbitrary IPC, provider/network,
  shell/task/child-process, and sibling-import surfaces are absent or disabled
  in the controlled harness;
- typed result, route state, correlation, distinct producer IDs, and rendered
  bypass limitation evidence;
- explicit outside-slice disclosure for terminal, tasks, debugger, extension
  host, Git, third-party extensions, external CLIs, arbitrary SDKs, and direct
  providers;
- rollback that disables the constrained host action without enabling an
  alternative route.

These details are `DOMAIN_ATTACHMENT` and `PORTABLE_CONTRACT_NOT_REQUIRED`.

## Integration attachment requirements

The evidence-freeze packet must identify the frozen manifest, catalogue,
approved decisions, branch bases, and its explicit lack of runtime behavior.

The final Integration packet must additionally provide:

- the exact Ananke, Horae, and Moirae checkpoint/tag/artifact set;
- the full acceptance matrix with a pass/fail result for every case;
- repository-relative evidence locations and SHA-256 attachment digests;
- process IDs/start times/endpoints, run manifest digest, correlation/producer
  joins, route/dispatch chronology, and read-count evidence;
- a summary of residual risks and all route-specific/global limitations;
- owner acceptance of the final evidence set; and
- an explicit statement that compatibility/lock advancement and sealing remain
  separate reviewed transactions.

## Consumer authorization sequence

1. Integration evidence freeze authorizes Ananke to implement against the
   frozen expectations.
2. Ananke owner signs its packet; Horae explicitly accepts that exact
   checkpoint before beginning.
3. Horae owner signs its packet; Moirae explicitly accepts that exact
   checkpoint before beginning.
4. Moirae owner signs its packet; Integration explicitly accepts all three
   exact checkpoints before real proof begins.
5. Final evidence receives owner acceptance before any compatibility or
   completion proposal.

An acceptance for one commit or artifact cannot float to a later branch head.
