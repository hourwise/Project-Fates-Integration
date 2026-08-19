# FATES-SLICE-004B / 004C governance remap

**Status:** GOVERNANCE REMAP PREPARED; NOT ACTIVATED

**Date:** 2026-08-19

**Decision classification:** `GOVERNANCE_REMAP_PUBLISHED_PENDING_CI`

## Decision

The prior conceptual labels are remapped to the canonical letter-qualified
children of the open numeric `FATES-SLICE-004` parent:

| Prior conceptual label | Canonical child | Capability | Governance meaning |
| --- | --- | --- | --- |
| `FATES-SLICE-003B` | `FATES-SLICE-004B` | Strict host/workload containment | First implementation and acceptance child after sealed 004A |
| `FATES-SLICE-004B` | `FATES-SLICE-004C` | Host-mediated governed effects | Successor child only after canonical 004B containment is accepted and closed |

The conceptual architecture and requirements are not discarded. The strict
Linux x86_64 / verified KVM / Firecracker + jailer / no guest NIC / constrained
vsock / host-side credential-custody profile remains the source design for
canonical 004B in
`docs/decisions/FATES-SLICE-003B-activation-decision-package.md`. The prior
004B readiness assessment remains the historical source for the host-mediated
effects capability, now addressed as canonical 004C.

This remap resolves the lifecycle mismatch identified by the stopped 003B
activation transaction: the repository schema derives a subslice's numeric
parent from its identifier, and the current open/provisional parent is
`FATES-SLICE-004`. A canonical containment child must therefore be 004B, not
003B. No canonical 003B child is created, and no old sealed state is reopened.

## Canonical progression

The current governance order is:

```text
003A-R1 (sealed)
    -> 004A (sealed)
    -> 004B containment (activate, implement, accept, close)
    -> 004C host-mediated effects (separate design, activate, implement,
       accept, close)
```

004A remains formally sealed and unchanged. 004B and 004C are future
letter-qualified children under numeric parent 004; neither exists or is
active in this remap transaction.

## Activation versus implementation and acceptance

The following ordering is normative and prevents an activation record from
being mistaken for an acceptance claim:

1. **Remap publication:** publish this decision, update current governance
   references, validate the schemas/order, and obtain green CI. This step does
   not create a child or change `active-slice.json`.
2. **004B activation:** in a separately authorized transaction, create the
   canonical child under `slices/004-governed-execution/subslices/` with
   `implementationStatus: planned`, `sealStatus: provisional`, and
   `activation.state: ready_for_activation`; record the exact decision,
   prerequisites, baseline, and component starting checkpoints. Only that
   transaction may then set the child to `implementationStatus: active`,
   `sealStatus: provisional`, `activation.state: active`, and set
   `activeSubsliceId: FATES-SLICE-004B` while keeping `activeSliceId:
   FATES-SLICE-004`.
3. **004B implementation:** after activation, Moirae and Integration may begin
   only the canonical containment implementation scope. Activation is not
   implementation, and it is not evidence that Firecracker, KVM, jailer,
   credentials, guest artifacts, or hostile-workload controls work.
4. **004B acceptance:** acceptance requires the immutable platform/artifact
   manifest, exact component checkpoints, dedicated KVM-capable environment,
   deterministic tests, process-heavy hostile matrix, independent host-side
   evidence, cleanup proof, full validation, and separately authorized
   harmless live acceptance where required. A green activation CI run is not
   containment acceptance.
5. **004B closure:** only a successful bounded acceptance basis, immutable
   evidence, provenance, full validation, green CI, owner closure, and the
   deterministic 004B seal transaction may set the child to
   `implementationStatus: completed`, `sealStatus: sealed`, and
   `activation.state: closed`. Closure does not activate 004C.
6. **004C gate:** only after canonical 004B is accepted and closed may a new
   owner-authorized 004C design/activation transaction define the first
   host-mediated effect, its route, target/resource scope, credential/effect
   custody, reconciliation, and acceptance matrix. 004C has its own
   activation, implementation, acceptance, closure, evidence, and CI gates.

The remap deliberately keeps activation and acceptance as separate gates:

```text
remap publication -> 004B activation -> 004B implementation ->
004B acceptance -> 004B closure -> 004C design/activation
```

No step may infer the next step's authorization or success.

## Ownership and boundaries

- **Integration** owns the canonical child records, active control, decision
  linkage, manifest/checkpoint control, validation, evidence integrity, and
  sealing transaction.
- **Moirae Code** owns the trusted host supervisor and containment boundary for
  canonical 004B. The existing conceptual package's architecture is not an
  implementation claim.
- **Ananke** remains the sole policy, approval, capability/effect, and
  consequential-action authority. A supervisor or broker may enforce an
  Ananke binding but may not mint or widen authority.
- **Horae** is not required for the first 004B containment proof and may only
  participate in a later 004C route under a separate decision.
- **Mnemosyne** remains outside execution authority and has no required 004B
  or 004C role.
- **Runtime Contracts** remains unchanged unless a separate neutral-contract
  gate proves a shared structural need.

Canonical 004B must preserve the accepted credential rule: the untrusted
workload receives no durable host credential or unrestricted reusable bearer
credential, and no host secret may cross through environment, files, argv,
handles, memory-visible stores, logs, telemetry, or evidence. Canonical 004C
may not weaken this boundary or turn a generic host proxy into authority.

## Control-state and artifact invariants

This remap changes no runtime or control state:

- `active-slice.json` remains the current 004A control state;
- `fates-lock.json`, compatibility matrix, and compatibility snapshots remain
  unchanged;
- no 004B or 004C `subslice.json` exists;
- no 004B or 004C seal record or tag exists;
- 004A's tag, evidence, and sealed record remain immutable; and
- no component repository or Runtime Contracts source changes.

The canonical 004B activation transaction must record exact source/component
pins and a platform/artifact manifest declaration. Runtime artifact slots may
remain deferred only where the accepted containment package explicitly allows
deferred immutable digest selection; fake digests and mutable `latest` inputs
are prohibited. Canonical 004C must select its own later checkpoints and must
not inherit 004B acceptance as effect acceptance.

## Stop conditions

The next transaction must stop without activation if the remap is not
published and CI-green, if the parent/child mapping is ambiguous, if a
required prerequisite is treated as post-acceptance work, if an activation
record is being used as containment evidence, if 004B is attempted under a
different numeric parent, or if 004C is treated as implicitly authorized by
004B activation or closure.

## Final disposition

**GO:** prepare and publish this governance remap and ordering clarification.

**NO-GO:** activate 004B or 004C in this transaction. Activation requires a
new owner-authorized transaction after this remap and its validation/CI are
published. Implementation, Firecracker/KVM execution, hostile-workload tests,
live acceptance, credentials, and 004C work remain out of scope.
