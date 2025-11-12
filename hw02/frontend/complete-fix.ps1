# Complete Fix and Test Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Complete Fix and Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Close notepad processes
Write-Host "1. Closing notepad processes..." -ForegroundColor Yellow
$notepads = Get-Process notepad -ErrorAction SilentlyContinue
if ($notepads) {
    $notepads | Stop-Process -Force
    Write-Host "   OK Closed $($notepads.Count) notepad process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   OK No notepad processes running" -ForegroundColor Green
}

# Step 2: Check hosts file
Write-Host "2. Checking hosts file..." -ForegroundColor Yellow
try {
    $hostsContent = Get-Content "C:\Windows\System32\drivers\etc\hosts" -ErrorAction Stop
    $localhostLine = $hostsContent | Select-String "^127\.0\.0\.1\s+localhost"
    
    if ($localhostLine) {
        Write-Host "   OK localhost is configured in hosts file" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: localhost not found in hosts file" -ForegroundColor Yellow
        Write-Host "   But don't worry, we can use 127.0.0.1 instead" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   WARNING: Cannot read hosts file" -ForegroundColor Yellow
    Write-Host "   But don't worry, we can use 127.0.0.1 instead" -ForegroundColor Yellow
}

# Step 3: Flush DNS
Write-Host "3. Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "   OK DNS cache flushed" -ForegroundColor Green

# Step 4: Test localhost resolution
Write-Host "4. Testing localhost resolution..." -ForegroundColor Yellow
try {
    $pingResult = ping -n 1 -w 1000 localhost 2>&1
    if ($pingResult -match "127\.0\.0\.1") {
        Write-Host "   OK localhost resolves to 127.0.0.1" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: localhost doesn't resolve correctly" -ForegroundColor Yellow
        Write-Host "   Use 127.0.0.1 instead" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   WARNING: Cannot ping localhost" -ForegroundColor Yellow
    Write-Host "   Use 127.0.0.1 instead" -ForegroundColor Yellow
}

# Step 5: Test if server is running
Write-Host "5. Testing if dev server is running..." -ForegroundColor Yellow
try {
    $testIP = Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($testIP) {
        Write-Host "   OK Dev server is running on port 5173" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Dev server not running" -ForegroundColor Yellow
        Write-Host "   Please start it with: npm run dev" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   WARNING: Cannot test port 5173" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Recommendations" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Try these URLs in order:" -ForegroundColor Yellow
Write-Host "  1. http://127.0.0.1:5173      (Most reliable)" -ForegroundColor Green
Write-Host "  2. http://192.168.3.6:5173    (Network address)" -ForegroundColor Cyan
Write-Host "  3. http://localhost:5173      (If resolved)" -ForegroundColor White
Write-Host ""
Write-Host "Opening browser with primary URL..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Open browser
Start-Process "http://127.0.0.1:5173"

Write-Host ""
Write-Host "Browser opened!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"

