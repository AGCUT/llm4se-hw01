# Watermark Tool Build Script - Tkinter Lightweight Version
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Watermark Tool - Build Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check PyQt5
Write-Host "`n[1/4] Checking environment..." -ForegroundColor Yellow
$pyqt5_check = python -c "import PyQt5" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "WARNING: PyQt5 detected, this will increase exe size" -ForegroundColor Red
    Write-Host "Recommend: pip uninstall PyQt5 -y" -ForegroundColor Red
}

# Clean old build files
Write-Host "`n[2/4] Cleaning old files..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force build
    Write-Host "OK: Cleaned build directory"
}
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "OK: Cleaned dist directory"
}

# Start building
Write-Host "`n[3/4] Building..." -ForegroundColor Yellow
pyinstaller watermark_tool.spec

# Check result
Write-Host "`n[4/4] Checking result..." -ForegroundColor Yellow
if (Test-Path "dist\watermark_tool.exe") {
    $size = (Get-Item "dist\watermark_tool.exe").Length / 1MB
    $sizeStr = "{0:N2}" -f $size
    
    Write-Host "`n================================" -ForegroundColor Green
    Write-Host "SUCCESS: Build completed!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "Output: dist\watermark_tool.exe"
    Write-Host "Size: $sizeStr MB"
    
    if ($size -gt 100) {
        Write-Host "`nWARNING: File size exceeds 100 MB" -ForegroundColor Red
        Write-Host "Possible reasons:" -ForegroundColor Red
        Write-Host "  1. PyQt5 not uninstalled" -ForegroundColor Red
        Write-Host "  2. Other large libraries included" -ForegroundColor Red
        Write-Host "`nSuggestion:" -ForegroundColor Yellow
        Write-Host "  1. Run: pip uninstall PyQt5 -y" -ForegroundColor Yellow
        Write-Host "  2. Clean and rebuild" -ForegroundColor Yellow
    } elseif ($size -lt 30) {
        Write-Host "`nEXCELLENT: File size perfectly optimized!" -ForegroundColor Green
    } else {
        Write-Host "`nGOOD: File size is as expected (30-50 MB)" -ForegroundColor Green
    }
} else {
    Write-Host "`n================================" -ForegroundColor Red
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host "Please check error messages and retry"
}
