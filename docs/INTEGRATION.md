# The Fates — Integration State

Audited 2026-08-11. “Integrated” below means demonstrated across real component
boundaries; matching types or proposed ADRs alone do not qualify. The older
Slice 02 detail below is retained as historical evidence. The current R1
reconciliation block is authoritative for present control state.

## Current post-R1 reconciliation

- Current compatibility set: `fates-slice-003a-r1-2026-08-11`.
- Integration: sealed commit `1ed2a5c45607585fa17d72ceed1be91b5f09881f`, tag
  `fates-slice-003a-r1-v0.1.0-protocol-1.4.0`.
- Active control: `status: active`, `activeSliceId: FATES-SLICE-004`,
  `activeSubsliceId: FATES-SLICE-004A`; next recommendation remains
  `FATES-SLICE-004`.
- R1 is CLOSED / SEALED with bounded application-level identity and route
  claims. It does not claim OS-authenticated process origin or host containment.
- Conceptual 003B is remapped to canonical 004B containment and remains
  separately gated and inactive.
- Slice 004 remains a planned numeric umbrella. Its bounded 004A durable
  governed-effect lifecycle child is active in control state only; no
  implementation, live acceptance, or generic governed-execution claim follows
  from this activation checkpoint. The later decomposition is 004A
  implementation -> canonical 004B containment -> canonical 004C host-mediated
  effects.
- Canonical slices are numbered compatibility/control units. Letter-qualified
  sub-slices are bounded implementation or acceptance units owned by a
  canonical slice. The active 004A child is stored beneath the numeric
  `FATES-SLICE-004` owner and is not a separate compatibility-matrix row. The
  control state records the numeric parent and bounded child separately.
- The Runtime Contracts HEAD/tag lineage discrepancy is recorded in
  `docs/decisions/FATES-SLICE-004-runtime-contracts-discrepancy.json`; neither
  the lock nor the existing adoption tag is changed here.

> The following Slice 02 detail is retained as historical evidence; the
> reconciliation block above is authoritative for present control state.

## Historical shared protocol baseline detail

| Item | Current authority |
| --- | --- |
| Project | Project Adrasteia / attached folder `Project Runtime Contracts` |
| Package | `project-runtime-contracts@0.4.0` |
| Protocol | current `1.4.0`; minimum `1.0.0` |
| Immutable source | commit `124b6aee2629a3147739934ad5f1b45b32c8ba46` |
| Artifact | `project-runtime-contracts-0.4.0.tgz`, SHA-256 `11ee062b079f74d2a4558af315c9b9b12a6aede291d409c48f038d93c416e2c2` |
| Integration set | `fates-slice-002-2026-08-09`; global `provisional`; `runtime_validated` for the bounded Slice 02 path |

`FATES-SLICE-002` is formally accepted and sealed at slice level. The live
acceptance record is `docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json`;
the owner handoffs are under
`slices/002-governed-action-handoff/handoffs/`. The successor global
compatibility set remains provisional because the unchanged locked Moirae Code
checkpoint is pushed but untagged. The historical activation decision remains
the record of authorization; it is not being rewritten as implementation evidence.

Ananke consumes the package in its Adrasteia adapter workspace; Mnemosyne, Horae, and Moirae Code pin the same artifact at the repository root. Their committed baseline files agree on source, package, protocol, URL, and digest.

Runtime Contracts owns structural validation only. Identity, scope, delegation, readiness, correlation, references, and generic results do not prove authentication, authority, transport, freshness, domain outcomes, or execution.

## Actual cross-Fate paths

| Producer → consumer | Implemented path | Evidence level and limit |
| --- | --- | --- |
| Runtime Contracts → all runtime/host consumers | Immutable tarball dependency plus owner-local adapters and baseline verification | Stage-A conformance and inspection are implemented/tested. No shared runtime behavior is imported. |
| Ananke → Horae | Horae's bounded Slice 02 relay freshly inspects Ananke and dispatches the authorized action over canonical HTTP | Live compiled Ananke/Horae evidence verified one dispatch, one producer read, preserved identifiers, exact digest, and fail-closed negatives. Ananke remains the sole action and fixture authority. |
| Mnemosyne → Horae | Callback/transport-neutral inspection facade | Inspection and composition only. Horae deliberately invents no Mnemosyne HTTP service and retrieves no memory. |
| Ananke ↔ Mnemosyne | Mnemosyne emits outbound advisory safety notifications through a callback adapter and audits delivery | Owner-local bridge tests exist. There is no standard/live transport or inbound Ananke decision/grant path; memory failure cannot bypass Ananke, and notification failure cannot widen memory access. |
| Peers → Moirae Code | Ananke HTTP inspection and callback inspection for Horae/Mnemosyne | Stage-A client parsing exists. All action, approval, session, and qualified-memory methods fail closed. |
| Ananke → MCP tools | Real stdio MCP adapter behind the Ananke gateway | Implemented and tested locally. Governance applies only when direct server/tool/credential paths are unavailable. |
| Mnemosyne → agent memory tools | Transport-neutral governed Almanac MCP surface | Implemented locally with project/context boundaries; not composed through Horae or Moirae. |
| Moirae → Horae → Ananke | The bounded route exists; live acceptance used an external request harness at Horae's public relay boundary | No Moirae process was started or modified. Live timeout, post-dispatch indeterminate transport loss, and missing/wrong-producer induction were not claimed; deterministic owner-local tests cover those semantics. |
| Integration → runtimes | None | Integration validates locks/evidence and must not be a runtime, fixture reader, or mock substitute. |

