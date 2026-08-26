# Informed Fates containment review prompt

**Mode:** `INFORMED`.

This pack exposes the current Fates architecture and sealed 003A claim
boundary. It must not include prior Claude/Gemini answers or any other
reviewer's conclusions when sent to a new reviewer.

## Current architecture to review

The system is The Fates, composed of five repositories/components:

- **Ananke** owns final policy, approval binding, governed action execution,
  typed outcomes, and producer-owned audit. It is the sole action authority.
- **Horae** owns discovery, admission, compatibility, freshness, capability
  reduction, lifecycle supervision, composition, and routing. It is not action
  authority and must not mint credentials.
- **Moirae Code** is the governed developer host and user-facing integration
  surface. Its architectural responsibility is host/product integration; it
  must not claim that an IDE, terminal, extension, child process, provider,
  filesystem, or network is governed unless the OS enforces it.
- **Mnemosyne** owns governed memory, provenance, reliability, retrieval, and
  invalidation direction. Memory and remembered approvals are not execution
  authority.
- **Runtime Contracts** owns portable neutral structure only, not policy,
  authorization, execution, persistence, credentials, or sandbox semantics.

The current route is a bounded local Moirae -> Horae -> Ananke -> Horae ->
Moirae path. It uses separate processes, fresh inspection and a single
harmless producer-owned effect. The Integration repository records
compatibility and evidence; it is not a runtime authority.

## What sealed 003A proves and does not prove

The sealed 003A evidence proves only the bounded process-origin and governed
route claim: independent Moirae process participation, exact route and
arguments, fresh Horae inspection, canonical Ananke authority, exactly one
harmless producer-owned read/effect, preserved correlation and evidence, typed
result return, and bounded fail-closed behavior in the accepted harness.

It does not prove OS filesystem, network, shell, subprocess, browser,
extension, arbitrary IPC, credential, direct-Ananke, alternate-MCP, or
full-machine containment. It does not prove general bypass resistance or
governed local consequential effects. The Defender interaction recorded during
the initial harness is a host-security finding, not runtime-malware evidence
and not a confirmed false positive. The exposed credential set was
provider-side revoked/rotated and is invalid; no values are included here.

## Proposed next boundary

The proposed next research question is host containment and governance bypass
resistance. It must select one supported platform profile deliberately. The
current recommendation is Linux x86_64 on a pinned Linux host with KVM-backed
Firecracker, layered kernel controls, explicit filesystem/network policy, and
no ambient credentials. This is a proposal, not an implementation decision;
Windows AppContainer, Job Objects, restricted tokens/integrity, gVisor,
rootless containers, Landlock, seccomp, namespaces, and other current projects
must be compared against the threat model and reproducibility requirements.

The containment TCB must separate:

- OS/kernel/hypervisor enforcement;
- the Moirae host supervisor's launch, lifecycle, and evidence duties;
- Ananke's policy and effect authority;
- Horae's route/freshness duties;
- the future opaque credential/effect boundary;
- host-observed evidence versus workload self-report.

## Review questions

1. Is the proposed platform profile strong enough for the local-effect claim,
   or does it merely package the process?
2. Are direct Ananke HTTP, raw sockets, alternate MCP, shell/PowerShell/cmd/
   bash/Python/Node, arbitrary child processes, localhost services, and
   process-tree escape actually prevented or only discouraged?
3. Are filesystem parent paths, symlinks/reparse points, inherited handles or
   descriptors, IPC, writable executable paths, path substitution, browser and
   extension paths, and mounted configuration addressed?
4. Can the workload read environment variables, host configuration, agent
   workspace files, browser state, or any credential-bearing store? If the
   answer depends on a broker, what is the broker's trust boundary and who
   authorizes a handle?
5. Can any allowed network route become an arbitrary exfiltration or provider
   write channel? How are DNS, proxies, metadata services, loopback, IPv4/IPv6,
   Unix sockets, and private addresses handled?
6. Which evidence is synchronous before the effect, and which evidence is
   merely asynchronous enrichment? What happens if the evidence collector,
   supervisor, kernel primitive, or route becomes unavailable?
7. Do Firecracker, gVisor, containers, namespaces, seccomp, Landlock, Windows
   AppContainer, Job Objects, or restricted tokens materially change the
   decision? Classify each as embed, wrap, study, defer, or reject with a
   reason, cost, licensing concern, and falsification test.
8. How could complexity, latency, Defender/endpoint-security interaction, or
   operator usability pressure lead to a weakened or bypassed deployment?
9. What is the minimum proof needed before any claim of governed local effects?
   List concrete experiments and the host-side evidence they require.

Do not assume that a Fates ADR, route receipt, process identity, sandbox
project, gateway, or model statement is proof. Do not propose disabling
Defender, exclusions, execution-policy bypass, alternate encodings, or any
execution change intended to evade detection.

Return findings with evidence quality, severity, applicability to the proposed
Linux profile, reproducibility, and one of the prescribed dispositions:
`NEW_REQUIREMENT`, `ALREADY_COVERED`, `VALIDATION_GAP`, `EXPERIMENT_REQUIRED`,
`RESEARCH_REQUIRED`, `REJECTED_WITH_REASON`, or `OUT_OF_SCOPE`.
