# Post-Slice-003A readiness and 003B external-review preparation

**Status:** documentation and research preparation only; not an implementation
authorization.

**Baseline:** FATES-SLICE-003A is sealed. Its evidence, compatibility lock,
matrix, snapshot, tags, source checkpoints, and claim boundary remain closed.
This document is additive planning material. It does not change
`active-slice.json`, `fates-lock.json`, the compatibility matrix or snapshot,
sealed evidence, or any component repository.

## 1. Proposed objective

The candidate objective is:

> **FATES-SLICE-003B — Host containment and governance bypass resistance**

The objective is deliberately not assumed to be an architecture. Before
activation, owners must select one supported platform profile and prove that a
hosted untrusted process cannot obtain a consequential effect through a path
that is not independently governed. A process-origin receipt is not OS
containment evidence, and a logical route allowlist is not a host boundary.

The first proof should be narrow: one platform profile, one intentionally
bounded workload class, one explicit network policy, one explicit filesystem
policy, no ambient credentials, and a fail-closed result when any required
primitive is absent or unverifiable. No full Windows/Linux/macOS portability
claim is proposed.

003B must not create a new Fate or move policy authority into a sandbox,
gateway, container runtime, or external service. Ananke remains the action,
approval, and effect authority; Horae remains discovery, freshness,
composition, and routing authority; Moirae remains the host/product boundary;
Runtime Contracts remains neutral structure only.

## 2. Recommended first supported platform

**PROPOSED - SUBJECT TO EXTERNAL REVIEW AND OWNER DESIGN GATE:** Linux x86_64
on a dedicated, pinned Linux host profile, using KVM-backed Firecracker as the
outer boundary.

This remains a candidate only, not a final 003B architecture and not a claim
that the current Windows development workstation already proves it. Linux has
mature, composable
kernel controls for namespaces, cgroups, seccomp, and Landlock, and the
Firecracker and gVisor projects document layered isolation models. A pinned
Linux runner or VM profile gives the first adversarial test suite a
reproducible kernel and device surface. The current Windows development
environment remains useful for documentation and non-security unit tests, but
it cannot be used as evidence for the Linux profile. A Windows profile is a
separate future support decision.

The initial profile must specify at least:

- x86_64 Linux kernel and ABI versions, KVM availability, microcode/firmware
  assumptions, and the exact CI/runner image;
- Firecracker and guest-kernel versions, immutable binaries/images, and the
  minimal device model exposed to the guest;
- host privilege requirements and the narrow supervisor identity;
- cgroups v2, namespaces, seccomp, Landlock ABI, process-tree lifecycle, and
  network-device policy;
- no host workspace, browser profile, extension directory, credential store,
  agent environment, or arbitrary host socket mounted into the workload;
- the evidence sources used to prove denial, process membership, network
  egress, filesystem scope, and cleanup.

KVM unavailability, an unsupported Landlock ABI, a missing cgroup or namespace
facility, an unverifiable binary/image, or an unbounded fallback must fail
closed. The first profile does not promise a no-KVM fallback.

## 3. Minimum proof before any local-effect claim

The smallest meaningful 003B proof is a falsifiable matrix, not a happy-path
demo. It must show, on the pinned profile:

1. A bounded workload starts only through the reviewed supervisor and receives
   only the declared input, scratch space, and route capability.
2. Ananke remains the sole consequential-action authority. A sandboxed process
   cannot turn a direct HTTP call, raw socket, alternate MCP client, local
   helper, or child process into an unreviewed effect.
3. The workload has no ambient access to host files, symlink/reparse escapes,
   browser or extension state, inherited descriptors/handles, environment
   credentials, mounted configuration, or host IPC.
4. Network egress is deny-by-default and the only allowed route is independently
   identified, policy-bound, and observable. A domain allowlist alone is not
   sufficient proof of destination or effect safety.
5. Every permitted child process remains inside the same lifecycle boundary;
   process-tree termination is complete and independently observed.
6. Denials and cleanup are evidenced by host/kernel/supervisor observations,
   not by claims emitted by the untrusted workload.
7. Unsupported or ambiguous setup, policy drift, supervisor loss, timeout,
   or evidence loss fails closed and cannot silently fall back to an ordinary
   host process.

The acceptance suite should use harmless canary files, isolated test sockets,
non-secret credential sentinels, and process/network instrumentation. It must
never require recording or reproducing a real credential value.

