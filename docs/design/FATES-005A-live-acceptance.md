# FATES-005A — real Firecracker/KVM and Moirae-vsock acceptance

Status: implementation prepared; live acceptance is not claimed until the
Linux/KVM `--execute` path completes.

This slice keeps the r7 candidate unchanged. It adds a real execution path for
one bounded guest proposal:

```text
guest static init (AF_VSOCK, CID 2:7000)
  -> Firecracker virtio-vsock bridge
  -> host AF_UNIX listener at jail-root `run/fates/vsock.sock_7000`
  -> host Fates proposal endpoint
  -> existing governed.memory-admission path
  -> Ananke authority / Mnemosyne admission / Horae durable execution
```

The guest initrd contains only a statically linked proposal client. It does not
contain a model, provider client, credential, authority state, Fates checkout,
shell, or host filesystem. The host accepts one exact bounded operation and
source digest. Guest-supplied authority, principals, destination, provider
endpoint, and arbitrary action names are not accepted.

The VMM is launched through the pinned Firecracker/jailer pair. The acceptance
creates a fresh named network namespace, verifies it has no non-loopback links,
passes its `/run/netns/...` handle to jailer, and verifies that the live VMM PID
is in that same namespace. The effective config is inspected while the VMM is
alive and must contain no `network-interfaces` entry. A successful proposal
round trip is required in addition to these facts; `/dev/vsock` or a static
config alone is not evidence. For guest-initiated vsock, the host listener is
bound to Firecracker's documented `uds_path_<port>` socket rather than the
base `uds_path`.

The prior manually collected jail evidence and the original guest artifacts
under `~/firecracker-test` are inputs only. The initrd and jail session are
fresh per attempt. Cleanup is limited to the newly named namespace and session
directory.

## Commands

Plan mode starts no process, creates no namespace, builds no initrd, performs no
provider operation, and writes no evidence:

```text
node scripts/fates-005a-live-acceptance.mjs --plan --attempt-id 001 \
  --repos-root ~/fates-005a/repos \
  --firecracker-path /opt/fates/firecracker --firecracker-sha256 <sha256> \
  --jailer-path /opt/fates/jailer --jailer-sha256 <sha256> \
  --guest-kernel-path ~/firecracker-test/<kernel> --guest-kernel-sha256 <sha256> \
  --guest-rootfs-path ~/firecracker-test/<rootfs> --guest-rootfs-sha256 <sha256> \
  --workload-path <new-or-pinned-workload> --workload-sha256 <sha256> \
  --evidence-collector-path <new-or-pinned-collector> --evidence-collector-sha256 <sha256>
```

Execute mode uses the same artifact arguments. It additionally requires the
compiled exact peer checkouts and a buildable C compiler plus `cpio` on the
Linux host. It builds a new proposal-agent initrd, starts the fresh namespace,
launches the VMM, starts the separate host Fates process, and records an
attempt evidence file only after cleanup:

```text
node scripts/fates-005a-live-acceptance.mjs --execute --attempt-id 001 \
  --repos-root ~/fates-005a/repos \
  --moirae-implementation-commit <FATES-005A Moirae commit> \
  --integration-implementation-commit <FATES-005A Integration commit> \
  ...the artifact arguments above...
```

The script refuses a reused attempt evidence file, namespace, or jail session.
It never updates `current-candidate.json`, the r7 manifest, a seal, a tag, or a
production-readiness state.
