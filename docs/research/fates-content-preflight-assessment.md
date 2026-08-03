# Fates Content Surface Preflight assessment

## Conclusion

The ownership split previously proposed remains correct and should be finalized, not reinvented. Ananke's local opt-in JSON heuristic proves a narrow seam but not ecosystem coverage. Shared neutral envelopes need an owner decision; required routing, source-aware inspection, receipt invalidation and cross-runtime tests are missing. Overall status: `PARTIALLY_COVERED`; shared contract decision: `NEEDS_OWNER_DECISION`.

## Boundary

Content Surface Preflight is deterministic inspection before content reaches a model, durable memory or executable workflow. It is not an Ananke policy decision, a Mnemosyne reliability score, malware immunity or proof that content is true.

| Owner | Responsibility |
|---|---|
| Runtime Contracts | Generic request, finding, outcome and receipt envelopes; no parser/scanner/policy implementation. |
| Horae | Route required surfaces through configured stages, preserve correlation and refuse stale/missing receipts. |
| Ananke | Decide whether findings/outcomes allow the intended exposure, memory admission or action. |
| Mnemosyne | Preserve source/receipt provenance and prevent unproven/unsafe content entering durable memory. |
| Moirae Code | Present findings, review, quarantine and derived-only choices. |
| Inspector implementation | Parse, recurse, extract and scan; lives outside Runtime Contracts and may be replaceable. |

## Surfaces

Files, archives, PDFs, images/OCR, office documents, scripts, source code, web pages, tool results, MCP resources, Slack/email/issues/PR descriptions, workflow JSON, tool descriptions/schemas, generated artifacts and nested attachments all require a surface profile. Tool metadata and returned content must not be exempt merely because transport is trusted.

## Required deterministic checks

- media/file type identification and parser selection;
- byte and extracted-size limits, time limits and depth limits;
- archive recursion, path traversal, absolute paths, symlinks and decompression ratio;
- malformed/unsupported/partially extracted documents;
- embedded scripts, macros, executables and active external content;
- hidden/invisible/encoded instruction indicators;
- secrets, credentials, sensitive identifiers and external links;
- source-specific structure: workflow nodes/expressions, MCP descriptions/schemas, office relationships, image OCR provenance;
- output provenance and exact content/extraction hash.

Prompt-injection indicators are findings, not proof of malicious intent. A classifier may enrich findings but cannot replace deterministic exposure/authority controls.

## Outcomes

Retain the proposed vocabulary, subject to the owner decision:

| Outcome | Semantics |
|---|---|
| `PASS` | Inspection completed under the named profile with no blocking finding. It does not mean trusted or true. |
| `PASS_WITH_FLAGS` | Exposure may proceed only if Ananke policy accepts the specific findings and destination. |
| `DERIVED_ONLY` | Raw content is withheld; only a bounded, provenance-linked derivative may be exposed. |
| `QUARANTINED` | Content is isolated pending review or deletion. |
| `UNSUPPORTED` | No approved parser/profile can produce adequate evidence. |
| `RESOURCE_LIMIT_EXCEEDED` | Inspection stopped at a deterministic bound; must not degrade to pass. |
| `INSPECTION_FAILED` | Parser/scanner/system failure; fail closed for protected exposure/admission. |

## Receipt requirements

A receipt should contain content hash, source identity/version, media type, byte size, extraction/profile ID and version, parser/scanner identities and versions, recursion/limit configuration, findings with locations, outcome, derived-object hashes, timestamps, correlation, tenant/scope and expiry/invalidation references. It must not contain recovered secrets unless a protected finding vault is explicitly designed.

The receipt is invalid when bytes, source revision, extraction profile, parser/scanner version, relevant policy-required check, nested member or source ACL materially changes. A remote URL alone is never a stable content identity.

## Receipt bridge

1. Horae obtains a receipt for the exact source object.
2. Ananke binds its exposure/admission decision to receipt ID, content hash, findings, destination/purpose and policy version.
3. Mnemosyne stores the receipt/source references with admitted records.
4. A later action referencing derived content carries both provenance and current receipt validity.
5. Any invalidation propagates to derived memories, context packs, workflow plans and approvals.

A receipt is not reusable across tenants or destinations unless its scope explicitly permits it. `PASS` is not an approval, declassification or execution grant.

## Progressive disclosure and dangerous defaults

Metadata-only or `DERIVED_ONLY` views should be the default for executable files, macros, scripts, unknown archives, untrusted workflows and tool-returned documents until raw exposure is justified. Derived text must retain source offsets/pages/objects where possible and be scanned again because extraction can reveal hidden instructions.

Secret lexicons and credential patterns must remain outside model-visible findings. Findings should use category, location and one-way token/fingerprint where needed for correlation.

## Current gap by Fate

| Fate | Current state | Status |
|---|---|---|
| Runtime Contracts | Proposed design gate; no accepted shared schema | NEEDS_OWNER_DECISION |
| Ananke | Accepted local opt-in slice and JSON heuristic | PARTIALLY_COVERED |
| Mnemosyne | Admission gate refers to preflight; onboarding bypasses it | DOCUMENTED_NOT_IMPLEMENTED |
| Horae | Preflight is proposed/deferred; no mandatory router | DOCUMENTED_NOT_IMPLEMENTED |
| Moirae Code | UI/inspection concepts proposed; no full host integration | DOCUMENTED_NOT_IMPLEMENTED |
| Integration | No multi-surface conformance/adversarial fixtures | MISSING_HIGH_PRIORITY |

## Minimum tests before implementation claims

- nested archive traversal and symlink escape;
- decompression bomb and extracted-size cap;
- malformed PDF/office partial extraction;
- macro/script/executable finding;
- hidden/encoded instruction in document/image/tool description/result;
- secret finding redacted from audit/model;
- unsupported parser and inspector outage fail closed;
- file changes after receipt and before model/memory/execution;
- nested attachment changes while parent hash metadata is stale;
- `DERIVED_ONLY` raw-access attempt;
- cross-tenant receipt replay;
- poisoned tool result attempting memory admission;
- preflight pass followed by disallowed information flow.
