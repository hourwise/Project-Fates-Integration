# FATES-SLICE-003B activation-decision package

**Status:** Activation-ready governance package; `FATES-SLICE-003B` is not
activated, implemented, or represented in `active-slice.json`.

**Date:** 2026-08-18

**Final classification:** `003B_ACTIVATION_READY`

**Governance remap:** This is the accepted conceptual containment package
originally labelled `FATES-SLICE-003B`. Its canonical Integration child is
now `FATES-SLICE-004B` under numeric parent `FATES-SLICE-004`, as recorded in
[`FATES-SLICE-004B-004C-governance-remap.md`](FATES-SLICE-004B-004C-governance-remap.md).
The package remains the source architecture and requirements for containment;
it does not create or activate a canonical child. The prior conceptual
host-mediated-effects successor is now canonical `FATES-SLICE-004C`.

## 1. Decision and scope

This package turns the accepted 003B containment concept and the owner’s
architecture decision into a bounded package for a later
activation/implementation transaction. The owner has selected one canonical
first profile; alternative profiles remain future portability/security-profile
work and do not weaken this first claim.

The package does not change `active-slice.json`, `fates-lock.json`, the
compatibility matrix/snapshot, any component repository, Runtime Contracts,
sealed 004A state, 004B state, or live-acceptance evidence.

## 2. Authoritative design intent

The following sources were inspected and reconciled:

- `docs/reviews/POST-003A-R1-003B-design-gate.md`;
- `docs/tasks/POST_SLICE_003A_READINESS.md`;
- `docs/reviews/POST-003A-final-external-review-synthesis.md`;
- `docs/reviews/POST-003A-code-grounded-reconciliation.md`;
- `slices/003-constrained-host-route/slice.json` and its Moirae handoff;
- `docs/design/FATES-SLICE-004-design-gate.md` and
  `slices/004-governed-execution/slice.json`;
- `docs/decisions/FATES-SLICE-004B-post-004A-readiness-assessment.md`;
- `active-slice.json`, `docs/checkpoint-policy.md`, and
  `docs/development-workflow.md`;
- `docs/SYSTEM_MAP.md`, `docs/INTEGRATION.md`, and
  `docs/REQUIREMENTS_TRACEABILITY.md`;
- Ananke architecture, threat-model, deployment-assumptions, and gateway
  contract documents;
- Horae ownership, supervision-state, and runtime-integration documents;
- Moirae trust-boundaries, extension-security, governed-path, and product
  architecture documents;
- Mnemosyne security and Stage-A integration-boundary documents; and
- Runtime Contracts ownership, design-gate, and protocol documents.

The accepted progression is:

```text
FATES-SLICE-003A-R1 (sealed)
        -> FATES-SLICE-004A (sealed)
        -> FATES-SLICE-003B (host containment)
        -> FATES-SLICE-004B (host-mediated governed effects)
```

003B was originally intended to prove a real trusted host/guest or equivalent
containment boundary for arbitrary developer-side user-space workload. It is
not a tiny function sandbox, a model-intent filter, or an Ananke replacement.
The workload may run shells, interpreters, compilers, build tools, Git, and
child processes inside its domain; escape to host authority or an ungoverned
effect path is the prohibited outcome.

The boundary deliberately leaves host-mediated developer effects and their
consequential capability/credential brokerage to 004B. It must not move
Ananke policy into a sandbox, make Horae an effect authority, make Mnemosyne an
authorization source, or turn Runtime Contracts into an implementation layer.

## 3. Normative security objective

Successful 003B MUST demonstrate, on one explicitly selected and pinned
platform profile, that:

> An untrusted developer-side workload can execute its declared bounded
> development workload inside a controlled domain, while it cannot directly
> exercise protected host capabilities, obtain durable host credentials or an
> unrestricted reusable bearer credential, escape the containment boundary,
> or bypass the trusted mediation path required for later governed effects.

This objective is a security claim about the selected profile and threat
assumptions. It is not a claim against unknown kernel, hypervisor, firmware,
hardware, or supply-chain zero-days.

### Required guarantees

003B MUST guarantee or fail closed on the following properties:

- **Process tree:** the supervisor owns the workload session; children and
  grandchildren remain in the same containment domain; detached, reparented,
  daemonized, scheduled, or service-created descendants cannot outlive the
  session unnoticed.
- **Filesystem:** only the declared guest/workspace and scratch surfaces are
  available; parent paths, devices, mounts, host workspace, browser/extension
  data, credential stores, symlink/hard-link/reparse escapes, and writable
  executable/configuration substitutions are denied or independently proven
  absent.
