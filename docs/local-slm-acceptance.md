# Local Qwen acceptance harness

`fates:slm` is a bounded acceptance and evidence runner for the current Fates MVP
security candidate. It does not replace Ananke, Horae, Mnemosyne, or Moirae
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

`full` runs SET, BEN, ADV, and FLT cases. `performance` runs the five payload
size cohorts. `fault` runs only deterministic fault-injection cases and does not
need a live Qwen server. The endpoint must be explicit HTTP loopback on port
8080 with the `/v1` path. `localhost` and `[::1]` are accepted equivalents;
remote endpoints and silent provider fallback are rejected.

The optional `--adrasteia-dir` points to the Runtime Contracts checkout. If it is
omitted, the harness infers `Project Runtime Contracts` beside the Ananke
checkout. All six authoritative component SHAs are checked before a run.

## Evidence

Each run writes these files under the requested output directory:

- `run-manifest.json` — run identity, host metadata, endpoint, model discovery,
  compatibility-set ID, and exact component SHAs;
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
component pins, accepted loopback endpoint, result-state vocabulary, and the
absence of obvious credential/private-key material.

Live model tests are opt-in. Normal Integration CI does not start llama.cpp and
does not require Qwen availability. A model that emits no expected tool call is
recorded as `NOT_EXERCISED` where appropriate; FAULT cases provide deterministic
coverage for the corresponding governance boundary.
