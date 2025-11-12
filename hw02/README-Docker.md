# Docker 部署说明

## 🚀 快速开始

### 1. 从阿里云镜像仓库拉取镜像

```bash
# 登录阿里云容器镜像服务
docker login registry.cn-hangzhou.aliyuncs.com

# 拉取最新镜像
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

## 📥 下载 Docker 镜像文件

### 方式一：从 GitHub Actions Artifacts 下载

1. 访问 GitHub 仓库的 Actions 页面
2. 选择最新的 workflow run
3. 在 Artifacts 部分下载 `docker-image-{version}.tar.gz`
4. 解压并导入：

```bash
gunzip ai-travel-planner-v1.0.0.tar.gz
docker load -i ai-travel-planner-v1.0.0.tar
```

### 方式二：从阿里云镜像仓库导出

```bash
# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 保存为 tar 文件
docker save registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest -o ai-travel-planner-latest.tar

# 压缩（可选）
gzip ai-travel-planner-latest.tar
```

---

## 🔧 GitHub Actions 配置

### 1. 配置 GitHub Secrets

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：

- `ALIYUN_REGISTRY_USERNAME`: 阿里云容器镜像服务用户名
- `ALIYUN_REGISTRY_PASSWORD`: 阿里云容器镜像服务密码
- `ALIYUN_NAMESPACE`: 阿里云容器镜像服务命名空间

### 2. 触发构建

- **自动触发**：推送到 `main` 或 `master` 分支，或创建版本标签
- **手动触发**：在 Actions 页面手动运行 workflow

---

## 📚 详细文档

更多详细信息请查看 [Docker部署指南](./docs/Docker部署指南.md)

---

## 🔗 相关链接

- [阿里云容器镜像服务](https://www.aliyun.com/product/acr)
- [Docker 官方文档](https://docs.docker.com/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

