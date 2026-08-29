# FATES-005A — real Firecracker/KVM and Moirae-vsock acceptance

Status: implementation prepared; live acceptance is not claimed until the
Linux/KVM `--execute` path completes. This remediation does not execute
attempt `001` and does not create an acceptance evidence file.

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
digits. Its operations are `prepare`, `launch`, `inspect`, and `cleanup`, plus
the harmless `--version` and `--self-test` modes. It derives every namespace,
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

## Bootstrap (manual root action only)

The remediation prepares the source and tests but does not install a sudoers
rule or ask for a password. After reviewing the implementation commit and the
compiled helper digest, the host administrator can run this small interactive
sequence on `fates-kvm`:

```sh
set -eu
src=/home/fatesadmin/fates-005a/host-control-build/fates-005a-host-control
dst=/usr/local/libexec/fates-005a-host-control
expected='<INSERT-REPORTED-HELPER-BINARY-SHA256>'
test "$(sha256sum "$src" | awk '{print $1}')" = "$expected"
sudo install -o root -g root -m 0755 "$src" "$dst"
printf '%s\n' 'fatesadmin ALL=(root) NOPASSWD: /usr/local/libexec/fates-005a-host-control' | sudo tee /etc/sudoers.d/fates-005a-host-control >/dev/null
sudo chmod 0440 /etc/sudoers.d/fates-005a-host-control
sudo visudo -cf /etc/sudoers
sudo stat -c '%U:%G %a %n' "$dst" /etc/sudoers.d/fates-005a-host-control
sudo sha256sum "$dst"
sudo -n "$dst" --version
```

The `expected` value is intentionally filled from the remediation report; it
must not be guessed. The installed helper must remain root-owned, mode 0755,
and non-writable by `fatesadmin`. A harmless self-test may be run as:

```sh
sudo -n /usr/local/libexec/fates-005a-host-control --self-test
```

Rollback removes only this helper and its one sudoers file, followed by a
syntax check:

```sh
sudo rm -f /etc/sudoers.d/fates-005a-host-control
sudo rm -f /usr/local/libexec/fates-005a-host-control
sudo visudo -cf /etc/sudoers
```

The acceptance command is intentionally not included here. A later authorized
acceptance prompt must provide the new Moirae and Integration descendant SHAs,
and attempt `001` remains unused until then.
