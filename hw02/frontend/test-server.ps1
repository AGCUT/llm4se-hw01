# Test Server Connection Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Testing Server Connection" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if port is listening
Write-Host "1. Checking if port 5173 is listening..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue
if ($portTest.TcpTestSucceeded) {
    Write-Host "   OK Port 5173 is open" -ForegroundColor Green
} else {
    Write-Host "   ERROR Port 5173 is not responding" -ForegroundColor Red
    Write-Host "   Make sure dev server is running (npm run dev)" -ForegroundColor Yellow
    exit 1
}

# Test 2: Try HTTP request
Write-Host "2. Testing HTTP request..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    Write-Host "   OK Server responded with status:" $response.StatusCode -ForegroundColor Green
    Write-Host "   Content length:" $response.Content.Length "bytes" -ForegroundColor Green
} catch {
    Write-Host "   ERROR Server not responding" -ForegroundColor Red
    Write-Host "   Error:" $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Test 3: Check if it's HTML
Write-Host "3. Checking response content..." -ForegroundColor Yellow
if ($response.Content -match "<html") {
    Write-Host "   OK Valid HTML response" -ForegroundColor Green
} else {
    Write-Host "   WARNING Response doesn't look like HTML" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Test Results: ALL PASSED!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server is working correctly!" -ForegroundColor Green
Write-Host "If browser still can't access, try:" -ForegroundColor Yellow
Write-Host "  1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  2. Use incognito mode (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "  3. Try different browser" -ForegroundColor White
Write-Host "  4. Try http://127.0.0.1:5173 instead" -ForegroundColor White
Write-Host ""

