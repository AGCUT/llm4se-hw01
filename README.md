# LLM4SE 作业仓库

## 📁 项目结构

- **hw0**: 第一次水印工具
- **hw01**: 第二次水印工具，可执行文件在 [Release](https://github.com/AGCUT/llm4se-hw01/releases) 中
- **hw02**: Web 版 AI 旅行规划师

## 🚀 快速使用 Docker 镜像

### 从 GitHub Actions 下载

1. 访问 [GitHub Actions](https://github.com/AGCUT/llm4se-hw01/actions)
2. 选择最新的 workflow run（确保构建已完成，显示绿色 ✓）
3. 滚动到页面底部，在 **Artifacts** 部分下载 `docker-image-{version}.tar.gz`
   - **提示**：如果看不到 Artifacts，说明构建还在进行中或已过期（Artifacts 保留 90 天）
4. 解压并导入镜像：

   ```bash
   # Linux/Mac
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
   wsl gunzip docker-image-latest.tar.gz
   docker load -i docker-image-latest.tar

   # Windows - 方法三：使用 Git Bash（如果已安装 Git）
   gunzip docker-image-latest.tar.gz
   docker load -i docker-image-latest.tar
   ```

5. 运行容器：

   ```bash
   docker run -d \
     --name ai-travel-planner \
     -p 80:80 \
     --restart unless-stopped \
     crpi-9vyhiuv04rrbghql.cn-hangzhou.personal.cr.aliyuncs.com/your-namespace/ai-travel-planner:latest
   ```

6. 访问应用：http://localhost

### 详细文档

- [hw02 Docker 部署指南](./hw02/docs/Docker部署指南.md)
- [hw02 Docker 镜像测试指南](./hw02/TEST_DOCKER_IMAGE.md)
- [hw02 GitHub Actions 配置指南](./hw02/docs/GitHub-Actions配置指南.md)

## 📦 Docker 镜像构建状态

[![Docker Build](https://github.com/AGCUT/llm4se-hw01/actions/workflows/docker-build-and-push.yml/badge.svg)](https://github.com/AGCUT/llm4se-hw01/actions/workflows/docker-build-and-push.yml)
