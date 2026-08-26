# POST-003A R1 / 003B DESIGN GATE

**Status:** proposed design only; owner approval required before R1
activation; FATES-SLICE-003B remains paused.

`active-slice.json`: `status: idle`, `activeSliceId: null`.

**Parent synthesis:**
[`POST-003A-final-external-review-synthesis.md`](POST-003A-final-external-review-synthesis.md).

**Historical implementation/evidence basis:** accepted CODE_GROUNDED
reconciliation at `6906ab6a1cc24825340e241c07221e78f35ef845`.

No component source, Runtime Contracts schema, lock, matrix, compatibility
snapshot, sealed evidence, tag, credential, Defender setting, execution
policy, or containment software is changed by this design gate.

## 1. Workload and security property

The future Moirae containment profile is not a tiny function sandbox. The
hostile workload may legitimately run arbitrary user-space development
activity inside the boundary:

- shell and interpreters;
- Node, Python, Rust, C, and C++ toolchains;
- build systems and test runners;
- Git and package tooling;
- arbitrary project code and child processes.

The required distinction is:

> Arbitrary code execution inside the containment domain is expected. Escape
> from the containment domain is not permitted.

The first profile must prevent the workload from obtaining host credentials,
host process authority, host filesystem reach, direct Ananke authority,
unmediated provider authority, arbitrary external network egress, unauthorized
host IPC, or alternate consequential paths. It must not globally ban the
tools that make a coding agent useful merely because those tools can be
abused in an uncontained host.

## 2. R1 design gate

### Proposed identifier

`FATES-SLICE-003A-R1 — Reproducibility and route-identity remediation`

**State:** `PROPOSED — OWNER APPROVAL REQUIRED BEFORE ACTIVATION`.

### Bounded R1 scope

1. Track and version the Horae HTTP route host around the existing sealed
   relay semantics. Do not reuse the temporary wrapper as an authority source;
   preserve one route and no fallback.
2. Repeat acceptance with `ANANKE_DEVELOPMENT_MODE` disabled and an ephemeral
   test execution authenticator supplied out-of-band. No credential value may
   enter source, logs, evidence, or acceptance output.
3. Add an allowlist projection so producer fields cannot overwrite
   broker-owned projected fields.
4. Add inspection, readiness, dispatch, and action deadlines with cancellation
   and bounded child/process cleanup. A peer that accepts a connection and
   never completes inspection must produce a named fail-closed result.
5. Add application-level request identity with audience/channel binding,
   freshness, nonce/attempt identity, and a single-use/replay decision
   appropriate to the bounded route. Do not call this OS-authenticated origin.
6. Repeat reproducible real-process acceptance and add the qualification to
   the post-seal record without changing historical evidence.

### R1 non-goals

R1 does not implement a trusted supervisor, guest VM, host/guest launch
attestation, OS containment, provider NetworkBroker, platform credential
keychain, arbitrary sandbox execution, broad privileged-import linting, or
supply-chain transparency. Those belong to 003B or later unless an owner
explicitly revises the gate.

## 3. R1 versus 003B identity decision

The recommended split is:

| Identity property | R1 | 003B |
| --- | --- | --- |
| Request freshness and replay-safe application identity | Implement for the bounded route | Preserve and bind to the containment session |
| Tracked route-host identity | Implement and reproduce | Consume as one input to the supervisor profile |
| Acceptance-harness PID correlation | Report truthfully as correlation | Replace/augment with supervisor-observed launch membership |
| OS-authenticated process origin | Do not claim | Own through trusted supervisor/host boundary |
| Host/guest channel identity | Do not simulate with a cosmetic hash | Bind to the trusted supervisor launch and measured/pinned artifact |
| Artifact-bound producer attestation | Do not claim | Evaluate measured/pinned executable or image identity |

This split avoids creating an R1 mechanism that falsely claims to solve the
same trust problem that 003B's supervisor/channel boundary must solve. R1 may
make the route reproducible and replay-safe at the application layer; it must
state that true launch/channel identity is deferred.

## 4. Proposed strict 003B profile

### Profile

`Linux x86_64 / KVM / Firecracker / no guest NIC / constrained vsock strict proof profile`

