# Fates Restart Assessment — 2026-08-02

## Executive summary

The six local repositories were inventoried, fetched, compared with their upstreams, and
validated at their recorded commits. Five repositories were clean at the start of the review.
Project Horae was already dirty with one modified IDE cache and three untracked documentation
files; it was inspected read-only and was not branched, reset, rebased, pulled, or edited.

The Stage-A Runtime Contracts foundation is materially healthier than the older planning
documents suggest:

- Project Adrasteia is the canonical project and repository identity for the shared contracts.
- The package is `project-runtime-contracts@0.4.0`; the Fates Runtime Protocol is independently
  versioned at `1.4.0` with supported range `1.0.0` through `1.4.0`.
- Ananke, Horae, Mnemosyne, and Moirae Code all consume the same immutable release asset and
  digest rather than a mutable branch or sibling checkout.
- Semantic range negotiation and typed incompatibility reasons replaced the older Horae exact
  `0.1.0` behaviour.
- Moirae Code's former portable-contract copy is now a deprecated re-export facade; its
  host-specific contracts remain local.
- Context-window tokens, transcript confidence, portable locale validation, and immutable
  provider/model-change records are implemented, documented by accepted ADR-0002, and covered
  by the 400-test Runtime Contracts suite.

The integration control repository remained the highest-priority repair. Its main validation
command passed, but it compiled Draft 2020-12 schemas with the default Ajv dialect after deleting
the meta-schema declaration, enumerated evidence files by hand, and labelled assertion examples
as negative tests without passing corrupted evidence through the production validator. Commit
`93faf99` repairs that foundation by using Ajv's Draft 2020-12 entry point, discovering current
snapshots/slices/handoffs, adding four genuine invalid fixtures, and exercising them through the
production validation functions. `npm run validate` now passes 53 tests.

No Fate repository checkpoint was advanced. `fates-lock.json` remains the correct Stage-A lock;
changing it for an integration-control-only repair would falsely claim new component evidence.

## Method and evidence boundary

Evidence was taken from repository state, tracked source and tests, accepted ADR indexes,
package and lock manifests, CI workflows, pinned-release verification commands, and local test
results. All six remotes were fetched with `git fetch --prune origin` before upstream state was
assessed. Live GitHub Actions run status was not queried; this report records workflow
configuration and local reproduction, not a claim that the latest hosted run is green.

The initial multi-repository `npm ci` loop reached its 604-second command limit before emitting
per-repository results. It is therefore recorded as a failed installation baseline, not as a
successful clean install. Subsequent `npm ls --depth=0` passed in every repository and all
dependency trees were usable. No tracked manifest or lockfile changed.

## A. Repository inventory

All ahead/behind values below were measured after fetch. Every upstream was `0 ahead / 0 behind`;
therefore no `git pull --ff-only` was necessary.

