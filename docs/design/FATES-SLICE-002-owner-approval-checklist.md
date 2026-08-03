# FATES-SLICE-002 owner approval checklist

## Purpose and status

This checklist captures explicit decisions required before implementation may begin. It is not a request to activate Slice 02, merge a runtime branch, advance a lock, or merely acknowledge the associated design documents.

**Design package classification:** READY_FOR_OWNER_APPROVAL.
**Current Slice state:** inactive.
**Selected future topology:** separate local processes over loopback HTTP: Moirae constrained host -> Horae handoff -> Ananke authority -> Horae relay -> Moirae typed result.

An approval below must state that the owner approves the bounded design and accepts the listed obligations. Silence, document readership, branch push, test success, or a generic approval emoji is not sufficient.

## Shared approval gate

- [ ] The approver confirms the candidate action remains fates.slice02.inspect-fixed-fixture.v1 only.
- [ ] The approver confirms the action remains local, harmless, read-only, fixed-fixture and fixed-digest only.
- [ ] The approver confirms there is no caller path/URI/command, network, provider, browser, shell, child process, workflow, persistence, retry, memory dependency, fallback, package/protocol change or global-governance claim.
- [ ] The approver accepts that the route is not implemented or active yet.
- [ ] The approver accepts that direct Moirae -> Ananke is not a permitted substitute.

## Ananke owner approval

- [ ] Approve Ananke ownership of immutable fixture bytes and the sole physical read.
- [ ] Approve the exact registered action, strict two-field argument schema and no general-purpose filesystem MCP substitution.
- [ ] Approve canonical binding of arguments, trusted principal pair, bounded scope, purpose, policy version, validity, origin/schema receipt and correlation.
- [ ] Approve denial before executor invocation, one read maximum, post-read SHA-256 check, typed result/failure and no retry.
- [ ] Approve Ananke-owned decision/outcome/audit evidence, including zero-read denial and actual/expected digest evidence.
- [ ] Accept the required Ananke checkpoint and handoff packet before Horae consumption.

Approval record: owner ____________________ date __________ reference ____________________

## Horae owner approval

- [ ] Approve the selected loopback-HTTP, separate-process topology and reject generic package-call/MCP shortcuts.
- [ ] Approve Horae as the only relay between Moirae and Ananke, with no Horae authority decision or physical read.
- [ ] Approve immediate Ananke identity/registration/compatibility/health/readiness reinspection and the 1,000 ms maximum freshness age.
- [ ] Approve fail-closed refusal on unregistered, unready, stale, unhealthy, incompatible, endpoint/instance-drifted, capability-drifted or malformed origin/schema inputs.
- [ ] Approve preservation of Moirae origin/correlation and addition of distinct Horae route/event IDs.
- [ ] Approve typed denied, unavailable, stale, incompatible, malformed, timed_out and indeterminate relay semantics, including no false success/retry.
- [ ] Accept the required Horae checkpoint and handoff packet before Moirae consumption.

Approval record: owner ____________________ date __________ reference ____________________

## Moirae Code owner approval

- [ ] Approve a test-only/narrow host that can issue the exact action only and calls Horae only.
- [ ] Approve trusted host identity/dual-principal creation outside model content and one initiating correlation ID.
- [ ] Approve no direct Ananke fallback, no local fixture read, no arbitrary IPC, and no environment-derived action/location input.
- [ ] Approve typed presentation of request, route state, Ananke decision/outcome, digest, correlation, producer IDs and limitations.
- [ ] Approve harness disabling/no-configuring direct fixture, direct Ananke, provider/network, shell/task/child-process and sibling-import surfaces.
- [ ] Accept explicit disclosures that terminal, task, debugger, extension host, Git, third-party extension, external CLI and direct-provider paths are outside the Slice claim.
- [ ] Accept the required Moirae checkpoint and handoff packet before Integration proof.

Approval record: owner ____________________ date __________ reference ____________________

## Adrasteia owner approval

- [ ] Approve the conclusion that existing contracts cover identity, principals, scope, correlation, readiness, compatibility, references and generic results for this design.
- [ ] Approve keeping route receipts, schema digest, fixture digest, policy/decision evidence, timeout and host presentation domain-local.
- [ ] Confirm no package or protocol version change is approved.
- [ ] Accept that reopening contracts requires a demonstrated, reusable structural field needed by at least two runtimes plus compatibility/migration analysis.

Approval record: owner ____________________ date __________ reference ____________________

## Integration owner approval

- [ ] Approve the repository order: evidence freeze -> Ananke adapter -> Horae handoff/relay -> Moirae constrained host -> Integration real proof.
- [ ] Approve the cross-runtime positive/negative test matrix and rule that mocks cannot prove the route.
- [ ] Approve the checkpoint/handoff contents and requirement for clean, pushed, green producer checkpoints.
- [ ] Approve non-activation, no-lock-advance and no-sealing conditions until implementation proof and later user authorization exist.
- [ ] Approve the route-specific bypass claim and exclusions.

Approval record: owner ____________________ date __________ reference ____________________

## Decision record

- [ ] All five owners have provided explicit design approvals.
- [ ] Any dissent, requested change, or unresolved topology/contract question is recorded below.
- [ ] Only after all approvals may an implementation scope be proposed; that later proposal still requires separate user authorization before Slice activation.

Unresolved items / owner conditions:

____________________________________________________________________________

____________________________________________________________________________