- **Environment and handles:** no ambient host environment, command-line
  secret, inherited descriptor/handle, Unix socket, shared memory object,
  device, or privileged control handle enters the workload.
- **Credentials:** durable credentials remain in Ananke/provider or a trusted
  broker boundary. No durable credential or unrestricted reusable bearer token
  enters workload environment variables, argv, files, memory, inherited
  handles, guest stores, logs, or evidence.
- **Temporary capability:** if a later effect requires a capability, it is an
  opaque, short-lived, audience/session/profile/action/resource-bound
  reference, single-use or replay-resistant, revocable, and invalidated on
  channel/session/process death. It returns a result, never a raw credential.
- **Network and IPC:** the strict first profile has no ordinary guest NIC and
  no DNS, proxy, metadata, private, link-local, IPv4, or IPv6 path. Only an
  explicitly mapped host-side channel can exist, and channel arrival is not
  authorization. Arbitrary localhost services, Ananke APIs, MCP servers,
  providers, and host daemons are unreachable unless a later governed path
  explicitly mediates them.
- **Supervisor/channel identity:** a launch-bound session/profile identity and
  channel binding are verified by the trusted supervisor and host-side
  evidence. A process name, public hash, localhost address, model assertion,
  or schema-valid receipt is not process authentication.
- **Authorization binding:** any later consequential request is bound to the
  Ananke decision, exact action/capability, canonical arguments, principals,
  scope, audience, session/profile identity, expiry, and replay state.
- **Failure and evidence:** unsupported primitives, profile drift, identity or
  channel mismatch, supervisor loss, malformed IPC, evidence loss, timeout,
  crash, and cleanup ambiguity fail closed. Host/kernel/supervisor evidence,
  not workload self-report, proves the result.
- **Shutdown and recovery:** normal and abnormal shutdown terminate all
  descendants within a bounded deadline. In-flight authorization/capability
  material is revoked or expires; no restart silently reuses stale session or
  capability state.

### Explicit nonclaims and 004B boundary

003B does not claim that every operating system is supported, that a guest or
kernel is free of unknown vulnerabilities, that a trusted channel authorizes
an effect, or that all future developer conveniences are available in the
strict profile. Git remotes, package registries, browser/extension access,
provider-network access, and host-mediated consequential effects are separate
profiles or 004B concerns. 003B does not prove provider-side exactly-once
execution, compensation, durable workflow semantics, memory provenance, or
global host governance outside the selected supervisor/containment domain.

## 4. Candidate containment profile and unresolved architecture

### Owner-selected canonical first profile

The authoritative first profile is:

`Linux x86_64 / pinned KVM / Firecracker + jailer / no guest NIC / constrained vsock`

The first proof would run on a dedicated pinned Linux runner or VM profile,
with an immutable Firecracker/jailer build, guest kernel and rootfs/image
digests, minimal device model, ephemeral guest storage, no host workspace
mount, no ambient credentials, fixed vsock-to-host-Unix-socket mapping,
seccomp/LSM/Landlock policy identities, cgroups v2, namespaces, and an
independent host evidence collector. KVM, kernel, VMM, profile, policy,
runner, or evidence-collector unavailability would fail closed. The current
Windows workstation cannot be evidence for this profile.

The following alternatives remain legitimate future profiles but do not define
the initial 003B claim:

| Option | Security/bypass posture | Testability and portability | Disposition |
| --- | --- | --- | --- |
| Firecracker microVM with no NIC and constrained vsock | Strong first boundary; hardware/guest boundary plus explicit host channel; still depends on pinned host, kernel, VMM, jailer, supervisor, and evidence collector | High deterministic falsifiability on pinned Linux; no current Windows proof; operationally heavier | **Canonical first profile** |
| gVisor or equivalent sandbox runtime | Layered defense and potentially lower startup cost; different kernel/API and configuration TCB | Linux-focused; requires independent proof of network, filesystem, process, and credential behavior | Viable alternative; not selected |
| Rootless OCI/container plus namespaces, cgroups, seccomp, Landlock | Lower friction and broad Linux tooling; weaker isolation claim and larger host-kernel/configuration bypass surface than a microVM | Easier CI integration; not accepted as sole hostile-code boundary without a new proof | Defense-in-depth or alternate profile only |
| Windows AppContainer/restricted token/Job Object profile | Potential Windows developer support; requires proof of reparse points, handles, child creation, IPC, and network policy | Matches current workstation but no accepted profile or host evidence exists | Separate future platform decision |
| Restricted child process, environment allowlist, ACLs, or localhost proxy alone | Cannot establish a defensible hostile-workload boundary; direct host/process/network/credential paths remain | Easy to run but not sufficient for 003B | Rejected as the sole boundary |