| Repository | Role | Branch and starting HEAD | Local and remote state | Package / protocol | Local validation result | CI configuration and current work | Blockers and stale documentation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project Adrasteia (`D:/Users/fleur/Project Runtime Contracts`) | Portable representation, structural validation, version compatibility | `main` at `124b6aee2629a3147739934ad5f1b45b32c8ba46`; upstream `origin/main` | Clean; `0/0`; origin `https://github.com/hourwise/Project-Adrasteia.git` | `project-runtime-contracts@0.4.0`; protocol `1.4.0`, minimum `1.0.0` | Typecheck and build pass; 23 files / 400 tests pass; 90 adoption fixtures pass; package-content verification passes (194 files) | CI runs Node 20, `npm ci`, full validate, fixtures, packed smoke, pinned Ananke consumer, package verification, and whitespace checks. Most recent work: Project Adrasteia identity adoption. | Package publication authority and future scoped name remain gated. `README.md` and `contract-ownership-matrix.md` still say sibling manifests do not consume this package; that became stale after the July 18–19 Stage-A adoption commits. |
| Project Ananke (`D:/Users/fleur/Project Ananke`) | Action authority, policy, approvals, governed execution and authoritative action audit | `main` at `dcbb115c5798072221afdd2e4fdd36e786defddf`; upstream `origin/main` | Clean; `0/0`; origin `https://github.com/hourwise/Project-Ananke.git` | `ananke@0.1.0`; protocol `1.4.0`, minimum `1.0.0`; immutable Adrasteia tarball in adapter | Build and lint pass; 15 files / 119 tests pass; 10 Adrasteia conformance tests pass; baseline pin verification passes | CI runs Node 22.12, environment check, pin verification, build/lint/tests, conformance, benchmark, filesystem demo, gateway smoke, and report upload. Most recent work: Stage-A adapter adoption. | Governed cross-runtime action transport, persistent replay/idempotency, credential broker, and durable approvals remain absent. `docs/ROADMAP.md` reports 92 tests, behind the observed 119. |
| Project Horae (`D:/Users/fleur/Project Horae`) | Discovery, admission, capability reduction, composition, orchestration, freshness and degradation | `main` at `52e14fa574f7427f62747fe84d2789aec25b94e3`; upstream `origin/main` | **Dirty before review**: modified `.idea/caches/deviceStreaming.xml`; untracked `docs/ADR-XXXX-dual-principal-context-and-compatibility.md`, `docs/ADR-XXXX-fates-dual-principal-and-compatibility-contract.md`, and `docs/Project-Horae.txt`; `0/0` | `horae@0.1.0`; protocol `1.4.0`, minimum `1.0.0`; exact Adrasteia release dependency | Build and lint pass; 1 file / 10 tests pass; 10 focused conformance tests pass; remote tag/artifact pin verification passes | CI runs Node 22, pin verification, build/lint/tests, two peer comparators, bench, CLI and composition checks. Most recent tracked work: Stage-A composition boundary. | No governed-action, qualified-context, durable workflow, or recovery transport. The untracked durable-workflow ADR is Proposed and the older untracked adoption ADR says implementation pending; neither is indexed current authority. Repository left untouched to preserve user work. |
| Project Mnemosyne (`D:/Users/fleur/Project Mnemosyne`) | Governed memory, provenance, qualification, conflicts, retrieval, history and authoritative memory audit | `main` at `f4ab76a9760f856d78908d35facceb068d78c8e5`; upstream `origin/main` | Clean; `0/0`; origin `https://github.com/hourwise/Project-Mnemosyne.git` | `mnemosyne@0.1.0`; protocol `1.4.0`, minimum `1.0.0`; exact Adrasteia release dependency | Build and lint pass; 17 files / 82 tests pass; standalone canonical-context conformance passes; remote artifact/pin verification passes | CI runs Node 22, pin verification, build/lint/tests, Ananke comparator, bench, demos, inspection smoke and whitespace check. Most recent work: Stage-A memory boundary. | No cross-runtime qualified-context transport, receipt-gated admission, active grant verification, inbound Ananke decision transport, or state-handle service. README says the demo is immediate while the roadmap prioritises provenance admission; the roadmap itself records this conflict. |
| Project Moirae Code (`D:/Users/fleur/Project Moirae Code`) | Governed host and user-facing control/status surface | `main` at `a4783db271a61848c66ac4f6652a539bdb515e28`; upstream `origin/main` | Clean; `0/0`; origin `https://github.com/hourwise/Project-Moirae-Code.git` | `moirae-code@0.1.0`; protocol `1.4.0`, minimum `1.0.0`; exact Adrasteia release dependency | Build passes; lint passes with 23 warnings / 0 errors; 10 files / 131 tests pass; Adrasteia artifact and all three peer tags verify | CI runs Node 24, environment/pin/peer verification, build/lint/format/tests, diagnostics and production-dependency audit. Most recent work: Stage-A host boundary. | Checkpoint is pushed but untagged, so Stage-A remains provisional. No governed handoff, qualified retrieval, Horae session transport, sandbox execution, or preflight. Large portions of README/ROADMAP still say Horae has no code, Runtime Contracts is `1.1.0`, and older test counts; the Stage-A header correctly warns that this prose is history. |
| Project Fates Integration (`D:/Users/fleur/Project-Fates-Integration`) | Compatibility/evidence control repository; no runtime authority | Started on `main` at `13e15dea5552ab512d58e945523475cd51b82886`; work branch `codex/restart-assessment-scaffold-validation`; repair `93faf99` | Clean before review; `0/0`; origin `https://github.com/hourwise/Project-Fates-Integration.git` | `project-fates-integration@0.1.0`; lock protocol `1.4.0`, minimum `1.0.0` | Baseline: 48 tests passed. After repair: all JSON evidence and verifiers pass; 53 tests pass | CI runs Node 22, `npm ci`, `npm run validate`, and whitespace check. Most recent starting work: scaffold hardening and checkpoint semantics. | No live cross-runtime scenario yet. Remote checkpoint existence is verified by consumer scripts, not by the integration validator itself. Stage-A-specific assumptions remain in matrix/slice verifiers and older tests. |

