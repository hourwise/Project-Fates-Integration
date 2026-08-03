# FATES-SLICE-002 cross-owner consistency review

## Scope and baseline

This review compares the five merged owner-design authorities. It is a design
consistency review only: it neither implements a runtime boundary nor activates
FATES-SLICE-002.

| Owner | Design document | Merged document commit | Merge commit | Review PR |
| --- | --- | --- | --- | --- |
| Ananke | `docs/ADR-XXXX-bounded-registered-read-adapter-for-governed-fixture-inspection.md` | `86eb983fbd16cefb3218f438d2f44a246b27c5d0` | `a1ee37339dbb032f151120f2c342b82c324b0238` | [Project-Ananke#1](https://github.com/hourwise/Project-Ananke/pull/1) |
| Horae | `docs/ADR-XXXX-fail-closed-governed-action-handoff-and-result-relay.md` | `c07b6300b1e5e7dcc3f977b1e6638b1f25d60b52` | `b591bc688b64308a28bd958377dfdee2f2441985` | [Project-Horae#1](https://github.com/hourwise/Project-Horae/pull/1) |
| Moirae Code | `docs/ADR-XXXX-constrained-governed-action-request-and-result-host.md` | `bc48c25a1a5f793d69f38b3a7a2c05e50c9427d6` | `9a5de8461b96db2cdb7bb85343cb48a60b5e4eb0` | [Project-Moirae-Code#1](https://github.com/hourwise/Project-Moirae-Code/pull/1) |
| Adrasteia | `docs/decisions/SLICE-002-portable-contract-sufficiency-assessment.md` | `bbf240b1fdcb9be1dbd30b13d2fe2708a22ec7b8` | `f9eeb25076e0a590f13c7bed6c8de8c9a363ce1b` | [Project-Adrasteia#1](https://github.com/hourwise/Project-Adrasteia/pull/1) |
| Integration | `docs/design/FATES-SLICE-002-runtime-boundary-resolution.md` | `bd1d211ff70a3718504bb171c08e617836cdfcd5` | `a5c35043f420f36e76db8b7c9246a15e025d2a9f` | [Project-Fates-Integration#3](https://github.com/hourwise/Project-Fates-Integration/pull/3) |

Classification values are `CONSISTENT`,
`CONSISTENT_WITH_OWNER_LOCAL_DETAIL`, `CONFLICT_REQUIRES_CHANGE`, and
`UNRESOLVED_OWNER_DECISION`. A conflict in action identity, fixture ownership,
route topology, authority, retry, readiness, digest binding, or direct fallback
is blocking.

## Findings

| # | Concern | Classification | Evidence and conclusion |
| --- | --- | --- | --- |
| 1 | Action identity | CONSISTENT | Every owner names only `fates.slice02.inspect-fixed-fixture.v1`. |
| 2 | Request arguments | CONSISTENT | The closed request contains exactly `fixtureId` and `expectedSha256`. |
| 3 | Unknown arguments | CONSISTENT | Ananke rejects extra keys; Horae and Moirae refuse expanded or malformed requests before dispatch. |
| 4 | Fixture ownership | CONSISTENT | Ananke owns immutable bytes and performs the only physical read. Integration owns expected evidence, never runtime fixture access. |
| 5 | Route | CONSISTENT | The sole claimed route is Moirae -> Horae -> Ananke, followed by Horae relay and Moirae presentation. |
| 6 | Transport | CONSISTENT | The route uses separate local processes over loopback HTTP; no package-import, MCP, or generic IPC substitute is selected. |
| 7 | Direct Moirae -> Ananke fallback | CONSISTENT | It is prohibited by the Moirae ADR, Horae ADR, Ananke authority boundary, and Integration design. |
| 8 | Horae physical read | CONSISTENT | Horae inspects/admit/relays only; it cannot read the fixture. |
| 9 | Moirae local read | CONSISTENT | The constrained host receives no fixture path and direct access is a harness failure. |
| 10 | Integration runtime implementation | CONSISTENT | Integration owns assertions and evidence only; it does not host, mock, or read the runtime route. |
| 11 | Readiness | CONSISTENT | Horae revalidates immediately before dispatch. Readiness older than 1,000 ms, process-alive-only state, incomplete registration, health, capability, protocol, endpoint, or identity drift fail closed. |
| 12 | Identity and attestation | CONSISTENT_WITH_OWNER_LOCAL_DETAIL | All designs require pinned runtime/instance/artifact/endpoint identity and reject loopback-as-proof. The approved local mechanism is frozen in `FATES-SLICE-002-process-attestation-decision.json`; no production PKI is introduced. |
| 13 | Canonical binding | CONSISTENT | Action, strict arguments, trusted principals, tenant/project/workspace and bounded scope, purpose, policy version, validity, origin/schema receipt, expected digest, and correlation are bound before authority execution. |
| 14 | Execution | CONSISTENT | Ananke denies before adapter invocation, reads at most once, validates the post-read digest, audits its outcome, and never retries. |
| 15 | Result states | CONSISTENT | `completed`, `denied`, `unavailable`, `stale`, `incompatible`, `malformed`, `timed_out`, and `indeterminate` have the same fail-closed meaning. |
| 16 | Timeout and cancellation | CONSISTENT_WITH_OWNER_LOCAL_DETAIL | No false success or retry is permitted. Cancellation ends before confirmed dispatch only; loss after dispatch is `timed_out` or `indeterminate`. Initial local test values are frozen in `FATES-SLICE-002-timeout-decision.json`. |
| 17 | Correlation | CONSISTENT | Moirae creates one initiating correlation. Moirae, Horae, and Ananke retain distinct producer-owned identifiers. |
| 18 | Bypass claim | CONSISTENT | Only the controlled tested route is claimed. Terminal, task runner, debugger, extension host, Git, arbitrary SDKs, external CLIs, and direct provider paths remain explicitly outside the global claim. |
| 19 | Runtime Contracts | CONSISTENT | No package or protocol change is approved. Route receipts, schema/digest bindings, timeouts, and decision detail are owner-local; reopening requires a proven reusable structural need from at least two runtimes. |

## Result

**Cross-owner consistency: PASS.** There are no
`CONFLICT_REQUIRES_CHANGE` or `UNRESOLVED_OWNER_DECISION` findings. The two
owner-local details above are resolved by the companion approval decisions in
this package and do not alter the bounded action, transport, authority split,
or contract baseline.

This result is not an activation decision. Slice 02 remains inactive until a
later explicit user-authorized activation task accepts real implementation
checkpoints and cross-runtime evidence.
