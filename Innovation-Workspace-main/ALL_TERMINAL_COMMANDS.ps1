param(
  [string]$DbUser = "postgres",
  [SecureString]$DbPassword,
  [string]$DbHost = "localhost",
  [string]$DbPort = "5432",
  [string]$DbName = "innovation_hub"
)

$ErrorActionPreference = "Stop"

$scriptPath = $MyInvocation.MyCommand.Path
if (-not $scriptPath) {
  $scriptPath = Join-Path (Get-Location) "ALL_TERMINAL_COMMANDS.ps1"
}
$root = Split-Path -Parent $scriptPath
$serverDir = Join-Path $root "server"
$clientDir = Join-Path $root "client"
$schemaPath = Join-Path $serverDir "schema.sql"
$serverEnv = Join-Path $serverDir ".env"
$serverEnvExample = Join-Path $serverDir ".env.example"
$clientEnv = Join-Path $clientDir ".env"
$clientEnvExample = Join-Path $clientDir ".env.example"

function Resolve-PsqlPath {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) {
    return $cmd.Source
  }

  $candidates = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName "bin\psql.exe" }

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Set-EnvValue {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )

  if (!(Test-Path $Path)) {
    Set-Content -Path $Path -Value "$Key=$Value"
    return
  }

  $content = Get-Content -Path $Path -Raw
  $originalContent = $content
  $pattern = "(?m)^$([Regex]::Escape($Key))=.*$"
  if ($content -match $pattern) {
    $content = [Regex]::Replace($content, $pattern, "$Key=$Value")
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) {
      $content += "`n"
    }
    $content += "$Key=$Value`n"
  }

  if ($content -eq $originalContent) {
    return
  }

  try {
    Set-Content -Path $Path -Value $content
  } catch {
    Write-Warning "Could not update $Path because it is in use. Close processes using this file, or update it manually."
  }
}

Write-Host "== Innovation Hub Full Setup (Frontend + Backend + Database) ==" -ForegroundColor Cyan

if (!(Test-Path $serverEnv) -and (Test-Path $serverEnvExample)) {
  Copy-Item $serverEnvExample $serverEnv
  Write-Host "Created server/.env from .env.example" -ForegroundColor Yellow
}

if (!(Test-Path $clientEnv) -and (Test-Path $clientEnvExample)) {
  Copy-Item $clientEnvExample $clientEnv
  Write-Host "Created client/.env from .env.example" -ForegroundColor Yellow
}

if (!(Test-Path $schemaPath)) {
  throw "schema.sql not found at $schemaPath"
}

if (-not $DbPassword) {
  $DbPassword = Read-Host "Enter PostgreSQL password" -AsSecureString
}

$plainDbPassword = [System.Net.NetworkCredential]::new("", $DbPassword).Password
$env:PGPASSWORD = $plainDbPassword
$psqlPath = Resolve-PsqlPath

if (-not $psqlPath) {
  throw "psql was not found. Install PostgreSQL client tools (or full PostgreSQL) and ensure psql.exe is in PATH. Then re-run this script."
}

# Keep runtime credentials in local env files, not templates.
Set-EnvValue -Path $serverEnv -Key "DB_HOST" -Value $DbHost
Set-EnvValue -Path $serverEnv -Key "DB_PORT" -Value $DbPort
Set-EnvValue -Path $serverEnv -Key "DB_USER" -Value $DbUser
Set-EnvValue -Path $serverEnv -Key "DB_PASSWORD" -Value $plainDbPassword
Set-EnvValue -Path $serverEnv -Key "DB_NAME" -Value $DbName
Set-EnvValue -Path $serverEnv -Key "PORT" -Value "5000"
Set-EnvValue -Path $serverEnv -Key "CLIENT_ORIGIN" -Value "http://localhost:3000,http://localhost:3001,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5000"
Set-EnvValue -Path $clientEnv -Key "REACT_APP_API_URL" -Value "http://localhost:5000/api"

Write-Host "\n[1/5] Creating database if missing..." -ForegroundColor Green
$safeDbName = $DbName.Replace('"', '""')
$dbExistsOutput = & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$DbName' LIMIT 1;"
$dbExists = if ($null -eq $dbExistsOutput) { "" } else { [string]$dbExistsOutput }
$dbExists = $dbExists.Trim()

if ($LASTEXITCODE -ne 0) {
  throw "Failed to query PostgreSQL for database existence. Check host/port/user/password."
}

if ($dbExists -ne "1") {
  & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE `"$safeDbName`";" | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create database $DbName."
  }
} else {
  Write-Host "Database $DbName already exists." -ForegroundColor Yellow
}

Write-Host "\n[2/5] Applying schema..." -ForegroundColor Green
& $psqlPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $schemaPath | Out-Host

Write-Host "\n[3/5] Installing backend dependencies..." -ForegroundColor Green
Push-Location $serverDir
npm install | Out-Host
Pop-Location

Write-Host "\n[4/5] Installing frontend dependencies..." -ForegroundColor Green
Push-Location $clientDir
npm install | Out-Host
Pop-Location

Write-Host "\n[5/5] Starting backend and frontend in separate terminals..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$serverDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$clientDir'; npm start"

Write-Host "\nDone." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Health:   http://localhost:5000/api/health" -ForegroundColor White

# Clear sensitive values from process env after setup.
if ($env:PGPASSWORD) {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
