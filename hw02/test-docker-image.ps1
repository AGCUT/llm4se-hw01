# Docker 镜像测试脚本
# 用于测试从阿里云拉取的 Docker 镜像是否正常运行

param(
    [string]$ImageTag = "latest",
    [string]$Port = "80",
    [string]$Registry = "crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com",
    [string]$Namespace = ""
)

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "Docker 镜像测试脚本"
Write-ColorOutput Green "=========================================="
Write-Output ""

# 检查 Docker 是否安装
Write-ColorOutput Yellow "1. 检查 Docker 是否安装..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-ColorOutput Red "❌ Docker 未安装或未在 PATH 中"
    Write-Output "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
}
Write-ColorOutput Green "✓ Docker 已安装"
Write-Output ""

# 检查 Docker 是否运行
Write-ColorOutput Yellow "2. 检查 Docker 是否运行..."
try {
    docker info | Out-Null
    Write-ColorOutput Green "✓ Docker 正在运行"
} catch {
    Write-ColorOutput Red "❌ Docker 未运行"
    Write-Output "请启动 Docker Desktop"
    exit 1
}
Write-Output ""

# 如果没有提供命名空间，提示用户输入
if ([string]::IsNullOrEmpty($Namespace)) {
    Write-ColorOutput Yellow "请输入阿里云容器镜像服务命名空间:"
    $Namespace = Read-Host
}

# 构建完整镜像名称
$FullImageName = "$Registry/$Namespace/ai-travel-planner:$ImageTag"
Write-ColorOutput Yellow "3. 镜像名称: $FullImageName"
Write-Output ""

# 检查是否已登录
Write-ColorOutput Yellow "4. 检查是否已登录阿里云容器镜像服务..."
$loginStatus = docker info 2>&1 | Select-String "cr.aliyuncs.com"
if (-not $loginStatus) {
    Write-ColorOutput Yellow "需要登录阿里云容器镜像服务..."
    Write-Output "执行: docker login $Registry"
    Write-Output "用户名: 你的阿里云账号"
    Write-Output "密码: 固定密码（在控制台设置）"
    Write-Output ""
    $login = Read-Host "是否现在登录? (y/n)"
    if ($login -eq "y" -or $login -eq "Y") {
        docker login $Registry
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput Red "❌ 登录失败"
            exit 1
        }
    } else {
        Write-ColorOutput Red "❌ 需要先登录才能拉取镜像"
        exit 1
    }
}
Write-ColorOutput Green "✓ 已登录"
Write-Output ""

# 拉取镜像
Write-ColorOutput Yellow "5. 拉取镜像..."
docker pull $FullImageName
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ 拉取镜像失败"
    exit 1
}
Write-ColorOutput Green "✓ 镜像拉取成功"
Write-Output ""

# 检查是否有同名容器在运行
Write-ColorOutput Yellow "6. 检查现有容器..."
$existingContainer = docker ps -a --filter "name=ai-travel-planner" --format "{{.Names}}"
if ($existingContainer) {
    Write-ColorOutput Yellow "发现已存在的容器，正在停止并删除..."
    docker stop ai-travel-planner 2>$null
    docker rm ai-travel-planner 2>$null
    Write-ColorOutput Green "✓ 已清理旧容器"
}
Write-Output ""

# 运行容器
Write-ColorOutput Yellow "7. 启动容器..."
docker run -d `
    --name ai-travel-planner `
    -p "${Port}:80" `
    --restart unless-stopped `
    $FullImageName

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ 容器启动失败"
    exit 1
}
Write-ColorOutput Green "✓ 容器启动成功"
Write-Output ""

# 等待容器启动
Write-ColorOutput Yellow "8. 等待容器启动（10秒）..."
Start-Sleep -Seconds 10

# 检查容器状态
Write-ColorOutput Yellow "9. 检查容器状态..."
$containerStatus = docker ps --filter "name=ai-travel-planner" --format "{{.Status}}"
if ($containerStatus) {
    Write-ColorOutput Green "✓ 容器运行中: $containerStatus"
} else {
    Write-ColorOutput Red "❌ 容器未运行"
    Write-Output "查看日志:"
    docker logs ai-travel-planner
    exit 1
}
Write-Output ""

# 检查健康状态
Write-ColorOutput Yellow "10. 检查健康状态..."
$healthStatus = docker inspect --format='{{.State.Health.Status}}' ai-travel-planner 2>$null
if ($healthStatus) {
    Write-ColorOutput Green "✓ 健康状态: $healthStatus"
} else {
    Write-ColorOutput Yellow "⚠ 健康检查未配置或未就绪"
}
Write-Output ""

# 测试 HTTP 访问
Write-ColorOutput Yellow "11. 测试 HTTP 访问..."
$url = "http://localhost:$Port"
try {
    $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-ColorOutput Green "✓ HTTP 访问成功 (状态码: $($response.StatusCode))"
        Write-ColorOutput Green "✓ 应用可以正常访问: $url"
    } else {
        Write-ColorOutput Yellow "⚠ HTTP 访问返回状态码: $($response.StatusCode)"
    }
} catch {
    Write-ColorOutput Red "❌ HTTP 访问失败: $($_.Exception.Message)"
    Write-Output "查看容器日志:"
    docker logs ai-travel-planner --tail 50
}
Write-Output ""

# 显示容器信息
Write-ColorOutput Yellow "12. 容器信息:"
Write-Output "容器名称: ai-travel-planner"
Write-Output "访问地址: http://localhost:$Port"
Write-Output "镜像: $FullImageName"
Write-Output ""

# 显示常用命令
Write-ColorOutput Cyan "=========================================="
Write-ColorOutput Cyan "常用命令:"
Write-ColorOutput Cyan "=========================================="
Write-Output "查看日志:     docker logs -f ai-travel-planner"
Write-Output "停止容器:     docker stop ai-travel-planner"
Write-Output "启动容器:     docker start ai-travel-planner"
Write-Output "删除容器:     docker rm -f ai-travel-planner"
Write-Output "查看状态:     docker ps -a | grep ai-travel-planner"
Write-Output "进入容器:     docker exec -it ai-travel-planner sh"
Write-Output ""

Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "测试完成！"
Write-ColorOutput Green "=========================================="

