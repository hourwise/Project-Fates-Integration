# FATES-SLICE-002 — Governed action handoff

## Status

Completed and sealed on 2026-08-09. Activation is recorded in
[`docs/decisions/FATES-SLICE-002-activation-decision.json`](../../docs/decisions/FATES-SLICE-002-activation-decision.json),
and final acceptance is recorded in
[`docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json`](../../docs/evidence/FATES-SLICE-002-live-acceptance-2026-08-09.json).

The approved implementation order, owner checkpoints, live evidence, and
post-seal validations are complete for the bounded Slice 02 claim. This seal
does not claim global Moirae governance, a Moirae process proof, or any
excluded capability.

## Approved scope

The only action is `fates.slice02.inspect-fixed-fixture.v1`, with exactly
`fixtureId` and `expectedSha256` arguments. The route is:

```text
Moirae constrained host -> Horae handoff/relay -> Ananke authority and sole physical reader
```

The approved transport is separate local processes over loopback HTTP. Ananke
owns the fixed fixture, performs at most one physical read, verifies the
post-read digest, and emits the authority evidence. Horae verifies and relays;
Moirae originates and presents typed evidence; Integration remains
evidence-only.

No Runtime Contracts package or protocol change is approved. Mnemosyne,
content preflight, persistence, retry, provider fallback, credentials,
browser, shell, workflow, arbitrary filesystem access, direct
Moirae-to-Ananke fallback, and global host governance are excluded.

## Starting baseline

The exact starting baseline is `fates-stage-a-2026-07` from `fates-lock.json`.
The activation record copies all five exact checkpoint entries. Stage A remains
`inspection_only` and `provisional`. Moirae Code remains a pushed but untagged
checkpoint and is not represented as sealed.

## Implementation order

1. Integration evidence freeze
2. Ananke bounded adapter
3. Horae handoff/relay
4. Moirae constrained host
5. Integration real proof

Each implementation step was bound to the preceding producer checkpoint and
handoff. The final tagged Ananke and Horae checkpoints are recorded in
`fates-lock.json` and the successor compatibility snapshot.

## Acceptance evidence

The [frozen acceptance matrix](../../docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md)
and its [machine-readable evidence contract](../../docs/decisions/FATES-SLICE-002-evidence-freeze.json)
remain authoritative. They require positive and negative evidence for
one-read/zero-read behavior, digest mismatch, canonical binding, readiness and
identity drift, timeout/indeterminate handling, correlation and producer-ID
preservation, no direct fallback, no non-Ananke fixture read, and explicit
bypass limitations. Mocks cannot prove the real route.

## Remaining limitations

Final handoffs are in `handoffs/ananke-transport-handoff.json` and
`handoffs/horae-handoff.json`. The live acceptance record preserves the
distinction between live verified behavior, owner-local deterministic tests,
and behavior not induced live. The global compatibility set remains
provisional because the unchanged locked Moirae checkpoint is still
`pushed_untagged`; this does not reopen or alter the sealed Slice 02 claim.

The next permitted action is separate review and authorization of Slice 03.
