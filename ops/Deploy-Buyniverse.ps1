[CmdletBinding()]
param(
  [string]$SshAlias = "spaceship",
  [string]$RemoteDir = "~/buyniverse.com",
  [string]$HealthUrl = "https://buyniverse.com/",
  # The demo is a separate deployment with its own docroot and a config of its
  # own. Pass an empty string to publish production only.
  [string]$DemoDir = "~/demo.buyniverse.com",
  [string]$DemoHost = "demo.buyniverse.com"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($SshAlias -notmatch '^[A-Za-z0-9._@-]+$') {
  throw "SshAlias contains unsupported characters."
}
if ($DemoDir -ne "" -and ($DemoDir -notmatch '^(?:~\/|\/)[A-Za-z0-9._/-]+$' -or $DemoHost -notmatch '^[a-z0-9.-]+$')) {
  throw "DemoDir/DemoHost contain unsupported characters."
}
if ($RemoteDir -notmatch '^(?:~\/|\/)[A-Za-z0-9._/-]+$') {
  throw "RemoteDir must be an absolute POSIX path or ~/ path without shell metacharacters."
}

Write-Host "=== Deploying Buyniverse to Spaceship ($SshAlias) ===" -ForegroundColor Cyan

$sshOptions = @(
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=15",
  "-o", "ServerAliveInterval=5",
  "-o", "ServerAliveCountMax=3"
)

# Execute atomic remote deployment script with retry logic to avoid Spaceship port 21098 rate-limiting
$remoteScriptTemplate = @'
set -eu
cd -- __REMOTE_DIR__
release_dir="$(pwd -P)"
case "$release_dir" in
  */buyniverse.com) ;;
  *) echo "Refusing unexpected release directory: $release_dir" >&2; exit 64 ;;
esac

git fetch --prune origin main
# Refuse the release, before touching the live tree, while a migration it
# needs is pending: every table in ops/schema-requirements.txt must exist.
required="$(git show origin/main:ops/schema-requirements.txt 2>/dev/null | grep -v '^#' | grep -v '^[[:space:]]*$' || true)"
if [ -n "$required" ]; then
  php_bin=php
  if test -x /opt/alt/php84/usr/bin/php; then php_bin=/opt/alt/php84/usr/bin/php; fi
  printf '%s\n' "$required" | "$php_bin" -r '$c = require getenv("HOME") . "/buyniverse-runtime.php"; $p = new PDO($c["db_dsn"], $c["db_user"], $c["db_password"]); $m = []; foreach (file("php://stdin", FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $t) { $s = $p->prepare("SHOW TABLES LIKE ?"); $s->execute([trim($t)]); if (!$s->fetchColumn()) $m[] = trim($t); } if ($m) { fwrite(STDERR, "missing tables: " . implode(", ", $m) . PHP_EOL); exit(1); } echo "SCHEMA_OK", PHP_EOL;' \
    || { echo "Pending migration: the release needs tables that do not exist yet; nothing was published." >&2; exit 65; }
fi
git reset --hard origin/main
test -d dist
test -f dist/index.html
test -f dist/.htaccess

stage="$(mktemp -d /tmp/buyniverse-release.XXXXXX)"
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT HUP INT TERM
cp -a dist/. "$stage"/

# release_dir was resolved and checked above; do not use a computed parent.
find "$release_dir" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf -- {} +
cp -a "$stage"/. "$release_dir"/

test -f "$release_dir/index.html"
test -f "$release_dir/.htaccess"
test -f "$release_dir/app/main.js"
git log -n 1 --oneline

# The demo host gets the same build in its own docroot. Its configuration sits
# beside the docroot (see ops/buyniverse-demo-runtime.example.php), holds no
# secrets and is created once; an existing one is never overwritten.
demo_dir="__DEMO_DIR__"
if [ -n "$demo_dir" ]; then
  demo_dir="$(eval "echo $demo_dir")"
  case "$demo_dir" in
    */demo.buyniverse.com) ;;
    *) echo "Refusing unexpected demo directory: $demo_dir" >&2; exit 64 ;;
  esac
  mkdir -p -- "$demo_dir"
  find "$demo_dir" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  cp -a "$stage"/. "$demo_dir"/
  demo_config="${demo_dir}.runtime.php"
  if [ ! -f "$demo_config" ]; then
    printf '%s\n' '<?php' "return ['app_mode' => 'demo', 'demo_hosts' => ['__DEMO_HOST__'], 'allow_demo_workspace_state' => false];" > "$demo_config"
    chmod 600 "$demo_config"
  fi
  test -f "$demo_dir/index.html"
  echo "DEMO_PUBLISHED $demo_dir"
fi
'@
$remoteScript = $remoteScriptTemplate.Replace('__REMOTE_DIR__', $RemoteDir).Replace('__DEMO_DIR__', $DemoDir).Replace('__DEMO_HOST__', $DemoHost)
# Windows PowerShell 5.1 strips embedded double quotes from native arguments,
# so the script travels base64-encoded and is decoded by the remote shell.
$remoteScript = $remoteScript -replace "`r`n", "`n"
$remoteCommand = "echo " + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript)) + " | base64 -d | bash"

$deployed = $false
$maxSshAttempts = 3
for ($sshAttempt = 1; $sshAttempt -le $maxSshAttempts; $sshAttempt++) {
  Write-Host "Connecting to $SshAlias (attempt $sshAttempt/$maxSshAttempts)..." -ForegroundColor Yellow
  & ssh @sshOptions $SshAlias $remoteCommand
  if ($LASTEXITCODE -eq 0) {
    $deployed = $true
    break
  }
  if ($LASTEXITCODE -eq 65) { throw "Release refused: a required migration is pending (see ops/schema-requirements.txt). Nothing was published." }
  Write-Warning "SSH connection attempt $sshAttempt failed with exit code $LASTEXITCODE."
  if ($sshAttempt -lt $maxSshAttempts) {
    Write-Host "Waiting 15 seconds before retry..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
  }
}

if (-not $deployed) {
  throw "Remote deployment failed after $maxSshAttempts attempts."
}

$healthy = $false
for ($attempt = 1; $attempt -le 5; $attempt++) {
  & curl.exe --fail --silent --show-error --max-time 20 --head --output NUL $HealthUrl
  if ($LASTEXITCODE -eq 0) {
    $healthy = $true
    break
  }
  if ($attempt -lt 5) { Start-Sleep -Seconds 2 }
}
if (-not $healthy) {
  throw "Deployment completed but health check failed: $HealthUrl"
}
& curl.exe --fail --silent --show-error --max-time 20 --head $HealthUrl

Write-Host "=== Deployment to buyniverse.com Completed Successfully ===" -ForegroundColor Green
