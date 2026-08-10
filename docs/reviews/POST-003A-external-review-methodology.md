# External review methodology for host containment research

**Status:** review preparation only. No external review has been performed by
this document.

## Purpose

Use independent external review to find missing requirements and falsifiable
containment gaps before any FATES-SLICE-003B activation. Reviews are inputs to
owner decisions, not authority, implementation, acceptance, or evidence by
themselves.

The review packs intentionally separate three kinds of review:

| Mode | Material exposed to reviewer | Question answered |
|---|---|---|
| `BLIND` | Generic first-principles scenario only | What trust boundaries, side doors, and proof obligations does an independent reviewer derive without Fates framing? |
| `INFORMED` | Current Fates architecture, sealed 003A evidence boundary, and the proposed 003B question; no earlier reviewer answers | Does the proposed next boundary address the known architecture and claim limits? |
| `CODE_GROUNDED` | Pinned repositories/commits, relevant source, tests, ADRs, and evidence | What does the code actually enforce, and where do the claims exceed enforcement? |

For a `BLIND` review, send only the blind prompt text. Do not add a cover
message, source link, readiness document, architecture summary, reviewer
roster, or any other material that names or frames the Fates system.

The owner must keep the material shown to each reviewer and must not describe a
review as blind if the reviewer had prior Fates context.

If a reviewer reveals prior Fates knowledge despite receiving only the blind
prompt, reclassify the review as `priorFatesContext: CONFIRMED` and treat the
report as `INFORMED`, not `BLIND`. If prior context cannot be established in
either direction, use `POSSIBLE` rather than claiming independence.

## Required record

Every review record must contain the following fields. Prompt text may be
stored with the record; otherwise store a cryptographic hash of the exact
prompt and identify the immutable prompt file.

```text
reviewId:
reviewerService:
reviewerModelOrVersion:
reviewDate:
mode: BLIND | INFORMED | CODE_GROUNDED
priorFatesContext: NONE | POSSIBLE | CONFIRMED
promptFile:
promptSha256:
sourceMaterial:
  - path-or-url-and-revision:
  - hash-when-available:
findings:
  - findingId:
    statement:
    affectedBoundary:
    severity: LOW | MEDIUM | HIGH | CRITICAL
    evidence:
    evidenceQuality: ASSERTED | DOCUMENTED | CODE_GROUNDED | REPRODUCED
    confidence:
    proposedDisposition:
disposition: NEW_REQUIREMENT | ALREADY_COVERED | VALIDATION_GAP |
  EXPERIMENT_REQUIRED | RESEARCH_REQUIRED | REJECTED_WITH_REASON |
  OUT_OF_SCOPE
ownerReconciliation:
  sourceCheck:
  decisionCheck:
  sealedEvidenceCheck:
  experimentOrFalsifier:
  finalDisposition:
  rationale:
```

Do not place credentials, credential values, private tokens, or secret-bearing
environment output in a prompt, source pack, finding, hash input, or review
record. A prompt hash proves which prompt was used; it does not make secret
handling safe.

## Context classification correction

The existing review classifications must be corrected factually without
rewriting their substantive conclusions:

- Claude was not blind: classify it as `INFORMED` with
  `priorFatesContext: CONFIRMED`.
- Gemini must be classified from the actual session record. If prior Fates
  exposure cannot be ruled out, use `priorFatesContext: POSSIBLE`, not `NONE`.

Context classification is metadata about independence. It is not a quality
score and does not decide whether a finding is valid.

## Candidate reviewer roster

The owner may select from the following roster. No independence, training
separation, or shared-data separation is assumed from the service name.

| Candidate | Useful role | Independence caveat |
|---|---|---|
| Claude | Architecture/threat-model review | Prior Fates context is confirmed for the earlier review; a new run must be labelled accurately. |
| Gemini | Independent threat-model comparison | Context must be reconstructed from the session record; use `POSSIBLE` when uncertain. |
| DeepSeek | Adversarial side-door enumeration | Verify model/version and prompt material. |
| Qwen | Platform and kernel-boundary challenge | Verify model/version and prompt material. |
| Kimi | Requirements and failure-mode review | Verify model/version and prompt material. |
| Mistral | Open-source/platform comparison | Verify model/version and prompt material. |
| Grok | Adversarial challenge and counterexample search | Verify model/version and prompt material. |
| GitHub Copilot repo-grounded | Code and repository proof review | Treat repository access as code-grounded, not blind. |
| Microsoft Copilot | Windows/platform-specific comparison | Treat product context and tenant history as possible prior exposure unless established otherwise. |

The owner chooses the set and records why each selected reviewer is appropriate.
Adding reviewers does not turn agreement into proof.

## Reconciliation protocol

For each finding:

1. Normalize the claim without strengthening it. Separate an asserted threat,
   a requirement, a current implementation claim, and a proposed experiment.
2. Check the relevant source code at a pinned revision. ADRs and diagrams are
   hypotheses until the code and evidence support them.
3. Check accepted laws, requirements traceability, component ownership, and
   the sealed 003A claim boundary. Do not reopen sealed evidence to make a
   later design look cleaner.
4. Check primary documentation for any platform or third-party assertion.
   Record version, license, configuration, and known limitations.
5. Reproduce the finding or write a concrete falsification experiment where
   safe and authorized. A proposed exploit is not reproduced merely to create
   dramatic evidence.
6. Score the finding on five independent dimensions: severity, novelty,
   evidence quality, applicability to the selected platform/profile, and
   reproducibility. The score guides attention; it is not a mathematical
   security guarantee.
7. Assign exactly one disposition and record the rationale. A finding may
   create a new requirement even when the current implementation is unchanged.

The reconciliation record must preserve agreement and disagreement. There is
no majority-vote proof: one reproducible severe finding can outweigh unanimous
but untested agreement, while one unsupported assertion does not become true
because several reviewers repeat it.

## Review completion gate

External review preparation is complete only when the owner has the selected
reviewer records, exact prompts or hashes, source material, context labels,
finding dispositions, unresolved experiments, and a decision about whether the
first platform profile remains suitable. This gate does not activate 003B or
authorize production changes. No external model report is added to the Fates
documentation until it has been returned and reconciled under this method.