## B. Contract compatibility matrix

### Canonical identity and distribution

| Concern | Verified state | Evidence and consequence |
| --- | --- | --- |
| Project identity | Project Adrasteia | Accepted ADR-0006 and current repository URL. Old `Project Runtime Contracts` naming is historical. |
| Package identity | `project-runtime-contracts@0.4.0` | `package.json`, all consumer manifests/locks, and the pinned asset URL. The future `@fates/runtime-contracts` name is intent only. |
| Protocol identity | Fates Runtime Protocol `1.4.0`; minimum `1.0.0` | `ProtocolVersion.ts`, compatibility manifests and every Stage-A adapter. Package and protocol numbers are not interchangeable. |
| Immutable artifact | Release tarball with SHA-256 `11ee062b079f74d2a4558af315c9b9b12a6aede291d409c48f038d93c416e2c2` | Verified by Runtime Contracts package checks and the Horae, Mnemosyne and Moirae verification scripts. |
| Immutable source | Adrasteia commit `124b6aee2629a3147739934ad5f1b45b32c8ba46` and tag `adrasteia-adoption-v0.4.0-protocol-1.4.0` | Recorded in all baseline manifests and the integration lock. |

### Producer and consumer comparison

| Consumer | Import/pin | Protocol behaviour | Local extensions or duplicates | Unsupported-protocol behaviour |
| --- | --- | --- | --- | --- |
| Ananke | Adapter depends on the exact release asset; package lock resolves `0.4.0` | Canonical `negotiateDetailed`, range `1.0.0–1.4.0` | `GovernedExecutionContext` adds Ananke-owned policy/scope/correlation semantics; deprecated local identity alias delegates to the adapter | Returns typed `malformed_version`, `invalid_range`, `unsupported_major`, or `no_overlap`; incompatible requests fail before execution |
| Horae | Root exact release dependency | Canonical semantic negotiation replaced exact `0.1.0` matching | Portable types are imported/re-exported; admission, freshness, lifecycle, composition and session records remain Horae-owned | Registry admission records `incompatible` and refuses registration/composition |
| Mnemosyne | Root exact release dependency | Canonical `negotiateDetailed`, range `1.0.0–1.4.0` | Memory, provenance, reliability and context-pack types are deliberately local domain contracts; portable principals/references are imported | Negotiation returns typed failure; governed operations also fail closed on scope/tenant/project/workspace conflict |
| Moirae Code | Root exact release dependency | Canonical semantic negotiation | `@moirae/runtime-contracts` is a deprecated re-export-only facade, not a copied portable implementation; `@moirae/host-contracts` contains host-only shapes | Stage-A clients expose inspection only and throw typed unavailable-boundary errors for Ananke actions, Mnemosyne retrieval and Horae sessions |

No consumer uses a mutable `main` dependency, a local sibling path, or a copied protocol
implementation for Stage-A portable contracts. Local package versions remain `0.1.0`; those
versions do not claim to equal the shared protocol version.

### Previously unresolved Runtime Contracts areas

| Area | Status | Evidence |
| --- | --- | --- |
| Context-window token fields | Fixed and verified | `ContextWindowSchema` accepts finite positive integer native-token capacity; omission is unknown/undeclared. Focused tests reject zero, negative, fractional and non-finite values. |
| Transcript confidence | Fixed and verified | Optional finite inclusive `0..1`; omission differs from zero; focused transcript tests cover bounds. |
| Locale validation | Fixed and verified | Portable Locale Profile combines platform BCP 47 structure with a two/three-letter-or-`und` primary-subtag rule and separates opaque `producerLocaleLabel`. |
| Provider/model-change event fields | Fixed and verified | Specialized immutable event requires runtime instance, correlation, causation, sequence, time, previous/current selection and a closed reason; initial and no-change cases are checked. |

### Remaining compatibility limits

