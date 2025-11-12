# GitHub Actions 配置指南

本文档介绍如何配�?GitHub Actions 自动构建和推�?Docker 镜像到阿里云容器镜像服务�?

## 📋 目录

1. [前提条件](#前提条件)
2. [配置阿里云容器镜像服务](#配置阿里云容器镜像服�?
3. [配置 GitHub Secrets](#配置-github-secrets)
4. [触发构建](#触发构建)
5. [下载 Docker 镜像文件](#下载-docker-镜像文件)
6. [故障排查](#故障排查)

---

## 前提条件

- GitHub 仓库（公开或私有）
- 阿里云账�?
- 阿里云容器镜像服务实�?

---

## 配置阿里云容器镜像服�?

### 1. 创建容器镜像服务实例

1. 登录 [阿里云控制台](https://www.aliyun.com/)
2. 进入 [容器镜像服务](https://www.aliyun.com/product/acr)
3. 创建个人版或企业版实�?
4. 记录以下信息�?
   - **命名空间**（Namespace）：例如 `your-username` �?`your-org`
   - **Registry 地址**：例�?`registry.cn-hangzhou.aliyuncs.com`

### 2. 创建访问凭证

1. 进入容器镜像服务控制�?
2. 点击「访问凭证」或「Access Token�?
3. 创建访问凭证（用户名和密码）
4. 记录用户名和密码

---

## 配置 GitHub Secrets

### 1. 进入 GitHub 仓库设置

1. 打开 GitHub 仓库
2. 点击「Settings」→「Secrets and variables」→「Actions�?
3. 点击「New repository secret�?

### 2. 添加以下 Secrets

#### ALIYUN_REGISTRY_USERNAME

- **Name**: `ALIYUN_REGISTRY_USERNAME`
- **Value**: 您的阿里�?AccessKey ID
  - 获取方式：登�?[阿里云控制台](https://www.aliyun.com/) �?[AccessKey 管理](https://usercenter.console.aliyun.com/#/manage/ak)
  - 示例格式：`LTAI5txxxxxxxxxxxxx`（请使用您自己的 AccessKey ID�?
- **说明**：可以使用阿里云 AccessKey ID 作为用户名，也可以使用容器镜像服务创建的用户�?
- **⚠️ 注意**�?
  - 请使用您自己�?AccessKey ID
  - **不要�?AccessKey ID 提交到代码仓�?*

#### ALIYUN_REGISTRY_PASSWORD

- **Name**: `ALIYUN_REGISTRY_PASSWORD`
- **Value**: 您的阿里�?AccessKey Secret
  - 获取方式：与 AccessKey ID 一起创建（只在创建时显示一次）
  - 示例格式：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（请使用您自己的 AccessKey Secret�?
- **说明**：可以使用阿里云 AccessKey Secret 作为密码，也可以使用容器镜像服务创建的密�?
- **⚠️ 重要提示**�?
  - AccessKey Secret 只在创建时显示一次，请妥善保�?
  - **不要�?AccessKey Secret 提交到代码仓�?*
  - **不要�?AccessKey Secret 分享给他�?*
  - 如果不小心泄露，请立即在阿里云控制台删除并重新创�?
  - 建议�?GitHub Actions 创建专用�?AccessKey，而不是使用主账号�?AccessKey

#### ALIYUN_NAMESPACE

- **Name**: `ALIYUN_NAMESPACE`
- **Value**: 阿里云容器镜像服务命名空间（例如：`your-username` �?`your-org`�?
- **说明**：在阿里云容器镜像服务控制台中查看或创建命名空间
- **获取方式**�?
  1. 登录 [阿里云容器镜像服务](https://www.aliyun.com/product/acr)
  2. 点击「实例列表」→ 选择您的实例
  3. 点击「命名空间」→ 查看或创建命名空�?
  4. 记录命名空间名称

### 3. 验证 Secrets

确保以下 Secrets 已配置：

- �?`ALIYUN_REGISTRY_USERNAME`
- �?`ALIYUN_REGISTRY_PASSWORD`
- �?`ALIYUN_NAMESPACE`

---

## 触发构建

### 1. 自动触发

#### 推送到主分�?

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

创建 Pull Request �?`main` �?`master` 分支会自动触发构建�?

### 2. 手动触发

1. 访问 GitHub 仓库的「Actions」页�?
2. 选择「Docker Build and Push to Aliyun」workflow
3. 点击「Run workflow�?
4. 输入版本标签（例如：`v1.0.0`�?
5. 点击「Run workflow�?

---

## 下载 Docker 镜像文件

### 方式一：从 GitHub Actions Artifacts 下载

1. 访问 GitHub 仓库的「Actions」页�?
2. 选择最新的 workflow run
3. 在「Artifacts」部分下�?`docker-image-{version}.tar.gz`
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
# 登录阿里云容器镜像服�?
docker login registry.cn-hangzhou.aliyuncs.com

# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest

# 保存�?tar 文件
docker save registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest -o ai-travel-planner-latest.tar

# 压缩（可选）
gzip ai-travel-planner-latest.tar
```

---

## 故障排查

### 1. 构建失败

#### 检�?GitHub Secrets

确保以下 Secrets 已正确配置：
- `ALIYUN_REGISTRY_USERNAME`
- `ALIYUN_REGISTRY_PASSWORD`
- `ALIYUN_NAMESPACE`

#### 检查构建日�?

1. 访问 GitHub 仓库的「Actions」页�?
2. 选择失败�?workflow run
3. 查看构建日志中的错误信息

#### 常见错误

**错误：Authentication failed**

- **原因**：AccessKey ID �?AccessKey Secret 错误
- **解决方案**�?
  1. 检�?`ALIYUN_REGISTRY_USERNAME` �?`ALIYUN_REGISTRY_PASSWORD` 是否正确
  2. �?[阿里云控制台](https://usercenter.console.aliyun.com/#/manage/ak) 检�?AccessKey 状�?
  3. 确认 AccessKey 是否已启�?
  4. 如果 AccessKey 已禁用或删除，请重新创建

**错误：Namespace not found**

- **原因**：命名空间名称错误或不存�?
- **解决方案**�?
  1. 检�?`ALIYUN_NAMESPACE` 是否正确
  2. �?[阿里云容器镜像服务](https://www.aliyun.com/product/acr) 控制台检查命名空间是否存�?
  3. 确认命名空间名称是否区分大小�?
  4. 如果命名空间不存在，请先创建命名空间

**错误：Permission denied**

- **原因**：AccessKey 没有推送权限或命名空间权限不足
- **解决方案**�?
  1. 检�?AccessKey 是否有容器镜像服务的读写权限
  2. 在阿里云控制台检查命名空间权限设�?
  3. 确认 AccessKey 是否有访问该命名空间的权�?
  4. 如果权限不足，请在阿里云控制台配置相应的权限

### 2. 镜像推送失�?

#### 检查网络连�?

```bash
ping registry.cn-hangzhou.aliyuncs.com
```

#### 检查镜像标�?

确保镜像标签格式正确�?
- �?`v1.0.0`
- �?`latest`
- �?`main`
- �?`1.0.0`（缺�?`v` 前缀�?

### 3. Artifacts 下载失败

#### 检�?Artifacts 是否生成

1. 访问 GitHub 仓库的「Actions」页�?
2. 选择 workflow run
3. 查看「Artifacts」部分是否有文件

#### 检查文件大�?

- Artifacts 文件大小限制�?0GB
- 如果文件过大，考虑使用阿里云镜像仓库直接拉�?

---

## 最佳实�?

1. **使用版本标签**：避免使�?`latest` 标签，使用具体的版本号（�?`v1.0.0`�?
2. **定期更新镜像**：定期推送新版本镜像
3. **监控构建状�?*：设置构建通知，及时了解构建状�?
4. **使用缓存**：启�?Docker 构建缓存，加快构建速度
5. **多平台构�?*：支�?`linux/amd64` �?`linux/arm64` 平台
6. **安全最佳实�?*�?
   - **不要�?AccessKey Secret 提交到代码仓�?*
   - 使用 GitHub Secrets 安全存储敏感信息
   - 定期轮换 AccessKey
   - �?GitHub Actions 创建专用�?AccessKey

---

## 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [阿里云容器镜像服务](https://www.aliyun.com/product/acr)
- [Docker 官方文档](https://docs.docker.com/)
- [GitHub Actions Docker 示例](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)
- [阿里�?AccessKey 管理](https://usercenter.console.aliyun.com/#/manage/ak)

---

## 支持

如有问题，请提交 Issue 或联系维护者�?