## 4. Proposed containment TCB

The proposed trusted computing base is layered and intentionally small:

| Layer | Proposed responsibility | Not its responsibility |
|---|---|---|
| Linux host kernel and KVM | Hardware/OS isolation primitives, process credentials, namespaces, cgroups, syscall and filesystem enforcement | Fates policy, action meaning, or evidence interpretation |
| Firecracker VMM/jailer profile | Guest boundary, minimal device model, resource limits, VMM process hardening | Ananke authorization or destination policy |
| Moirae host supervisor | Construct and verify the immutable profile, launch/stop the workload, bind the approved route, deny ambient resources, collect host evidence | Replacing Ananke policy or making a consequential allow decision |
| Ananke | Action policy, approval, capability/effect decision, provider execution, producer-owned outcome/audit | OS sandboxing or general host governance |
| Horae | Admission, freshness, composition, route and lifecycle coordination | Sandbox authority, credential minting, or effect execution |
| Credential/effect boundary | Future short-lived opaque handle and provider use at the effect boundary | Passing raw credentials through model, memory, host UI, or workload environment |
| Evidence collector | Host-observed process/network/filesystem/decision joins | Treating workload self-report as proof |

The credential/effect boundary is a required future design dependency, not
implemented by this preparation task. The owner-approved non-secret lesson
from the prior staging incident is:

`credential disposition: provider-side revoked/rotated; former exposed credential set invalid`

Future isolation cannot rely only on `.gitignore`, secret scanning, code
review, or Git history. A trusted authority/effect boundary must eventually
use opaque references or delegated authority. No credential value is recorded
or sought here.

## 5. Threat model and bypass register

The attacker is code running inside the bounded workload, including a prompt-
injected or compromised tool, helper, extension, interpreter, dependency, or
child process. The attacker may know the profile and may attempt every
available local interface. The threat model does not assume that model intent,
declared tool metadata, process names, or a route receipt are honest.

The register remains broad, but each scenario is classified for the proposed
profile. `INITIAL_PROFILE_REQUIRED` means it belongs in the first Linux
acceptance matrix. `ARCHITECTURAL_CROSS_PLATFORM_REQUIREMENT` means it is an
invariant regardless of operating system. `FUTURE_PLATFORM_PROFILE` means it
requires a separate platform or exposed-surface decision and is not a live
requirement for the initial profile by default.

| Profile class | Consequential side door | Required question for the future proof |
|---|---|---|
| `ARCHITECTURAL_CROSS_PLATFORM_REQUIREMENT` | Ananke authority, exact capability/profile binding, and no ambient credential | Does every supported profile preserve the action authority and effect boundary without relying on model intent or process naming? |
| `INITIAL_PROFILE_REQUIRED` | Direct Ananke HTTP | Can the Linux workload reach Ananke without the intended authenticated, origin-bound route? |
| `INITIAL_PROFILE_REQUIRED` | Raw sockets and alternate network stacks | Can it open or tunnel an unapproved connection, including IPv4/IPv6, DNS, Unix sockets, or a proxy escape? |
| `INITIAL_PROFILE_REQUIRED` | Alternate MCP client/server | Can it use a second MCP transport, local server, stdio, or a renamed adapter to bypass Horae/Ananke? |
| `INITIAL_PROFILE_REQUIRED` | Shell, bash, Python, Node, or another Linux interpreter | Can an interpreter create a new effect path or widen the declared capability? |
| `INITIAL_PROFILE_REQUIRED` | Arbitrary child process | Can it spawn, re-parent, daemonize, detach, or preserve a process after the supervisor stops? |
| `INITIAL_PROFILE_REQUIRED` | Localhost services | Can it reach an ungoverned host or sibling service through loopback, port reuse, service discovery, or a forwarded socket? |
| `INITIAL_PROFILE_REQUIRED` | Linux filesystem escape | Can it reach parent paths, devices, mounts, symlinks, bind mounts, hard links, or writable executable/configuration paths? |
| `INITIAL_PROFILE_REQUIRED` | Environment and mounted configuration | Can it read process environment, inherited descriptors, command lines, config files, service accounts, or agent workspace data? |
| `FUTURE_PLATFORM_PROFILE` | Browser, extension, helper, debugger, task runner, and IDE paths | If a supported workload exposes this surface, can an ordinary host integration perform an effect outside the sandbox while appearing to belong to the governed session? |
| `INITIAL_PROFILE_REQUIRED` | Linux IPC and inherited OS objects | Can it use Unix sockets, shared memory, signals, file descriptors, devices, or other inherited capabilities? |
| `INITIAL_PROFILE_REQUIRED` | Executable/path substitution | Can it replace a binary, loader, script, package, or PATH entry between verification and execution? |
| `INITIAL_PROFILE_REQUIRED` | Linux process-tree escape | Can it use reparenting, service creation, scheduled work, or a detached grandchild to outlive containment? |
| `INITIAL_PROFILE_REQUIRED` | Network egress outside the governed route | Can it use an allowed domain or proxy as an arbitrary write/read channel, or reach metadata, private IPs, or a second provider? |
| `FUTURE_PLATFORM_PROFILE` | Windows PowerShell, AppContainer, Job Object, reparse-point, and handle variants | What Windows-specific behavior must a separately supported Windows profile prevent? |

