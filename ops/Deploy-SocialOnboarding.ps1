[CmdletBinding()]
param(
  [int]$MaxAttempts = 6,
  [int]$InitialDelaySeconds = 20,
  [int]$MaxDelaySeconds = 300,
  [string]$SshAlias = 'spaceship',
  [string]$RemoteDir = '~/buyniverse.com',
  [string]$MigrationConfigPath = '/home/agingriouh/buyniverse-migration.php',
  [string]$ReleaseRef = 'origin/main',
  [string]$ExpectedReleaseMarker = 'app/main.js?v=132'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$deployScript = 'C:\git\webhacks\spaceship\scripts\Deploy-Buyniverse.ps1'
$logPath = Join-Path ([IO.Path]::GetTempPath()) 'buyniverse-social-onboarding-deploy.log'
if ($SshAlias -notmatch '^[A-Za-z0-9._@-]+$' -or $RemoteDir -notmatch '^(?:~\/|\/)[A-Za-z0-9._/-]+$' -or $MigrationConfigPath -notmatch '^/[A-Za-z0-9._/-]+$' -or $ReleaseRef -notmatch '^[A-Za-z0-9._/-]+$') {
  throw 'Unsupported deployment argument.'
}
if (-not (Test-Path -LiteralPath $deployScript)) { throw "Missing deployment script: $deployScript" }

function Write-DeployLog([string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K') $Message"
  Write-Output $line
  Add-Content -LiteralPath $logPath -Value $line
}

# Keep the migration runner encoded so the remote shell receives no untrusted
# expansion and PHP reads the private runtime config only on the server.
$php = @'
<?php
$configPath = getenv("BUYNIVERSE_MIGRATION_CONFIG");
if (!is_string($configPath) || $configPath === "" || !is_file($configPath) || !is_readable($configPath)) throw new RuntimeException("Controlled migration configuration is unavailable");
$config = require $configPath;
$pdo = new PDO($config["db_dsn"], $config["db_user"], $config["db_password"], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
$sql = file_get_contents("/tmp/buyniverse-social-onboarding.sql");
$sql = preg_replace("/^--.*$/m", "", $sql);
foreach (preg_split("/;\\s*(?:\\r?\\n|$)/", $sql) as $statement) {
  $statement = trim($statement);
  if ($statement !== "") $pdo->exec($statement);
}
echo "MIGRATION_OK\\n";
'@
$encodedPhp = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($php))
$sshOptions = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=25', '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=3')
$remote = "set -eu; cd -- $RemoteDir; git fetch --prune origin main; git show ${ReleaseRef}:dist/index.php > /tmp/buyniverse-social-onboarding.php; git show ${ReleaseRef}:ops/migrations/20260825_social_onboarding_fiscal.sql > /tmp/buyniverse-social-onboarding.sql; if test -x /opt/alt/php84/usr/bin/php; then /opt/alt/php84/usr/bin/php -l /tmp/buyniverse-social-onboarding.php; echo $encodedPhp | base64 -d | BUYNIVERSE_MIGRATION_CONFIG=$MigrationConfigPath /opt/alt/php84/usr/bin/php; else php -l /tmp/buyniverse-social-onboarding.php; echo $encodedPhp | base64 -d | BUYNIVERSE_MIGRATION_CONFIG=$MigrationConfigPath php; fi; rm -f /tmp/buyniverse-social-onboarding.php /tmp/buyniverse-social-onboarding.sql"

for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
  Write-DeployLog "Attempt $attempt/${MaxAttempts}: remote lint and controlled fiscal migration."
  & ssh @sshOptions $SshAlias $remote
  if ($LASTEXITCODE -eq 0) {
    Write-DeployLog 'Migration verified; deploying the published dist artifact.'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $deployScript -SshAlias $SshAlias -RemoteDir $RemoteDir
    if ($LASTEXITCODE -eq 0) {
      $html = curl.exe --fail --silent --show-error --max-time 20 https://buyniverse.com/
      if ($LASTEXITCODE -eq 0 -and $html -match [regex]::Escape($ExpectedReleaseMarker)) {
        Write-DeployLog "Deployment verified with release marker $ExpectedReleaseMarker."
        exit 0
      }
      Write-DeployLog 'Deploy command completed but the expected release marker is not public.'
    } else {
      Write-DeployLog "Deploy command failed with exit code $LASTEXITCODE."
    }
  } else {
    Write-DeployLog "Remote preflight failed with exit code $LASTEXITCODE; release not attempted."
  }
  if ($attempt -lt $MaxAttempts) {
    $delay = [Math]::Min($MaxDelaySeconds, $InitialDelaySeconds * [Math]::Pow(2, $attempt - 1))
    Write-DeployLog "Next attempt in $([int]$delay) seconds."
    Start-Sleep -Seconds $delay
  }
}

Write-DeployLog 'Retry window ended without a verified deployment.'
exit 1
