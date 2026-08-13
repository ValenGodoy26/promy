param(
  [Parameter(Mandatory = $true)]
  [string]$SmokeScript,
  [string]$Port = "4017",
  [int]$StartupTimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$serverScript = Join-Path $root "dist\server.js"
$smokeScriptPath = Join-Path $root $SmokeScript
$healthUrl = "http://localhost:$Port/api/health"
$qaBaseUrl = "http://localhost:$Port/api"
$server = $null

try {
  $serverCommand = "`$env:PORT='$Port'; & '$node' '$serverScript'"
  $server = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $serverCommand -WorkingDirectory $root -PassThru -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
  $healthy = $false

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $healthUrl
      if ($response.StatusCode -eq 200) {
        $healthy = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $healthy) {
    throw "Timeout esperando healthcheck en $healthUrl"
  }

  $env:QA_BASE_URL = $qaBaseUrl
  & $node $smokeScriptPath
  if ($LASTEXITCODE -ne 0) {
    throw "La smoke QA termino con exit code $LASTEXITCODE"
  }
}
finally {
  Remove-Item Env:QA_BASE_URL -ErrorAction SilentlyContinue
  if ($server) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
}
