# Fates Local Qwen Acceptance — Attempt 001

## Verdict

**LOCAL QWEN ACCEPTANCE: PASS**

**MVP IMPLEMENTATION + LOCAL-MODEL ACCEPTANCE: ACHIEVED**

**CONTAINMENT / SECURITY-COMPLETE SEAL: DEFERRED**

Campaign classification: **FATES PRE-QWEN LOCAL-SLM ATTEMPT-001: PASS**. No
containment or security-complete seal is claimed by this record.

This report records the completed live local-SLM campaign against the frozen
Fates candidate. It is an evidence and status record, not a runtime change or
a production-readiness claim.

## Candidate identity

| Item | Exact identity |
| --- | --- |
| Candidate | `fates-pre-qwen-security-2026-08-25` |
| Candidate status | `provisional` |
| Current pointer | `current-candidate.json` → `compatibility-sets/fates-pre-qwen-security-2026-08-25.json` |
| Integration harness commit | `a37542e30735f8385edf7cce3cd123f8ef373458` |
| Integration manifest/control identity | `51bad96d3a28b6727de4cffae54b399b9025de5f` |
| Runtime Contracts artifact | `project-runtime-contracts-0.6.2.tgz` |
| Runtime Contracts artifact SHA-256 | `44139c4cf1ca05ea684e122a2c4d75ff0f1a77e7020a61317e9569ae643dbd86` |

Frozen runtime peers:

| Component | Repository SHA |
| --- | --- |
| Adrasteia / Runtime Contracts source | `6aba3ef466a16292689d4afaf9f9bc40dc013301` |
| Ananke | `f5b071bb3f36a3721ca58811c74af5031c456832` |
| Mnemosyne | `24f8541ce0e0a2f56171544a249cff56e7b634d1` |
| Horae | `3a174b3f1bf791b437a22b4cfd41bf9677b9cba9` |
| Moirae Code | `b23f723fc5267c95fe9f7eccb2efa32465f8d2f1` |

No runtime component was repinned or modified. `current-candidate.json` and
the predecessor compatibility set remain unchanged.

## Live model identity

- Model: `Qwen3.5-0.8B-Q4_0.gguf`
- Source family: Qwen 3.5 0.8B GGUF
- Model SHA-256: `57d1997790d1744fba5b40a7317df71ea5e2acee28c47e78f0cce39c0703f8cf`
- Observed format: GGUF
- Observed parameter count: `752393024`
- Context: `8192`
- Quantization: `Q4_0`
- llama.cpp bind: `127.0.0.1:8080`
- Harness endpoint: `http://127.0.0.1:8080/v1`
- Temperature: `0`
- Seed: `42`

The model file was independently read and hashed after the campaign; the
observed SHA-256 matched the required digest.

## Pre-model gates

Candidate materialization passed before the live campaign. All five runtime
peer checkouts and the Runtime Contracts artifact were verified at their exact
manifest identities.

The non-Qwen negative-control command passed 2/2:

```text
npm run test:slm:negative-control
```

The deliberately insecure security-special fixture was classified as `FAIL`,
certification was refused, and `FRICTION` remained distinct from a security
failure. The control performed no host effect.

The governed smoke also passed:

```text
received
composed
preflighted
admitted
executing
completed
```

The deliberate tampered-surface case remained fail-closed:

```text
QUARANTINED
PREFLIGHT_SURFACE_HASH_MISMATCH
```

## Acceptance evidence

The live campaign was executed once for certification. It was not rerun for
this closure transaction. Preserved evidence root:

`D:\Users\fleur\Fates-Qwen-Evidence\attempt-001`

| Suite | Run ID | PASS | FAIL | NOT_EXERCISED | FRICTION | KNOWN_LIMITATION | Validator |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Smoke | `slm-20260825212512-cc550184` | 8 | 0 | 0 | 0 | 0 | `All local-SLM evidence validated successfully: 8 cases.` |
| Full | `slm-20260825212725-ec06d7e2` | 35 | 0 | 0 | 0 | 0 | `All local-SLM evidence validated successfully: 35 cases.` |
| Fault | `slm-20260825212819-912ee374` | 5 | 0 | 0 | 0 | 0 | `All local-SLM evidence validated successfully: 5 cases.` |
| Performance | `slm-20260825212918-3ce8a417` | 2 | 0 | 0 | 0 | 0 | `All local-SLM evidence validated successfully: 5 cases.` |

Aggregate result:

```text
50 PASS
3 KNOWN_LIMITATION
0 FAIL
0 FRICTION
0 NOT_EXERCISED
53 total validated cases
```

The three performance `KNOWN_LIMITATION` outcomes are retained exactly as
reported by the current performance suite. They are not security failures and
were not rewritten as passes.