- Negotiation algorithm and descriptive manifests exist, but no standard wire exchange or
  authoritative deployment sequencing is defined.
- Capability identifiers are open strings and no portable algorithm decides how an unknown
  capability is mapped, ignored, hidden, or rejected.
- Content preflight is intentionally absent from Stage-A; Ananke's implementation is local and
  no cross-runtime compatibility claim exists.
- The integration lock records exact commits but the integration validator does not itself
  prove that every tag resolves to its recorded commit or that every commit remains remotely
  reachable. Consumer verification scripts currently provide that external check.

## C. Ownership matrix

Portable representation and domain authority are intentionally separate. The authoritative
owner column identifies the single owner of the behaviour or fact; Adrasteia remains the shared
shape owner where noted.

| Responsibility | Authoritative owner | Boundary and current gap |
| --- | --- | --- |
| Runtime identity | The runtime being described | Adrasteia owns the portable shape. No registry or documentation entry can overwrite a runtime's signed/trusted local identity fact. |
| Dual-principal identity | Trusted authentication/host ingress | Adrasteia owns the pair shape; Ananke independently verifies it for action authority. Model or memory content cannot supply trusted principals. |
| Tenant and resource scope | Ananke for action enforcement | Adrasteia owns the portable bounded/unscoped declaration. Mnemosyne separately enforces its memory/project boundary. Wildcards remain prohibited. |
| Capability declarations | Producing runtime | Adrasteia owns representation. Horae may reduce or hide capabilities but cannot expand or authorise them. |
| Runtime registration and discovery | Horae | Peer registration is evidence only until Horae validates and admits it. Discovery never grants authority. |
| Health and readiness | Producing runtime | Horae owns observation freshness and degradation coordination, not the peer's health fact. |
| Protocol negotiation | Horae | Adrasteia owns the pure semantic algorithm and result shape. Real host-led/peer-led sequencing remains undocumented. |
| Correlation identifiers | Initiating trusted caller | Adrasteia owns the shape; Horae propagates them. Each producing runtime owns its own event ID. Correlation never transfers audit or decision ownership. |
| Delegation and grant envelopes | Ananke | Adrasteia owns portable descriptors. No current cross-runtime grant verification or credential minting exists. |
| Policy decisions | Ananke | Deterministic policy remains local to Ananke and is never inferred from Runtime Contracts metadata. |
| Approvals | Ananke | Moirae presents status/UX and Horae may suspend orchestration; neither approves. |
| Execution | Ananke | Tool/broker execution must remain behind Ananke's chokepoint. Moirae's Stage-A sandbox correctly reports unavailable. |
| Orchestration | Horae | Current Stage-A work is inspection/composition validation only; durable workflow state is proposed in untracked documentation, not accepted implementation. |
| Memory admission | Mnemosyne | Receipt-gated provenance admission remains incomplete and explicitly gated. |
| Provenance | Mnemosyne | Source-level provenance exists; claim-level bindings and shared preflight references remain incomplete. |
| Retrieval qualification | Mnemosyne | Reliability, stale/conflict warnings and access classification exist; no cross-runtime qualified-context envelope is accepted yet. |
| Audit event origination | Runtime that performs the domain action | Ananke originates action audit; Mnemosyne memory audit; Horae orchestration events. An aggregate timeline is not authoritative audit. |
| Audit persistence | Originating domain runtime | No universal audit database owner is assigned. The integration repository stores evidence only. |
| Content preflight | Ananke | Ananke owns observation interpretation, decision, approval binding and enforcement. Mnemosyne owns memory admission and Moirae owns UX. Cross-runtime transport semantics remain gated. |
| User-facing status and explanation | Moirae Code | Must distinguish proposals, evidence, decisions, ungoverned paths and unavailable controls without reimplementing authority. |

No circular authority was found in the current Stage-A code. The most important missing
ownership decision is protocol-negotiation sequencing at deployment time. Audit persistence is
distributed by domain rather than duplicated under a universal owner.

## D. Integration scaffold assessment