This profile remains proposed. It is not evidence that the current Windows
workstation or any current Fates repository implements containment.

### Required pinned inputs

- dedicated Linux host OS and kernel profile;
- x86_64 architecture, KVM availability, microcode/firmware assumptions, and
  runner identity;
- approved Firecracker build and digest;
- reviewed/hardened jailer build and digest, with any patch source and digest;
- guest kernel hash and rootfs/image hash;
- minimal Firecracker device model and configuration;
- no host filesystem share and no direct host-workspace mount;
- ephemeral guest disk/workspace copy or preloaded image;
- no ambient credentials, browser stores, host extension directories, or
  inherited host descriptors;
- no ordinary guest IP interface in the strict proof profile;
- explicitly mapped vsock endpoints and host Unix-socket permissions;
- trusted supervisor build identity and configuration;
- seccomp/LSM/Landlock policy identities and required capabilities;
- resource and lifecycle policy;
- hostile acceptance workload hash and evidence collector configuration.

Unsupported KVM, guest/profile mismatch, missing policy capability, digest
mismatch, unverified host path, unavailable evidence collector, supervisor
loss, or any fallback to ordinary host execution must fail closed.

### Trust-computing-base outline

| TCB layer | Required responsibility | Explicit non-responsibility |
| --- | --- | --- |
| Host Linux kernel and KVM | VM/process/filesystem/IPC primitives and hardware virtualization boundary | Fates policy or effect authorization |
| Firecracker and jailer | Guest boundary, device model, VM lifecycle, process hardening | Network policy, Ananke authority, or proof by product name |
| Trusted Moirae supervisor | Build/verify profile, launch/stop guest, bind channel, remove ambient resources, collect host evidence | Replace Ananke or mint consequential authority |
| Guest kernel/rootfs | Execute the arbitrary development workload inside the guest | Prove its own containment or authorize effects |
| Horae | Route, freshness, lifecycle, and composition coordination | Host containment or credential minting |
| Ananke | Policy, approval, capability, effect, and provider authority | Host/guest sandboxing |
| Credential/effect boundary | Resolve/use an approved short-lived handle or delegated authority | Expose credentials to the workload |
| Evidence collector | Independently join host/kernel/supervisor/process/network/filesystem/decision evidence | Treat workload self-report as proof |

Firecracker itself does not prove containment. The TCB includes the pinned
host/kernel, VMM/jailer, supervisor, guest artifacts, profile configuration,
channel endpoints, evidence collector, and their operator-controlled inputs.

## 5. vsock channel design invariant

The strict profile may use a deliberately constrained vsock channel because a
no-NIC guest avoids broad ordinary IP networking. The channel must be treated
as transport, not authority:

> trusted channel != authorization

Required properties:

- one explicit host-side Unix-socket endpoint per approved guest service;
- a fixed port-to-purpose map; reject undeclared ports;
- no generic host-forwarding socket;
- no route from the workload to arbitrary Ananke APIs, MCP services, host
  daemons, localhost services, or external destinations;
- application-layer request identity, audience, freshness, and replay checks;
- channel binding to the supervisor-created session when 003B identity exists;
- host-side logging/evidence of endpoint selection and denial;
- Ananke authority decision before any credential/effect resolution.

Arrival through an approved vsock endpoint must not authorize an operation by
itself. Any broker behind the channel remains subordinate to Ananke and must
not become a second policy engine or confused deputy.

## 6. Producer identity and supply-chain claims

Use the smallest claim that repairs the current gap:

1. **Configured peer identity:** R1 may verify a tracked route host and
   expected protocol/configuration identity.
2. **Measured/pinned running artifact identity:** 003B may bind the supervisor
   launch to an executable, guest kernel, rootfs/image, or profile digest.
3. **Signed build provenance:** useful later to explain how a pinned artifact
   was produced; not required merely to make R1 reproducible.
4. **Transparency/attestation systems:** later strengthening unless the first
   strict proof demonstrates a concrete dependency.

Do not call a configured value or public digest artifact attestation. Do not
introduce Sigstore, Rekor, TPM, or mTLS solely as a cosmetic repair. Select the
minimum identity mechanism that is actually bound to the launch and channel
boundary being claimed.

## 7. Network and provider profiles

