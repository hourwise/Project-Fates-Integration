# FATES-SLICE-002 stop and suspension conditions

## Status and effect

These are proposed hard gates. They do not activate, suspend, terminate, or
implement the slice in this package.

- A **hard activation stop** prevents the future activation commit.
- A **suspension** after activation prevents new owner work and downstream
  consumption, preserves all evidence already produced, and returns the slice
  to explicit owner/user review.
- A **termination condition** ends the bounded candidate rather than expanding
  or silently redefining it. Termination requires an explicit state proposal;
  it is never represented as completion.

No stop, suspension, or termination may be handled by weakening tests,
rewriting failure as success, advancing the lock, or silently changing scope.

## Hard activation stops

Activation must stop if any of the following is true:

1. Integration `main` or `origin/main` differs materially from
   `26b19e97468c0c660ef3ea4ed32f75cec84a4dee` without a new audited baseline.
2. The Integration worktree is dirty, required files are untracked, validation
   is not green, or hosted CI is not successful for the audited main commit.
3. Any Ananke, Horae, Moirae Code, Adrasteia, or Integration owner design is
   not merged into its default branch.
4. Any owner approval is withdrawn, becomes conditional, or gains an
   unresolved issue.
5. A contradiction exists among merged authorities for topology, action,
   arguments, fixture ownership, route, authority, readiness, retry, digest,
   correlation, failure semantics, or fallback.
6. The activation/implementation sequence remains contradictory. In
   particular, the current requirement for implementation proof "before any
   activation request" must be reconciled with activation as permission to
   begin implementation.
7. The fixture ID, fixture bytes/rule, fixture SHA-256, request-schema ID,
   canonical request schema, or request-schema SHA-256 is not frozen.
8. Process identity/attestation, secret delivery/redaction, endpoints, route
   components, readiness freshness, or timeout values are unresolved.
9. The acceptance-evidence matrix is incomplete or a required case is reduced
   to mock-only proof.
10. A Runtime Contracts change unexpectedly becomes necessary without a new
    Adrasteia decision proving a neutral structural need for at least two
    runtimes and defining compatibility/migration effects.
11. The active-slice or live slice schema cannot represent activation honestly.
    The current missing non-goal, handoff, and activation-evidence fields are a
    blocker until a local schema amendment is approved and validated.
12. The completed-handoff schema cannot record immutable artifacts, producer
    dependencies, hosted CI, owner sign-off, and consumer authorization.
13. A required repository is dirty or contains unknown uncommitted work that
    cannot be isolated. Existing unrelated Horae work must not be overwritten.
14. Moirae Code cannot create and remotely verify the annotated checkpoint tag
    required for a sealed repository checkpoint.
15. The route would require direct Moirae-to-Ananke access, a package shortcut,
    mock transport, Integration runtime behavior, or a non-Ananke fixture read.
16. The route would require a caller-controlled path/URI/command, general
    filesystem authority, arbitrary IPC, remote OAuth, MCP migration, workflow
    persistence, retry, memory, provider fallback, browser, shell, credential,
    child process, content preflight, or external side effect.
17. The branch base for any owner is not the merged design commit recorded in
    the proposal, or an implementation is proposed from an unmerged
    documentation branch.
18. `fates-lock.json`, the compatibility matrix, Stage-A snapshot, Slice 01,
    package versions, or protocol versions would have to change merely to mark
    Slice 02 active.

## Suspension conditions after activation

If a future activation occurs, suspend the slice immediately when:

1. An owner checkpoint, required negative test, full repository suite, or
   hosted CI fails.
2. A producer checkpoint/handoff is missing, not clean, not pushed, not
   reproducible, not tagged, not owner-signed, or not accepted by its consumer.
3. Work begins out of order or a consumer uses a mutable branch head instead
   of the accepted producer checkpoint.
4. Design scope expands beyond the exact action/two-field request or introduces
   a new capability not explicitly approved.
5. The runtime route bypasses Horae, bypasses Ananke authority, delegates the
   physical read, or lets Integration act as a runtime.
6. A caller-controlled path, URI, command, fixture location, endpoint,
   capability, principal, or attestation secret appears.
7. Retry, persistence, workflow semantics, provider/network fallback, memory,
   browser, shell, credentials, arbitrary IPC, or direct-package runtime proof
   is introduced.
8. A component checkpoint or artifact digest cannot be reproduced from the
   recorded commit/tag/build instructions.
9. Readiness, registration, health, compatibility, endpoint/instance identity,
   capability, schema, origin, freshness, or HMAC enforcement cannot be proven
   immediately before dispatch.
10. A negative test shows a fixture read without Ananke allow, more than one
    Ananke read, or any fixture read by Horae, Moirae, Integration, or a helper.
11. Direct Moirae-to-Ananke fallback, local fixture fallback, or a mock route is
    deemed necessary.
12. Correlation is rewritten, producer IDs are overwritten, or Ananke
    decisions/outcomes are reclassified by the relay or host.
13. A timeout or post-dispatch loss is converted to success, silently retried,
    or represented as a false zero-read assertion.
14. Cross-runtime latency exceeds the 5,000 ms hard timeout because of
    governance logic and cannot be resolved without bypassing controls.
15. Pair capability, nonce, identity, endpoint, artifact, or secret-redaction
    tests fail, or secret material appears in action payloads, results, fixture
    content, command lines, environment variables, or ordinary logs.
16. An owner approval is withdrawn or a replacement decision changes the
    frozen design.
17. Any implementation proposes a lock, matrix, snapshot, package, protocol,
    or completion/seal change before the final Integration proof is accepted.

## Termination conditions

Return the candidate for termination review, rather than indefinite
suspension, if:

- the fixed, harmless action cannot be implemented without a prohibited
  general capability or direct fallback;
- the three-process topology cannot meet identity/readiness requirements
  without changing the approved trust model;
- a Runtime Contracts change is necessary but does not meet the two-runtime
  neutral-structure rule;
- the route cannot meet the hard timeout without bypassing governance;
- Moirae cannot be constrained truthfully to a Horae-only tested route; or
- owners reject the bounded scope or decline to produce the required
  checkpoint/handoff evidence.

Termination preserves all evidence and records the precise reason. It does not
mark the slice completed, validated, compatible, or sealed.

## Suspension transaction requirements

The future activation task must define a reviewed control-plane transaction
that:

1. records the suspension reason and failing checkpoint/evidence reference;
2. prevents downstream consumer authorization and new implementation work;
3. leaves the last compatible Stage-A lock/snapshot/matrix unchanged;
4. disables any partially implemented Slice 02 route using the owner rollback
   procedure, without enabling direct fallback;
5. retains decision, dispatch, read-attempt, result, timeout, and audit evidence;
6. requires a new owner consistency review and explicit user instruction to
   resume; and
7. never silently revises acceptance criteria or success semantics.

The current `active-slice.schema.json` has only `idle` and `active`; it cannot
represent `suspended`. Until a local state-model decision is approved, a
suspended implementation must remain `active` with an explicit suspension
record in the live slice package, or use another separately approved honest
state transition. This is an additional local implementation detail, not a
Runtime Contracts requirement.
