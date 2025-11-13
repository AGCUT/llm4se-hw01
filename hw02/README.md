# AI 旅行规划师 - Web 版

基于 React + TypeScript + Vite 构建的智能旅行规划应用。

## 🚀 快速开始

### 方式一：使用 Docker（推荐）

#### 从 GitHub Actions 下载镜像

1. **访问 GitHub Actions**
   - 打开本仓库的 [Actions 页面](https://github.com/AGCUT/llm4se-hw01/actions)
   - 选择最新的 workflow run（构建完成后）
   - 滚动到页面底部，在 **Artifacts** 部分下载 `docker-image-{version}.tar.gz`
   - **注意**：Artifacts 只在构建完成后才会出现，需要等待构建完成

2. **导入并运行镜像**

   ```bash
   # Linux/Mac - 解压并导入
   gunzip docker-image-latest.tar.gz
   docker load -i docker-image-latest.tar

   # Windows - 方法一：使用 7-Zip（推荐）
   # 1. 安装 7-Zip: https://www.7-zip.org/
   # 2. 右键点击 .tar.gz 文件 -> 7-Zip -> 解压到当前文件夹
   # 3. 再次右键点击 .tar 文件 -> 7-Zip -> 解压到当前文件夹
   # 4. 或者使用命令行：
   7z x docker-image-latest.tar.gz
   7z x docker-image-latest.tar
   docker load -i docker-image-latest.tar

   # Windows - 方法二：使用 WSL（如果已安装）
   # 在 WSL 终端中直接运行（不需要 wsl 命令）：
   gunzip docker-image-latest.tar.gz
   docker load -i docker-image-latest.tar

   # Windows - 方法三：使用 Git Bash（如果已安装 Git）
   gunzip docker-image-latest.tar.gz
   docker load -i docker-image-latest.tar

   # 运行容器
   docker run -d \
     --name ai-travel-planner \
     -p 80:80 \
     --restart unless-stopped \
     crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest
   ```

3. **访问应用**
   - 打开浏览器访问：http://localhost

#### 从阿里云镜像仓库拉取（需要登录）

```bash
# 1. 登录阿里云容器镜像服务
docker login crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com
# 用户名: 你的阿里云账号
# 密码: 在控制台设置的固定密码

# 2. 拉取镜像
docker pull crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 3. 运行容器
docker run -d \
  --name ai-travel-planner \
  -p 80:80 \
  --restart unless-stopped \
  crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### 方式二：本地开发

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

## 📦 Docker 镜像信息

- **镜像仓库**: `crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner`
- **最新版本**: `latest`
- **构建状态**: [![Docker Build](https://github.com/AGCUT/llm4se-hw01/actions/workflows/docker-build-and-push.yml/badge.svg)](https://github.com/AGCUT/llm4se-hw01/actions)

## 📖 详细文档

- [Docker 部署指南](./docs/Docker部署指南.md)
- [Docker 打包使用指南](./docs/Docker打包使用指南.md)
- [Docker 镜像测试指南](./TEST_DOCKER_IMAGE.md)
- [GitHub Actions 配置指南](./docs/GitHub-Actions配置指南.md)

## 🔧 常用命令

```bash
# 查看运行中的容器
docker ps | grep ai-travel-planner

# 查看容器日志
docker logs -f ai-travel-planner

# 停止容器
docker stop ai-travel-planner

# 删除容器
docker rm ai-travel-planner

# 查看镜像
docker images | grep ai-travel-planner
```

## 📝 注意事项

1. **端口占用**: 确保 80 端口未被占用，或使用其他端口（如 `-p 8080:80`）
2. **环境变量**: 应用需要配置 Supabase 等环境变量（已在构建时注入）
3. **网络访问**: 确保容器可以访问外部 API 服务

## 🐛 问题反馈

如果遇到问题，请：
1. 查看 [故障排查指南](./docs/Docker部署指南.md#故障排查)
2. 检查 [GitHub Issues](https://github.com/AGCUT/llm4se-hw01/issues)
3. 查看容器日志：`docker logs ai-travel-planner`

