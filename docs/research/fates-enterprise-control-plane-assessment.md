# Fates enterprise control-plane assessment

## Conclusion

OptScale's public material validates operational expectations but does not justify placing an enterprise dashboard or anomaly product in the Fates core. Registration, resource allowlists, deterministic budgets, revocation and emergency stop are fundamental governance primitives. Fleet views, cost analytics, alert feeds, comparative rankings, incident dashboards and compliance exports are product projections over trusted events. Product claims were not independently performance-tested.

## Capability comparison

| Enterprise expectation | Current Fates state | Classification | Owner/action |
|---|---|---|---|
| Agent/runtime registration and ownership | Horae registration/admission and RuntimeRegistration exist | PARTIALLY_COVERED | Connect to governed runtime path; add owner/attestation evidence |
| Heartbeat, freshness, health, readiness | Implemented in Horae Stage A | COVERED_BUT_UNPROVEN | Prove startup/failure in Integration |
| Tool/server/data-store allowlist | Ananke policy can bind server/tool/scope; no complete runtime admission path | PARTIALLY_COVERED | Ananke admission decision + Horae origin receipt |
| Cost/token/time/tool-call budgets | Partial SessionBudget fields only | MISSING_HIGH_PRIORITY | Neutral budget envelope; Horae counts, Ananke stops/authorizes increases |
| Recursion/spawn/concurrency/rate limits | Absent | MISSING_HIGH_PRIORITY | Add deterministic limits after owner decision |
| Auto-stop/kill switch | Cancellation vocabulary only | MISSING_HIGH_PRIORITY | Emergency stop/revocation design and tests |
| Capability/model/provider drift | Model/provider events and registration freshness exist separately | PARTIALLY_COVERED | Join drift events to approval/cache invalidation |
| Loop/drift/token-burst anomalies | Absent | PRODUCT_LAYER_ONLY | Advisory detection in operations layer after deterministic counters |
| Runtime tracing and incident timeline | Correlation/lifecycle/audit envelopes exist | PARTIALLY_COVERED | Durable joined projection; tamper evidence decision |
| Audit export | Local audit structures, not fleet export | PRODUCT_LAYER_ONLY | Moirae/enterprise adapter |
| Fleet policy distribution | No distribution/acknowledgement protocol | MISSING_MEDIUM_PRIORITY | Ananke policy-version distribution/ack evidence |
| Tenant isolation | Scopes and classifications exist; end-to-end proof absent | COVERED_BUT_UNPROVEN | Cross-runtime negative tests |
| Dashboard, alerts, rankings, FinOps views | Absent by design | PRODUCT_LAYER_ONLY | Moirae Code or separate enterprise product |

## Budget model

Budgets must be goal/workflow-scoped and deterministic. Suggested dimensions are wall-clock duration, model input/output/total tokens, monetary cost, tool calls, writes, approval requests, retries, recursion depth, spawned agents, concurrent steps, requests per interval and externally defined risk/action units.

Runtime Contracts may define requested/effective limits and consumption snapshots. Horae owns counters and orchestration stop. Ananke authorizes the effective budget, any increase and consequential step after exhaustion. Provider/model adapters report signed or reconciled usage where available; estimated use is explicitly marked. Moirae displays consumption and stop reasons.

Budgets persist across retries, provider fallback, process restart, MRTR and spawned/nested agents. A child receives a sub-budget; it does not reset the parent. A cheaper model fallback may not reset tokens/time or change disclosure/action policy. Counter failure fails closed for an autonomous consequential path.

## Emergency stop

Stop scopes should include grant, workflow, agent, runtime, integration/server, tenant and fleet. Activation must:

1. prevent new Ananke admissions;
2. revoke or mark affected grants/approvals unusable;
3. signal Horae cancellation for in-flight work;
4. quarantine affected catalogues/state handles where appropriate;
5. report actions that may continue because the external system is non-cancellable;
6. preserve an incident timeline without secrets.

Re-enable requires explicit authority and current admission/readiness checks. A kill switch is not merely a UI button.

## Monitoring versus enforcement

Deterministic limits, deny-by-default origin/tool/resource policy, identity/tenant checks, approval mutation rules and token audience validation are enforcement. Loop/drift classification, unusual-hour alerts, behavioural baselines and cost forecasts are detection. Detection may cause a conservative deterministic stop policy, but a probabilistic “normal” score cannot authorize a call.

OptScale claims millisecond blocking and under-50ms routing in early use; these are vendor claims. Fates should define its own latency budgets and measure policy, preflight, discovery refresh, retrieval and broker overhead separately. Security decisions must not be skipped to meet a dashboard target.

## Registration and fleet identity

Self-declared agent names or MCP `clientInfo` are inventory hints only. Production registration needs verified workload/runtime identity, owner/delegator, tenant, environment, build/revision, admitted capabilities/origins, policy version and revocation state. Changes create events and may invalidate approvals or quarantine the runtime. Horae records/discovers; Ananke decides admission; Moirae projects the inventory.

## Product boundary

Keep out of Runtime Contracts and core policy:

- dashboards, charts, comparative agent scores and team rankings;
- billing-account integrations and invoice forecasts;
- alert-channel integrations and case-management UI;
- vendor-specific framework instrumentation;
- compliance conclusions or legal mappings.

Portable events should make those products possible without making them mandatory.

## Recommended tests

- token/cost/time exhaustion between plan steps;
- recursion and two-agent ping-pong;
- child agent attempts a fresh budget;
- concurrency race overshoots a shared budget;
- provider fallback preserves consumption and disclosure policy;
- restart/resume preserves counters;
- kill during external in-flight effect;
- tenant kill does not affect another tenant;
- policy version changes while agent is offline;
- unregistered/cloned workload uses valid-looking `clientInfo`;
- health succeeds while readiness/catalogue is incomplete;
- capability/model/provider drift invalidates approval.
