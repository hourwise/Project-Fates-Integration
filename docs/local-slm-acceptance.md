# Local Qwen acceptance harness

`fates:slm` is a bounded acceptance and evidence runner for the current Fates MVP
security candidate. It resolves `current-candidate.json` and its referenced
compatibility manifest before loading any component or making a model call. It
does not replace Ananke, Horae, Mnemosyne, or Moirae
policy. It loads their pinned builds and uses the same transport-neutral governed
route as `fates:governed`.

The runner has three recorded modes:

- `LIVE_MODEL`: calls the pinned Moirae `LlamaCppProvider` and normalizes text,
  tool-call, done, and provider-error events. Tool calls are passed through
  `captureToolCallProposal()` and remain proposals.
- `GOVERNED`: sends fixture or captured proposals through Moirae envelope
  creation, Horae, Ananke authenticated preflight, Mnemosyne admission, and a
  synthetic executor.
- `FAULT_INJECTION`: emits deterministic malformed and hostile provider events;
  it does not depend on Qwen voluntarily producing an attack.

The synthetic executor records an invocation and returns `effect: not_performed`.
It has no shell, filesystem, network, Git, credential, email, or external-effect
implementation.

## Operator invocation

Build the exact pinned component checkouts first. With llama.cpp running on its
OpenAI-compatible loopback endpoint:

```text
npm run fates:slm -- --ananke-dir "<ananke-checkout>" --horae-dir "<horae-checkout>" --mnemosyne-dir "<mnemosyne-checkout>" --moirae-dir "<moirae-checkout>" --base-url http://127.0.0.1:8080/v1 --model <model-id> --suite smoke --output "<evidence-directory>"
```

The optional `--adrasteia-dir` points to the Runtime Contracts checkout. If it
is omitted, the harness infers `Project Runtime Contracts` beside the Ananke
checkout. The pointer must remain `status: provisional`; the runner verifies
all five runtime peer origins, exact full commit objects, clean worktrees, and
the clean Integration checkout before a live model call. It never falls back
to `fates-lock.json`, a branch head, `main`, or a latest tag.

`full` runs SET, BEN, ADV, and FLT cases. `performance` runs the five payload
size cohorts. `fault` runs only deterministic fault-injection cases and does not
need a live Qwen server. The endpoint must be explicit HTTP loopback on port
8080 with the `/v1` path. `localhost` and `[::1]` are accepted equivalents;
remote endpoints and silent provider fallback are rejected.

## Evidence

Each run writes these files under the requested output directory:

- `run-manifest.json` — run identity, host metadata, endpoint, model discovery,
  current candidate ID, exact five runtime component SHAs, the non-recursive
  Integration control identity, the actual Integration `harnessCommit`, and
  the Runtime Contracts artifact digest;
- `summary.json` — result counts, usability metrics, security metrics, and timing
  summaries;
- `cases.jsonl` — one normalized record per SET/BEN/ADV/FLT/PERF case;
- `timings.json` — per-case timing fields and performance sample summaries;
- `failures/` — detailed records for `FAIL` and `FRICTION` cases.

Validate a captured run locally:

```text
npm run validate:slm -- --output "<evidence-directory>"
```

The validator checks the local-SLM schemas, cross-file run identity, exact
candidate-manifest pins, accepted loopback endpoint, result-state vocabulary,
the absence of obvious credential/private-key material, and rejects a
certifiable pack containing a security `FAIL`. `FRICTION` and
`NOT_EXERCISED` remain distinct evidence states.

Before the campaign, run the non-Qwen detector self-test:

```text
npm run test:slm:negative-control
```

It uses a fixture only: it deliberately marks a tampered surface as admitted,
proves the case evaluator returns `FAIL`, and proves the evidence validator
refuses certification. It performs no host effect and no model call.

Live model tests are opt-in. Normal Integration CI does not start llama.cpp and
does not require Qwen availability. A model that emits no expected tool call is
recorded as `NOT_EXERCISED` where appropriate; FAULT cases provide deterministic
coverage for the corresponding governance boundary.
