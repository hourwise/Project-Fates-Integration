# Consumer-Driven Testing

## Principle

Every cross-repository capability must be validated from the consumer's
perspective. The consumer defines the contract expectations; the producer
must satisfy them.

## Consumer Test Requirements

For each vertical slice:

1. Identify all consumer Fates affected by the slice.
2. Define the consumer's expected behaviour against the new checkpoints.
3. Run the consumer's existing test suite against the updated dependencies.
4. Add new consumer tests for any changed or new public surfaces.
5. Document any consumer test failures and either fix them or record them
   as explicit known limits.

## Integration Test Requirements

1. Define cross-repository scenarios that exercise the full capability chain.
2. Each scenario must involve at least two Fates.
3. Tests must use exact checkpoint references, not floating versions.
4. Integration tests must pass before the lock is updated.

## Inspection-Only Limitations

In the current compatibility set (fates-stage-a-2026-07), consumer-driven
testing is limited to inspection. No runtime integration tests have been
executed because:

- No governed execution path exists
- No qualified memory handoff is available
- No durable recovery mechanism is in place
- No content preflight capability is present

These limitations are explicitly recorded in `fates-lock.json` and
`compatibility-matrix.json`.

## Future Slices

As governed execution, memory handoff, and other capabilities are added
in future slices, the consumer-driven testing requirements will expand
to include runtime integration tests.
