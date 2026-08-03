# MCP 2026-07-28 impact assessment

Date: 2026-08-03

Baseline: [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) compared with 2025-11-25 and the current Fates repositories.

## 1. Breaking-change inventory

- Removes `initialize`/`notifications/initialized`, protocol sessions and `Mcp-Session-Id`.
- Requires per-request protocol version and client capabilities in `_meta`; client identity is recommended per request.
- Requires servers to implement `server/discover`; clients may call it or invoke inline.
- Adds recognized `UnsupportedProtocolVersionError` and explicit modern/legacy/dual-era fallback rules.
- Adds required `resultType`; MRTR uses `input_required` and retries with `inputResponses`.
- Moves asynchronous Tasks into `io.modelcontextprotocol/tasks` with durable handles, polling/update/cancel.
- Replaces several server-initiated requests with MRTR and list-change streams with `subscriptions/listen`.
- Requires HTTP routing headers `Mcp-Method`, `Mcp-Name` and protocol version handling.
- Makes tools/prompts/resources catalogues/read results cacheable with deterministic order, `ttlMs` and `cacheScope`.
- Removes SSE resumability/redelivery and legacy ping/log-level patterns.
- Deprecates Roots, Sampling, Logging, legacy HTTP+SSE and Dynamic Client Registration under the stated minimum twelve-month window; DCR is moving toward Client ID Metadata Documents.
- Adds an extension framework, OAuth Client Credentials and Enterprise-Managed Authorization; hardens issuer/audience/resource rules.

### Official documentation consistency caveat

The current core specification describes a stateless base protocol with self-contained requests and per-request capability negotiation, and the OAuth Client Credentials guide now declares client extension support in per-request metadata and recommends server advertisement through `server/discover`. However, the same core overview still says extensions are negotiated “during initialization,” while current SDK examples retain `connect`/client abstractions that may conceal version-dependent behaviour. Treat extension negotiation and SDK behaviour as feature- and version-dependent until confirmed against the extension schema, conformance suite and pinned SDK implementations. A legacy/modern label alone is insufficient; the compatibility matrix must record initialization, discovery, per-request metadata and each extension independently.

## 2. Current repository dependencies on pre-2026-07-28 MCP semantics

Ananke's adapter imports `Client`/`StdioClientTransport` from `@modelcontextprotocol/sdk` resolved to `1.29.0` and uses connection/list/call patterns with legacy test servers (`server-everything` and `server-memory` `2026.1.26`). No modern `server/discover`, per-request capability metadata, MRTR, cache fields, routing headers or Tasks code was found.

Horae has generic registration/discovery/readiness but no MCP wire adapter. Moirae Code has no centralized production MCP client; an accepted implementation-pending host ADR calls for legacy/modern negotiation. Runtime Contracts exposes descriptive `supportedMcpVersions`/eras and an old fixture containing `2026-01-26`, but no feature matrix. Mnemosyne has no direct MCP SDK dependency. Integration pins Fates commits but not an MCP feature/version matrix.

Multiple ADRs refer to a “MCP 2026-07-28 Stateless Compatibility Architecture” decision that could not be located as a repository artifact. Those references are stale/unresolved, not an accepted migration decision.

## 3. Stateless-core impact

Do not delete Fates logical sessions. Distinguish:

| Concept | Owner/meaning |
|---|---|
| MCP transport session | Removed in modern MCP; legacy adapter concern only |
| Authenticated principal session | Identity provider/host context; never transport proof |
| Runtime/application session | Fates bounded logical context (`RuntimeSession`), transport-independent |
| Orchestration run/workflow execution | Horae durable state |
| Task | Horae durable operation; optional MCP Tasks projection |
| Approval scope | Ananke exact authority/action binding |
| Correlation scope | Cross-runtime observability, not authority |
| Memory conversation/session | Mnemosyne retrieval/history context, not authority |
| Server-issued state handle | Explicit sensitive reference in tool arguments; not permission |

Current `RuntimeSession` documentation already says it is application logical state, which is correct. Rename only if consumers still map it to connection/MCP IDs.

State handles require opaque/high-entropy representation, principal/tenant/audience/purpose binding, expiry/revocation, safe logging, approval-fingerprint inclusion when material, and independent authorization on each use. Possession alone must never authorize.

## 4. Headless authorization threat model

Client Credentials allows background services, CI, scheduled workers and server-to-server clients to authenticate without a human. A token proves the workload credential, not that its proposed tool/effect is permitted. Threats include leaked shared secrets, stolen signing keys, compromised CI, cloned workers, scheduled actions after offboarding/policy change, replay, environment migration, over-broad scopes, runaway cost and absent live approval.

Required invariants:

1. Every headless call crosses Ananke.
2. Service/workload authority is explicit, bounded, expiring and revocable; it is not inherited wholesale from its owner.
3. High-risk classes require live approval or an explicit pre-authorized policy/bounded delegation.
4. Prefer short-lived signed JWT assertions where supported, but validate workload/environment attestation separately.
5. Credentials never enter model, memory, logs, generated files or downstream servers.
6. Budgets, kill switch and independent audit attribution are mandatory for unattended execution.

## 5. Identity and delegation mapping

MCP `clientInfo`, `serverInfo` and capability maps are self-reported metadata. Runtime Contracts needs an explicit distinction between assertion and verification evidence, without implementing verification. Map authenticated human/service/workload as delegating principal; model/agent/runtime as acting principal; represented principal remains separate. Gateway identity and original client identity must both survive forwarding. Server origin/admitted instance/build and response identity must be compared.

