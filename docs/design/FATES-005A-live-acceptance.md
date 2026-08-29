# FATES-005A — real Firecracker/KVM and Moirae-vsock acceptance

Status: R5 remediation prepared; live acceptance is not claimed until a later
authorized Linux/KVM `--execute` path completes. R5 does not execute Attempt
004, replace the installed R4 helper, or create acceptance evidence. The
historical Attempt-001/002/003 evidence remains immutable.

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
socket. Its signal cleanup waits for transport closure and unlinks only the
same socket inode it bound. No TCP fallback, NIC, TAP, NAT, or ordinary IP
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
| guest kernel | `/home/fatesadmin/firecracker-test/vmlinux-6.18.44` | `435466ec838656f59e464ce941e7fe9f3697d5da6a73c5e5dad60dae5ad93ceb` |
| guest rootfs | `/home/fatesadmin/firecracker-test/ubuntu-24.04.ext4` | `aa36ebaf68f67c1e232eb6575541de9f25763b2ce61f4bd0a062823e3d9fdf50` |

The original files under `~/firecracker-test` are read-only inputs. The
attempt initrd is freshly built at the exact derived path
`/home/fatesadmin/fates-005a/attempts/fates-005a-NNN/guest-initrd.cpio`; the
helper verifies its digest before copying it into the exact jail.

## R5 helper replacement (manual root action only)

R5 builds and validates a replacement for the already-installed R4 helper but
does not replace it. The installed R4 SHA-256 is
`a52d7c27dd1f9c3e55a95283ccf11dda844b3cd6529e862437d86020ee228e34` and must
remain unchanged during this remediation. After reviewing the R5 implementation
commit and the exact build SHA-256, the host administrator may run this bounded
sequence on `fates-kvm`; the temporary and backup paths are fixed:

```sh
set -eu
src=/home/fatesadmin/fates-005a/host-control-build/fates-005a-host-control-r5
dst=/usr/local/libexec/fates-005a-host-control
tmp=/usr/local/libexec/.fates-005a-host-control.r5.new
backup=/usr/local/libexec/.fates-005a-host-control.r4.backup
expected='2f9788e6102f9006cb41d5f5042b4bab5306d68c7473d7185c5b95b2dd115020'
old='a52d7c27dd1f9c3e55a95283ccf11dda844b3cd6529e862437d86020ee228e34'
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
```

The R5 `--self-test` lifecycle, when run as root after this explicitly
authorized replacement, uses only `fates-r5-lifecycle-test`; it does not create
an acceptance attempt or evidence file. The acceptance command is intentionally
not included here. A later authorized prompt must provide the exact R5 Moirae
and Integration descendant SHAs and select an unused three-digit acceptance
attempt. Attempt 004 remains unused.
