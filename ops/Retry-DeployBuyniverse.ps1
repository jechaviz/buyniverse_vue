[CmdletBinding()]
param(
  [int]$MaxAttempts = 6,
  [int]$InitialDelaySeconds = 120,
  [int]$MaxDelaySeconds = 1800,
  [int]$AttemptTimeoutSeconds = 75,
  [string]$ExpectedReleaseMarker = 'commercial-metrics.js?v=2'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$deployScript = 'C:\git\webhacks\spaceship\scripts\Deploy-Buyniverse.ps1'
$logPath = Join-Path ([System.IO.Path]::GetTempPath()) 'buyniverse-deploy-retry.log'

function Write-RetryLog {
  param([string]$Message)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K') $Message"
  Write-Output $line
  Add-Content -LiteralPath $logPath -Value $line
}

if (-not (Test-Path -LiteralPath $deployScript)) {
  throw "Missing deployment script: $deployScript"
}

for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
  $stdout = Join-Path ([System.IO.Path]::GetTempPath()) "buyniverse-deploy-attempt-$attempt.out.log"
  $stderr = Join-Path ([System.IO.Path]::GetTempPath()) "buyniverse-deploy-attempt-$attempt.err.log"
  Write-RetryLog "Attempt $attempt/$MaxAttempts started."

  $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $deployScript
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

  $finished = $process.WaitForExit($AttemptTimeoutSeconds * 1000)
  if (-not $finished) {
    & taskkill.exe /PID $process.Id /T /F | Out-Null
    Write-RetryLog "Attempt $attempt timed out after $AttemptTimeoutSeconds seconds."
  } elseif ($process.ExitCode -eq 0) {
    try {
      $html = curl.exe --fail --silent --show-error --max-time 20 https://buyniverse.com/
      if ($LASTEXITCODE -eq 0 -and $html -match [regex]::Escape($ExpectedReleaseMarker)) {
        Write-RetryLog "Deployment verified. Release marker '$ExpectedReleaseMarker' is live."
        exit 0
      }
      Write-RetryLog "Deploy process completed but the expected release marker is not public yet."
    } catch {
      Write-RetryLog "Deploy process completed but public verification failed: $($_.Exception.Message)"
    }
  } else {
    Write-RetryLog "Attempt $attempt failed with exit code $($process.ExitCode)."
  }

  if ($attempt -lt $MaxAttempts) {
    $delay = [Math]::Min($MaxDelaySeconds, $InitialDelaySeconds * [Math]::Pow(2, $attempt - 1))
    Write-RetryLog "Next attempt in $([int]$delay) seconds."
    Start-Sleep -Seconds $delay
  }
}

Write-RetryLog "Retry window ended without a verified deployment."
exit 1
