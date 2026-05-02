[CmdletBinding()]
param(
  [int]$BackendPort = 5000,
  [int]$FrontendPort = 3000,
  [int]$DatabasePort = 5432,
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[start] $Message" -ForegroundColor Cyan
}

function Test-TcpPort {
  param(
    [string]$HostName,
    [int]$Port
  )

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $async = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(1200)) {
      $client.Close()
      return $false
    }

    $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Wait-ForHttp {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 1000
    }
  }

  return $false
}

function Start-ServiceProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  Write-Step "Starting $Name"
  return Start-Process powershell -WorkingDirectory $WorkingDirectory -PassThru -ArgumentList @(
    '-NoExit',
    '-Command',
    $Command
  )
}

function Initialize-NpmDependencies {
  param(
    [string]$Name,
    [string]$WorkingDirectory
  )

  $packageJsonPath = Join-Path $WorkingDirectory 'package.json'
  if (-not (Test-Path $packageJsonPath)) {
    throw "$Name package.json not found at $packageJsonPath"
  }

  $needsInstall = -not (Test-Path (Join-Path $WorkingDirectory 'node_modules'))

  if (-not $needsInstall) {
    Push-Location $WorkingDirectory
    try {
      & cmd /c "npm ls --depth 0 >nul 2>&1"
      if ($LASTEXITCODE -ne 0) {
        $needsInstall = $true
      }
    } finally {
      Pop-Location
    }
  }

  if (-not $needsInstall) {
    Write-Step "$Name dependencies are ready"
    return
  }

  Write-Step "Installing $Name dependencies"
  Push-Location $WorkingDirectory
  try {
    if (Test-Path (Join-Path $WorkingDirectory 'package-lock.json')) {
      & cmd /c "npm ci"
    } else {
      & cmd /c "npm install"
    }

    if ($LASTEXITCODE -ne 0) {
      throw "Failed to install dependencies for $Name"
    }
  } finally {
    Pop-Location
  }
}

$root = $PSScriptRoot
if (-not $root -or -not $root.Trim()) {
  $root = (Get-Location).Path
}

$serverPath = Join-Path $root 'server'
$clientPath = Join-Path $root 'client'
$serverEnv = Join-Path $serverPath '.env'
$clientEnv = Join-Path $clientPath '.env'

if (-not (Test-Path $serverPath)) {
  throw "Server folder not found at $serverPath"
}

if (-not (Test-Path $clientPath)) {
  throw "Client folder not found at $clientPath"
}

Write-Step "Root: $root"

if (-not (Test-Path $serverEnv)) {
  Write-Host "[start] server/.env missing. Copying from server/.env.example is recommended." -ForegroundColor Yellow
}

if (-not (Test-Path $clientEnv)) {
  Write-Host "[start] client/.env missing. Copying from client/.env.example is recommended." -ForegroundColor Yellow
}

if (Test-TcpPort -HostName '127.0.0.1' -Port $DatabasePort) {
  Write-Step "Database port $DatabasePort is reachable"
} else {
  Write-Host "[start] Database port $DatabasePort is not reachable. Start PostgreSQL and make sure innovation_hub exists." -ForegroundColor Yellow
}

$backendAlreadyRunning = Test-TcpPort -HostName '127.0.0.1' -Port $BackendPort
$frontendAlreadyRunning = Test-TcpPort -HostName '127.0.0.1' -Port $FrontendPort

if ($backendAlreadyRunning) {
  Write-Step "Backend already running on port $BackendPort. Reusing existing service"
}

if ($frontendAlreadyRunning) {
  Write-Step "Frontend already running on port $FrontendPort. Reusing existing service"
}

$backendCommand = 'npm start'
$frontendCommand = 'npm start'

Initialize-NpmDependencies -Name 'backend' -WorkingDirectory $serverPath
Initialize-NpmDependencies -Name 'frontend' -WorkingDirectory $clientPath

$backendProcess = $null
$frontendProcess = $null

if (-not $backendAlreadyRunning) {
  $backendProcess = Start-ServiceProcess -Name 'backend' -WorkingDirectory $serverPath -Command $backendCommand
}

if (-not $frontendAlreadyRunning) {
  $frontendProcess = Start-ServiceProcess -Name 'frontend' -WorkingDirectory $clientPath -Command $frontendCommand
}

Write-Step "Waiting for backend on http://localhost:$BackendPort/api/health"
if (-not (Wait-ForHttp -Url "http://localhost:$BackendPort/api/health" -TimeoutSeconds 90)) {
  throw "Backend did not become ready on http://localhost:$BackendPort/api/health"
}

Write-Step "Waiting for frontend on http://localhost:$FrontendPort"
if (-not (Wait-ForHttp -Url "http://localhost:$FrontendPort" -TimeoutSeconds 120)) {
  throw "Frontend did not become ready on http://localhost:$FrontendPort"
}

Write-Host ""
Write-Host "[start] Full stack is running:" -ForegroundColor Green
Write-Host "[start] Frontend: http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "[start] Backend:  http://localhost:$BackendPort/api/health" -ForegroundColor Green
Write-Host "[start] Database: 127.0.0.1:$DatabasePort" -ForegroundColor Green
Write-Host ""

if ($backendProcess) {
  Write-Host "[start] Backend PID: $($backendProcess.Id)" -ForegroundColor DarkGray
} else {
  Write-Host "[start] Backend PID: existing process" -ForegroundColor DarkGray
}

if ($frontendProcess) {
  Write-Host "[start] Frontend PID: $($frontendProcess.Id)" -ForegroundColor DarkGray
} else {
  Write-Host "[start] Frontend PID: existing process" -ForegroundColor DarkGray
}

if ($OpenBrowser) {
  Start-Process "http://localhost:$FrontendPort"
}

