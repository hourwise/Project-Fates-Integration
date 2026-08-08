# The Fates — Integration State

Audited 2026-08-08. “Integrated” below means demonstrated across real component boundaries; matching types or proposed ADRs alone do not qualify.

## Shared protocol baseline

| Item | Current authority |
| --- | --- |
| Project | Project Adrasteia / attached folder `Project Runtime Contracts` |
| Package | `project-runtime-contracts@0.4.0` |
| Protocol | current `1.4.0`; minimum `1.0.0` |
| Immutable source | commit `124b6aee2629a3147739934ad5f1b45b32c8ba46` |
| Artifact | `project-runtime-contracts-0.4.0.tgz`, SHA-256 `11ee062b079f74d2a4558af315c9b9b12a6aede291d409c48f038d93c416e2c2` |
| Integration set | `fates-stage-a-2026-07`; provisional; `inspection_only` |

Ananke consumes the package in its Adrasteia adapter workspace; Mnemosyne, Horae, and Moirae Code pin the same artifact at the repository root. Their committed baseline files agree on source, package, protocol, URL, and digest.

Runtime Contracts owns structural validation only. Identity, scope, delegation, readiness, correlation, references, and generic results do not prove authentication, authority, transport, freshness, domain outcomes, or execution.

## Actual cross-Fate paths

| Producer → consumer | Implemented path | Evidence level and limit |
| --- | --- | --- |
| Runtime Contracts → all runtime/host consumers | Immutable tarball dependency plus owner-local adapters and baseline verification | Stage-A conformance and inspection are implemented/tested. No shared runtime behavior is imported. |
| Ananke → Horae | Horae `HttpAnankeInspectionBinding` calls Ananke's public identity, health, readiness, registration, and compatibility endpoints | Real inspection shape exists; no Horae execute/approve/dispatch/relay method exists. |
| Mnemosyne → Horae | Callback/transport-neutral inspection facade | Inspection and composition only. Horae deliberately invents no Mnemosyne HTTP service and retrieves no memory. |
| Ananke ↔ Mnemosyne | Mnemosyne emits outbound advisory safety notifications through a callback adapter and audits delivery | Owner-local bridge tests exist. There is no standard/live transport or inbound Ananke decision/grant path; memory failure cannot bypass Ananke, and notification failure cannot widen memory access. |
| Peers → Moirae Code | Ananke HTTP inspection and callback inspection for Horae/Mnemosyne | Stage-A client parsing exists. All action, approval, session, and qualified-memory methods fail closed. |
| Ananke → MCP tools | Real stdio MCP adapter behind the Ananke gateway | Implemented and tested locally. Governance applies only when direct server/tool/credential paths are unavailable. |
| Mnemosyne → agent memory tools | Transport-neutral governed Almanac MCP surface | Implemented locally with project/context boundaries; not composed through Horae or Moirae. |
| Moirae → Horae → Ananke | None at runtime | Slice 02 specifies a future loopback three-process route only. Current code cannot make or relay the action. |
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

- Stage-A owner adapters, immutable baseline JSON files, peer comparator/conformance tests, lock, snapshot, matrix, and Slice 001 handoffs.
- Coordination validators check local dependency/boundary rules, lock/snapshot consistency, planned-slice restrictions, schema references, and negative fixtures.
- Slice 02 has design authorities and owner approvals, a cross-owner consistency result of `PASS`, local process-attestation/timeout/schema-digest decisions, and a frozen future acceptance matrix.

Not current evidence:

- No real Moirae/Horae/Ananke action route.
- No producer checkpoint/handoff for a Slice 02 implementation.
- No proof of one Ananke physical read, zero-read denials, readiness/endpoint drift handling, timeout/indeterminate handling, or end-to-end producer/correlation preservation.
- No qualified memory handoff, composed content-preflight path, persistent retry/reconciliation, or host-wide bypass closure.

Audit validation on 2026-08-08:

| Repository | Result |
| --- | --- |
| Ananke | Full run: 118/119 passed; one 15-second stdio MCP test timed out. Focused rerun of that file: 4/4 passed. |
| Mnemosyne | 82/82 passed across 17 files. |
| Horae | 10/10 passed in the Stage-A testbench file. |
| Moirae Code | 131/131 passed across 10 files. |
| Runtime Contracts | 400/400 passed across 23 files. |
| Integration | 54/54 passed across 5 suites. |

These were test-only commands. No builds, report generators, deployments, installs, secret operations, external actions, commits, or pushes were run.

## Unresolved integration gates

1. Slice 02 remains pending a separate explicit activation decision against the exact `fates-stage-a-2026-07` lock. That decision authorizes only the approved bounded implementation order; implementation evidence is produced afterward.
2. After an explicit, non-circular activation decision, the approved order is Integration evidence freeze → Ananke bounded adapter → Horae handoff/relay → Moirae constrained host → real Integration proof.
3. Preserve exact producer ownership: Ananke alone reads the fixture and decides; Horae verifies/admits/dispatches/relays without authority; Moirae originates/renders without direct fallback; Integration only asserts evidence.
4. Satisfy the future evidence matrix with pinned artifacts and real processes. Mocks cannot prove transport, identity attestation, physical-read count, or bypass closure.
5. Do not advance `fates-lock.json`, compatibility snapshot/matrix completion, or seal status until consumer checkpoints, handoffs, tests, and real integration evidence pass.
6. Obtain/verify an annotated Moirae checkpoint tag before any Stage-A or successor integration set can be fully sealed.
7. Keep later classes gated: provenance admission before durable trusted-memory ingestion; idempotency/reconciliation before retryable effects; shared preflight decision before cross-Fate content exposure; host isolation/secret brokering before claiming local-effect governance.

## Known drift

- Runtime Contracts baseline/ownership/version documents retain pre-adoption statements contradicted by later immutable artifact and consumer evidence.
- Horae's `runtime-integration.md` retains the pre-Stage-A exact-version statement.
- Moirae's `governed-path.md` overstates client capabilities compared with current fail-closed Stage-A implementations.
- Integration locks Stage-A commits, while several attached checkouts are later documentation-only design heads. Those heads do not change the locked compatibility claim.
