$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$testStudentKey = if ($env:HACKER_SSH_KEY) { $env:HACKER_SSH_KEY } else { Join-Path (Get-Location) 'SSH passkey/xs738394.key' }
if (-not (Test-Path -LiteralPath $testStudentKey -PathType Leaf)) { throw 'SSH key not found. Set HACKER_SSH_KEY to its file path.' }
& ssh.exe -p 10022 -i $testStudentKey xs738394@xs738394.xsrv.jp 'php ~/beahero.fun/public_html/hacker/bin/create_test_student.php'
if ($LASTEXITCODE -ne 0) { throw 'Test student setup failed. Publish the updated game first and check the SSH error above.' }
