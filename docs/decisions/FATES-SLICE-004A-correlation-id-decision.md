# FATES-SLICE-004A correlation-ID semantic binding decision

**Status:** accepted remediation design decision; no live acceptance is
authorized by this record.

## Question

Is `correlationId` semantic identity of a governed effect, or observability
metadata associated with a request/trace?

## Existing behavior

Ananke approval binding excludes per-attempt `requestId`, `causationId`, and
`correlationId` from the approval/action binding. The approval-binding
documentation describes these values as observational correlation fields.
The durable execution store persisted `correlationId` in the intent and
provider request, but `hashExecutionBinding()` incorrectly included it in the
durable semantic binding. Reusing an idempotency key with only a new
correlation ID therefore returned `binding_mismatch`.

## Alternatives and consequences

**Model A — correlation is binding material.** Exact retries retain the
original correlation ID; a changed correlation is a binding mismatch. This
preserves the old durable hash but conflicts with the established
approval-binding contract and treats a trace identifier as effect identity.

**Model B — correlation is observability metadata.** Retries may carry new
correlation/request identifiers while retaining the same semantic governed
effect. Provider, target, exact arguments, principals, resource scope,
purpose, tenant/workspace, expiry, approval hashes, effect, and scoped
idempotency key remain binding material. Correlation remains stored, forwarded
where required for provider traceability, and projected into audit.

## Decision

Select **Model B**. Remove only `correlationId` from the durable semantic
binding hash. Keep it in the durable intent record, provider request, and
audit projection. Update deterministic tests and the 004A acceptance driver
to prove changed-correlation duplicate reuse and effect-field mutation
failure.

This preserves fail-closed protection against every effect-relevant mutation
while allowing a fresh request trace to retrieve an existing durable result.
It does not change the public route shape, idempotency namespace, provider
receipt identity fields, audit field availability, or approval/action binding
contract. The Ananke and Integration checkpoints/hashes must be re-approved
before any future live attempt. Attempt `001` remains permanently consumed.
