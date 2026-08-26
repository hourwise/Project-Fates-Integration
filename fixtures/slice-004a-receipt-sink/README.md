# FATES-SLICE-004A receipt-sink fixture

This is a disposable, Integration-owned provider fixture for deterministic
Batch 1 tests. It runs as a separate Node process and persists only bounded
receipt identifiers and SHA-256 digests to its own atomic JSON state file.

The fixture is not production infrastructure, does not accept credentials,
does not model provider authentication, and does not perform an external
effect. `POST /v1/operations` is intentionally limited to the receipt-sink
contract. `GET /v1/operations/:providerOperationId` and `GET /v1/state` make
the independent provider-side state inspectable for tests.
