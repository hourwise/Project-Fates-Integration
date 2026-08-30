# FATES-005A — real Firecracker/KVM and Moirae-vsock acceptance

Status: R5.4 guest-kernel capability and listener-cleanup remediation prepared;
live acceptance is not claimed. Attempt 004 was invoked once and consumed by a
pre-execution implementation-eligibility gate failure. Attempt 005 reached the
real Firecracker/jailer launch path, and Attempt 006 reached the live VMM path,
but their retained results are `INCOMPLETE / NOT ACCEPTED`. R5.4 proved that
the previously pinned guest kernel cannot expose the required non-PCI
virtio-vsock path, prepared a separate corrected kernel/helper pair, and
transferred pathname cleanup ownership to the fixed helper. The installed
helper and historical evidence remain unchanged.

## R5.2 historical Attempt-004 record

Attempt 004 is consumed. The authorized `--execute --attempt-id 004` command
was invoked exactly once and failed before guest initrd construction,
privileged preparation, namespace creation, jail creation, Firecracker or
jailer launch, live KVM execution, AF_VSOCK, the governed listener, the
governed proposal, or any model/provider execution.

```text
Attempt 004: CONSUMED
classification: PRE-EXECUTION IMPLEMENTATION-ELIGIBILITY GATE FAILURE
live containment reached: false
normal acceptance evidence JSON created: false
```

The exact blocker was the omission of
`docs/evidence/FATES-005A-live-acceptance-attempt-003.json` from the
Integration publication implementation allowlist. The normal
`docs/evidence/FATES-005A-live-acceptance-attempt-004.json` path was not
created and must not be fabricated after the failed pre-execution gate.

The retained controller streams are diagnostic captures, not acceptance
evidence:

```text
stdout: /tmp/fates-005a-attempt-004.stdout
SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

stderr: /tmp/fates-005a-attempt-004.stderr
SHA-256: b0bd7426a94d45e3a1a907738d02b35e43edfe2c2865becc85d89330997df109
```

The immutable repository evidence remains unchanged:

```text
Attempt 001: 67b10b3605ac4ba06df9916fab1b2ef63ce04057d8f03bbd4683538f8abdc485
Attempt 002: e8298157801bf2c2fc2e841004c7f8740fb858e704344bc4c71c9942c1416753
Attempt 003: 2f886d1bd257b84b781120de44002daf4785730bb56d8c203372ddc50f65a3e5
```

The R5.2 instruction contained a 63-character transcription of the Attempt
002 digest. The 64-character value recorded above is the digest of the
unchanged repository artifact, verified locally and on `fates-kvm`.

R5.2 adds the missing Attempt-003 path as one exact enumerated entry. When
both implementation checkpoints are supplied to `--plan`, it performs the
same exact SHA, descendant, changed-path allowlist, clean-worktree, and
candidate checks as `--execute`, then reports `implementationEligibility:
PASS` and `result: NOT_EXECUTED`. The plan path does not build an initrd,
invoke sudo, create runtime state, start a listener or VMM, or write
evidence. `--execute` independently repeats its checks immediately before
live work.

## R5.3 historical Attempt-005 record

Attempt 005 is consumed. Its normal evidence was created once, retained
unchanged, and is tracked as one exact implementation-history path:

```text
Attempt 005: CONSUMED
classification: INCOMPLETE / NOT ACCEPTED
failure phase: POST-LAUNCH TRANSPORT OBSERVATION
normal evidence created: true
evidence: docs/evidence/FATES-005A-live-acceptance-attempt-005.json
evidence SHA-256: 2215d4875335ef996b74eb0b1a10f78deb49e2740c39fb190f5e59e69dfaad4f
guest connection historical status: UNPROVABLE
```

The retained evidence proves that the host listener bound the expected
guest-vsock `_7000` Unix endpoint before launch and that the fixed
Firecracker/jailer lifecycle was launched and cleaned up. The controller then
failed while waiting for the endpoint pathname to remain visible after launch.
The pathname's absence is ambiguous: a successful guest exchange can close the
one-shot listener and remove its pathname, while an unexpected listener failure
can produce the same observation. The retained evidence therefore does not
prove either a guest connection or a governed result, and no retrospective
host-child outcome is reconstructed.

## R5.3 transport sequencing and evidence

