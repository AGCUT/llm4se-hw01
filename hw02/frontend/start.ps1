# AI Travel Planner - Quick Start Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  AI Travel Planner - Start" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeCmd) {
    Write-Host "Error: Node.js not installed" -ForegroundColor Red
    Write-Host "Please install from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = node --version
Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green

# Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "OK Dependencies ready" -ForegroundColor Green

# Check environment variables
Write-Host "Checking environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    Copy-Item .env.example .env.local
    Write-Host ""
    Write-Host "IMPORTANT: Please edit .env.local and add your Supabase config" -ForegroundColor Red
    Write-Host "Opening .env.local in notepad..." -ForegroundColor Yellow
    Start-Process notepad .env.local
    Write-Host ""
    Write-Host "After saving, run this script again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}
Write-Host "OK Environment file exists" -ForegroundColor Green

# Start server
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Starting Dev Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will start at: http://localhost:5173" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npm run dev