The owner decision resolves the architecture choice. The initial security
claim is scoped to supported Linux x86_64 hosts with verified KVM capability;
Windows, gVisor, rootless containers, WSL, and other weaker fallbacks are not
equivalent profiles and must fail closed if offered in the canonical path.

### Owner decision record

`OWNER_DECISION: Linux x86_64 / pinned KVM / Firecracker + jailer / no guest NIC / constrained vsock / host-side credential custody.`

The owner decision is authoritative for the first profile. It does not
activate 003B, create a canonical child record, or authorize implementation.

## 4.1 Runtime-artifact pinning strategy

The later activation transaction must carry an immutable platform manifest and
must refuse mutable “latest” inputs. The manifest is to be produced and
reviewed before implementation begins, with each entry recording source/release
identity, version, cryptographic digest, build provenance, license, and
verification command:

- Firecracker release/build and binary SHA-256;
- jailer release/build, patch source if any, and binary SHA-256;
- host Linux distribution/kernel, x86_64 architecture, KVM capability and
  runner identity;
- guest kernel and root filesystem/image SHA-256;
- guest init/agent and workload/image SHA-256;
- minimal device model and complete VM configuration digest;
- no-NIC network profile and constrained-vsock endpoint map;
- seccomp/LSM/Landlock policy identities and required ABI/features;
- cgroup/resource/process/cleanup policy;
- Moirae supervisor source/build commit and configuration digest; and
- Integration acceptance driver, evidence collector, and fixture hashes.

The manifest is a prerequisite artifact for the later activation/implementation
transaction, not a request to download or build those artifacts now. Any
digest, runner, policy, or configuration drift invalidates the profile and
requires a new checkpoint/acceptance decision. No historical 004A component
pin is treated as an automatic 003B runtime-artifact pin.

### Starting repository pins for the later transaction

The following are explicit starting references, not current lock changes:

| Repository | Role in first 003B proof | Starting reference |
| --- | --- | --- |
| Project-Fates-Integration | Control, acceptance orchestration, evidence, and seal | Final commit of this published decision package, recorded by the later activation transaction |
| Project Moirae Code | Primary trusted host supervisor/platform adapter | Sealed R1 checkpoint `bc7b984bd2eb0e0f07a1cd7259a8eab21556f097` (`moirae-fates-slice-003a-r1-v0.1.0-protocol-1.4.0`) |
| Project Ananke | Authority/effect boundary consulted by later governed paths; no first-proof provider effect | Sealed R1 checkpoint `dde9f74cbcfefea2176a6f0103e1f6b9064f4e64` (`ananke-fates-slice-003a-r1-v0.1.0-protocol-1.4.0`) |
| Project Horae | Explicitly out of first 003B proof | No new 003B pin; existing sealed R1 reference remains unchanged |
| Project Mnemosyne | Out of scope | No 003B pin |
| Runtime Contracts / Adrasteia | Neutral structural baseline only | Immutable package baseline `124b6aee2629a3147739934ad5f1b45b32c8ba46`, `adrasteia-adoption-v0.4.0-protocol-1.4.0` |

The later activation transaction must record the final Integration SHA and
confirm all selected repositories are clean at their exact references. It
must not update the global lock or matrix merely to prepare 003B; any lock or
compatibility advancement is a separate checkpoint/seal transaction.

## 4.2 Acceptance environment requirement

The authoritative process-heavy proof requires a dedicated Linux x86_64
environment with verified KVM capability, the pinned Firecracker/jailer
artifacts, the selected guest artifacts, host-side process/network/filesystem
observation, and an independent evidence collector. GitHub-hosted CI or the
current Windows workstation may run static, contract, fixture, and mock tests,
but cannot substitute for the canonical containment proof unless a separately
reviewed topology proves the exact requirements.

Nested virtualization, WSL, Docker, rootless containers, or a missing KVM
capability must produce a named unavailable/preflight failure; they must never
be reported as successful 003B containment.

## 4.3 Normative first-profile requirements

The following requirements are normative for the canonical first profile. A
later implementation or acceptance artifact MUST use these meanings; an
implementation that cannot demonstrate them is unavailable or failed and MUST
NOT be reported as contained.

