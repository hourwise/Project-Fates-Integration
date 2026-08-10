# Independent containment review prompt

This is a genuinely blind, first-principles review prompt. Do not append
project names, repository names, component counts, current architecture
diagrams, preferred technologies, earlier reviewer conclusions, or internal
phase names when sending it.

## Prompt

You are reviewing a proposed system that lets an untrusted or compromised
local workload perform a narrowly declared consequential operation through a
trusted control path. The proposal claims that the workload should be
contained, that only declared effects should be possible, and that the result
should be auditable. The host platform, operating system, runtime, number of
services, and implementation technology are intentionally unspecified.

Starting from first principles, do the following:

1. Define the minimum trust boundaries and state which party owns policy,
   process launch, credentials, effect execution, routing, and evidence.
2. Determine whether the proposal needs one boundary or several distinct
   boundaries. Do not assume that a network gateway, process name, API route,
   container, or model instruction is a security boundary.
3. Enumerate equivalent consequential paths: direct HTTP, raw sockets,
   alternate tool protocols, shell and scripting interpreters, arbitrary child
   processes, local services, filesystem and path tricks, environment and
   mounted configuration, browser/extension/helper paths, IPC, inherited
   handles, executable substitution, process-tree escape, and ungoverned
   network egress.
4. For each path, state a concrete enforcement mechanism, an independently
   observable denial test, and the evidence that would falsify the claim.
5. Compare plausible OS/kernel/runtime approaches without assuming a specific
   vendor or project. Identify where virtualization, namespaces, syscall
   filtering, filesystem policy, process supervision, identity, and network
   mediation are complementary or insufficient.
6. Analyze credential custody. Explain why source control hygiene, secret
   scanning, review, or a process environment cannot by themselves prove that
   an untrusted workload cannot read or exfiltrate credentials.
7. Identify assumptions about kernel, hypervisor, firmware, CI, privilege,
   nested virtualization, filesystem mounts, DNS, proxies, and host updates.
8. Identify complexity, latency, and usability pressures that could cause an
   operator or an automated system to disable, bypass, or weaken the controls.
9. Propose the smallest falsifiable proof for one explicitly selected platform
   profile. Challenge the premise if the proposed guarantee is stronger than
   the available evidence.

Return:

- trust-boundary diagram in text;
- threat and bypass register;
- minimum enforcement/evidence matrix;
- unsupported assumptions;
- severe findings and their reproducibility conditions;
- experiments required before any implementation or acceptance claim;
- a clear distinction between current evidence, proposed design, and unknown.

Do not fill missing facts with guesses. Do not treat agreement with a stated
architecture as evidence. Do not recommend weakening endpoint security or
changing execution mechanisms to evade host controls.
