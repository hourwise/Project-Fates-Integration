# FATES-005C current candidate

`current-candidate.json` is the only current-candidate pointer. It resolves to
`compatibility-sets/fates-current-candidate-2026-08-27.json`; the historical
`fates-lock.json` and Stage-A compatibility set remain immutable history.

The selected operation is `governed.memory-admission`. A controlled Moirae
request is composed by Horae, preflighted and authorised by the pinned Ananke
runtime, verified and strictly admitted by Mnemosyne, then dispatched by Horae
to a deterministic in-process sink. The operation uses
`IDEMPOTENT_SAME_EFFECT`: an exact retry returns the prior result without a
second sink attempt, while a changed payload, caller, or scope fails closed.

The operation digest is SHA-256 over canonical, lexicographically ordered JSON
covering request/correlation identity, authenticated service, acting agent,
tenant, workspace, project, action, source/memory resource, destination and
input digest. The digest is carried in the operation envelope and joined smoke
evidence. Runtime Contracts receipts additionally bind content, source,
destination, context, issued/expiry times and the authenticated issuer.

The Integration repository entry uses a non-recursive control/operation
checkpoint. It cannot contain its own eventual commit hash. The final
publication commit is therefore recorded separately in the handoff/report;
the materializer verifies the five distinct runtime repositories and the
published Runtime Contracts artifact digest.

This candidate is provisional, unsigned, partial-runtime, not sealed, not
production-ready, not security-complete, not Firecracker/KVM accepted, and not
Qwen/model validated. Process-local replay state, external exactly-once
effects, guest isolation, jailer/vsock enforcement, credential custody and
network isolation remain outside this bounded vertical.
