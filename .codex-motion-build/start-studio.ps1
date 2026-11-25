# ==============================================================================
# AI Studio & Marketing Automation - Unified Launcher
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 LAUNCHING AI VIDEO STUDIO & MARKETING AUTOMATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot
$AutomationDir = Join-Path $WorkspaceRoot "automation"

if (-not (Test-Path $AutomationDir)) {
    Write-Host "Creating junction to automation project..." -ForegroundColor Yellow
    cmd /c mklink /J "$AutomationDir" "$WorkspaceRoot\new project - marketing automatio\new project - marketing automatio\automation"
}

# Change directory to automation
Set-Location $AutomationDir

Write-Host "Starting unified stack: n8n, Dashboard, AI Editor Engine, Public Media Server..." -ForegroundColor Green
node scripts/start-all.cjs