### Strict proof profile

- no guest NIC;
- no ordinary guest IP networking, DNS, proxy, metadata, link-local, private,
  IPv4, or IPv6 path;
- preloaded/project workspace image or ephemeral disk;
- only approved vsock channels;
- provider credentials absent from the guest;
- host-side evidence for every allowed channel and denied network attempt.

The strict proof intentionally does not solve all developer convenience.

### Later developer profile

A later profile may support provider/model access, Git remotes, npm/PyPI/Crates
registries, and other dependencies through explicit mediation:

- destination and protocol policy;
- host-observed proxy/broker evidence;
- credential custody outside the guest;
- Ananke authority before consequential provider/effect operations;
- no direct provider credential in guest environment, filesystem, memory,
  arguments, inherited handles, or guest credential stores.

The later profile must not be treated as equivalent to the strict no-IP proof.

## 8. Credential and effect boundary

The invariant is:

> Credentials never enter the hostile workload's readable environment,
> filesystem, memory, arguments, inherited handles, or guest credential stores.

The intended flow is:

```text
hostile workload request
        -> governed channel
        -> Ananke authority/policy decision
        -> short-lived opaque handle or delegated authority
        -> trusted effect/provider boundary
        -> result only
```

Arrival through the trusted broker/channel does not itself grant authority.
The broker must verify the Ananke decision, exact capability/action/arguments,
audience, expiry, and session/profile binding before using any real credential.
It must return a result, not a credential. No raw credential brokerage is
implemented by this gate.

## 9. Synchronous, cached, and asynchronous controls

| Timing | Controls |
| --- | --- |
| One-time profile startup | Verify host/kernel/KVM, Firecracker/jailer/guest digests, device model, no-NIC profile, vsock endpoint map, policy capabilities, resource policy, and evidence collector availability. |
| Session/launch | Bind the immutable profile/session identity, launch through the trusted supervisor, verify process membership and forbidden inherited resources, establish the channel, and fail closed on mismatch. |
| Cached immutable checks | Cache only immutable profile/configuration digest and artifact checks for the session; invalidate on drift, restart, or untrusted state. |
| Per-consequential-effect synchronous | Verify current channel/profile identity, Ananke authority/policy, exact capability/action/arguments, credential/effect authorization, replay state, and minimum durable pre-effect evidence. |
| Asynchronous non-authorizing | Dashboards, explanations, extended provenance, transparency anchoring, analytics, non-critical telemetry, and cleanup enrichment. These may never retroactively authorize an effect or erase an indeterminate result. |

Harmless local activity should not require a large audit pipeline on every
operation. The synchronous chain must remain the minimum security-critical
chain before a consequential effect.

## 10. Hostile acceptance matrix outline

Every row requires a pinned-profile setup, an allowed or denied expected result,
independent host-side evidence, cleanup evidence, and a stated falsifier. The
workload's own report is never sufficient.

| Attack or failure | Strict-profile expectation | Independent evidence |
| --- | --- | --- |
| Direct Ananke HTTP/API | Denied; no consequential effect | Host network/socket observation plus Ananke no-dispatch record |
| Alternate MCP client/server, stdio, local helper | Denied or remains in-domain without authority | Supervisor/process/effect evidence |
| IPv4/IPv6, DNS, proxy, link-local, private, metadata, raw socket | Denied in no-NIC profile | Host/kernel network evidence |
| Unauthorized vsock port or endpoint | Denied | Host endpoint/port map and supervisor log |
| Host filesystem, mount, parent path, symlink, hard-link, device | Denied | Host-side filesystem and mount evidence |
| Host workspace, browser, extension, debugger, task runner | Not mounted or reachable | Host mount/path/process evidence |
| Inherited descriptors, handles, Unix sockets, shared memory, signals | Denied or absent | Supervisor launch inventory and host IPC observation |
| Child process, daemon, reparent, detach, service creation | All descendants terminate inside session | Host process-tree and cleanup evidence |
| Environment, argv, procfs, config, credential-store discovery | No credential material present or reachable | Secret sentinels and host-side inventory; never record real values |
| Broker confused deputy, replay, wrong audience, wrong profile | Denied before effect | Ananke/broker decision and replay ledger evidence |
| Unsupported profile, KVM/VMM/supervisor failure | No ordinary-host fallback | Startup/termination evidence and control-state record |
| Evidence collector failure or delayed evidence | Consequential release denied | Collector health and gate decision |
| Resource exhaustion and timeout | Bounded termination, named outcome | Host resource/process evidence |
| Configuration drift or digest mismatch | Session denied or stopped | Profile manifest comparison and supervisor evidence |
| Cooperative shell/Node/Python/compiler/Git workflow | Allowed in-domain only | Workload success plus independent absence of escape/effect |

