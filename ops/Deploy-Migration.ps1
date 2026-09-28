[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Migration,
  [string]$SshAlias = 'spaceship',
  [string]$RemoteDir = '~/buyniverse.com',
  [string]$MigrationConfigPath = '/home/agingriouh/buyniverse-migration.php',
  [string]$ReleaseRef = 'origin/main',
  [switch]$SkipRelease
)

# Controlled release with a schema change:
#   1. lint every PHP file of the release on the server's PHP 8.4,
#   2. apply one idempotent migration with the dedicated migration account,
#   3. only then publish dist/ with ops/Deploy-Buyniverse.ps1.
# The migration runner is base64-encoded so the remote shell expands nothing,
# and PHP reads the private migration configuration only on the server.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Migration -notmatch '^\d{8}_[a-z0-9_]+\.sql$' -or $SshAlias -notmatch '^[A-Za-z0-9._@-]+$' -or $RemoteDir -notmatch '^(?:~\/|\/)[A-Za-z0-9._/-]+$' -or
    $MigrationConfigPath -notmatch '^/[A-Za-z0-9._/-]+$' -or $ReleaseRef -notmatch '^[A-Za-z0-9._/-]+$') {
  throw 'Unsupported deployment argument.'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "ops/migrations/$Migration"))) { throw "Unknown migration: $Migration" }

$php = @'
<?php
// Errors are printed (statement number and database message, never secrets)
// because the server CLI runs with display_errors off.
try {
  $configPath = getenv("BUYNIVERSE_MIGRATION_CONFIG"); $sqlPath = getenv("BUYNIVERSE_MIGRATION_SQL");
  if (!is_string($configPath) || !is_file($configPath) || !is_readable($configPath)) throw new RuntimeException("Migration configuration is unavailable: " . $configPath);
  if (!is_string($sqlPath) || !is_file($sqlPath)) throw new RuntimeException("Migration file is unavailable");
  $config = require $configPath;
  $pdo = new PDO($config["db_dsn"], $config["db_user"], $config["db_password"], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
  $sql = preg_replace("/^--.*$/m", "", (string) file_get_contents($sqlPath));
  $count = 0;
  foreach (preg_split("/;\s*(?:\r?\n|$)/", $sql) as $statement) {
    $statement = trim($statement);
    if ($statement === "") continue;
    $count++;
    try { $pdo->exec($statement); }
    catch (Throwable $error) { fwrite(STDOUT, "STATEMENT $count FAILED: " . substr(preg_replace("/\s+/", " ", $statement), 0, 100) . PHP_EOL . "  " . $error->getMessage() . PHP_EOL); exit(2); }
  }
  echo "MIGRATION_OK statements=$count", PHP_EOL;
} catch (Throwable $error) { fwrite(STDOUT, "MIGRATION_ERROR " . get_class($error) . ": " . $error->getMessage() . PHP_EOL); exit(3); }
'@
$encodedPhp = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($php))
$sshOptions = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=25', '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=3')
$remote = @"
set -eu
cd -- $RemoteDir
git fetch --prune origin main
work=`$(mktemp -d /tmp/buyniverse-migration.XXXXXX)
trap 'rm -rf -- "`$work"' EXIT
git archive $ReleaseRef dist ops/migrations/$Migration | tar -x -C "`$work"
php_bin=php
if test -x /opt/alt/php84/usr/bin/php; then php_bin=/opt/alt/php84/usr/bin/php; fi
find "`$work/dist" -name '*.php' -print0 | xargs -0 -n1 "`$php_bin" -l >/dev/null
echo "LINT_OK"
echo $encodedPhp | base64 -d | BUYNIVERSE_MIGRATION_CONFIG=$MigrationConfigPath BUYNIVERSE_MIGRATION_SQL="`$work/ops/migrations/$Migration" "`$php_bin"
"@

Write-Host "Linting release and applying $Migration..." -ForegroundColor Yellow
& ssh @sshOptions $SshAlias $remote
if ($LASTEXITCODE -ne 0) { throw "Remote lint or migration failed (exit $LASTEXITCODE); release not published." }
if ($SkipRelease) { Write-Host 'Migration applied; release skipped by request.' -ForegroundColor Green; exit 0 }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Deploy-Buyniverse.ps1')
if ($LASTEXITCODE -ne 0) { throw "Release failed after the migration (exit $LASTEXITCODE)." }
Write-Host "=== $Migration applied and release published ===" -ForegroundColor Green
