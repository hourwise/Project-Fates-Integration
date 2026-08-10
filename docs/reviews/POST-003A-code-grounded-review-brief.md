# Code-grounded containment review brief

**Mode:** `CODE_GROUNDED`.

This is a review contract, not a completed review. The reviewer must inspect
the pinned source and tests and must not infer enforcement from ADRs, diagrams,
names, or owner assertions.

## Core instruction

> Do not trust ADRs or architecture claims. Determine what the code actually
> enforces, at the pinned revisions, and distinguish tested owner-local logic
> from host/kernel enforcement and real cross-process evidence.

## Source pack

Start with the Integration routing and authority documents, then inspect only
the relevant pinned code in:

- `D:\\Users\\fleur\\Project-Fates-Integration`;
- `D:\\Users\\fleur\\Project Ananke`;
- `D:\\Users\\fleur\\Project Horae`;
- `D:\\Users\\fleur\\Project Mnemosyne`;
- `D:\\Users\\fleur\\Project Moirae Code`;
- `D:\\Users\\fleur\\Project Runtime Contracts`.

The source pack must record the exact commit for every repository and the
reviewer must not silently substitute a mutable branch head. The sealed 003A
evidence and final claim boundary are context, not permission to change them.

## Questions to answer from code and executable tests

1. Can any code path in the host call Ananke directly without the intended
   Horae route, or create a second action client, MCP transport, provider SDK,
   shell path, or fallback?
2. What endpoint, origin, instance, capability, readiness, and allowlist checks
   are executable rather than documentary? Are they fresh at dispatch?
3. What proves process origin? What prevents a process with a copied name,
   command line, port, or route receipt from being accepted?
4. Can a caller forge, strip, replay, or mutate evidence, headers, schema
   receipts, correlations, identifiers, or route state?
5. Can a child process inherit credentials, environment variables, handles,
   descriptors, sockets, browser/extension access, working directories, or
   writable executable/configuration paths?
6. Can the host reach raw network destinations, localhost services, private
   addresses, alternate providers, DNS or proxy side channels outside the
   governed route?
7. What happens on shell, PowerShell, cmd, bash, Python, Node, interpreter,
   arbitrary-subprocess, daemon, breakaway, reparenting, and process-tree
   cases?
8. What happens on symlink/reparse, bind-mount, parent-path, hard-link,
   path-substitution, archive, inherited-descriptor, shared-memory, named-pipe,
   and other IPC cases?
9. Is there any production path that reads a credential from an environment,
   mounted file, browser store, or host configuration? If not, what prevents a
   child or helper from doing so? Record only names/categories, never values.
10. Are retries, fallback, timeout, cleanup, and indeterminate states
    fail-closed after a dispatch or process loss?
11. Which tests use mocks or in-process doubles, and which tests observe real
    process, kernel, filesystem, network, credential, and evidence behavior?
12. Are security controls installed before execution and independently
    verified, or can a control failure degrade to ordinary host execution?

## Required output

For each conclusion, include:

- exact repository, commit, file, symbol/test, or external primary source;
- observed behavior and the narrower claim it supports;
- missing or contradictory enforcement;
- severity, evidence quality, confidence, applicability, and reproducibility;
- a safe experiment or falsifier where the source is insufficient;
- exactly one prescribed disposition from the methodology.

Do not implement fixes during the review. Do not run a live acceptance command.
Do not change Defender, execution policy, exclusions, credentials, provider
state, locks, snapshots, tags, or sealed evidence.
