# Fates information-flow assessment

## Conclusion

The Fates do not currently enforce cross-server information flow. MCPHunt shows why this is a P0 composition gap: individually permitted reads and writes can faithfully produce policy-violating egress. The required control is deterministic label and lineage propagation plus Ananke destination/purpose policy, not another prompt instruction. Status: `MISSING_HIGH_PRIORITY`.

## Threat model

A flow is a path from one or more source values through tools, memory, models, transformations, plans or agents to a destination. It can violate policy even if:

- every individual tool is admitted;
- the model follows the user's task faithfully;
- no prompt is adversarial;
- the sensitive value is reformatted or summarized;
- the destination call is normally harmless;
- the gateway exposes only a curated tool list.

The policy must reason about source classification, tenant, principal, purpose, recipient/destination trust, transformation and consent across the whole path.

## Required ownership

| Fate | Responsibility |
|---|---|
| Mnemosyne | Attach sensitivity, provenance and ACL lineage to evidence, memories, derived claims and context packs; invalidate on source changes. |
| Horae | Propagate flow metadata through plan steps, retries, subagents, MRTR rounds, callbacks and gateways without widening it. |
| Ananke | Decide whether a source→transformation→destination flow is permitted; issue declassification decisions; block before egress/effect. |
| Runtime Contracts | Define neutral labels, lineage references and decision/receipt envelopes only if used across transports/runtimes. |
| Moirae Code | Explain flow paths, warnings and declassification review; never decide policy. |
| Integration | Prove objective canary propagation, hard negatives, tenant isolation and revocation. |

## Default invariants

1. Output sensitivity is no lower than protected contributing input unless an explicit declassification decision applies.
2. Derived visibility is no broader than the most restrictive contributing evidence by default.
3. Tenant identity is never removed by summarization, aliasing, gateway forwarding or model transformation.
4. A destination is evaluated by immutable identity/trust domain, not display name.
5. Purpose and recipient are material approval/flow dimensions.
6. A tool result is data, not an instruction or grant.
7. Declassification is narrow, expiring, auditable and bound to exact content/claim or transformation—not a global “safe” flag.
8. Unknown labels, lineage breaks and mismatched tenants fail closed for consequential egress.

These form a safe baseline but are not a complete lattice. Sanitization may remove a secret; aggregation may create a new sensitive inference; translation may preserve meaning without bytes; encryption changes exposure but not underlying authorization; and a public plus private fact may reveal a third, more sensitive fact.

## Proposed neutral envelopes

Research labels, not contract changes:

- `InformationLabel`: classification, tenant, data categories, purpose constraints and optional subject/resource references.
- `LineageRef`: source object/version/content hash and transformation edge.
- `FlowContext`: current principals, plan/step/attempt, source labels, destination identity/trust domain and intended purpose.
- `DeclassificationReceipt`: authorized principal, transformation/content hash, input labels, output label, destination/audience, purpose, expiry and policy version.
- `FlowDecision`: allow/deny/require-review with reason and receipt reference.

Secrets and raw protected data must not be copied into audit receipts. Labels must be authenticated through the protected path; caller-supplied labels cannot lower restrictions.

## Composition analysis

Horae should produce a plan graph containing declared reads, writes, model disclosures, tool origins, credentials, dynamic destinations and subworkflow edges. Ananke evaluates both each call and newly created reachability paths. Approval for a plan does not waive per-step live-state checks. If a step produces a protected label that makes a later edge illegal, execution stops even if the later call was originally listed.

Dynamic expressions and model-selected destinations remain unresolved risk until runtime. They require staged approval or a destination allowlist. Nested agents inherit no more authority or data visibility than their parent delegation and receive explicit labels with their context.

## Declassification and sanitization

Declassification is an Ananke decision informed by deterministic transformation evidence. Examples:

- exact secret redaction with verification may permit a narrower output;
- aggregation may permit release only when group-size and inference rules pass;
- code/output scanning may permit `DERIVED_ONLY`, not raw content;
- a human may authorize a specific disclosure, but the receipt must name recipient, purpose and content hash.

An LLM assertion that content is safe is advisory evidence only. Semantic non-verbatim leakage remains a residual risk and should be tested with paraphrase/encoding variants.

## Deterministic test scenarios

1. Read a canary credential from private server A; write ordinary text to public server B—deny when the canary is included.
2. Same task with a legitimate, verified redaction—allow only the sanitized derivative under a declassification receipt.
3. Browser reads a private page then submits a public form—preserve browser-mediated lineage.
4. Private Slack plus public PR reveals an unreleased customer—classify the derived claim as sensitive.
5. Two low-class records jointly reveal a secret—raise derived classification.
6. Tenant A context is passed to a tenant B tool through a gateway—deny.
7. Tool aliases change but downstream origin is identical—policy remains origin-bound.
8. Gateway hides downstream identity—deny consequential call.
9. Model paraphrases a secret rather than copying bytes—semantic detector should flag; deterministic byte taint alone exposes residual risk.
10. Permission revoked after a context pack is cached—pack invalidates before any outgoing call.
11. MRTR server asks for unrelated credential—deny input release and original-call retry.
12. Hard negative: public canary-looking string with no protected lineage—do not flag as a proven leak solely by string form.

## Relationship to content preflight

Preflight determines whether a content surface is safe to expose or admit. Information-flow control determines where already-admitted information may move. A `PASS` preflight receipt does not declassify content; a flow decision does not assert parser safety. Both receipts may be referenced by one Ananke decision but remain distinct.

## Classification

| Capability | Status | Note |
|---|---|---|
| Classification/source references | PARTIALLY_COVERED | Present but not propagated as flow state |
| Cross-server deterministic lineage | MISSING_HIGH_PRIORITY | Core gap |
| Plan-level composition risk | MISSING_HIGH_PRIORITY | Per-tool approval is insufficient |
| Explicit declassification | MISSING_HIGH_PRIORITY | Needs owner decision |
| Semantic leakage detection | EXPERIMENTAL_RESEARCH | Advisory; cannot be sole boundary |
| Global trust score or prompt-only mitigation | REJECT_INCOMPATIBLE | Loses claim, destination and policy context |