| Domain | Normative requirement |
| --- | --- |
| Platform and artifacts | The host, KVM capability, Firecracker, jailer, guest artifacts, policies, supervisor, workload, and evidence collector MUST match the immutable activation manifest. Mutable `latest` inputs, unverified drift, and silent fallback MUST NOT be accepted. |
| Workload | The workload MUST be treated as arbitrary hostile code. Names, metadata, declared intent, and self-reported success MUST NOT establish trust. |
| Process tree | The supervisor MUST own launch, membership, resource limits, shutdown, and descendant reaping. A surviving or reparented descendant MUST fail the session and MUST block sealing. |
| Filesystem and mounts | The guest MUST use only the pinned rootfs/workspace and explicitly allowed mounts. Host paths, devices, symlink/hard-link/reparse escapes, and ambiguous descriptors MUST be denied or fail closed. |
| Environment and handles | The workload MUST receive a minimal explicit environment and only explicitly allowed handles. Host environment, inherited descriptors, control sockets, and host process handles MUST NOT cross the boundary. |
| Devices and resources | The VM MUST expose only the minimal declared device model and bounded CPU, memory, I/O, process, and file resources. Exhaustion or unsupported primitives MUST produce a named failure, never a fallback. |
| Network and IPC | The guest MUST have no NIC and MUST use only the fixed-purpose constrained-vsock channel. Direct host, localhost, metadata, private-network, provider, and arbitrary-vsock access MUST be denied. Generic host proxies MUST NOT be substituted. |
| Credentials | The workload MUST receive no durable host credential or unrestricted reusable bearer credential. Credential material MUST NOT appear in guest files, environment, argv, memory-visible stores, inherited handles, logs, telemetry, or evidence. |
| Channel identity | Every channel message MUST bind the session ID, supervisor launch nonce, profile digest, workload/artifact digest, sequence/causation data, request digest, and purpose. URL knowledge or copied public identifiers MUST NOT authenticate a peer. |
| Authorization binding | A supervisor MUST enforce an already-issued Ananke binding and MUST NOT mint, reinterpret, widen, or persist authority. The trusted channel MUST NOT be treated as authorization. |
| Failure and shutdown | Channel loss, supervisor loss, child crash, profile drift, evidence loss, parser failure, or cleanup ambiguity MUST revoke temporary capability state and fail closed. |
| Evidence | Acceptance MUST use independent host-side lifecycle/process/network/filesystem observations and immutable sanitized evidence. Missing, delayed, ambiguous, or secret-bearing evidence MUST block release and sealing. |
| Consequential effects | The first proof MUST be harmless and no-provider. No external effect, provider call, or host consequential action may be used to claim containment. |

## 5. Proposed trusted supervisor and channel contract

The following is a decision-ready contract for owner review, not current
implementation:

- **Moirae Code** owns the trusted developer-host supervisor and the selected
  platform adapter. It constructs and verifies the immutable profile, launches
  and stops the workload, removes ambient resources, establishes the session
  channel, and collects host-side lifecycle evidence. Its current supervisor,
  sandbox, network-broker, secret-broker, and local-IPC code is scaffolded and
  cannot be cited as 003B enforcement.
- **Ananke** remains the only authority for policy, approval, capability/effect
  admission, provider use, and consequential action audit. A supervisor or
  broker may enforce Ananke's already-issued binding but may not mint or
  reinterpret authority.
- **Horae** is excluded from the first 003B proof. 003B needs a host
  containment boundary, not orchestration. Horae may participate in a later
  004B route only when its exact freshness/relay role is separately authorized.
- **Integration** owns exact checkpoint control, decision records,
  deterministic validation, acceptance orchestration, and independent evidence
  verification. It is not on the runtime effect path.
- **Mnemosyne** is out of scope. Memory, provenance, remembered approvals, and
  state handles cannot authorize containment or effects.
- **Runtime Contracts** remains neutral structure only. Identity, capability,
  lifecycle, correlation, and references do not authenticate a process,
  authorize an effect, persist a capability, or prove containment.

The proposed channel is one fixed-purpose host-side Unix-socket endpoint
mapped from a constrained vsock port. It is not a generic forwarding socket
and not an Ananke API. Every message carries a session ID, supervisor launch
nonce, profile digest, workload/artifact digest, sequence/causation data,
canonical request digest, and—only for a later effect path—an Ananke decision
reference. The supervisor verifies launch membership, socket ownership,
profile/session binding, freshness, replay state, and exact purpose before
forwarding anything. A second local process cannot impersonate the session by
knowing a URL or copying a public identifier. Channel disconnect, supervisor
loss, child crash, or profile drift invalidates the session and all temporary
capabilities.