Firecracker's guest-initiated vsock design maps a guest connection request for
port `7000` to the host AF_UNIX listener at the configured `uds_path` followed
by `_7000`; the guest connects to host CID `2`. This is the documented
guest-initiated ordering in the [Firecracker vsock documentation](https://github.com/firecracker-microvm/firecracker/blob/main/docs/vsock.md):

```text
host binds uds_path_7000
  → Firecracker launches with uds_path=/run/fates/vsock.sock
  → guest AF_VSOCK connects to CID 2:7000
  → Firecracker connects the request to the host Unix listener
  → host accepts one connection and receives one bounded frame
```

R5.3 proves the `_7000` path independently with `lstat()`, requiring a
non-symlink Unix socket before launch and recording only bounded `dev`/`ino`
identity in acceptance evidence. It does not require the pathname to persist
after the exchange. The host result marker now binds successful evidence to the
exact session, request, correlation, proposal action, governed `ALLOW`,
unprivileged listener UID/GID, and `directProviderExecution: false`; the
`guestConnectionAccepted` and `proposalReceived` fields are emitted only after
the real transport receive returns a frame.

The controller's successful evidence chain at the R5.3 checkpoint was:

```text
pre-launch socket identity
  → immediate post-launch runtime inspection
  → real guest connection marker
  → real proposal marker
  → exact governed ALLOW marker
  → listener completion and inode-safe cleanup
```

Missing, stale, wrong-session/request/correlation, root-owned, provider-bypass,
or transport-unproven markers fail closed. R5.4 removes the listener's
post-launch pathname operation entirely: its transport close owns only its
server/socket descriptors, while the fixed helper owns exact jail/session
removal after verified VMM shutdown.

The Attempt-006 implementation-aware plan is non-executing and must report
`result: NOT_EXECUTED` with `implementationEligibility: PASS`. Attempt 006 is
not run by this remediation.

## Certified contract

The established 005A design is the narrow proposal-channel containment claim:

```text
real Firecracker/KVM + jailer
  + fresh no-NIC network namespace
  + real AF_VSOCK guest-to-host bridge
  + one bounded guest proposal
  + governed host Fates path
```

The profile is therefore deliberately identified as
`linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-proposal-v1`. It has a
rootfs drive and a fresh static guest initrd containing only the fixed
proposal client. It does not claim guest workload or evidence-collector
execution. The broader Moirae workload/evidence profile remains a separate
profile and still requires those artifacts and its declared execution binding.

The guest initrd does not contain a model, provider client, credential,
authority state, Fates checkout, shell, or host filesystem. Its `/init` reads
only the fixed proposal fields and `fates.execution_contract`, connects using
AF_VSOCK to host CID 2 port 7000, sends one bounded proposal, checks for an
ALLOW `proposal.result`, and then pauses. It does not open `/workload` or
`/evidence-collector`; those paths are not present in this profile.

The host accepts one exact `governed.memory-admission` proposal and routes it
through the existing governed Fates smoke path. The host listener is a normal
unprivileged Node process. It is never started by sudo and fails closed if its
UID or GID is zero. It binds the guest-initiated Firecracker socket at
`uds_path_<port>`, not the base `uds_path`.

## Privilege boundary

The acceptance orchestration remains an ordinary `fatesadmin` process. The
only privileged transition is:

```text
unprivileged acceptance orchestration
        |
        +-- unprivileged governed Fates listener
        |
        +-- sudo -n /usr/local/libexec/fates-005a-host-control <fixed operation>
                    |
                    +-- create one exact /run/netns/fates-005a-NNN
                    +-- prepare one exact /srv/jailer/firecracker/fates-005a-NNN
                    +-- launch the fixed, hashed jailer/Firecracker pair
                    +-- inspect permitted runtime facts
                    +-- stop and remove only that attempt's resources
```

The helper accepts only `fates-005a-NNN` where `NNN` is exactly three decimal
digits for production operations. Its operations are `prepare`, `launch`,
`inspect`, and `cleanup`, plus the harmless `--version` and `--self-test`
modes. The root-gated portion of `--self-test` uses the fixed non-acceptance
identity `fates-r5-lifecycle-test` to exercise a real Firecracker/KVM
lifecycle; it is never an acceptance attempt. The helper derives every namespace,
jail, PID file, socket, staging path, source path, and executable path itself.
It rejects extra arguments, traversal, shell metacharacters, arbitrary paths,
arbitrary commands, arbitrary environment variables, and arbitrary cleanup
targets. It never calls a shell or evaluates supplied text.

The fixed helper checks the installed Firecracker and jailer digests before
preparation, checks the fixed guest kernel and rootfs digests, checks the fresh
attempt initrd digest supplied by the unprivileged builder, and writes the
bounded proposal into its own JSON configuration. It launches only:

```text
/usr/local/bin/jailer
  --id fates-005a-NNN
  --exec-file /usr/local/bin/firecracker
  --uid 65532 --gid 65532
  --chroot-base-dir /srv/jailer
  --netns /run/netns/fates-005a-NNN
  --new-pid-ns --resource-limit no-file=1024
```

With `--new-pid-ns`, the direct child created by the helper is retained as the
launcher/jailer identity. Jailer writes the actual Firecracker host PID to the
fixed internal `<jail-root>/firecracker.pid`; the helper accepts only a bounded
regular file opened without symlink following, containing one decimal PID. It
then verifies the Firecracker start time, exact executable basename, UID/GID
65532, and `/proc` liveness before writing its own fixed metadata. Inspect
reports the Firecracker host PID and namespace PID separately from the launcher
PID. Cleanup verifies that same Firecracker PID/start-time/executable/UID/GID
identity, uses bounded SIGTERM/SIGKILL shutdown, accounts for the launcher,
and removes the namespace and jail only after no verified process remains.

Network containment is checked by comparing `st_dev`/`st_ino` identities for
`/proc/<firecracker-host-pid>/ns/net` and the fixed named namespace handle.
The loopback-only result comes from enumerating the links in that namespace;
it is not a hardcoded evidence list. The unprivileged host listener writes its
ready marker only after the exact guest-vsock AF_UNIX endpoint is a bound Unix
socket. Its signal cleanup waits for transport closure and closes only the
server/socket descriptors it owns; it does not traverse or unlink the jail
pathname after jailer launch. The fixed helper removes the exact session tree
after verified VMM shutdown. No TCP fallback, NIC, TAP, NAT, or ordinary IP
route is introduced.

The helper does not grant write access to `/srv/jailer`, does not change
`fatesadmin`'s groups or capabilities, and does not run Node, JavaScript, Bash,
`ip`, `cp`, `rm`, or a repository-controlled executable as root. The listener
and all Ananke/Horae/Mnemosyne/governance work remain outside the helper.

## Fixed host artifacts

These values are duplicated in the root-owned helper and the ordinary
acceptance manifest; the helper is authoritative at launch and recalculates
them rather than trusting the Node process:

| Artifact | Fixed path | SHA-256 |
| --- | --- | --- |
| Firecracker | `/usr/local/bin/firecracker` | `2fd0171309af7e24cf8dafc8a6f921c1434c49b5f9349bb996b7ed0a4deb8aa7` |
| jailer | `/usr/local/bin/jailer` | `1f3a0c1fe86212d0001819bfe0819071c01208b3ccc9398c3b3bc1b84cf21edd` |
| guest kernel (R5.4 replacement, not installed) | `/home/fatesadmin/fates-005a/diagnostics/r54/vmlinux-6.18.44-vsock-mmio` | `8b872cf4b2dfab3e2b97af8554914aad08393f1b266e7b389991da457d4caa5c` |
| guest rootfs | `/home/fatesadmin/firecracker-test/ubuntu-24.04.ext4` | `aa36ebaf68f67c1e232eb6575541de9f25763b2ce61f4bd0a062823e3d9fdf50` |
| lifecycle-test initrd | `/home/fatesadmin/fates-005a/diagnostics/r4/guest-initrd.cpio` | `51eb8d4ac3bdff9d1d17a591ae9a148f514b48e0984be0331ff99b03144f446b` |

The kernel used by Attempts 001–006 remains an immutable historical input at
`/home/fatesadmin/firecracker-test/vmlinux-6.18.44`, SHA-256
`435466ec838656f59e464ce941e7fe9f3697d5da6a73c5e5dad60dae5ad93ceb`. R5.4
extracted its embedded IKCONFIG (config SHA-256
`f02e332384bc5b4b3b8df3694935d2d7774b7b7c884414cddd7c2d65b8acb75d`) and
found `CONFIG_VSOCKETS=y`, `CONFIG_VIRTIO_VSOCKETS=y`, `CONFIG_VIRTIO=y`,
`CONFIG_VIRTIO_MMIO=y`, `CONFIG_BLK_DEV_INITRD=y`, `CONFIG_KVM_GUEST=y`,
`CONFIG_SERIAL_8250_CONSOLE=y`, and `CONFIG_PRINTK=y`, but
`CONFIG_VIRTIO_MMIO_CMDLINE_DEVICES` was disabled. Because the profile boots
with `pci=off` and the initrd has no modules, the pinned guest is classified
`PROVEN KERNEL CAPABILITY DEFECT`.

The replacement artifact was built from the official Linux 6.18.44 source
archive (archive SHA-256
`0f72d938f06828e82c90405174fe572287db7bfe089e2fc46572a99a7f240d43`) with a
certified config SHA-256
`0a9945bdc619baa720de276b82a72f7898938b9e509d394324bf95c73014480c`. Its
required symbols, including `CONFIG_VIRTIO_MMIO_CMDLINE_DEVICES=y`, are
embedded and verified. The resulting static x86-64 kernel is 29,995,192 bytes
and remains at the diagnostics-only path above; it has not replaced the
validated `~/firecracker-test` kernel.

The exact structured audit and replacement metadata are recorded in
`docs/evidence/FATES-005A-r5.4-kernel-capability.json`. The replacement helper
is likewise a staging artifact only; no installed helper or production kernel
was changed by R5.4.

Compile-only remote staging on `fates-kvm` produced the replacement helper at
`/home/fatesadmin/fates-005a/diagnostics/r54/fates-005a-host-control-r54`,
SHA-256
`7d575925963d3b08e001ee12d7f507eb4c977c040a6e9df220b226609f783207`,
owned by `fatesadmin:fatesadmin` with mode `0755`. The normal guest initrd was
built at
`/home/fatesadmin/fates-005a/diagnostics/r54/guest-initrd-normal.cpio`,
SHA-256
`77d43ef1f04cd259dd60bd6ef4143120cb273c341d1a06f4a4b950ee9fa8bd4a`; the
explicit diagnostic initrd was built at
`/home/fatesadmin/fates-005a/diagnostics/r54/guest-initrd-diagnostic.cpio`,
SHA-256
`4f1942c7a70d1866c3c8fbe54e017e57963422d8b83a12406fdaae1768a0cd50`. Both
archives are single-`init`, mode `0600`, and marked `compiled_not_used`; no
Firecracker process was launched from either staging artifact.

## R5.4 listener ownership and guest diagnostics

Attempt 006 independently reproduced the listener `EACCES`. Before jailer
launch, the exact session chain was traversable by `fatesadmin`: `/srv`,
`/srv/jailer`, and `/srv/jailer/firecracker` were `root:root 0755`, the fresh
session and chroot root were `root:root 0711`, `/root/run` was `root:root 0711`,
and `/root/run/fates` was `root:root 01733`. While Firecracker was live, jailer
changed the chroot root to `65532:65532 0700` as part of the configured
privilege drop. The session parent stayed `root:root 0711`; the listener then
received `EACCES` when pathname traversal reached the now-private chroot root,
so its `lstat()`/`unlink()` cleanup could not safely inspect the endpoint.

R5.4 therefore makes ownership explicit. The unprivileged listener closes its
open server and accepted-socket descriptors only. The fixed root helper stops
the verified Firecracker process, accounts for the launcher, removes the exact
derived namespace and jail/session, and is the sole owner of stale pathname
removal. No generic privileged unlink operation is added, and the pre-launch
socket type plus bounded `dev`/`ino` evidence remains required.

The built R5.4 transport module was also exercised on Linux in a non-VMM
descriptor check: close completed after its socket parent was made inaccessible,
and an idempotent second close preserved a replacement Unix socket. These are
listener-lifecycle checks only; they are not Firecracker/vsock or containment
acceptance evidence.

The production guest source now has an explicitly requested diagnostic build
mode. It emits at most 32 fixed stage records to the guest serial stream and
clamps numeric errno values to 0–65535; it adds no shell, network, credential,
provider, or arbitrary guest-content channel. The normal acceptance initrd
build does not enable this mode. A diagnostic initrd can be requested with
`fates-005a-build-guest-initrd.mjs --diagnostic` for a future non-acceptance
rehearsal after the explicit kernel/helper replacement.

The original files under `~/firecracker-test` are read-only inputs. The
attempt initrd is freshly built at the exact derived path
`/home/fatesadmin/fates-005a/attempts/fates-005a-NNN/guest-initrd.cpio`; the
helper verifies its digest before copying it into the exact jail.

The lifecycle-test initrd is a separate retained R4/R5 diagnostic fixture, not
an acceptance-attempt input. Read-only verification on `fates-kvm` found a
regular, non-symlink `newc` cpio archive owned by `fatesadmin:fatesadmin`, mode
`0600`, size `743936` bytes, with only the `init` archive entry. The embedded
`/init` byte-for-byte matches a static build of the exact pinned Moirae proposal
source at `832d35d3fe14e5539059adfedf43ce1159d2fbd8` (source SHA-256
`37433ea0f2e9af41327b9899fcf924b44ccd9790d34fa9fd296ba219e2faa45f`). The
source and archive contain no model, provider client, credentials, shell, host
checkout, or unrelated payload. This dedicated fixture is therefore bound to
`51eb8d4ac3bdff9d1d17a591ae9a148f514b48e0984be0331ff99b03144f446b`. The
immutable Attempt-003 evidence records a different, ephemeral freshly built
initrd hash, `67336c2dfa415fd347878d68c386cb2c5cc52be089345fa5b303e4933b4922a6`;
that attempt input was removed and is not reused here.

## R5.1 helper replacement (manual root action only)

R5.1 builds and validates a replacement for the already-installed R4 helper
but does not replace it. The installed R4 SHA-256 is
`a52d7c27dd1f9c3e55a95283ccf11dda844b3cd6529e862437d86020ee228e34` and must
remain unchanged during this remediation. The R5.1 staging artifact was built
from Integration commit
`171a4f0f4ceec157134867f17bb62ba92f4508fb` and the corrected helper source
SHA-256 is
`1fe49219221e69d645a6683090f0a3d1859c166c3e943b97ffeb500e9c5f52c4`. The
Linux compiler was `gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0`; the exact command
was:

```sh
gcc -std=c11 -O2 -static -s -Wall -Wextra -Werror -o /home/fatesadmin/fates-005a/host-control-build/fates-005a-host-control-r5-1 scripts/fates-005a-host-control.c
```

The resulting non-installed staging binary is
`/home/fatesadmin/fates-005a/host-control-build/fates-005a-host-control-r5-1`,
SHA-256
`030df70f1ebc77659bae458bc6b2b45db8a6b4c50da4b9973e217bac8c52445e`, size
`1120568` bytes, static x86-64. The previously staged R5 binary remains
separate and is not the installation source. After reviewing the R5.1
implementation commit and exact build SHA-256, the host administrator may run
this bounded sequence on `fates-kvm`; the temporary and backup paths are fixed:

```sh
set -eu
src=/home/fatesadmin/fates-005a/host-control-build/fates-005a-host-control-r5-1
dst=/usr/local/libexec/fates-005a-host-control
tmp=/usr/local/libexec/.fates-005a-host-control.r5.new
backup=/usr/local/libexec/.fates-005a-host-control.r4.backup
fixture=/home/fatesadmin/fates-005a/diagnostics/r4/guest-initrd.cpio
fixture_expected='51eb8d4ac3bdff9d1d17a591ae9a148f514b48e0984be0331ff99b03144f446b'
expected='030df70f1ebc77659bae458bc6b2b45db8a6b4c50da4b9973e217bac8c52445e'
old='a52d7c27dd1f9c3e55a95283ccf11dda844b3cd6529e862437d86020ee228e34'
test -f "$fixture"
test ! -L "$fixture"
test "$(stat -c '%U:%G %a %s %F' "$fixture")" = 'fatesadmin:fatesadmin 600 743936 regular file'
test "$(sha256sum "$fixture" | awk '{print $1}')" = "$fixture_expected"
test "$(sha256sum "$src" | awk '{print $1}')" = "$expected"
test ! -e "$tmp"
test ! -e "$backup"
test "$(sha256sum "$dst" | awk '{print $1}')" = "$old"
install -o root -g root -m 0755 "$dst" "$backup"
test "$(sha256sum "$backup" | awk '{print $1}')" = "$old"
install -o root -g root -m 0755 "$src" "$tmp"
test "$(sha256sum "$tmp" | awk '{print $1}')" = "$expected"
mv -f -- "$tmp" "$dst"
visudo -cf /etc/sudoers
stat -c '%U:%G %a %n' "$dst" /etc/sudoers.d/fates-005a-host-control
test "$(sha256sum "$dst" | awk '{print $1}')" = "$expected"
sudo -n "$dst" --version
sudo -n "$dst" --self-test
test ! -e /run/netns/fates-r5-lifecycle-test
test ! -e /srv/jailer/firecracker/fates-r5-lifecycle-test
test ! -e /home/fatesadmin/fates-005a/attempts/fates-r5-lifecycle-test
test ! -e /run/netns/fates-005a-004
test ! -e /srv/jailer/firecracker/fates-005a-004
test ! -e /home/fatesadmin/fates-005a/attempts/fates-005a-004
test ! -e /home/fatesadmin/fates-005a/repos/integration/docs/evidence/FATES-005A-live-acceptance-attempt-004.json
```

The R5.1 `--self-test` lifecycle, when run as root after this explicitly
authorized replacement, uses only `fates-r5-lifecycle-test`; it does not create
an acceptance attempt or evidence file. The acceptance command is intentionally
not included here. A later authorized prompt must provide the exact R5 Moirae
and Integration descendant SHAs and select an unused three-digit acceptance
attempt. At the R5.1 checkpoint, Attempt 004 remained unused; R5.2 records its
subsequent one-shot consumption above.
