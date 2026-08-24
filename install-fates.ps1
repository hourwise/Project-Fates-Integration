param(
  [ValidateSet('ananke', 'mnemosyne', 'horae', 'moirae', 'contracts', 'all')]
  [string] $Target = 'all',
  [string] $Root = '',
  [switch] $DryRun
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = if ($Root) { $Root } else { Split-Path -Parent $scriptRoot }
$arguments = @('scripts/fates-operator.mjs', 'install', $Target, '--root', $workspaceRoot)
if ($DryRun) { $arguments += '--dry-run' } else { $arguments += '--yes' }

& node @arguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
