# Fates derived-understanding assessment

## Decision summary

Mnemosyne can support derived understanding without a new Fate, but the current implementation cannot yet meet the required safety properties. Situation-model terminology is `EXPERIMENTAL_RESEARCH`; deterministic provenance dependencies, invalidation, ACL lineage and action revalidation are `MISSING_HIGH_PRIORITY`. The accepted provenance-admission design gate is the correct place to refine the design. Do not add public contracts until the benchmark demonstrates a material advantage over simpler retrieval.

## Existing foundation

Mnemosyne already provides governed `MemoryRecord`/`ProjectRecord` structures, source references, reliability and access classifications, contradiction/supersession status, context packs, restart packs, onboarding and a small graph. It correctly states that memory is evidence rather than authority. It also has an accepted Stage-A provenance-admission design gate covering multi-source provenance, derivation, admission states, preflight references and re-admission.

What does not exist is a durable, claim-level derivation graph that explains which normalized observations caused which work episode, situation interpretation or conclusion; which source role each edge plays; how access restrictions combine; and which descendants become stale when a source changes, disappears or is revoked.

## Proposed research pipeline

The research model should remain internal until validated:

```text
immutable source snapshot
  → normalized observation/percept
  → candidate correlations
  → revisable work episode
  → revisable situation model
  → claim set with uncertainty and validity
  → deterministic admission/review
  → governed durable memory
  → task-scoped retrieval/context pack
  → Ananke live-state check before action
```

The useful unit is a claim with evidence and dependencies, not a polished narrative. Narrative text should be a projection generated from claims, never the canonical record.

## Required claim properties

Any derived claim admitted to durable memory must be:

- inspectable: its normalized claim, sources, transformations, model/config and reviewer state are visible;
- evidence-linked: every supporting, contradicting and contextual source has immutable identity/version;
- falsifiable: the claim states what evidence would contradict it and can enter `contradicted`, `superseded`, `unverifiable` or recompute-required states;
- temporally bounded: event time, observation time, derivation time and validity interval remain distinct;
- permission-tainted: effective access is at least as restrictive as all contributing evidence unless a valid declassification receipt says otherwise;
- reversible: source deletion/revocation invalidates descendants and removes them from new packs, while legally required audit tombstones retain no prohibited content;
- incapable of authority: no claim, reliability score or prior approval can satisfy Ananke's current authority check.

`ClaimAuthority` must mean “fitness of a source for this claim/use,” not permission to act. Source reliability and claim authority are separate axes: a highly reliable Slack quote proves what was said, not that a feature shipped; a deployment observation may prove runtime state but not original intent.

## Evidence roles and state distinctions

The model must distinguish at least:

| State | Example evidence | What it can support |
|---|---|---|
| Said | Slack/meeting statement | A statement occurred, with speaker/time |
| Intended | accepted requirement or explicit decision | Intended direction within its validity period |
| Committed | commit at immutable hash | Code entered a branch/history |
| Merged | merge event/target hash | Code reached a target branch |
| Deployed | deployment system receipt | A build/revision was released to an environment |
| Runtime-observed | telemetry or live query | State held at an observation time |
| Inferred | model/rule derivation | A falsifiable interpretation, never primary evidence |
| Uncertain | missing/conflicting evidence | An explicit gap, not a prompt for interpolation |

No “latest source wins” rule is safe across these roles. Later Slack text cannot override current runtime evidence merely because it is newer. A merged PR cannot support “available in production” without deployment/runtime evidence. Partial code cannot support “requirement complete” without acceptance evidence.

## Circularity and model summaries

A generated summary may cite primary sources but must not become an independent corroborating source for a later summary. Derivation edges need stable source roles such as primary observation, transformation, contextual evidence and prior derivation. The admission engine must detect:

- a claim depending on itself through any path;
- two generated summaries that ultimately share the same primary evidence but appear as two sources;
- a summary used to increase confidence in its own ancestor;
- an old model conclusion used without the original source remaining accessible.

On detection, the derivation is `CircularDerivationDetected` or equivalent, excluded from confidence aggregation and held for review. This algorithm belongs in Mnemosyne, not Runtime Contracts.

## Permission, deletion and revocation

Default effective visibility is the intersection/most-restrictive combination of source ACLs, tenant, purpose and audience. Joint inference can be more sensitive than its fragments; therefore a derived record may be raised to a stricter classification by a deterministic rule or review, never silently lowered.

Declassification requires an authorized principal, precise claim/content hash, source set, destination/audience, purpose, expiry and transformation evidence. Redaction does not automatically declassify a semantic fact.

Source deletion or permission revocation must:

1. write a non-content tombstone where audit retention permits;
2. mark all dependent derivations unavailable/recompute-required;
3. invalidate context packs, retrieval caches and exports;
4. prevent the deleted/revoked content from becoming a model input during recomputation;
5. propagate across tenants/providers/backups to the extent technically possible and disclose residual retention limits.

## Action boundary

Mnemosyne may return “the release blocker appears resolved” with sources and uncertainty. It may not authorize release, deployment or external communication. Action-critical use requires Horae to carry the assumptions and evidence receipt to Ananke; Ananke requires current identity, scope, approval and live-state evidence. A stale or invalidated assumption returns `STALE_STATE` or equivalent and invalidates approval.

## Benchmark before adoption

Compare:

A. keyword retrieval;
B. hybrid/vector retrieval;
C. graph-assisted retrieval;
D. episode/situation synthesis.

Use histories with changed requirements, reverted and unmerged commits, merged-but-undeployed changes, concept renames, conflicting Slack, outdated ADRs, revoked permissions, deleted sources and adversarial content. Measure correct answers, confident errors, stale answers, contradiction detection, coverage, provenance completeness, leakage, deletion correctness, downstream action correctness, review burden, processing/storage tokens, storage growth, latency and incremental recomputation.

Adopt D only if it materially improves correct, provenance-complete answers without worsening confident-error, leakage, revocation or action correctness. Twin's single public scenario and stated 1.7M-token/~US$10 experiment are useful motivation, not sufficient evidence of generalization.

## Proposed decisions

1. Amend the existing provenance-admission gate rather than create a new Fate or competing ADR.
2. Keep `WorkEpisode`, `SituationModel`, `DerivedClaim` and related names internal research labels until benchmark results settle the minimal public vocabulary.
3. Add source-role, derivation dependency, validity, recompute, cycle and ACL-lineage requirements to the gate.
4. Define a retrieval receipt separately from durable memory.
5. Require a cross-runtime stale-context test before any derived claim influences an Ananke request.

## Classification

| Proposal | Status | Owner | Blocks integration? |
|---|---|---|---|
| Situation/episode synthesis | EXPERIMENTAL_RESEARCH | Mnemosyne | No |
| Claim dependency/invalidation graph | MISSING_HIGH_PRIORITY | Mnemosyne | Yes for durable derived memory |
| Claim-specific authority/evidence role | PARTIALLY_COVERED | Mnemosyne | No |
| Most-restrictive ACL lineage/declassification | MISSING_HIGH_PRIORITY | Mnemosyne + Ananke | Yes for derived sharing |
| Retrieval receipts/coverage | MISSING_MEDIUM_PRIORITY | Mnemosyne | No |
| Memory as action authority | REJECT_INCOMPATIBLE | Ananke | Always prohibited |