Do not claim proof against unknown kernel, hypervisor, firmware, or hardware
zero-days. Record the selected threat assumptions and residual risk.

## 11. Pinned platform manifest outline

The future manifest must include, at minimum:

- host OS/kernel and architecture;
- KVM requirements, microcode/firmware assumptions, and runner identity;
- Firecracker version, build source, and digest;
- jailer version, build source, patch set, and digest;
- guest kernel hash and guest rootfs/image hash;
- device model and complete VM configuration;
- guest network profile and explicit no-NIC assertion where applicable;
- vsock endpoint/port map and host Unix-socket ownership/mode;
- supervisor build identity and configuration hash;
- seccomp/LSM policy identities and Landlock ABI/features;
- resource, lifecycle, process-tree, and cleanup policy;
- acceptance workload hash;
- evidence collector version/configuration and storage target.

A platform update invalidates and reruns the relevant containment proof. It
does not inherit stale acceptance merely because the logical route is
unchanged.

## 12. Landlock qualification

If Landlock is used:

- query the running ABI at startup;
- explicitly require and record the filesystem/network features needed by the
  selected policy;
- fail closed when the required ABI or feature is unavailable;
- test policy installation and descendant inheritance;
- use Landlock with namespaces, descriptor hygiene, seccomp, guest/host
  boundaries, and explicit network policy;
- never rely on Landlock as the sole network or containment boundary.

The current primary Linux documentation records TCP network restrictions from
ABI 4 and UDP restrictions from ABI 10. The final implementation must pin the
required capability rather than preserve a stale blanket claim about UDP.

## 13. Performance and operator-erosion controls

Classify and benchmark:

- one-time profile startup and guest creation;
- session/launch cost;
- per-consequential-effect synchronous cost;
- cached immutable profile checks;
- asynchronous enrichment and cleanup.

Measure cold/warm startup, p50/p95/p99 latency, CPU, memory, I/O, concurrency,
deny-path cost, evidence durability, resource cleanup, and unsupported-profile
failure rates. Compare durable mode with test-only in-memory mode; do not use
third-party marketing numbers as Fates targets.

Operator-erosion tests must cover workspace mounts for debugging, bridged
networking, broad egress, disabled microVM, ambient credentials, emergency
bypass flags, and endpoint-security exclusions. The secure path must be the
supported low-friction path. No Defender exclusion, execution-policy bypass,
alternate encoding, or security-control weakening is acceptable.

## 14. Proposed traceability requirements

These are proposed requirements for owner acceptance, not active requirements
and not implementation authorization. Do not add them to the active control
state until the owner accepts their IDs and scope.

| Proposed ID | Requirement | Owner/placement |
| --- | --- | --- |
| `POST003A-R1-01` | The accepted R1 route host is tracked, versioned, reproducible, and preserves one route/no fallback. | Horae + Integration; R1 |
| `POST003A-R1-02` | R1 live acceptance exercises Ananke's production-style execution-authentication path with ephemeral out-of-band auth and secret-free evidence. | Ananke + Integration; R1 |
| `POST003A-R1-03` | Inspection/readiness/action paths have bounded deadlines, cancellation, fail-closed cleanup, and named timeout/indeterminate states. | Horae + Integration; R1 |
| `POST003A-R1-04` | Producer results are projected by a broker-owned allowlist that cannot be overwritten by unexpected producer fields. | Horae; R1 |
| `POST003A-R1-05` | R1 request identity is fresh, audience/channel-bound, replay-safe, and never described as OS-authenticated process origin. | Horae/Moirae + Integration; R1 |
| `POST003B-01` | The selected profile admits arbitrary user-space development workload inside the boundary while denying escape to host authority/resources. | Moirae + Integration; 003B |
| `POST003B-02` | Trusted supervisor launch identity binds the workload artifact, containment profile, process lifecycle, and host/guest channel. | Moirae; 003B |
| `POST003B-03` | No ambient credential enters workload environment, filesystem, memory, arguments, inherited handles, or guest stores; effect access remains subordinate to Ananke. | Ananke/Moirae; 003B/later |
| `POST003B-04` | The strict first profile has no ordinary guest NIC and exposes only an explicit vsock endpoint map with application authorization. | Moirae; 003B |
| `POST003B-05` | Hostile acceptance uses independent host-side evidence for direct authority, network, filesystem, process, IPC, credential, replay, failure, resource, and drift cases. | Integration + Moirae; 003B |
| `POST003B-06` | The platform manifest pins host/kernel, KVM, VMM/jailer, guest artifacts, policies, channel map, workload, and evidence collector; updates rerun proof. | Integration + Moirae; 003B |

