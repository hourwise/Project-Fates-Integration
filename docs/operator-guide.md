# Fates operator guide

The Integration repository provides a small control-plane operator for existing Fate
checkouts. It does not copy runtime source, create local dependencies, or replace the
immutable compatibility lock.

## Discover and report

From `Project-Fates-Integration`:

```shell
npm run fates:plan
npm run fates:report
node scripts/fates-operator.mjs report --json --output fates-report.json
```

The report is safe to share with outside testers: it contains repository paths, branches,
HEADs, dirty-state, package metadata, available validation scripts, and missing-checkout
status. It does not read environment secrets or report credential material.

## Install one Fate or the complete system

Each Fate remains independently installable and testable. The installer operates only on
the sibling checkouts named by the operator and uses each repository's own package manager
boundary:

```shell
node scripts/fates-operator.mjs install mnemosyne --yes
node scripts/fates-operator.mjs install all --yes
```

Use `--dry-run` to inspect the exact actions. Windows users can run `install-fates.ps1`
from Explorer/PowerShell; POSIX users can run `./install-fates.sh`. Installation requires
explicit `--yes` because `npm ci` replaces a checkout's installed dependency tree.

## Validation order

Run a standalone Fate's own validation command first, then the Integration control checks:

```shell
npm run validate:quick       # Ananke
npm run validate             # Mnemosyne, Horae, Moirae Code, or Runtime Contracts
npm run validate             # Project-Fates-Integration, from this repository
```

Linux/KVM containment remains an environment-dependent validation step and is not claimed
by this Windows operator surface.
