# FATES-SLICE-002 — Governed action handoff

## Status

Active. Activation is recorded in [`docs/decisions/FATES-SLICE-002-activation-decision.json`](../../docs/decisions/FATES-SLICE-002-activation-decision.json).

Activation authorizes only the approved implementation order. It does not mean
that the route is implemented, tested across real processes, complete, or
sealed.

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

Each later step requires the preceding producer checkpoint and handoff. No
checkpoint, lock, matrix, snapshot, completion claim, or seal status may
advance until the required producer-owned and cross-runtime evidence is
accepted.

## Acceptance evidence

The [frozen acceptance matrix](../../docs/reviews/FATES-SLICE-002-acceptance-evidence-matrix.md)
and its [machine-readable evidence contract](../../docs/decisions/FATES-SLICE-002-evidence-freeze.json)
remain authoritative. They require positive and negative evidence for
one-read/zero-read behavior, digest mismatch, canonical binding, readiness and
identity drift, timeout/indeterminate handling, correlation and producer-ID
preservation, no direct fallback, no non-Ananke fixture read, and explicit
bypass limitations. Mocks cannot prove the real route.

## Remaining limitations

No product implementation, implementation checkpoint, handoff packet, or real
three-process proof exists yet. The provisional Stage-A/Moirae status remains
unchanged, and attached component worktree drift is not substituted for the
locked starting checkpoints.