Capability declarations describe protocol support, not authority. Expansion/reduction between rounds or retries is material when it changes the action/disclosure path; expansion requires renewed evaluation and may invalidate approval.

## 6. Approval continuity under MRTR

MRTR is a sequence of governed attempts joined by causation, not one indivisible authorization. Horae persists the suspended step and input request; Moirae labels whether input came from human, model, system or credential broker; Ananke compares the new canonical request with the approved fingerprint.

Harmless completion input may preserve an approval only when policy explicitly permits and server/tool/origin/schema, principals, scope, purpose, destination/effect, capability set, live state and expiry remain unchanged. Secrets unrelated to the action, new destinations/amounts, schema/origin changes, expired approvals and model-generated “confirmation” require deny or fresh approval. Retry must reuse idempotency context and never duplicate a partial effect.

## 7. Discovery and cache invalidation rules

Servers must implement discovery, but clients need not call it before every operation. Fates should require a fresh, scoped receipt for consequential calls until inline equivalence is proven. Receipt fields should include origin/instance, asserted identity, supported versions/features/extensions, catalogue/schema hashes, principal/tenant scope, cache metadata, fetched time and verification/admission references.

`ttlMs` and `cacheScope` are untrusted freshness hints, not authority. Local policy sets maximum TTL. Force invalidation on permission/grant/policy revocation, origin/identity/build change, tool/schema/description/capability/version change, tenant/principal change and security quarantine. A cached view never authorizes an execution after material drift.

## 8. Token audience and issuer controls

Clients must request resource-bound tokens; servers validate audience/resource. Record authorization server and validate response issuer to prevent mix-up. Maintain separate registration/credential state per issuer. Never pass an upstream bearer token to another resource server. A gateway uses an approved standards-compliant token exchange/delegation mechanism or protected coarse credential with local Ananke enforcement; otherwise deny. Token metadata may be audited, but bearer values are never logged or remembered. Discovery/CIMD fetches require SSRF and redirect controls.

## 9. Enterprise authorization compatibility

Enterprise-Managed Authorization is compatible with generic dual principals and delegation, but it controls identity and server access, not tool/effect permission. An optional adapter should map ID-JAG/IdP claims to verified principal evidence and bounded Fates scopes; Ananke still evaluates every call. Horae invalidates discovery/catalogue on offboarding/revocation; Mnemosyne propagates ACL changes; Moirae presents SSO/admin configuration and clearly separates “connected,” “tool visible,” “tool callable” and “effect approved.” Extension-specific admin UI is `PRODUCT_LAYER_ONLY`.

## 10. Required migration ADRs

Do not create them in this task. Recommended decisions:

1. **MCP 2026-07-28 dual-era version-support and deprecation policy**—modern/legacy matrix, fallback/downgrade rules, SDK policy and retirement criteria.
2. **MCP discovery, origin, cache and approval binding**—receipt fields, verification/admission, invalidation and gateway chain.
3. **MRTR/Tasks durable workflow and approval continuity**—state, input provenance, idempotency and cancellation.
4. **Headless workload authorization and credential broker**—attestation, risk classes, grants, token exchange/audience/issuer and kill controls.

These may amend existing ADR-0003/0004 and consumer ADRs rather than duplicate accepted decisions; owners must resolve the currently missing related-decision artifact.

## 11. Required compatibility tests

Use the `SEC-26-*` cases in [the security catalogue](./fates-security-test-catalogue.md), plus a four-cell modern/legacy/dual-era client-server matrix over stdio and Streamable HTTP. Cover discovery optionality, recognized versus unrecognized fallback errors, no handshake/session assumptions, required result type, header/body mismatch, cache invalidation, MRTR inputs/expiry/schema drift/idempotency, Tasks resume/cancel, subscription/cancellation behaviour, audience/issuer/mix-up, headless clone and enterprise revocation. Prove equivalent actions reach identical Ananke decisions across eras.

## 12. Recommended version-support policy

- Current product code remains pinned to its tested legacy SDK/servers until the ADR and fixtures pass.
- Add `2026-07-28` as a supported version only after an official-SDK modern adapter and conformance suite pass; descriptive manifest edits alone are prohibited.
- Prefer a dual-era adapter at the Horae/Moirae boundary during the deprecation window; modern is preferred, legacy fallback explicit and observable.
- Never auto-downgrade for consequential calls outside an allowed version policy.
- Maintain a feature matrix, not only version strings: discovery, MRTR, Tasks, cache, headers, subscriptions, auth extensions and deprecated features.
- Pin SDK/package releases and protocol fixtures in Integration; no copied MCP types in generic contracts.
- Set legacy retirement by evidence and upstream needs, respecting the official minimum deprecation window but not promising support indefinitely.

## 13. Whether this blocks the next integration slice

It blocks any slice whose goal is modern/remote/headless MCP execution or a claim of current-MCP compatibility. It does not block documentation, local contract-neutral cleanup, benchmark work, or the next narrow transport-neutral Moirae/Horae → Ananke action-decision round trip. That slice must preserve origin/schema identity and correlation without claiming MCP 2026-07-28 compatibility. Version support, `server/discover`, routing headers, MRTR/Tasks and headless authorization become blocking only when the slice enables or claims those capability classes; persistent idempotency becomes blocking before any retryable external effect.
