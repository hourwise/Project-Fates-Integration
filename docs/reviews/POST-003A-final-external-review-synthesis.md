# POST-003A FINAL EXTERNAL-REVIEW SYNTHESIS

**Status:** documentation/research synthesis only; no R1 or 003B activation.

**Owner authorization:** final post-003A external-review synthesis and
R1/003B design gate.

**Historical checkpoint:** the accepted post-seal CODE_GROUNDED reconciliation
at `6906ab6a1cc24825340e241c07221e78f35ef845`.

**Control state:** `active-slice.json` remains idle. The sealed 003A lock,
matrix, compatibility snapshot, evidence, tags, hashes, credentials, Defender
settings, execution policies, and all component repositories remain outside
the scope of this document.

## Purpose and evidence discipline

This document synthesizes three external-review evidence classes for an owner
design gate. It does not implement a control, turn a candidate platform into
an accepted architecture, or treat model agreement as proof.

The classes are not interchangeable:

| Class | Record used here | What it can establish |
| --- | --- | --- |
| `BLIND` | Previously collected owner review history and the blind-review preparation record | First-principles threat-model themes, possible attack paths, and falsification ideas; not current Fates implementation facts |
| `INFORMED` | Claude review metadata: `mode: INFORMED`, `priorFatesContext: CONFIRMED`, plus the informed prompt and readiness material | Architecture/design challenge against the proposed 003B direction; technology claims require current primary-source checking |
| `CODE_GROUNDED` | Accepted reconciliation at `6906ab6a1cc24825340e241c07221e78f35ef845` | Current pinned-source and sealed-evidence qualifications; no bookkeeping is reopened here |

The Integration workspace contains the review methodology, prompt packs,
readiness material, and accepted CODE_GROUNDED reconciliation, but not
standalone raw answer files for each BLIND reviewer. Accordingly, the blind
section records owner-reported aggregate themes with an explicit provenance
limit. It does not invent reviewer names, vote counts, per-review novelty, or
consensus. A theme that was present in the common prompt is classified as
solicited, not independently novel.

## 1. BLIND review synthesis

### Convergence reported by the collected blind-review class

The collected blind-review evidence converges at the structural level on the
need to separate an arbitrary-code workload from the authority and host
boundaries around it. The themes retained for design consideration are:

- arbitrary in-domain code must not be confused with permission to escape the
  domain;
- host credentials, host filesystem/process/IPC access, direct Ananke access,
  unmediated provider authority, and arbitrary network egress are separate
  escape classes;
- channel reachability is not authorization;
- a trusted supervisor and independently observed host-side evidence are
  needed for a containment claim;
- unsupported setup, supervisor/VMM loss, evidence loss, resource exhaustion,
  and policy drift must fail closed;
- acceptance must be dominated by hostile negative tests, not only a
  cooperative action.

This is structural convergence reported from the external-review class, not a
security proof. The current source and the accepted CODE_GROUNDED findings
independently support several of the same boundaries, while the blind reports
do not establish implementation coverage.

### Solicited findings versus genuinely novel findings

The common blind prompt already solicited questions about direct Ananke paths,
alternate MCP, shell/interpreter execution, child processes, filesystem and
network escape, credentials, IPC, replay, cleanup, evidence, and degraded
controls. Those categories cannot be counted as reviewer novelty merely
because multiple reviewers mentioned them.

No raw per-review answer ledger is present in the Integration workspace, so no
finding is labelled genuinely novel here. A future review record may promote a
candidate to `NOVEL` only when the exact reviewer answer and prompt exposure
show that it was not supplied by the common prompt or prior Fates material.

### Substrate disagreements and design alternatives

The collected material presents alternatives rather than a consensus
architecture:

- KVM-backed Firecracker microVMs;
- gVisor or container-based layered profiles;
- Linux namespaces, cgroups, seccomp, and Landlock as complementary controls;
- a strict no-guest-NIC profile with a constrained vsock channel;
- later mediated developer networking;
- separate Windows profiles using AppContainer, jobs, restricted tokens, or
  other platform controls.

These are substrate/design disagreements, not contradictions in the Fates
authority model. The first proof should select one falsifiable profile rather
than combine every candidate into an unbounded architecture.

### Usability and performance concerns

The blind class appropriately raises the risk that operators will erode
controls for convenience: workspace mounts, bridged networking, broad egress,
ambient credentials, disabled microVMs, emergency bypass flags, and security
product exclusions. MicroVM startup, guest image preparation, per-effect
governance, evidence durability, cleanup, and developer network access are
operational constraints. They are not reasons to weaken the first strict
proof; they are requirements for a supported low-friction secure path and a
later developer profile.

### Falsification themes