## Compatibility and version assumptions

- The adopted protocol range is semantic `1.0.0–1.4.0`; package version and protocol version are independent.
- Current Ananke, Mnemosyne, Horae, and Moirae adapters build/parse canonical Runtime Contracts shapes while preserving domain-local schemas and semantics.
- Horae currently performs semantic range negotiation through its Adrasteia adapter, despite stale prose claiming exact equality.
- Runtime/instance identity, endpoint, readiness, capability declaration, compatibility, origin receipts, and artifact checkpoints are distinct evidence. Loopback reachability and schema validity are not identity or authority.
- Runtime Contracts strips unknown top-level schema fields in tested families; closed enums reject unknown values while selected identifier/event strings remain open. Consumers must not rely on unknown fields surviving parsing.
- Content preflight is not part of the shared Stage-A contract. Ananke's local implementation remains authoritative for its policy meaning.
- Slice 02's approved sufficiency assessment requires no Runtime Contracts change. Fixture identity/digest, request-schema hash, route/freshness/timeout receipts, and Ananke decisions remain owner-local unless a reusable neutral need is proven across at least two runtimes.

## Integration evidence and checks

Current evidence:

- Stage-A owner adapters, immutable baseline JSON files, peer comparator/conformance tests, lock, historical snapshot, matrix, and Slice 001 handoffs.
- Slice 02 Ananke and Horae implementation checkpoints, annotated tags, green CI, and owner handoffs.
- The live acceptance JSON records compiled process roles, endpoints, route/event/request/correlation identifiers, producer checkpoint and digest, dispatch/read counts, validation results, and negative-path outcomes.
- Coordination validators check local dependency/boundary rules, lock/snapshot consistency, completed-slice state, handoff schemas, schema references, and negative fixtures.
- The Slice 02 control state records `implementationStatus: completed`, `sealStatus: sealed`, `integrationLevel: runtime_validated`, and an idle active-slice slot.

Not current evidence:

- No Moirae process participation or Moirae implementation checkpoint was claimed for Slice 02.
- Live timeout, post-dispatch indeterminate transport loss, and missing/wrong producer or capability induction were not performed; owner-local deterministic tests cover those semantics.
- No qualified memory handoff, composed content-preflight path, persistent retry/reconciliation, or host-wide bypass closure.

Final validation on 2026-08-09:

| Repository | Result |
| --- | --- |
| Ananke | Full run: 16 files / 131 tests passed; build and lint passed. The earlier 129/131 MCP result was classified as a transient timeout after isolated, individual, repeated, and subsequent full-suite passes. |
| Mnemosyne | 82/82 passed across 17 files. |
| Horae | Aggregate validation passed: baseline verification, build, lint, 16 tests, 10 conformance tests, peer comparators, benchmark, CLI smoke, and composition. |
| Moirae Code | 131/131 passed across 10 files. |
| Runtime Contracts | 400/400 passed across 23 files. |
| Integration | 55/55 passed across 5 suites; all 12 canonical JSON validations and lock/matrix/slice/boundary checks passed. |

The final state also includes pushed Ananke and Horae checkpoints with annotated
tags and the Integration closure checkpoint. No credentials or temporary
acceptance scripts entered a repository.

## Unresolved integration gates

1. The Slice 02 row and slice record are completed/sealed against the exact Ananke and Horae tagged checkpoints; the successor global compatibility set is intentionally provisional because locked Moirae Code remains pushed but untagged.
2. Preserve exact producer ownership: Ananke alone reads the fixture and decides; Horae verifies, admits, dispatches, and relays without action authority; the live acceptance harness did not stand in for a Moirae process; Integration only asserts evidence.
3. Treat live timeout, post-dispatch indeterminate transport loss, and missing/wrong producer or capability as not-live-induced behaviors covered by deterministic owner-local tests, not as live route observations.
4. Obtain and verify an annotated Moirae checkpoint before a future global compatibility set can be sealed.
5. Keep later classes gated: provenance admission before durable trusted-memory ingestion; idempotency/reconciliation before retryable effects; shared preflight decision before cross-Fate content exposure; host isolation/secret brokering before claiming local-effect governance.
6. Slice 03 remains a separate, inactive task and has not started.

## Known drift

- Runtime Contracts baseline/ownership/version documents retain pre-adoption statements contradicted by later immutable artifact and consumer evidence.
- Horae's `runtime-integration.md` retains the pre-Stage-A exact-version statement.
- Moirae's `governed-path.md` overstates client capabilities compared with current fail-closed Stage-A implementations.
- Integration now locks the Slice 02 successor set for the bounded runtime-validated claim; several attached checkouts remain later documentation/design heads and do not change the lock. Moirae Code remains the explicit global-seal limitation.
