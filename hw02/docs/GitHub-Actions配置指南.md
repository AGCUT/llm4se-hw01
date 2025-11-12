# GitHub Actions 配置指南

本文档介绍如何配置 GitHub Actions 自动构建和推送 Docker 镜像到阿里云容器镜像服务。

## 📋 目录

1. [前提条件](#前提条件)
2. [配置阿里云容器镜像服务](#配置阿里云容器镜像服务)
3. [配置 GitHub Secrets](#配置-github-secrets)
4. [触发构建](#触发构建)
5. [下载 Docker 镜像文件](#下载-docker-镜像文件)
6. [故障排查](#故障排查)

---

## 前提条件

- GitHub 仓库（公开或私有）
- 阿里云账户
- 阿里云容器镜像服务实例

---

## 配置阿里云容器镜像服务

### 1. 创建容器镜像服务实例

1. 登录 [阿里云控制台](https://www.aliyun.com/)
2. 进入 [容器镜像服务](https://www.aliyun.com/product/acr)
3. 创建个人版或企业版实例
4. 记录以下信息：
   - **命名空间**（Namespace）：例如 `your-username` 或 `your-org`
   - **Registry 地址**：例如 `registry.cn-hangzhou.aliyuncs.com`

### 2. 创建访问凭证

1. 进入容器镜像服务控制台
2. 点击「访问凭证」或「Access Token」
3. 创建访问凭证（用户名和密码）
4. 记录用户名和密码

---

## 配置 GitHub Secrets

### 1. 进入 GitHub 仓库设置

1. 打开 GitHub 仓库
2. 点击「Settings」→「Secrets and variables」→「Actions」
3. 点击「New repository secret」

### 2. 添加以下 Secrets

#### ALIYUN_REGISTRY_USERNAME

- **Name**: `ALIYUN_REGISTRY_USERNAME`
- **Value**: 阿里云容器镜像服务用户名

#### ALIYUN_REGISTRY_PASSWORD

- **Name**: `ALIYUN_REGISTRY_PASSWORD`
- **Value**: 阿里云容器镜像服务密码

#### ALIYUN_NAMESPACE

- **Name**: `ALIYUN_NAMESPACE`
- **Value**: 阿里云容器镜像服务命名空间（例如：`your-username` 或 `your-org`）

### 3. 验证 Secrets

确保以下 Secrets 已配置：

- ✅ `ALIYUN_REGISTRY_USERNAME`
- ✅ `ALIYUN_REGISTRY_PASSWORD`
- ✅ `ALIYUN_NAMESPACE`

---

## 触发构建

### 1. 自动触发

#### 推送到主分支

```bash
git add .
git commit -m "feat: update docker config"
git push origin main
```

#### 创建版本标签

```bash
git tag v1.0.0
git push origin v1.0.0
```

#### 创建 Pull Request

创建 Pull Request 到 `main` 或 `master` 分支会自动触发构建。

### 2. 手动触发

1. 访问 GitHub 仓库的「Actions」页面
2. 选择「Docker Build and Push to Aliyun」workflow
3. 点击「Run workflow」
4. 输入版本标签（例如：`v1.0.0`）
5. 点击「Run workflow」

---

## 下载 Docker 镜像文件

### 方式一：从 GitHub Actions Artifacts 下载

1. 访问 GitHub 仓库的「Actions」页面
2. 选择最新的 workflow run
3. 在「Artifacts」部分下载 `docker-image-{version}.tar.gz`
4. 解压并导入：

```bash
# 解压
gunzip ai-travel-planner-v1.0.0.tar.gz

# 导入镜像
docker load -i ai-travel-planner-v1.0.0.tar

# 查看镜像
docker images | grep ai-travel-planner
```

### 方式二：从阿里云镜像仓库拉取

```bash
# 登录阿里云容器镜像服务
docker login registry.cn-hangzhou.aliyuncs.com

# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 保存为 tar 文件
docker save registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest -o ai-travel-planner-latest.tar

# 压缩（可选）
gzip ai-travel-planner-latest.tar
```

---

## 故障排查

### 1. 构建失败

#### 检查 GitHub Secrets

确保以下 Secrets 已正确配置：
- `ALIYUN_REGISTRY_USERNAME`
- `ALIYUN_REGISTRY_PASSWORD`
- `ALIYUN_NAMESPACE`

#### 检查构建日志

1. 访问 GitHub 仓库的「Actions」页面
2. 选择失败的 workflow run
3. 查看构建日志中的错误信息

#### 常见错误

**错误：Authentication failed**

- 检查 `ALIYUN_REGISTRY_USERNAME` 和 `ALIYUN_REGISTRY_PASSWORD` 是否正确
- 检查阿里云访问凭证是否有效

**错误：Namespace not found**

- 检查 `ALIYUN_NAMESPACE` 是否正确
- 检查命名空间是否存在

**错误：Permission denied**

- 检查访问凭证是否有推送权限
- 检查命名空间权限设置

### 2. 镜像推送失败

#### 检查网络连接

```bash
ping registry.cn-hangzhou.aliyuncs.com
```

#### 检查镜像标签

确保镜像标签格式正确：
- ✅ `v1.0.0`
- ✅ `latest`
- ✅ `main`
- ❌ `1.0.0`（缺少 `v` 前缀）

### 3. Artifacts 下载失败

#### 检查 Artifacts 是否生成

1. 访问 GitHub 仓库的「Actions」页面
2. 选择 workflow run
3. 查看「Artifacts」部分是否有文件

#### 检查文件大小

- Artifacts 文件大小限制：10GB
- 如果文件过大，考虑使用阿里云镜像仓库直接拉取

---

## 最佳实践

1. **使用版本标签**：避免使用 `latest` 标签，使用具体的版本号（如 `v1.0.0`）
2. **定期更新镜像**：定期推送新版本镜像
3. **监控构建状态**：设置构建通知，及时了解构建状态
4. **使用缓存**：启用 Docker 构建缓存，加快构建速度
5. **多平台构建**：支持 `linux/amd64` 和 `linux/arm64` 平台

---

## 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [阿里云容器镜像服务](https://www.aliyun.com/product/acr)
- [Docker 官方文档](https://docs.docker.com/)
- [GitHub Actions Docker 示例](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)

---

## 支持

如有问题，请提交 Issue 或联系维护者。