This model deliberately says `trusted channel != authorization`.

## 6. Credential-custody decision

The normative custody rule is:

> The untrusted workload never receives a durable host credential or an
> unrestricted reusable bearer credential capable of bypassing the trusted
> supervisor/Ananke mediation path.

Durable credentials may exist only in the Ananke/provider custody boundary or
an explicitly trusted broker operated outside the workload. They must not be
persisted in the guest, mounted from the host, placed in environment variables,
argv, files, memory-visible stores, inherited handles, crash dumps, logs,
telemetry, or evidence. Test fixtures use non-secret sentinels only.

The first strict profile should require **no credentials at all**. A later
004B profile may use an opaque temporary capability with exact action,
resource, audience, profile/session, expiry, nonce/replay, and revocation
binding. It is invalidated on process death, supervisor loss, profile drift,
or authorization cancellation. Ananke remains the authority for issuing or
consuming the corresponding effect decision.

No Runtime Contracts change is required for 003B as presently defined. The
existing portable identity, scope, lifecycle, correlation, and reference
families are sufficient as structural metadata and must not be stretched into
credential or authority semantics. If a future 004B implementation proves a
neutral opaque-capability envelope is needed, that is a separately gated
Runtime Contracts design and compatibility checkpoint; it is not part of this
package.

## 7. Threat and failure model

The attacker is arbitrary code inside the bounded workload, including a
prompt-injected or compromised tool, dependency, interpreter, extension,
helper, or child process. Process names, declared tool metadata, model intent,
and workload assertions are untrusted.

| Threat / failure | Prevented by | Detected by | Result | Evidence | Deterministic? |
| --- | --- | --- | --- | --- | --- |
| Read parent environment or mounted config | Clean environment; no host mounts; guest profile | Launch inventory and secret-sentinel probe | Denied; session invalid if exposed | Host launch manifest and sentinel result | Yes on pinned profile |
| Read credential files, stores, argv, or proc metadata | No credential material in guest; isolated image/workspace | Host/guest path probes and redacted inventory | Denied; no real secret recorded | Host filesystem/process evidence | Yes with non-secret sentinels |
| Traverse parent path, device, mount, symlink/hard-link/reparse escape | Guest rootfs, scoped workspace, mount policy, descriptor hygiene | Canonical path and host mount observation | Denied; fail closed on ambiguity | Host mount/path evidence | Yes per platform |
| Spawn arbitrary child, daemon, reparent, or service | Supervisor-owned process/session boundary and resource policy | Process-tree sampling and termination join | Child remains in domain or launch denied | Host process-tree evidence | Yes on pinned profile |
| Invoke shell, PowerShell, alternate interpreter, or host command | Arbitrary development tools allowed only inside guest; no host executor/escape | Host process and effect inventory | In-domain execution allowed; host escape denied | Process lineage and effect evidence | Yes for declared workload |
| Connect to Ananke, MCP, provider, localhost, metadata, or private network | No guest NIC; fixed channel map; deny-by-default network | Host/kernel socket capture and policy logs | Denied; no ungoverned effect | Host network evidence and Ananke no-dispatch record | Yes on strict profile |
| Use unauthorized vsock port or socket | Fixed purpose map and socket ownership/session binding | Supervisor endpoint audit | Malformed/incompatible; no forward | Endpoint and message evidence | Yes |
| Impersonate supervisor or reuse sibling session | Launch-bound nonce, profile digest, channel ownership, replay checks | Identity/session comparison | Rejected before mediation | Session binding and denial evidence | Yes |
| Replay stale authorization/capability | Expiry, nonce, sequence, audience, action/resource/profile binding | Ananke and supervisor replay ledger | Rejected; no effect | Decision/capability rejection | Yes |
| Bypass Ananke through a helper or raw provider API | No provider credential; no host API reachability; exclusive mediation | Host process/socket/effect inventory and Ananke audit | Denied; no consequential effect | Independent path inventory | Yes for declared paths |
| Supervisor or channel crash | Session revocation and no fallback to ordinary host process | Health/exit/watchdog observation | All in-flight capability material invalid; fail closed | Crash, revocation, cleanup evidence | Yes |
| Child crash during authorization or dispatch preparation | Durable session state; no capability release before binding | Supervisor/Ananke transition evidence | No authorization release; later retry requires fresh decision | Lifecycle and decision references | Yes |
| Cleanup race or descendant survives shutdown | Kill/reap policy, bounded grace, process-tree verification | Independent post-shutdown process scan | Session fails; no seal/acceptance success | Cleanup evidence and named failure | Yes on pinned runner |
| Process/port/file exhaustion | cgroup/resource limits and bounded admission | Host resource and supervisor telemetry | Named unavailable/timeout; no fallback | Resource-limit evidence | Yes |
| Malformed IPC or evidence exfiltration | Strict schema/size/redaction checks; no raw secrets | Parser, sanitizer, evidence validator | Malformed; channel/session invalidated | Sanitized rejection record | Yes |
| Evidence collector unavailable or delayed | Synchronous evidence gate before consequential release | Collector health/readiness | Release denied; no claim of containment | Collector gate evidence | Yes |
| Secret exfiltration through logs/evidence | Sanitizer removes/rejects secret sentinel; no raw value retained | Evidence scan and hash | Evidence rejected; no seal | Evidence scan and hash | Yes |

