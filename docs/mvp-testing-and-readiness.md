# Fates MVP testing and readiness

This is the handoff test plan for external testers. It separates the parts that are already
executable on the current Windows workspace from the Linux/KVM claims that still require the
target environment.

## Current executable baseline

- Runtime Contracts `0.5.0` contains the accepted Content Surface Preflight contract and passes
  its package validation (schema, typecheck, fixtures, packed-package checks).
- Ananke has the source-aware scanner, destination exposure caps, shared receipt factory, and
  focused policy/preflight coverage. Its receipt is consumed by the Mnemosyne verifier.
- Mnemosyne has receipt-gated admission, deterministic idempotency, staging/quarantine isolation,
  audit history, and the released-contract verifier.
- Horae now owns a transport-neutral governed route with composition, preflight, admission,
  execution, idempotency, cancellation, timeout, and explicit recovery states.
- Moirae has the fixed-session constrained-vsock dispatcher, a bounded guest agent, scoped
  credential delivery, and a Moirae-originated request envelope. The extension has an initial
  Moirae theme, icon, and governance-status command.
- Integration has two executable smokes: the Ananke → receipt → Mnemosyne boundary and the
  Moirae → Horae → Ananke → receipt → Mnemosyne route.

## Tests still required

| Test group | What it must achieve | Pass condition |
| --- | --- | --- |
| Release and package provenance | Verify the immutable Runtime Contracts tag, tarball digest, package-lock pins, and no mutable branch URLs | Fresh install resolves the tagged package and the calculated digest matches the release record |
| Source-aware scanner corpus | Exercise plain text, JSON, PDF/ELF/PE signatures, nested archives, path traversal, encrypted archives, secrets, prompt-injection text, scripts/macros, hidden characters, oversized content, and parser failures | Every case yields the expected bounded flags/outcome; raw or disallowed surfaces never escape |
| Destination enforcement | Request full exposure to Mnemosyne, model/context, export, and unknown destinations | Policy never grants more than the destination cap; external/export paths remain derived-only |
| Receipt and admission | Verify malformed, stale, wrong-path, wrong-hash, unsupported-contract, missing-signature, and valid receipts | Invalid evidence is quarantined or rejected; only a valid source-bound receipt can reach ADMITTED |
| Idempotency and replay | Repeat the same admission and governed request, then retry a staged record | Replays return the original result without duplicate memory/audit writes; retries keep candidate identity and increment attempt |
| Cross-Fate route | Run the non-fixture governed smoke from fresh component builds | The route reaches completed with received → composed → preflighted → admitted → executing → completed, and no raw content appears in the report |
| Guest workload | Run the guest agent over a real vsock transport with a bounded command, malformed frames, unknown methods, concurrent starts, and cancellation | Only allowlisted methods execute; frames are bounded; cancellation reaches the workload; unknown/malformed input fails closed |
| Linux/KVM containment | Launch the pinned Firecracker profile on Linux x86_64 with no guest NIC and constrained vsock | Guest cannot reach the host filesystem/network outside the declared channel; host evidence proves VM boundary and cleanup |
| Hostile process | Attempt fork/resource exhaustion, signal abuse, path traversal, device access, network access, and guest-to-host escape | Limits and cleanup hold; no host process or credential escape occurs |
| Timeout/recovery | Hang preflight, admission, and workload stages; cancel before and after dispatch; recover a staged route | No stage hangs indefinitely; terminal state is explicit; only authorized retry paths recover |
| Credential isolation | Deliver a one-shot scoped credential while observing host, guest, logs, failures, and cancellation | The host retains custody; the guest receives only the scoped value once; it is absent from reports and after cleanup |
| Provenance/replay audit | Correlate request, decision, receipt, admission, workload, and cleanup records | Every record binds to the same correlation/idempotency identity and is replay-verifiable without secrets |
| Standalone/operator install | Install Ananke, Mnemosyne, Horae, Moirae, Runtime Contracts, and all together using the operator wrappers | Each selected Fate reports its own validation command and fails clearly when a sibling is absent |
| External tester UX | Run JSON and human operator reports on a clean machine and inspect the Moirae extension status surface | A tester can identify missing checkouts, failed gates, and unsupported Linux claims without reading source |

## MVP blockers and remaining order

1. Publish the `project-runtime-contracts@0.5.0` tarball as the immutable GitHub release asset;
   the repository commit/tag can be prepared locally, but the current GitHub CLI credential is
   invalid for hosted release creation.
2. Run the Linux/KVM containment and hostile-process acceptance matrix.
3. Replace the transport-neutral integration smoke with the real Horae/Moirae process transport
   and real guest workload launch in the target deployment.
4. Add production signature verification for receipts if the deployment requires signed receipts;
   the current Mnemosyne adapter validates structure, freshness, source binding, and an explicit
   signature-presence requirement, but does not claim cryptographic signature verification.
5. Add destination-specific scanners/enforcement for any export/provider connectors introduced
   after the current MVP route.

The current JSON/human operator reports are sufficient for the first external testing round:
they expose checkout, branch, HEAD, dirty state, validation commands, and route identifiers while
redacting content and credentials. A full dashboard should wait until testers demonstrate that
these surfaces cannot explain a failure; adding a web UI before the runtime boundary is proven
would increase packaging and deployment surface without improving the MVP claim.

## VSCodium reskin seam

The current safe seam is the Moirae extension: product name, activity-bar icon, theme, status
command, and governance views are already isolated from the upstream editor. For a distributable
VSCodium fork, the next work should be a separate product-branding layer covering `product.json`,
update URLs, extension gallery policy, default settings, crash/telemetry defaults, legal notices,
and the installer artifact. Keep the governance extension as the authority-aware surface and do
not put policy or credential custody into renderer/theme code. The fork should be smoke-tested as
an installer, with extension activation, offline mode, workspace scope, and an explicit display of
unsupported direct terminal/third-party-extension paths.