Because R1/003B are not activated, these proposed IDs are not yet added to
`docs/REQUIREMENTS_TRACEABILITY.md`. The owner must approve them before a
traceability update or implementation plan is made.

## 15. Owner decisions required before R1 activation

1. Accept the final external-review synthesis and its provenance limitation for
   raw blind answer files.
2. Approve the exact R1 ID, scope, owners, and proposed traceability IDs
   `POST003A-R1-01` through `POST003A-R1-05`.
3. Confirm that R1 may implement application-level replay-safe identity but
   must not claim OS-authenticated process origin.
4. Approve the development-mode-disabled, ephemeral-auth acceptance design
   without secret-bearing evidence.
5. Approve the tracked Horae host ownership and bounded timeout/projection
   changes.
6. Approve the proposed first 003B profile: Linux x86_64, KVM, Firecracker,
   no guest NIC, constrained vsock, ephemeral guest storage, no ambient
   credentials, and host-observed evidence.
7. Approve the TCB, threat model, strict hostile matrix, falsifiers, and
   residual-risk statement.
8. Approve whether a later developer-network profile is a separate profile,
   not a weakening of the strict proof.
9. Approve the exact credential/effect boundary and no-confused-deputy rule.
10. Approve the pinned-platform manifest fields, update invalidation rule, and
    performance/erosion benchmark before 003B activation.
11. After this synthesis documentation checkpoint is committed and pushed,
    make a separate explicit owner decision to activate
    `FATES-SLICE-003A-R1` in the Integration control state **before any R1
    implementation begins**. After R1 implementation, validation, and
    acceptance, make a separate owner seal/closure decision. No activation is
    implied here.

## 16. Owner acceptance recorded

The owner accepts the synthesis and proposed design gate, without activating
R1 or 003B, including:

1. the synthesis and its limitation that raw blind-review answer files are not
   present in the Integration workspace;
2. the exact proposed R1 scope;
3. proposed requirements `POST003A-R1-01` through `POST003A-R1-05`;
4. application-level short-lived, audience-bound, replay-safe R1 identity;
5. the prohibition on claiming OS-authenticated process origin in R1;
6. development-mode-disabled ephemeral-auth acceptance;
7. tracked/versioned Horae host ownership;
8. bounded inspection/readiness/action cancellation;
9. bounded producer-result allowlist projection;
10. the proposed Linux x86_64 / KVM / Firecracker / no-guest-NIC /
    constrained-vsock first 003B strict proof target;
11. the proposed 003B TCB, threat model, hostile matrix, falsifiers, and
    residual-risk framing;
12. strict no-IP proof as separate from the later mediated developer-network
    profile;
13. credential/effect brokerage subordinate to Ananke;
14. `trusted channel != authorization`;
15. pinned-platform manifest and proof invalidation/revalidation after relevant
    platform changes;
16. performance, latency, and operator-erosion benchmarking.

This acceptance is documentation/design approval only. During this task R1
remains `PROPOSED — OWNER APPROVAL REQUIRED BEFORE ACTIVATION`,
`active-slice.json` remains `status: idle` with `activeSliceId: null`, no R1
implementation is authorized, and FATES-SLICE-003B remains paused.