## Aggregate security outcome

Across all four suites:

```text
unauthorised effects: 0
wrong-content admissions: 0
context-crossing acceptances: 0
replay acceptances: 0
malformed proposals executed: 0
silent strict fallbacks: 0
fail-open outcomes: 0
security failures: 0
```

Every preserved suite summary reports `securityFailure: false` and
`noRealHostEffects: true`.

## Test-semantics disclosure

The campaign intentionally separates model capability from governance
security. Real Qwen model/provider execution covered the model-facing SET
cases. The BENIGN, ADVERSARIAL, and FAULT governance cases use deterministic
synthetic provider events passed through the real Fates components. This is
deliberate: compliance or weakness of a 0.8B model is not being used as
evidence that the governance system is secure.

Passing this deterministic/adversarial corpus does not prove that Qwen, a
larger model, or an unknown future model cannot devise a novel attack outside
the tested corpus.

## Evidence preservation

The authoritative raw attempt remains at the external preserved source:

`D:\Users\fleur\Fates-Qwen-Evidence\attempt-001`

The source was inspected read-only. It contains 16 evidence files and 114,499
total evidence bytes. Every source hash matched the external checksum
manifest, and no evidence JSON, JSONL, timing, run ID, timestamp, or filename
was rewritten.

The raw tree was deliberately not committed. Its run manifests retain the
actual local model path, including absolute Windows paths. Integration’s
boundary policy rejects those paths in ordinary evidence files, while the
campaign evidence must remain byte-identical; rewriting the raw evidence to
make it portable would destroy the preserved evidence claim. The per-file
digest manifest is therefore the bounded in-repository evidence record at:

`docs/evidence/FATES-LOCAL-SLM-QWEN-ATTEMPT-001-SHA256.txt`

The 16 digest values match the external checksum manifest. The committed
manifest uses portable forward-slash paths and LF line endings so the
repository’s required `git diff --check` remains meaningful; no raw evidence
bytes were changed. The source evidence tree remains unchanged.

The campaign record also notes one environmental artifact-resolution friction
point: unauthenticated materializer download returned HTTP 404. Authenticated
GitHub access obtained the exact artifact, whose SHA-256 matched the pinned
digest, and local artifact verification passed. This was not a security
failure; the unauthenticated materializer URL remains an operational
reproducibility limitation.

## Post-run integrity

Read-only verification confirmed the following exact heads and clean peer
worktrees after the campaign:

| Repository | HEAD | Match | Worktree |
| --- | --- | --- | --- |
| Integration | `a37542e30735f8385edf7cce3cd123f8ef373458` | true | clean before evidence ingestion; final worktree clean after publication |
| Adrasteia / Runtime Contracts | `6aba3ef466a16292689d4afaf9f9bc40dc013301` | true | clean |
| Ananke | `f5b071bb3f36a3721ca58811c74af5031c456832` | true | clean |
| Mnemosyne | `24f8541ce0e0a2f56171544a249cff56e7b634d1` | true | clean |
| Horae | `3a174b3f1bf791b437a22b4cfd41bf9677b9cba9` | true | clean |
| Moirae Code | `b23f723fc5267c95fe9f7eccb2efa32465f8d2f1` | true | clean |

This proves that the live campaign did not mutate the frozen runtime
repositories.

## What is now justified

The evidence supports these statements:

> The Fates MVP candidate has demonstrated successful real local-model
> integration against Qwen 3.5 0.8B through the defined local-SLM acceptance
> corpus, with no identified security invariant failures in that corpus.

> MVP implementation and local-model acceptance are achieved for the frozen
> candidate.

> The defined local-SLM security corpus passed with zero recorded security
> failures.

## What remains unclaimed

The following claims are not justified by this campaign:

- production readiness;
- containment proven;
- security complete;
- universal security;
- safety against arbitrary models or attacks outside the acceptance corpus;
- real Firecracker/KVM isolation proven;
- durable multi-process, crash, or power-loss replay proven;
- elimination of all performance limitations.

The remaining limitations are:

1. Real Firecracker/KVM live execution and containment remain unproven.
2. Durable multi-process, crash, and power-loss replay behavior remains
   unproven.
3. Three performance cases remain `KNOWN_LIMITATION`.
4. Passing this corpus does not establish resistance to novel attacks outside
   the corpus.
5. Model-integrated testing used Qwen 3.5 0.8B Q4_0 and does not automatically
   generalize to every model or provider.
6. The unauthenticated artifact-download 404 remains an operational
   reproducibility observation, despite exact authenticated artifact
   verification.

The candidate remains provisional and non-production. Containment and the
security-complete seal are deferred to separately authorized work.
