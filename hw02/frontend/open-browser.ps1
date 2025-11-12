# Open Browser Script

Write-Host "Opening browser..." -ForegroundColor Green
Write-Host ""

# Try different URLs
$urls = @(
    "http://192.168.3.6:5173/",
    "http://127.0.0.1:5173/",
    "http://localhost:5173/"
)

foreach ($url in $urls) {
    Write-Host "Opening: $url" -ForegroundColor Yellow
    Start-Process $url
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Opened 3 browser tabs with different URLs" -ForegroundColor Green
Write-Host "Use the one that works!" -ForegroundColor Cyan

