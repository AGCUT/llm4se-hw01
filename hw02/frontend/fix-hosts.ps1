# Fix Hosts File Script
# This script must run as Administrator

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Fix Hosts File for localhost" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Running as Administrator: OK" -ForegroundColor Green
Write-Host ""

# Backup hosts file
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$backupPath = "C:\Windows\System32\drivers\etc\hosts.backup"

Write-Host "1. Creating backup..." -ForegroundColor Yellow
try {
    Copy-Item $hostsPath $backupPath -Force
    Write-Host "   OK Backup created at: $backupPath" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Could not create backup" -ForegroundColor Yellow
}

# Read current hosts file
Write-Host "2. Reading hosts file..." -ForegroundColor Yellow
$hostsContent = Get-Content $hostsPath

# Check if localhost entries exist
$hasLocalhost = $hostsContent | Where-Object { $_ -match "^127\.0\.0\.1\s+localhost" }
$hasLocalhostIPv6 = $hostsContent | Where-Object { $_ -match "^::1\s+localhost" }

if ($hasLocalhost -and $hasLocalhostIPv6) {
    Write-Host "   OK localhost entries already exist and uncommented" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your hosts file is correct!" -ForegroundColor Green
    Write-Host "The problem might be elsewhere." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "   Fixing localhost entries..." -ForegroundColor Yellow
    
    # Remove commented localhost lines
    $hostsContent = $hostsContent | Where-Object { 
        $_ -notmatch "^\s*#.*127\.0\.0\.1\s+localhost" -and 
        $_ -notmatch "^\s*#.*::1\s+localhost" 
    }
    
    # Add correct localhost entries if not exist
    if (-not $hasLocalhost) {
        $hostsContent += "127.0.0.1       localhost"
    }
    if (-not $hasLocalhostIPv6) {
        $hostsContent += "::1             localhost"
    }
    
    # Write back to hosts file
    try {
        $hostsContent | Set-Content $hostsPath -Force
        Write-Host "   OK Hosts file updated" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: Could not write to hosts file" -ForegroundColor Red
        Write-Host "   $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Flush DNS cache
Write-Host "3. Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "   OK DNS cache flushed" -ForegroundColor Green

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Fix Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now try accessing: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"

