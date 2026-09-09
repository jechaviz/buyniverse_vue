[CmdletBinding()]
param(
  [string]$SshAlias = "spaceship",
  [string]$RemoteDir = "~/buyniverse.com",
  [string]$HealthUrl = "https://buyniverse.com/"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($SshAlias -notmatch '^[A-Za-z0-9._@-]+$') {
  throw "SshAlias contains unsupported characters."
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
'@
$remoteScript = $remoteScriptTemplate.Replace('__REMOTE_DIR__', $RemoteDir)

$deployed = $false
$maxSshAttempts = 3
for ($sshAttempt = 1; $sshAttempt -le $maxSshAttempts; $sshAttempt++) {
  Write-Host "Connecting to $SshAlias (attempt $sshAttempt/$maxSshAttempts)..." -ForegroundColor Yellow
  & ssh @sshOptions $SshAlias $remoteScript
  if ($LASTEXITCODE -eq 0) {
    $deployed = $true
    break
  }
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