The blind class supports a negative-proof acceptance approach covering direct
Ananke, alternate MCP, raw network, unauthorized vsock, host filesystem,
inherited descriptors, process-tree escape, credential discovery, broker
confusion, replay, unsupported-profile startup, supervisor/VMM/evidence
failure, resource exhaustion, and configuration drift. Each must use
independent host-side evidence and a stated falsifier.

## 2. INFORMED Claude review reconciliation

The earlier Claude review is recorded as:

- `mode: INFORMED`;
- `priorFatesContext: CONFIRMED`.

Its architecture and threat-model findings are inputs, not automatic current
technology facts. The following reconciliation applies the informed findings
to the current Fates boundaries and current primary sources.

| Informed finding or proposal | Reconciliation | Design status |
| --- | --- | --- |
| Firecracker as a first Linux boundary | Firecracker is a plausible proposed outer boundary for a pinned Linux profile, but it is a VMM and part of a larger TCB. The official design states that guest egress is untrusted and must be filtered at host level; Firecracker does not itself perform network traffic filtering. | Accepted as a candidate; not containment proof. |
| Firecracker jailer as complete containment | The official jailer documentation says the operator's paths and parent directories are trusted inputs and must be protected from tampering. Jailer hardening is necessary but does not remove host-kernel, supervisor, image, path, or configuration assumptions. | Qualified; no standalone containment claim. |
| Firecracker/vsock governed communication | The official vsock design maps guest AF_VSOCK ports to host AF_UNIX sockets. This is a useful narrow transport for a strict profile, but endpoint selection and the application protocol remain part of the TCB. | Accepted as a channel candidate; authorization remains separate. |
| “No guest NIC plus vsock” | This can reduce broad IP-network escape classes in the first proof profile. It does not prove that the vsock endpoint is authorized, that the host endpoint cannot be abused, or that a request is bound to Ananke policy. | Recommended strict-profile direction; unimplemented. |
| Landlock network capability | Current Linux documentation records TCP network restrictions beginning at Landlock ABI 4 and UDP restrictions beginning at ABI 10. Any design must query and pin the required ABI/features at startup. Landlock is not the sole network boundary. | Accepted with current-source qualification. |
| Shell/interpreter execution is already covered | This is rejected as a containment claim. 003A's fixed route and deterministic tests do not prove arbitrary hostile shell, Node, Python, compiler, Git, or child-process behavior. Those tools are expected inside the future workload domain and must be tested for escape, not globally banned. | Rejected as an overbroad claim. |
| Proposed 003B architecture already exists | The current readiness and component source describe candidates and exclusions, not an implemented Firecracker supervisor, guest profile, network broker, credential broker, or host-attested channel. | Rejected; design only. |
| Large synchronous audit/enrichment pipeline | The minimum synchronous chain should protect authority and effect release. Dashboards, explanations, extended provenance, transparency anchoring, analytics, and non-critical telemetry may remain asynchronous and non-authorizing. | Accepted with bounded hot-path scope. |
| Secure controls may be disabled for usability | This is a risk to measure, not a permitted mitigation. The secure profile must be the supported path; endpoint security and execution policy must not be weakened. | Rejected as an implementation response. |

### Current primary-source qualifications

The current primary sources consulted for this synthesis are:

- [Firecracker design](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md), which describes KVM-backed vCPU execution, minimal device models, jailer/seccomp/cgroup/namespace layers, and explicitly says Firecracker does not filter guest network traffic;
- [Firecracker jailer documentation](https://github.com/firecracker-microvm/firecracker/blob/main/docs/jailer.md), which treats jailer inputs and their parent paths as trusted operator-controlled resources;
- [Firecracker vsock documentation](https://github.com/firecracker-microvm/firecracker/blob/main/docs/vsock.md), which describes guest AF_VSOCK to host AF_UNIX mediation and port mapping;
- [Linux Landlock documentation](https://docs.kernel.org/userspace-api/landlock.html), which documents filesystem rules and network rules, including TCP from ABI 4 and UDP from ABI 10.

These sources support design constraints only. They do not prove a Fates
implementation, a pinned version selection, a secure jailer patch, a trusted
supervisor, or a successful 003B acceptance.

## 3. CODE_GROUNDED findings that constrain design

The accepted CODE_GROUNDED reconciliation at
`6906ab6a1cc24825340e241c07221e78f35ef845` remains the implementation/evidence
source of truth. Its disposition bookkeeping is not reopened. The findings
that materially constrain this design are:

| Finding | Current constraint |
| --- | --- |
| F-01 and F-20 | The successful route used an untracked temporary Horae host; R1 needs a tracked, reproducible host and additive claim qualification. |
| F-02 and F-03 | Harness PID correlation is not runtime-authenticated process origin; freshness is not durable single-use replay protection. R1 may use application-level replay-safe identity but must defer launch/channel authentication to 003B. |
| F-04 | Configured producer identity and annotations are self-report/configuration matches, not artifact attestation. R1 needs only the minimum reproducible identity claim; 003B can bind launched artifacts to a trusted supervisor. |
| F-05 | The live route used development authentication even though Ananke has a production-style fail-closed path. R1 must exercise the existing production-style path with ephemeral out-of-band test auth. |
| F-09 | `IsolationLevel`, `networkPolicyId`, and `ExecutionEnvironment` have zero consumers in the reviewed Fates sources. Runtime Contracts vocabulary is not containment evidence. |
| F-10 and F-19 | Sandbox configuration and deterministic doubles do not prove host/kernel containment. 003B requires real process, kernel, filesystem, network, IPC, and credential observations. |
| F-11 | The pinned credential implementation is `InMemorySecretBroker`, not a platform keychain. Credential custody remains a later design requirement and was excluded from 003A. |
| F-12 and F-15 | Producer projection is not an allowlist, and pre-dispatch inspection lacks its own deadline/cancellation. These are immediate R1 remediation candidates. |
| F-17 | Privileged primitives require a future trusted-supervisor/adapter import boundary, not a blanket ban that would prevent the supervisor from doing its job. |
| F-06, F-07, F-14, F-16, and F-18 | These positive findings remain valid within their narrow scopes and must not be erased by the stronger 003B threat model. |

The resulting design rule is: 003A proves a bounded historical route with
narrow positive evidence; R1 repairs reproducibility and route-level
validation; 003B proves a separate hostile-workload containment boundary.

## 4. Combined synthesis conclusions

1. A hostile coding workload is expected to execute arbitrary user-space code
   inside its domain. Security is about preventing escape from that domain, not
   banning shell, Node, Python, compilers, build systems, Git, or child
   processes inside it.
2. The first 003B proof should be narrow and falsifiable: Linux x86_64, pinned
   host/kernel and guest artifacts, KVM-backed Firecracker, no ordinary guest
   NIC, constrained vsock endpoints, ephemeral guest storage, no ambient
   credentials, and independent host-side evidence.
3. A vsock connection is transport. It is not authorization, identity,
   attestation, or an Ananke decision. No generic host-forwarding socket is
   acceptable.
4. R1 should repair route reproducibility, production-style validation,
   boundedness, projection, replay-safe application identity, and truthful
   evidence language. It should not claim OS-authenticated process origin.
5. 003B should own trusted supervisor identity, host/guest launch binding,
   hypervisor/OS containment, channel identity tied to launch, and denial of
   direct Ananke/provider/network/filesystem/process/IPC paths.
6. A strict no-IP profile is recommended for the first falsification. A later
   mediated developer-network profile may support registries, Git remotes, and
   provider/model access without placing provider credentials in the guest.
7. Credentials remain outside the workload. The effect broker is subordinate
   to Ananke and cannot become a second authority or confused deputy.
8. Only the minimum security-critical evidence is synchronous before a
   consequential effect. Non-authorizing enrichment remains asynchronous.

## 5. Final recommendation at this gate

### R1

Recommend eventual activation of `FATES-SLICE-003A-R1 — Reproducibility and
route-identity remediation` before 003B, but do **not** activate it from this
document. The bounded scope is:

- tracked/versioned Horae route host;
- production-style ephemeral Ananke authentication validation;
- bounded inspection/readiness/action cancellation;
- bounded producer-result allowlist projection;
- replay-safe application-level request identity appropriate to the route;
- truthful process-correlation versus authentication wording;
- reproducible real-process acceptance and additive post-seal qualification.

True OS-authenticated process/channel identity is not an R1 claim.

### 003B first target

Recommend, as a **PROPOSED** first target:

`Linux x86_64 / KVM / Firecracker / no guest NIC / constrained vsock strict proof profile`

This is a platform/profile recommendation, not an implementation authorization.
It is preferred because it provides a narrow falsification target and reduces
ordinary IP-network escape surface. It still requires an owner-approved TCB,
pinned manifest, host supervisor, guest image, channel protocol, and negative
acceptance matrix.

### Identity

Use a split design:

- R1: application-level, audience-bound, short-lived, replay-safe request
  identity, explicitly not OS/process-origin authentication;
- 003B: trusted supervisor identity and launch-bound host/guest channel
  authentication tied to the measured/pinned workload artifact and containment
  profile.

### Networking

Recommend no ordinary guest IP networking for the strict first proof, followed
by a later explicitly mediated developer profile with destination/protocol
policy, host-observed evidence, credential custody, and no direct provider
credentials in the guest.

## 6. Stop state

This synthesis does not activate R1 or 003B, change `active-slice.json`, or
authorize implementation. The next action is an owner design decision on the
R1 scope and the proposed strict 003B profile.