Each row requires a concrete deny experiment, an allowed-path experiment where
appropriate, host-side evidence, and a known falsifier. “The process did not
try it” or “the model was instructed not to” is not evidence of containment.

## 6. Candidate primitive classification

These classifications are research dispositions for the first profile. They
do not add dependencies or authorize implementation.

| Primitive | Classification | Reason and boundary |
|---|---|---|
| Firecracker | **WRAP** | Recommended outer Linux boundary. The supervisor wraps its API and immutable guest profile; Firecracker never becomes Fates policy authority. Network filtering and host configuration remain outside Firecracker and must be explicit. |
| Linux namespaces | **EMBED** | Use inside the Fates-owned Linux enforcement adapter for mount, PID, user, network, and IPC separation. Namespaces alone are not a complete sandbox. |
| cgroups v2 | **EMBED** | Enforce resource and lifecycle bounds in the same platform adapter; record membership and kill completion. |
| seccomp-BPF | **EMBED** | Reduce the guest/supervisor syscall surface. Treat it as syscall filtering, not complete containment; fail closed on filter installation or verification failure. |
| Landlock | **EMBED** | Add unprivileged, scoped filesystem restrictions and prove the required ABI. Combine with namespace and descriptor hygiene; do not infer network or process containment from Landlock. |
| gVisor | **WRAP** | Viable Linux alternative where microVM overhead is unacceptable. It remains a defense layer with its own configuration and host assumptions, not the authority. It is not the first profile while Firecracker is the selected boundary. |
| Rootless containers / OCI runtime | **WRAP** | Useful packaging and defense-in-depth, but not accepted as the sole hostile-code boundary. Rootless and nested modes need explicit capability, namespace, filesystem, and network proof. |
| Windows AppContainer | **STUDY** | Strong later Windows candidate, but package identity, capability declarations, desktop compatibility, and child-process behavior require a separate profile and tests. |
| Windows Job Objects | **STUDY** | Useful later Windows process-tree/resource primitive. Breakaway, nested-job, inherited-handle, and non-CreateProcess cases must be proven before classification as a full boundary. |
| Windows restricted tokens/integrity levels | **STUDY** | Relevant later defense-in-depth identity/privilege controls, but token construction and object ACL coverage do not by themselves close filesystem, network, browser, or IPC paths. |
| Anthropic Sandbox Runtime or equivalent | **STUDY** | Current project material describes useful filesystem/network wrappers and explicit weaker nested modes. Review exact release, license, platform coverage, and bypass behavior before any use; never treat its proxy or policy as Ananke. |
| Generic gateway/proxy as the security authority | **REJECT** | A proxy can be a defense-in-depth data plane, but it cannot prove or replace host containment, origin, credentials, or Ananke authority. |
| Model instruction or LLM classifier as containment | **REJECT** | Intent and classification are advisory; deterministic OS and effect controls remain mandatory. |

