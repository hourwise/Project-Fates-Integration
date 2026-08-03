# Fates gateway and workflow assessment

## Conclusion

ToolFunnel and public n8n collections validate useful patterns but should not be adopted as architectural authorities. Horae owns discovery, origin-preserving routing and workflow state; Ananke remains the sole effect authority. Generic plan/step/attempt/continuation contracts may be justified across n8n, MCP Tasks/MRTR and native workflows, but the implementation is `DOCUMENTED_NOT_IMPLEMENTED`. An n8n importer is `PRODUCT_LAYER_ONLY` until a bounded experiment proves the generic normalization model.

## Gateway assessment

ToolFunnel demonstrates:

- progressive tool discovery (brief first, full schema on demand);
- fail-closed pre-call hooks;
- live attach/toggle and self-healing reconnect;
- gateway audit events;
- translation between legacy handshake-based MCP and 2026-07-28 modern MCP.

For Fates, each benefit adds a binding requirement:

| Pattern | Fates requirement |
|---|---|
| Lean catalogue | Principal/tenant-specific catalogue receipt; deterministic order; explicit cache/TTL ceiling; permission invalidation. |
| Policy hook | Defense-in-depth only; Ananke evaluates the full canonical request immediately before effect. |
| Live toggle/reconnect | Capability/schema/origin drift event; stale approval invalidation; bounded readiness backoff. |
| Transparent wrap | Preserve gateway and downstream identities; never erase the translation hop from audit. |
| Era translation | Record source/target protocol versions, translated features/losses and fallback reason; no silent semantic weakening. |
| Alias/meta-tool | Approval uses canonical downstream identity/action, not display alias or generic `run_tool`. |

The gateway must reject `Mcp-Method`/`Mcp-Name` header/body mismatches, duplicate/malformed headers, ambiguous aliases and unadmitted downstream servers before Ananke evaluates semantics. A gateway-generated description or schema is still untrusted metadata.

## Workflow import threat model

Public workflow JSON is executable supply-chain input. A small human-approval workflow can still change between report and resumed commit; a large collection can contain triggers, credentials, code nodes, external subworkflows, dynamic expressions, hidden destinations, retries and irreversible effects. Repository popularity, “production-ready” labels and import success are not safety evidence.

An import pipeline should produce a normalized, non-executable candidate plan with:

- source repository/release/commit/file/content hash and license/provenance state;
- nodes, edges, triggers, branches, loops, callbacks and nested workflow references;
- declared and inferred reads/writes/external effects;
- tool/server/integration origins and aliases;
- credential references and effective scopes, never secret values;
- literal versus runtime/model-resolved arguments and destinations;
- retry, timeout, idempotency and partial-success behaviour;
- human input/approval points and what exact version they bind;
- compensation candidate plus whether the effect is truly reversible;
- content-preflight findings and unresolved/unsupported constructs.

The normalized plan is evidence for Ananke, not an execution grant. Unknown nodes, code, unresolved destinations or inaccessible nested workflows fail closed or remain quarantined.

## Approval strategies

| Strategy | Benefit | Failure mode | Recommendation |
|---|---|---|---|
| Per-tool approval | Precise local effect | Fatigue; misses dangerous composition | Use for high-risk/dynamic steps, not alone |
| Whole-plan approval | Low friction | Mutation and runtime-resolved values invalidate meaning | Only for immutable, bounded plans with staged live checks |
| Staged approval | Balances context and precision | Requires durable suspension/resumption | Preferred for consequential multi-step workflows |
| Policy pre-authorization + live revalidation | Enables headless/repeated work | Over-broad policy or stale state | Preferred for low/bounded risk with deterministic limits |

Approval must bind plan hash/version, step, canonical downstream origin/tool, arguments/destination/amount, principals, tenant/resource/purpose, discovery/schema receipt, policy version, provider/disclosure posture, expiry and repetition/idempotency policy. Any material mutation invalidates it.

## Durable execution

Horae needs workflow, execution, step and attempt identities; states for waiting input/approval, ready, executing, retry pending, indeterminate, terminal and compensation; and durable continuation independent of MCP transport sessions. A resumed step is a new Ananke decision with current identity, policy, receipt, grant and live state. State handles locate state but never authorize it.

Timeout is not failure. Before retrying an external effect, Horae/Ananke must reconcile provider state or mark the attempt indeterminate. Compensation is a new consequential action requiring its own authority; it cannot be assumed safe because it is labelled rollback.

## Multi-tool problem

Composition risk must cover:

- a private read feeding a public write;
- several low-risk actions exceeding a cumulative amount/volume budget;
- an early step obtaining a broader credential/capability for later steps;
- a nested agent receiving more context or tools than the parent;
- one successful irreversible step followed by failure;
- callback/webhook execution after the original approval expires;
- a retry or resume on another server instance with different identity/schema.

Horae calculates/propagates the graph; Ananke decides each newly materialized risk edge. Neither tool curation nor whole-plan approval eliminates execution-time decisions.

## Protocol compatibility

ToolFunnel's dual-era implementation is evidence that translation is feasible, not a component to copy. Fates should use official SDK/spec fixtures and consumer-driven tests. Translation must make unsupported features explicit: legacy server-initiated requests versus MRTR, session assumptions, notification/subscription semantics, cancellation, cache metadata and Tasks. A legacy fallback may not bypass current identity, approval or origin controls.

## Classification

| Proposal | Status | Owner |
|---|---|---|
| Progressive tool disclosure | PARTIALLY_COVERED | Horae |
| Gateway as final policy gate | REJECT_INCOMPATIBLE | Ananke |
| Immutable gateway/downstream origin chain | MISSING_HIGH_PRIORITY | Horae |
| Generic durable plan/step/attempt model | DOCUMENTED_NOT_IMPLEMENTED | Horae / Runtime Contracts |
| n8n-specific importer/editor | PRODUCT_LAYER_ONLY | Moirae Code |
| Static import normalization experiment | EXPERIMENTAL_RESEARCH | Horae |
| Staged approval and mutation invalidation | PARTIALLY_COVERED | Ananke |
| Compensation/idempotent recovery | DOCUMENTED_NOT_IMPLEMENTED | Horae + Ananke |

## Benchmark proposal

Compare per-tool, whole-plan, staged and policy-preauthorized/live-revalidated governance over pinned workflows with safe, malicious, dynamically mutated, nested, retrying and partially failing variants. Measure bypass, approval fatigue, false denial, duplicate effects, latency and dangerous-composition detection. Do not adopt a generic workflow contract until at least n8n, MCP Tasks/MRTR and one native Fates workflow map without vendor-specific fields.