Security invariants (no host credential, no bypass, no escape, identity and
authorization binding) are distinct from availability guarantees (startup
latency, throughput, cleanup speed). A slow or unavailable profile may fail
closed; it must not weaken a security invariant.

## 8. Responsibility matrix

| Responsibility | Integration | Ananke | Moirae Code | Horae | Mnemosyne | Runtime Contracts |
| --- | --- | --- | --- | --- | --- | --- |
| Select/record profile and threat model | Owns decision/evidence | Consulted for effect boundary | Primary platform owner | Not required in first proof | Out | Structural references only |
| Trusted workload launch | Verifies checkpoint/evidence | No | Owns supervisor and platform adapter | No | No | No |
| Process/filesystem/network/IPC enforcement | Validates independent proof | No | Owns enforcement and host evidence | No | No | No |
| Policy/approval/effect authority | Verifies cross-owner claim | Sole owner | Enforces binding; cannot authorize | No | No | No |
| Credential custody | Verifies absence/evidence | Owns provider/effect custody | Keeps credentials outside workload | No | No | Carries references only |
| Route/orchestration | Acceptance orchestration only | No | Host boundary only | Excluded from first proof | No | Descriptive shapes |
| Memory/provenance | Scope check | No | No | No | Sole owner of memory semantics | No |
| Acceptance and sealing | Sole Integration owner | Component evidence | Component evidence | Not involved initially | Not involved | Schema validation only |

## 9. Activation-ready 003B subslice contract

No canonical 003B subslice artifact exists today. The following contract is
ready to instantiate in the separate activation transaction; instantiation is
not performed by this preparation/finalization task:

| Field | Proposed value |
| --- | --- |
| Identifier | `FATES-SLICE-003B` |
| Parent | `FATES-SLICE-003` |
| Title | Host containment and governance bypass resistance |
| Purpose | Prove one selected pinned platform profile can run an arbitrary bounded developer workload while preventing host credential access, host escape, direct consequential paths, and unauthorized process/channel reuse. |
| Predecessors | Sealed `FATES-SLICE-003A-R1`; sealed `FATES-SLICE-004A`; owner-selected canonical Firecracker profile. |
| In-scope repositories | Moirae Code (primary supervisor/platform owner) and Project-Fates-Integration (control/evidence). Ananke is a required authority/evidence consumer; Horae is not in the first proof. |
| Out of scope | 004B effects, provider credentials/effects, generic host proxying, memory/provenance, Mnemosyne, Horae route implementation, Runtime Contracts source changes, all unsupported platforms, and live external effects. |
| Initial state | `planned` / `provisional`; activation `ready_for_activation` only in the separate owner activation transaction. |
| Required pins | Exact host/kernel/architecture/KVM, VMM/jailer, guest artifacts, policy profiles, supervisor, channel map, workload, evidence collector, and all changed component commits. |
| Invariants | No ambient credentials; no ungoverned host path; no fallback; exact profile/session/channel binding; descendant cleanup; fail closed on drift or evidence loss. |
| Validation | JSON/control validators, component tests, pinned-profile process-heavy hostile matrix, independent host evidence, full Integration validation, green CI. |
| Acceptance | Positive contained workload plus the adversarial rows in Section 10; every denial and cleanup result independently evidenced. |
| Seal | Successful bounded acceptance, immutable evidence hashes, exact provenance, full validation, green CI, owner closure, and deterministic 003B tag under the generic subslice contract. |
| Successor | 004B may be separately designed/activated only after 003B is accepted and closed; 003B does not activate 004B. |

## 10. Deterministic acceptance matrix

