# Docker 部署指南

本文档介绍如何使�?Docker 部署 AI 旅行规划师应用�?

## 📋 目录

1. [前提条件](#前提条件)
2. [快速开始](#快速开�?
3. [从阿里云镜像仓库拉取镜像](#从阿里云镜像仓库拉取镜像)
4. [下载 Docker 镜像文件](#下载-docker-镜像文件)
5. [运行 Docker 容器](#运行-docker-容器)
6. [使用 Docker Compose](#使用-docker-compose)
7. [环境变量配置](#环境变量配置)
8. [GitHub Actions 自动构建](#github-actions-自动构建)
9. [故障排查](#故障排查)

---

## 前提条件

- Docker 20.10+ �?Docker Desktop
- Docker Compose 2.0+（可选，用于使用 docker-compose.yml�?
- 至少 2GB 可用磁盘空间
- 80 端口可用（或修改为其他端口）

---

## 快速开�?

### 1. 拉取最新镜�?

```bash
# 登录阿里云容器镜像服�?
docker login registry.cn-hangzhou.aliyuncs.com

# 拉取最新镜�?
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### 2. 运行容器

```bash
docker run -d \
  --name ai-travel-planner \
  -p 80:80 \
  --restart unless-stopped \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### 3. 访问应用

打开浏览器访问：http://localhost

---

## 从阿里云镜像仓库拉取镜像

### 1. 登录阿里云容器镜像服�?

```bash
# 方式一：使�?Docker 命令行登�?
docker login registry.cn-hangzhou.aliyuncs.com

# 输入用户名和密码
# 用户名：阿里云容器镜像服务用户名
# 密码：阿里云容器镜像服务密码（在控制台设置）
```

### 2. 拉取镜像

```bash
# 拉取最新版�?
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 拉取指定版本
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:v1.0.0

# 拉取特定分支
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:main
```

### 3. 查看镜像

```bash
docker images | grep ai-travel-planner
```

---

## 下载 Docker 镜像文件

### 方式一：从 GitHub Actions Artifacts 下载

1. 访问 GitHub 仓库�?Actions 页面
2. 选择最新的 workflow run
3. �?Artifacts 部分下载 `docker-image-{version}.tar.gz`
4. 解压并导入镜像：

```bash
# 解压
gunzip ai-travel-planner-v1.0.0.tar.gz

# 导入镜像
docker load -i ai-travel-planner-v1.0.0.tar

# 查看镜像
docker images | grep ai-travel-planner
```

### 方式二：从阿里云镜像仓库导出

```bash
# 1. 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 2. 保存�?tar 文件
docker save registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest -o ai-travel-planner-latest.tar

# 3. 压缩（可选）
gzip ai-travel-planner-latest.tar

# 4. 在其他机器上导入
docker load -i ai-travel-planner-latest.tar
# �?
gunzip ai-travel-planner-latest.tar.gz && docker load -i ai-travel-planner-latest.tar
```

### 方式三：使用 Docker Hub（如果已配置�?

```bash
# 拉取镜像
docker pull your-dockerhub-username/ai-travel-planner:latest

# 保存�?tar 文件
docker save your-dockerhub-username/ai-travel-planner:latest -o ai-travel-planner-latest.tar
```

---

## 运行 Docker 容器

### 基本运行

```bash
docker run -d \
  --name ai-travel-planner \
  -p 80:80 \
  --restart unless-stopped \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### 自定义端�?

```bash
docker run -d \
  --name ai-travel-planner \
  -p 8080:80 \
  --restart unless-stopped \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### 查看容器日志

```bash
# 查看实时日志
docker logs -f ai-travel-planner

# 查看最�?100 行日�?
docker logs --tail 100 ai-travel-planner
```

### 停止和删除容�?

```bash
# 停止容器
docker stop ai-travel-planner

# 删除容器
docker rm ai-travel-planner

# 停止并删除容�?
docker rm -f ai-travel-planner
```

### 更新镜像

```bash
# 1. 停止并删除旧容器
docker stop ai-travel-planner
docker rm ai-travel-planner

# 2. 拉取最新镜�?
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 3. 运行新容�?
docker run -d \
  --name ai-travel-planner \
  -p 80:80 \
  --restart unless-stopped \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

---

## 使用 Docker Compose

### 1. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    image: registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
    container_name: ai-travel-planner
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NGINX_HOST=localhost
      - NGINX_PORT=80
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 2. 运行服务

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 更新服务
docker-compose pull
docker-compose up -d
```

---

## 环境变量配置

### 前端环境变量

前端应用需要在构建时配置环境变量，或通过运行时注入：

```bash
# 方式一：通过环境变量文件（需要在构建时配置）
# 创建 .env 文件
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AMAP_KEY=your-amap-key
VITE_AMAP_SECURITY_CODE=your-security-code

# 方式二：通过 Docker 运行时环境变量（需要在 Dockerfile 中支持）
docker run -d \
  --name ai-travel-planner \
  -p 80:80 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

**注意**：由�?Vite 是构建时工具，环境变量需要在构建时配置。如果需要在运行时配置，需要使�?`window.__ENV__` 或类似的运行时配置方式�?

---

## GitHub Actions 自动构建

### 1. 配置 GitHub Secrets

�?GitHub 仓库�?Settings �?Secrets and variables �?Actions 中添加以�?secrets�?

- `ALIYUN_REGISTRY_USERNAME`: 阿里云容器镜像服务用户名
- `ALIYUN_REGISTRY_PASSWORD`: 阿里云容器镜像服务密�?
- `ALIYUN_NAMESPACE`: 阿里云容器镜像服务命名空�?

### 2. 触发构建

#### 自动触发

- 推送到 `main` �?`master` 分支
- 创建版本标签（如 `v1.0.0`�?
- 创建 Pull Request

#### 手动触发

1. 访问 GitHub 仓库�?Actions 页面
2. 选择 "Docker Build and Push to Aliyun" workflow
3. 点击 "Run workflow"
4. 输入版本标签（如 `v1.0.0`�?
5. 点击 "Run workflow"

### 3. 查看构建结果

- �?Actions 页面查看构建日志
- �?Artifacts 部分下载 Docker 镜像文件（如果启用）
- 在阿里云容器镜像服务控制台查看推送的镜像

---

## 故障排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker logs ai-travel-planner

# 检查容器状�?
docker ps -a | grep ai-travel-planner

# 检查端口占�?
netstat -tulpn | grep 80
# �?
lsof -i :80
```

### 2. 无法访问应用

```bash
# 检查容器是否运�?
docker ps | grep ai-travel-planner

# 检查端口映�?
docker port ai-travel-planner

# 检查防火墙设置
# Linux
sudo ufw status
# Windows
netsh advfirewall show allprofiles
```

### 3. 镜像拉取失败

```bash
# 检查登录状�?
docker login registry.cn-hangzhou.aliyuncs.com

# 检查镜像地址是否正确
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 检查网络连�?
ping registry.cn-hangzhou.aliyuncs.com
```

### 4. 健康检查失�?

```bash
# 进入容器检�?
docker exec -it ai-travel-planner sh

# 检�?nginx 配置
cat /etc/nginx/conf.d/default.conf

# 检查文件权�?
ls -la /usr/share/nginx/html

# 检�?nginx 日志
docker logs ai-travel-planner
```

### 5. 内存不足

```bash
# 检�?Docker 资源使用
docker stats ai-travel-planner

# 清理未使用的镜像和容�?
docker system prune -a
```

---

## 最佳实�?

1. **使用特定版本标签**：避免使�?`latest` 标签，使用具体的版本号（�?`v1.0.0`�?
2. **定期更新镜像**：定期拉取最新镜像并更新容器
3. **监控容器健康**：使用健康检查确保容器正常运�?
4. **备份数据**：定期备份重要数�?
5. **使用 Docker Compose**：对于生产环境，使用 Docker Compose 管理容器
6. **配置日志轮转**：配置日志轮转避免日志文件过�?
7. **使用�?root 用户**：确保容器以�?root 用户运行（已�?Dockerfile 中配置）

---

## 相关链接

- [Docker 官方文档](https://docs.docker.com/)
- [阿里云容器镜像服务](https://www.aliyun.com/product/acr)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Nginx 官方文档](https://nginx.org/en/docs/)

---

## 支持

如有问题，请提交 Issue 或联系维护者�?

