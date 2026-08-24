#!/usr/bin/env sh
set -eu

target="${1:-all}"
root="${FATES_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
exec node "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/scripts/fates-operator.mjs" install "$target" --root "$root" --yes
