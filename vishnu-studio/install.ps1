# Installs Vishnu's studio on a Windows machine. Run from this folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
# It checks the tools it needs, installs the packages, and fetches the two open-source tools the studio uses.
# It never asks for or stores an API key. Safe to run again: each step skips what is already done.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

function Step($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Need($cmd, $how) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Missing: $cmd. Install it with:  $how" -ForegroundColor Yellow
    return $false
  }
  return $true
}

Step "1/6 Checking the tools this needs"
$ok = $true
$ok = (Need "python" "winget install Python.Python.3.12") -and $ok
$ok = (Need "node" "winget install OpenJS.NodeJS.LTS") -and $ok
$ok = (Need "git" "winget install Git.Git") -and $ok
$ok = (Need "ffmpeg" "winget install Gyan.FFmpeg") -and $ok
if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
  if (Get-Command "npm" -ErrorAction SilentlyContinue) { Write-Host "Installing pnpm..."; npm install -g pnpm }
  else { Write-Host "Missing: pnpm (comes after Node.js)" -ForegroundColor Yellow; $ok = $false }
}
if (-not $ok) {
  Write-Host ""
  Write-Host "Install the missing tools above, open a NEW PowerShell window, and run this script again." -ForegroundColor Yellow
  exit 1
}

Step "2/6 Installing the video engine (Remotion and its packages)"
pnpm install

Step "3/6 Installing the Python packages"
python -m pip install --upgrade pip
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt

Step "4/6 Fetching earshot (lets the AI judge sound) into tools\earshot"
if (-not (Test-Path "tools\earshot\.git")) { git clone https://github.com/Leonxlnx/earshot tools\earshot }
if (-not (Test-Path "tools\earshot\.venv")) { python -m venv tools\earshot\.venv }
& tools\earshot\.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
& tools\earshot\.venv\Scripts\python.exe -m pip install -e "tools\earshot[mcp,llm,dev]"

Step "5/6 Fetching the humanizer (checks scripts read as human) into tools\instagram-agent-skill"
if (-not (Test-Path "tools\instagram-agent-skill\.git")) { git clone https://github.com/Jakeschincariol/instagram-agent-skill tools\instagram-agent-skill }

Step "6/6 Quick check"
python -c "import PIL, numpy, docx, whisper; print('Python packages: ok')"
& tools\earshot\.venv\Scripts\python.exe -m earshot doctor
if (Test-Path "node_modules\remotion") { Write-Host "Remotion: ok" } else { Write-Host "Remotion did not install; run: pnpm install" -ForegroundColor Yellow }

Write-Host ""
Write-Host "Installed. Two things left, by hand (see START-HERE.md):" -ForegroundColor Green
Write-Host "  1. Set your ElevenLabs key as a Windows user environment variable named ELEVENLABS_API_KEY."
Write-Host "  2. Open this folder in Claude Code and say: read AGENT-SETUP.md, then README.md."