The following matrix is the minimum RED contract for the later implementation
transaction. “Ordinary” means a non-process-heavy unit or fixture test.
“Process-heavy” means real supervisor/guest/host observation on the pinned
Linux profile.

| ID | Fixture / action | Expected observation and failure state | Evidence | Class |
| --- | --- | --- | --- | --- |
| 003B-POS-01 | Pinned profile and authorized harmless workload | Workload starts only through the supervisor; declared workspace and tools work | Profile manifest, launch membership, workload result | Process-heavy |
| 003B-POS-02 | Declared file/scratch/process actions | Allowed in-domain operations succeed; no host path is exposed | Host mount/process inventory | Process-heavy |
| 003B-POS-03 | Valid supervisor channel message | Exact session/profile/purpose message reaches the mediation boundary | Channel receipt and supervisor audit | Process-heavy |
| 003B-POS-04 | Normal shutdown with child/grandchild | All descendants terminate and are independently absent by deadline | Process-tree and cleanup record | Process-heavy |
| 003B-NEG-01 | Direct Ananke/provider/effect HTTP or raw socket | Unreachable or denied; Ananke records no unbound dispatch | Host socket capture plus Ananke audit | Process-heavy |
| 003B-NEG-02 | Credential sentinel in host env/file/store | Sentinel unavailable; no credential enters workload | Redacted host inventory and guest probe | Process-heavy |
| 003B-NEG-03 | Forbidden env/argv/descriptor/handle | Absent or access denied | Launch manifest and probe result | Process-heavy |
| 003B-NEG-04 | Parent path, device, mount, symlink/hard-link/reparse escape | Denied; no host inode/device is reachable | Host filesystem/mount evidence | Process-heavy |
| 003B-NEG-05 | IPv4/IPv6/DNS/proxy/metadata/private/local service | Denied under no-NIC strict profile | Host/kernel network evidence | Process-heavy |
| 003B-NEG-06 | Unauthorized vsock port or socket | Rejected as malformed/incompatible; no forward | Endpoint map and denial event | Ordinary + process-heavy |
| 003B-NEG-07 | Sibling process reuses another session ID/nonce | Rejected; no cross-session capability | Session binding evidence | Ordinary + process-heavy |
| 003B-NEG-08 | Stale, replayed, wrong-audience, wrong-profile capability | Rejected before mediation/effect | Capability/Ananke rejection record | Ordinary |
| 003B-NEG-09 | Operation/resource mismatch | Rejected; no authorization widening | Canonical binding and denial | Ordinary |
| 003B-NEG-10 | Shell/helper/alternate MCP/provider path | Remains in-domain or is denied; no host effect | Process/effect inventory | Process-heavy |
| 003B-NEG-11 | Supervisor crash or channel disconnect | Session revoked; no fallback; in-flight capability invalid | Crash, revocation, cleanup evidence | Process-heavy |
| 003B-NEG-12 | Child/grandchild crash during authorization | No capability release and no effect | Lifecycle and decision evidence | Process-heavy |
| 003B-NEG-13 | Detached child/daemon/service/cleanup race | Acceptance fails if any descendant survives the hard deadline | Independent post-shutdown scan | Process-heavy |
| 003B-NEG-14 | Malformed/oversized IPC | Fail closed without parser confusion or secret-bearing log | Sanitized rejection | Ordinary |
| 003B-NEG-15 | Process/port/file exhaustion | Bounded named unavailable/timeout; no ordinary-host fallback | Resource and supervisor telemetry | Process-heavy |
| 003B-NEG-16 | Evidence collector loss or delayed evidence | Consequential release denied; containment not claimed | Collector readiness gate | Process-heavy |
| 003B-NEG-17 | Secret exfiltration through logs/evidence | Sanitizer removes/rejects secret sentinel; no raw value retained | Evidence scan and hash | Ordinary |

Every row must declare its falsifier, cleanup result, expected exit/failure
code, and whether the result is a security invariant or availability result.
The workload's own report is never sufficient evidence.

## 11. Live-acceptance plan

No provider-side or destructive external effect is necessary for 003B. The
first profile should use a harmless workload, canary files, non-secret
sentinels, isolated sockets, and host-side process/network/filesystem
instrumentation. However, deterministic in-process tests cannot prove kernel,
VMM, host process, or network containment. The hostile rows marked
process-heavy therefore require one separately owner-authorized acceptance
attempt on the pinned Linux profile before seal.

That later attempt must declare:

