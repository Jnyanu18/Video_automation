# Launches a dedicated Chrome profile with a loopback-only CDP endpoint for REA/Playwright observation.
# The profile is isolated from your normal Chrome profile; close this window to end the session.
param(
    [string]$Url = "https://my.blotato.com",
    [int]$Port = 9222
)

$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$profileDir = Join-Path $env:LOCALAPPDATA "rea-blotato-profile"

if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "Port $Port is already in use. Close the existing debugging browser or pass -Port."
    exit 1
}

Start-Process -FilePath $chrome -ArgumentList @(
    "--remote-debugging-port=$Port",
    "--remote-debugging-address=127.0.0.1",
    "--user-data-dir=`"$profileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    $Url
)

Write-Host "Chrome started with profile $profileDir"
Write-Host "CDP endpoint: http://127.0.0.1:$Port"
