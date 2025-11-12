# AI旅行规划师 - 前端环境检查脚本

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "    前端环境诊断工具" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查Node.js
Write-Host "1. 检查Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✓ Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Node.js未安装！" -ForegroundColor Red
    Write-Host "   请访问 https://nodejs.org 下载安装" -ForegroundColor Red
    exit
}

# 2. 检查npm
Write-Host "2. 检查npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✓ npm版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ npm未安装！" -ForegroundColor Red
    exit
}

# 3. 检查package.json
Write-Host "3. 检查package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✓ package.json存在" -ForegroundColor Green
} else {
    Write-Host "   ✗ package.json不存在！" -ForegroundColor Red
    exit
}

# 4. 检查node_modules
Write-Host "4. 检查依赖安装..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules存在" -ForegroundColor Green
    
    # 检查关键依赖
    $criticalDeps = @("react", "vite", "@supabase/supabase-js")
    foreach ($dep in $criticalDeps) {
        if (Test-Path "node_modules\$dep") {
            Write-Host "   ✓ $dep 已安装" -ForegroundColor Green
        } else {
            Write-Host "   ✗ $dep 未安装" -ForegroundColor Red
            Write-Host "   需要运行: npm install" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ✗ node_modules不存在" -ForegroundColor Red
    Write-Host "   需要运行: npm install" -ForegroundColor Yellow
}

# 5. 检查环境变量文件
Write-Host "5. 检查环境变量..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✓ .env.local存在" -ForegroundColor Green
    
    # 检查关键环境变量
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_SUPABASE_URL") {
        Write-Host "   ✓ VITE_SUPABASE_URL已配置" -ForegroundColor Green
    } else {
        Write-Host "   ✗ VITE_SUPABASE_URL未配置" -ForegroundColor Red
    }
    
    if ($envContent -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host "   ✓ VITE_SUPABASE_ANON_KEY已配置" -ForegroundColor Green
    } else {
        Write-Host "   ✗ VITE_SUPABASE_ANON_KEY未配置" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ .env.local不存在" -ForegroundColor Red
    Write-Host "   需要复制: Copy-Item .env.example .env.local" -ForegroundColor Yellow
}

# 6. 检查端口占用
Write-Host "6. 检查端口5173..." -ForegroundColor Yellow
$portInUse = netstat -ano | Select-String ":5173" | Select-String "LISTENING"
if ($portInUse) {
    Write-Host "   ✗ 端口5173已被占用" -ForegroundColor Red
    Write-Host "   占用情况: $portInUse" -ForegroundColor Yellow
    Write-Host "   可以使用其他端口: npm run dev -- --port 3000" -ForegroundColor Yellow
} else {
    Write-Host "   ✓ 端口5173可用" -ForegroundColor Green
}

# 7. 检查关键文件
Write-Host "7. 检查关键文件..." -ForegroundColor Yellow
$criticalFiles = @(
    "src\main.tsx",
    "src\App.tsx",
    "src\config\supabase.config.ts",
    "index.html",
    "vite.config.ts",
    "tsconfig.json"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file 存在" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $file 不存在" -ForegroundColor Red
    }
}

# 总结
Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "    诊断完成" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "如果所有检查都通过，可以运行以下命令启动开发服务器：" -ForegroundColor Green
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果有错误，请按照上面的提示解决" -ForegroundColor Yellow