- exact profile/runner and workload hashes;
- owner authorization and attempt number;
- no real credentials and no provider-side effect;
- fixed ports/sockets and disposable guest/workspace state;
- bounded startup, action, evidence, and cleanup deadlines;
- no automatic retry; a consumed attempt is never reused;
- `PASS_BOUNDED`, `FAIL_BOUNDED`, or `INCOMPLETE` terminal classification;
- immutable JSON/journal evidence with secret/path sanitization; and
- an abort plan for profile drift, unsupported KVM, supervisor loss,
  evidence loss, or residual descendants.

No live acceptance is authorized or executed by this preparation transaction.

## 12. Performance and developer-friction budget

These are measurable owner-review targets, not current evidence or silently
accepted requirements:

| Phase | Proposed target on the pinned runner | Hard safety bound |
| --- | --- | --- |
| Cold profile/session startup | p95 <= 10 s | fail closed at 30 s |
| Warm session handshake/channel binding | p95 <= 500 ms | fail closed at 2 s |
| Per-operation security gate after a warm session | p95 <= 250 ms excluding provider work | fail closed at 1 s |
| Normal shutdown and descendant reap | p95 <= 5 s | acceptance failure at 15 s |
| Crash cleanup | p95 <= 10 s | no seal success with residual descendants |

The later benchmark must report p50/p95/p99, CPU, memory, I/O, concurrency,
deny-path cost, evidence durability, and unsupported-profile rate for cold and
warm sessions. A long-lived session may amortize startup, but drift, restart,
channel loss, and profile changes invalidate cached identity checks. Security
controls may not be weakened to meet these targets.

## 13. Activation prerequisites and stop conditions

Before a later transaction may set `003B` active, all of the following must
be true:

1. The owner-selected canonical profile and Linux x86_64 platform scope are
   recorded as the authoritative architecture decision.
2. The threat model, TCB, credential rule, channel contract, acceptance matrix,
   performance budget, and residual-risk statement are accepted.
3. The canonical 003B subslice record is created as planned/provisional with
   explicit prerequisites and no seal record.
4. Exact platform, policy, workload, supervisor, evidence-collector, and
   component checkpoints are pinned; no dependency is a mutable branch head.
5. The Runtime Contracts status is explicitly recorded as unchanged, or a
   separately approved neutral-contract gate is completed first.
6. Moirae and Integration owners accept their boundaries; Ananke confirms the
   authority/effect interface; Horae and Mnemosyne are explicitly excluded
   from the first proof.
7. RED tests and process-heavy acceptance fixtures are present and validated.
8. The parent/control state is clean and no 004A/004B invariant is altered.
9. A separate explicit owner activation decision records scope, starting
   checkpoints, acceptance criteria, and authorization.

Implementation must stop if containment is unavailable on the required
platform, a child reaches a host credential or direct effect path, supervisor
or channel identity cannot be authenticated, descendants cannot be reaped,
the required primitive is unavailable in CI, evidence is ambiguous, a generic
host proxy is needed, a new credential protocol is invented, or a neutral
Runtime Contracts change becomes necessary without its own gate.

## 14. Recommended later implementation sequence

This sequence is not authorized by this package:

1. Create the planned/ready-for-activation 003B record from this package.
2. Add RED governance, profile-manifest, credential, channel, and acceptance
   fixtures.
3. Implement the Moirae supervisor skeleton and pinned-profile verification.
4. Implement contained launch, environment/credential removal, and filesystem
   policy.
5. Implement process-tree ownership, resource limits, and bounded cleanup.
6. Implement authenticated session/channel identity and strict IPC parsing.
7. Add Ananke binding checks without moving policy authority into Moirae.
8. Run deterministic ordinary tests, then pinned-profile process-heavy hostile
   tests.
9. Run the separately authorized harmless live containment acceptance if the
   owner still requires it.
10. Produce exact component handoffs, Integration evidence, full validation,
    CI, closure, and the deterministic 003B seal tag.
11. Only after 003B closure, prepare a separate 004B design/activation gate.

## 15. Final decision

The owner decision has resolved the containment mechanism and supported first
platform. The package now establishes the canonical profile, platform scope,
ownership, credential custody, channel model, runtime-artifact pinning
strategy, KVM-capable acceptance environment, deterministic/process-heavy
acceptance matrix, prerequisites, and stop conditions. It is ready for a
separate activation transaction; no activation or implementation occurred
here.

**Final classification: `003B_ACTIVATION_READY`.**

**GO/NO-GO for a separate 003B activation/implementation transaction:
GO, provided the later transaction instantiates the planned child, records the
exact manifest/checkpoints, and obtains its separate activation authorization.
