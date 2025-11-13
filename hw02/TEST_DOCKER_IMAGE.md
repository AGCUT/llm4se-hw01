# Docker 镜像测试指南

本文档介绍如何测试从阿里云容器镜像服务拉取的 Docker 镜像是否正常运行。

## 📋 前提条件

- Docker Desktop 已安装并运行
- 已登录阿里云容器镜像服务
- 知道你的命名空间（在阿里云控制台查看）

## 🚀 快速测试

### 方式一：使用测试脚本（推荐）

#### Windows PowerShell

```powershell
# 进入项目目录
cd hw02

# 运行测试脚本
.\test-docker-image.ps1 -ImageTag latest -Port 80 -Namespace your-namespace
```

#### Linux/Mac

```bash
# 可以手动执行以下步骤，或修改脚本为 bash 版本
```

### 方式二：手动测试

#### 1. 登录阿里云容器镜像服务

```bash
# 个人版容器镜像服务
docker login crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com

# 输入用户名和密码
# 用户名: 你的阿里云账号（例如：aliyun7239471640）
# 密码: 在控制台设置的固定密码
```

#### 2. 拉取镜像

```bash
# 替换 your-namespace 为你的实际命名空间
docker pull crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

#### 3. 运行容器

```bash
docker run -d \
  --name ai-travel-planner \
  -p 80:80 \
  --restart unless-stopped \
  crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

#### 4. 检查容器状态

```bash
# 查看运行中的容器
docker ps | grep ai-travel-planner

# 查看容器日志
docker logs -f ai-travel-planner

# 查看容器详细信息
docker inspect ai-travel-planner
```

#### 5. 测试 HTTP 访问

```bash
# 使用 curl 测试
curl http://localhost

# 或使用 PowerShell
Invoke-WebRequest -Uri http://localhost -UseBasicParsing

# 或在浏览器中访问
# http://localhost
```

## ✅ 测试检查清单

### 基础功能测试

- [ ] 容器能够正常启动
- [ ] 容器状态为 "Up"（运行中）
- [ ] HTTP 访问返回 200 状态码
- [ ] 浏览器可以正常打开应用
- [ ] 页面能够正常加载（无 404 错误）

### 健康检查

```bash
# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' ai-travel-planner

# 应该返回: healthy
```

### 功能测试

1. **首页加载**
   - 打开 http://localhost
   - 检查页面是否正常显示
   - 检查是否有 JavaScript 错误（打开浏览器开发者工具）

2. **路由测试**
   - 测试各个页面路由是否正常
   - 检查 SPA 路由是否正常工作

3. **API 连接测试**
   - 检查 Supabase 连接是否正常
   - 检查其他 API 服务是否正常

## 🔍 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker logs ai-travel-planner

# 查看容器状态
docker ps -a | grep ai-travel-planner

# 检查端口占用
netstat -ano | findstr :80  # Windows
lsof -i :80                 # Linux/Mac
```

### HTTP 访问失败

1. **检查容器是否运行**
   ```bash
   docker ps | grep ai-travel-planner
   ```

2. **检查端口映射**
   ```bash
   docker port ai-travel-planner
   ```

3. **检查防火墙设置**
   - Windows: 检查 Windows Defender 防火墙
   - Linux: 检查 iptables 或 firewalld

4. **尝试其他端口**
   ```bash
   docker run -d --name ai-travel-planner -p 8080:80 ...
   # 然后访问 http://localhost:8080
   ```

### 镜像拉取失败

1. **检查登录状态**
   ```bash
   docker info | grep "cr.aliyuncs.com"
   ```

2. **重新登录**
   ```bash
   docker logout crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com
   docker login crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com
   ```

3. **检查镜像名称**
   - 确认命名空间正确
   - 确认镜像标签正确（latest, v1.0.0 等）

## 📊 性能测试

### 检查资源使用

```bash
# 查看容器资源使用情况
docker stats ai-travel-planner

# 查看容器详细信息
docker inspect ai-travel-planner | grep -A 10 "State"
```

### 负载测试（可选）

```bash
# 使用 Apache Bench 进行简单负载测试
ab -n 1000 -c 10 http://localhost/

# 或使用 curl 进行简单测试
for i in {1..10}; do curl -s http://localhost/ > /dev/null; done
```

## 🧹 清理测试环境

```bash
# 停止容器
docker stop ai-travel-planner

# 删除容器
docker rm ai-travel-planner

# 删除镜像（可选）
docker rmi crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

## 📝 测试报告模板

测试完成后，可以记录以下信息：

```
测试日期: [日期]
镜像版本: [版本标签]
测试环境: [操作系统/Docker 版本]

测试结果:
- 容器启动: [✓/✗]
- HTTP 访问: [✓/✗]
- 页面加载: [✓/✗]
- 功能测试: [✓/✗]

问题记录:
[记录遇到的问题和解决方案]
```

## 🔗 相关文档

- [Docker 部署指南](./docs/Docker部署指南.md)
- [Docker 打包使用指南](./docs/Docker打包使用指南.md)
- [GitHub Actions 配置指南](./docs/GitHub-Actions配置指南.md)

