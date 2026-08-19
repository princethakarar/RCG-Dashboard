# =====================================================================
#  RCG Dashboard - one-shot local runner
#  Usage (PowerShell, from the project folder):
#     ./start.ps1
#  If PowerShell blocks the script, run once:
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# =====================================================================

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "RCG Dashboard - starting up..." -ForegroundColor Cyan

# 1. Node check
try {
    $nodeV = node -v
    Write-Host "Node $nodeV detected." -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Install Node 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. .env.local check
if (-not (Test-Path ".env.local")) {
    Write-Host "WARNING: .env.local not found. The app needs Supabase credentials to work fully." -ForegroundColor Yellow
} else {
    Write-Host ".env.local found." -ForegroundColor Green
    if (Select-String -Path ".env.local" -Pattern "PASTE_" -Quiet) {
        Write-Host "NOTE: .env.local still has PASTE_..._HERE placeholders - server features (login/dashboards) will fail until you fill them in." -ForegroundColor Yellow
    }
}

# 3. Install dependencies if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first run, this can take a few minutes)..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "Dependencies already installed." -ForegroundColor Green
}

# 4. Launch the dev server
Write-Host ""
Write-Host "Starting Next.js dev server on http://localhost:3000 ..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
npm run dev
