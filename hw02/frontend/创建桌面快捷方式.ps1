# Create Desktop Shortcut Script

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\AI旅行规划师.url"

$urlContent = @"
[InternetShortcut]
URL=http://127.0.0.1:5173
IconIndex=0
"@

$urlContent | Out-File -FilePath $shortcutPath -Encoding ASCII

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Shortcut Created!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Desktop shortcut created at:" -ForegroundColor Green
Write-Host $shortcutPath -ForegroundColor Cyan
Write-Host ""
Write-Host "Double-click it to open the app!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"

