[CmdletBinding()]
param(
  [int]$BackendPort = 5000,
  [int]$FrontendPort = 3000,
  [int]$DatabasePort = 5432,
  [switch]$OpenBrowser
)

$nestedScript = Join-Path $PSScriptRoot 'Innovation-Workspace-main\START_PROJECT.ps1'

if (-not (Test-Path $nestedScript)) {
  throw "Launcher script not found at $nestedScript"
}

& $nestedScript @PSBoundParameters