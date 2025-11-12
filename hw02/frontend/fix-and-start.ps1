# Complete Fix and Start Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Complete Fix and Start" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all node processes
Write-Host "1. Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "   OK All Node.js processes stopped" -ForegroundColor Green

# Step 2: Check if port is free
Write-Host "2. Checking if port 5173 is free..." -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "   Port 5173 is still in use, trying to free it..." -ForegroundColor Yellow
    $pid = $portCheck.OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
Write-Host "   OK Port 5173 is free" -ForegroundColor Green

# Step 3: Clear npm cache
Write-Host "3. Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "   OK Cache cleared" -ForegroundColor Green

# Step 4: Check environment
Write-Host "4. Checking environment..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   OK .env.local exists" -ForegroundColor Green
} else {
    Write-Host "   WARNING .env.local not found" -ForegroundColor Yellow
}

# Step 5: Start dev server
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Starting Dev Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Browser will open automatically" -ForegroundColor Green
Write-Host "If not, visit: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Or try: http://127.0.0.1:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start server
npm run dev