Primary references used for this research preparation include the [Linux
Landlock documentation](https://www.kernel.org/doc/html/latest/security/landlock.html),
[Linux seccomp documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html),
[Firecracker design](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md),
[gVisor security model](https://gvisor.dev/docs/architecture_guide/security/),
[Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects),
[Windows AppContainer capability guidance](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/app-capability-declarations),
and the [Sandbox Runtime project](https://github.com/anthropic-experimental/sandbox-runtime).
These sources inform research classification only; they do not constitute Fates
acceptance evidence.

## 7. Governance, Defender, and performance lessons

The Defender event is recorded in the sealed 003A evidence and remains a real
acceptance-harness finding. A benign authorized agent changed execution
technique after a host security mechanism blocked the initial harness. This
shows that the security authority must not depend on model intent or the
chosen execution mechanism. It is not evidence that a bypass completed, and
it is not evidence of Ananke, Horae, or Moirae malware. No Defender control,
exclusion, policy, or execution-policy bypass is proposed or changed.

For future containment, classify controls by timing. An immutable containment
policy is installed and bound at session creation; it is verified at launch
and its security-critical identity/readiness is checked at each consequential
effect. The policy is not reconstructed or reinstalled per effect merely for
ceremony. If its state cannot be trusted between launch and action, that is a
design problem to solve and benchmark.

- **Containment/session creation:** install and bind namespace configuration,
  the VM/container boundary, mounts and filesystem restrictions, network
  restrictions, cgroup/resource policy, seccomp/Landlock or equivalent
  controls, ambient credential removal, and the permitted IPC/device surface.
- **Process launch:** synchronously verify expected containment/profile
  identity, supervisor identity, process membership, immutable
  profile/configuration binding, expected filesystem/network restrictions,
  resource limits, absence of forbidden inherited credentials/handles/resources,
  and fail-closed state before execution.
- **Consequential action/effect:** synchronously verify only the security-
  critical current state required for authority: Ananke policy/authority
  decision, actor/process/runtime identity, exact capability/profile binding,
  containment readiness/identity, credential handle or delegated authority
  where applicable, and minimum durable pre-effect evidence.
- **Concurrent but before release:** readiness probes, supervisor health, route
  connectivity, evidence joins, and test instrumentation may proceed in
  parallel, but cannot release an action until their required results exist.
- **Asynchronous after the gate:** telemetry enrichment, dashboards,
  explanation, benchmarking, transparency anchoring, and cleanup reporting.
  These may never retroactively authorize an effect or erase an indeterminate
  result.

The performance requirement is governance-preserving usability, not a target
that justifies weakening controls. A future benchmark should measure cold and
warm startup, per-launch and per-action p50/p95/p99, CPU, memory, I/O,
concurrency, deny-path cost, cleanup time, evidence durability, and the rate
of disabled-governance or unsupported-profile failures. It must compare the
intended durable mode with test-only in-memory modes and must not use external
project marketing numbers as Fates targets.

## 8. External-review preparation and stop gate

The review methodology and three prompt packs are in:

- [external-review methodology](../reviews/POST-003A-external-review-methodology.md);
- [blind containment review prompt](../reviews/POST-003A-blind-containment-review-prompt.md);
- [informed containment review prompt](../reviews/POST-003A-informed-containment-review-prompt.md);
- [code-grounded containment review brief](../reviews/POST-003A-code-grounded-review-brief.md).

The prior review context is corrected without rewriting conclusions:

- Claude: `INFORMED`, `priorFatesContext: CONFIRMED`;
- Gemini: `priorFatesContext: POSSIBLE` unless the owner can establish a
  stronger fact from the actual session record; it must not be labelled
  `NONE` when prior exposure cannot be ruled out.

No reviewer answer is treated as proof by consensus. A reproducible severe
finding can outweigh agreement, and every finding must be reconciled against
source, code, accepted decisions, sealed evidence, primary references, and a
reproducible experiment where applicable.

No 003B activation is permitted from these documents. Before implementation,
the owner must separately approve all of the following:

1. the objective, first platform profile, supported workload class, and
   proposed containment TCB;
2. the threat model, deny/allow matrix, falsification experiments, and
   evidence quality threshold;
3. the selected primitives, pinned versions, licensing review, host/CI
   requirements, and any required component-owner ADR changes;
4. the exact authority/credential/effect boundary, including the future
   opaque-reference decision and the no-ambient-credential invariant;
5. the implementation scope and repository owners, followed by an explicit
   003B activation in the integration control state;
6. the exact live acceptance command, cleanup procedure, evidence files, and
   stop conditions.

Until those approvals exist, the only valid state is documentation/research
preparation and the active integration slot remains idle.
