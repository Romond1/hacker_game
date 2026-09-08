param([switch]$Preview)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE). Publishing stopped." }
}

$deployKey = if ($env:HACKER_SSH_KEY) { $env:HACKER_SSH_KEY } else { Join-Path (Get-Location) 'SSH passkey/xs738394.key' }
$deployHost = 'xs738394@xs738394.xsrv.jp'
if (-not $Preview -and -not (Test-Path -LiteralPath $deployKey -PathType Leaf)) { throw 'SSH key not found. Set HACKER_SSH_KEY to its file path.' }
Invoke-Checked 'npm.cmd' @('test')
Invoke-Checked 'npm.cmd' @('run', 'check:server-contract')
Invoke-Checked 'npm.cmd' @('run', 'build')

$deployId = [guid]::NewGuid().ToString('N')
$deployArchive = Join-Path ([IO.Path]::GetTempPath()) "hacker-$deployId.tar.gz"
# Explicit allowlist: config.php, local credentials and SSH keys cannot enter the archive.
$deployFiles = @('index.html', 'favicon.svg', '.htaccess', 'assets', 'shared/economy.json', 'api/index.php', 'bin/create_user.php', 'bin/create_test_student.php', 'bin/check_reset.php', 'bin/check_economy.php', 'bin/provision_standard_accounts.php', 'src/bootstrap.php', 'src/reset_mission.php', 'src/progression.php', 'src/training.php')
try {
    Invoke-Checked 'tar.exe' (@('-czf', $deployArchive, '-C', 'dist') + $deployFiles)
    Invoke-Checked 'tar.exe' @('-tzf', $deployArchive)
    if ($Preview) { Write-Host 'Preview passed. No server connection or changes made.'; return }

    $remoteStage = ".hacker-deploy/$deployId"
    Invoke-Checked 'ssh.exe' @('-p', '10022', '-i', $deployKey, $deployHost, "umask 077 && mkdir -p ~/$remoteStage")
    Invoke-Checked 'scp.exe' @('-P', '10022', '-i', $deployKey, $deployArchive, "${deployHost}:$remoteStage/release.tar.gz")
    $remoteScript = @'
set -eu
umask 077
stage="$HOME/.hacker-deploy/DEPLOY_ID"
live="$HOME/beahero.fun/public_html/hacker"
test -f "$live/config.php"
mkdir "$stage/release"
tar -xzf "$stage/release.tar.gz" -C "$stage/release"
php -l "$stage/release/api/index.php"
php -l "$stage/release/src/bootstrap.php"
php -l "$stage/release/src/reset_mission.php"
php -l "$stage/release/src/progression.php"
php -l "$stage/release/src/training.php"
php -l "$stage/release/bin/create_test_student.php"
php -l "$stage/release/bin/check_reset.php"
HACKER_CONFIG_PATH="$live/config.php" php "$stage/release/bin/check_reset.php"
php -l "$stage/release/bin/create_user.php"
php -l "$stage/release/bin/provision_standard_accounts.php"
mkdir -p "$HOME/.hacker-backups"
tar -czf "$HOME/.hacker-backups/DEPLOY_ID.tar.gz" -C "$live" .
# Retain old hashed assets for browsers with the previous page open.
cp -R "$stage/release/assets" "$live/"
cp -R "$stage/release/src" "$stage/release/bin" "$stage/release/shared" "$live/"
cp -R "$stage/release/api" "$live/"
cp "$stage/release/.htaccess" "$stage/release/favicon.svg" "$live/"
# Staging is private, but published files must be readable by the web server.
find "$live/assets" "$live/api" "$live/bin" "$live/src" "$live/shared" -type d -exec chmod 755 {} \;
find "$live/assets" "$live/api" "$live/bin" "$live/src" "$live/shared" -type f -exec chmod 644 {} \;
chmod 644 "$live/.htaccess" "$live/favicon.svg"
cp "$stage/release/index.html" "$live/index.html"
chmod 644 "$live/index.html"
echo "Published. Backup: $HOME/.hacker-backups/DEPLOY_ID.tar.gz"
'@
    $remoteScript = $remoteScript.Replace('DEPLOY_ID', $deployId).Replace("`r", '')
    Invoke-Checked 'ssh.exe' @('-p', '10022', '-i', $deployKey, $deployHost, $remoteScript)
    Write-Host 'Open https://beahero.fun/hacker/ and verify login and gameplay. Database migrations were not run.'
} finally {
    if (Test-Path -LiteralPath $deployArchive) { Remove-Item -LiteralPath $deployArchive }
}