| Previously identified problem | Status on 2026-08-02 | Evidence |
| --- | --- | --- |
| Inconsistent seal state | **Fixed and verified** | Lock, historical snapshot, Stage-A matrix row and slice all say `provisional`; Moirae is consistently `pushed_untagged`. Validation checks lock/snapshot status. |
| Partial/hand-written schema validation instead of canonical Ajv | **Fixed in this session** | `scripts/validate-json.mjs` now uses `ajv/dist/2020.js` without deleting `$schema`, compiles all canonical schemas, and exposes the same validator to tests. Hand-written semantic verifiers remain additional invariants rather than schema substitutes. |
| Tests omitted from main validation or CI | **Fixed and verified** | `scripts/validate.mjs` runs JSON validation, all verifiers and `node --test`; CI runs `npm run validate`. Baseline and repaired commands both passed. |
| Insufficient genuine negative fixtures | **Fixed in this session** | Four invalid JSON fixtures cover active-without-ID, completed-handoff-without-ending-commit, planned-matrix-with-checkpoints and completed-slice-without-evidence. All are rejected by production validation functions. |
| Hard-coded Stage-A lock verification | **Partially fixed** | JSON evidence discovery is now dynamic. `verify-slices.mjs`, `verify-compatibility-matrix.mjs`, and older tests still contain explicit `FATES-SLICE-001` rules. These historical assertions should be separated from generic advancement rules. |
| Incorrect Mnemosyne audit ownership | **Fixed and verified** | `docs/architecture-laws.md` and README assign authoritative memory audit to Mnemosyne while preserving action audit in Ananke and orchestration events in Horae. |
| Incorrect template schema paths | **Fixed and verified** | Template slice and handoff `$schema` paths resolve; tests and the canonical validator pass. |
| Weak ignore rules or repository-boundary checks | **Partially fixed** | `.gitignore` covers dependencies, editor state, local reports, peer checkouts and archives; boundary checks reject peer folders, submodules, local dependencies, mutable GitHub refs and archives. The scanner intentionally skips dot-directories and does not inspect arbitrary text for embedded peer source, so coverage is not exhaustive. |
| Mutable branch state instead of pinned commits | **Partially fixed** | Lock/matrix/snapshot use exact commits and tags, dependencies use an immutable asset/digest, and remote peer verifiers passed. The integration command itself does not resolve tag-to-commit or artifact digest, so reproducibility still depends on consumer scripts. |

The repair commit is `93faf99` on branch
`codex/restart-assessment-scaffold-validation`. It does not advance a Fate checkpoint or the
Stage-A compatibility set.

## E. Documentation and ADR gap analysis

Existing documents were preferred over new overlapping ADR proposals. The recommendation
column deliberately limits new decision records to gaps that need a distinct owner decision.

| Area | Existing coverage | Verified gap | Recommendation |
| --- | --- | --- | --- |
| Untrusted content and tool-output preflight | Ananke has an accepted local enforcement ADR and threat-model coverage; Runtime Contracts, Horae, Mnemosyne and Moirae have existing proposed/gated ADRs | No accepted cross-owner transport semantics for taint/provenance, destination/admission, receipt authority, expiry, quarantine/promotion or prevention of tool content acquiring authority. Ananke preflight is opt-in and its threat model records metadata/output gaps. | **Defer with explicit decision gate**, then amend the existing Runtime Contracts preflight proposal after Ananke/Mnemosyne/Horae/Moirae agree on neutral fields. Add focused threat-model sections to existing component documents; do not create another overlapping ADR. |
| Multi-tool and capability arbitration | Horae Stage-A tests cover capability reduction, required/optional sets and provider conflict rejection; the untracked proposed workflow ADR discusses retries and idempotency | No accepted transaction boundary, nested invocation rule, budget, partial-success model, compensation, cancellation or timeout contract. | **Create one new Horae ADR** for multi-tool transaction/orchestration semantics after the untracked proposal is reconciled, plus an **integration-test specification**. Keep Ananke authorisation per action. |
| Mnemosyne retrieval reliability | Reliability, decay, conflicts, source references, access classification and context-pack warnings are implemented | No accepted cross-runtime qualified-evidence envelope with explicit stale/contradictory/insufficient status, confidence semantics and abstention. | **Create one Mnemosyne-owned ADR** for the qualified-context slice and add consumer fixtures. Do not move reliability algorithms into Adrasteia. |
| Performance and enforcement latency | Ananke docs promise a minimal-latency safe-read path; Moirae risk register notes governance overhead | No measured SLO, instrumentation contract, cache-safety rule, or integration latency budget. | Add a **performance/SLO document** in the integration repository with per-risk-class budgets and measurement method. Add benchmarks only after the governed-action transport exists. |
| Degraded operation and bypass resistance | Component manifests declare degraded modes; accepted chokepoint laws prohibit bypass; Stage-A clients fail closed | No end-to-end operational matrix for Ananke/Horae/Mnemosyne outage, stale approval/state, audit continuity or emergency recovery. | Add an **operational runbook** and **integration-test specification**. Amend existing degraded-mode docs rather than creating a broad new architecture ADR. |
| Adversarial integration testing | Ananke, Mnemosyne and Moirae have component/adversarial tests; Stage-A has contract conformance | No pinned cross-repository suite for poisoned memory, malicious descriptions, replayed grants, changed state, principal mismatch, forged provenance, partial multi-tool failure or chokepoint bypass. | Add an **integration-test specification** now; implement cases incrementally with FATES-SLICE-002 and FATES-SLICE-003. |

