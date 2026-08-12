# FATES-SLICE-004A Attempt 001 retrospective incident record

**Classification:** `FAILED / INCOMPLETE`

This is a retrospective incident/traceability record. It is **not** the
original live-evidence artifact and must not be interpreted as a reconstructed
acceptance result.

## Known facts

- Attempt `001` was owner-authorized and the `--execute` invocation ran exactly
  once.
- The invocation failed in Case A with:

  `Error: Case A duplicate did not reuse completion`

- The first request used idempotency key `004a-001-a` and correlation ID
  `004a-case-a`.
- The duplicate reused the same idempotency key but changed the correlation ID
  to `004a-case-a-duplicate`.
- At that checkpoint, `correlationId` participated in the durable binding
  digest. Ananke therefore returned a binding mismatch rather than reusing
  the durable completion. No duplicate-effect defect was demonstrated.
- Cases B, C, D, and E did not run.
- The driver failed before final acceptance JSON persistence.
- Temporary provider and SQLite state were cleaned by the harness.
- Provider operation count is unknown and unavailable. It MUST NOT be
  reconstructed, guessed, inferred, or fabricated.
- No retry occurred. Attempt `001` is permanently consumed and cannot be
  reused.

## Evidence limitation

No original Attempt 001 JSON evidence artifact exists. This record preserves
only the facts reported from the command failure and post-failure source/state
inspection. It does not claim provider operation count, durable lifecycle
completion, successful duplicate reuse, or completion of any later case.

The missing failure artifact was a defect in the prior acceptance harness.
The remediation adds an exclusive reservation journal and terminal evidence
record for future PASS, FAIL, and INCOMPLETE attempts. That mechanism does not
retroactively create evidence for Attempt 001.
