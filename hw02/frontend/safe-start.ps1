# Safe Start Script with Error Handling

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Safe Start Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Set error action preference
$ErrorActionPreference = "Continue"

# Step 1: Stop Node processes safely
Write-Host "1. Checking for running Node.js processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "   Found $($nodeProcesses.Count) Node.js process(es), stopping..." -ForegroundColor Yellow
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "   OK Processes stopped" -ForegroundColor Green
    } else {
        Write-Host "   OK No Node.js processes running" -ForegroundColor Green
    }
} catch {
    Write-Host "   WARNING: Could not stop some processes (this is usually OK)" -ForegroundColor Yellow
}

# Step 2: Check port
Write-Host "2. Checking port 5173..." -ForegroundColor Yellow
try {
    $portInUse = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "   Port 5173 is in use (will be freed automatically)" -ForegroundColor Yellow
    } else {
        Write-Host "   OK Port 5173 is available" -ForegroundColor Green
    }
} catch {
    Write-Host "   OK Port check completed" -ForegroundColor Green
}

# Step 3: Check directory
Write-Host "3. Checking current directory..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "   Current: $currentDir" -ForegroundColor White
if (Test-Path "package.json") {
    Write-Host "   OK package.json found" -ForegroundColor Green
} else {
    Write-Host "   ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "   You might be in the wrong directory" -ForegroundColor Red
    Write-Host "   Should be in: D:\hw\llm4se\llm4se-hw01\hw02\frontend" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 4: Check environment
Write-Host "4. Checking environment file..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   OK .env.local exists" -ForegroundColor Green
} else {
    Write-Host "   WARNING: .env.local not found" -ForegroundColor Yellow
    Write-Host "   Supabase might not work without configuration" -ForegroundColor Yellow
}

# Step 5: Check dependencies
Write-Host "5. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   OK node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   WARNING: node_modules not found" -ForegroundColor Yellow
    Write-Host "   Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ERROR: npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Step 6: Start server
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Starting Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will start on: http://localhost:5173" -ForegroundColor Green
Write-Host "Browser will open automatically" -ForegroundColor Green
Write-Host ""
Write-Host "To stop server: Press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting in 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Run dev server
try {
    npm run dev
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to start server" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Server stopped" -ForegroundColor Yellow
Read-Host "Press Enter to close"