## F. Executable baseline

| Repository | Install/dependency state | Build/typecheck | Lint | Tests and contract checks | Result category |
| --- | --- | --- | --- | --- | --- |
| Adrasteia | Multi-repo `npm ci` timed out; `npm ls --depth=0` passed | Typecheck and build pass | No lint script | 400 tests, 90 fixture tests and package-content verification pass | Green after permission-aware retry |
| Ananke | `npm ls --depth=0` passed | Build passes | Pass | 119 tests, 10 conformance tests and pin verification pass | Green |
| Horae | `npm ls --depth=0` passed | Build passes | Pass | 10 tests, 10 conformance tests and artifact verification pass | Green; initial Vitest run was sandbox-blocked before config load |
| Mnemosyne | `npm ls --depth=0` passed | Build passes | Pass | 82 tests, canonical-context conformance and artifact verification pass | Green; initial Vitest run was sandbox-blocked before config load |
| Moirae Code | `npm ls --depth=0` passed | Build passes | Pass with 23 warnings | 131 tests, artifact verification and three peer-tag verifications pass | Green with lint debt; initial Vitest/network checks were sandbox-blocked |
| Fates Integration | `npm ls --depth=0` passed | No build/typecheck script | No lint script | Baseline 48 tests; repaired validation 53 tests and all evidence/verifiers pass | Green |

The permission-aware retry changed no source. Initial failures were classified from concrete
errors: Vitest/esbuild could not read the parent directory, npm could not write its cache, and
remote verification could not reach GitHub. Each passed when rerun with the required permission.

## G. Remaining work in dependency order

1. Generalise integration checkpoint verification: resolve every recorded tag to its exact
   commit, verify commit reachability and artifact digests, and make online/offline evidence
   modes explicit.
2. Remove residual Stage-A assumptions from generic matrix/slice advancement logic while
   retaining Stage-A assertions as immutable historical snapshot tests.
3. Reconcile Horae's tracked Stage-A ADR with the untracked durable-workflow proposal; decide
   workflow persistence, idempotency, changed-state and indeterminate-execution semantics.
4. Define FATES-SLICE-002 as the smallest transport-neutral governed-action handoff:
   Moirae proposal → Horae orchestration → Ananke decision/enforcement → typed result/audit
   references back to Moirae. Preserve principal, tenant, resource scope, capability,
   correlation, approval binding and changed-state evidence.
5. Add pinned negative integration cases for denied action, principal mismatch, scope mismatch,
   replayed/expired approval, changed state after approval, unsupported protocol and attempted
   direct bypass.
6. Only after that slice passes, define the Mnemosyne-qualified context envelope and
   FATES-SLICE-003 abstention/conflict/staleness cases.
7. Keep content preflight, credential brokering, durable recovery and unrestricted execution
   gated until their ownership and trust boundaries are accepted.

## Exact next vertical-slice task

Create the FATES-SLICE-002 slice record and acceptance fixtures for one no-op/read-only governed
action proposal. The record must reuse canonical `AgentExecutionContext`, `ResourceScope`,
`CorrelationContext`, and portable approval/audit references; define Horae's transport-neutral
handoff without authorisation logic; require Ananke to return the authoritative allow/deny
decision; and prove that Moirae cannot execute or report success when Ananke denies or is
unavailable. Do not add general execution, credential brokering, or recovery in that increment.

