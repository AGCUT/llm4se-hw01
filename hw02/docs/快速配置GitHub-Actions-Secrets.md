# 快速配置 GitHub Actions Secrets

## 🚀 三步配置

### 第一步：进入 GitHub Secrets 配置页面

1. 打开您的 GitHub 仓库
2. 点击 **Settings**（设置）→ **Secrets and variables** → **Actions**
3. 点击 **New repository secret**（新建仓库密钥）

### 第二步：配置三个 Secrets

#### 1. ALIYUN_REGISTRY_USERNAME

- **Name**: `ALIYUN_REGISTRY_USERNAME`
- **Secret**: 您的阿里云 AccessKey ID
  - 获取方式：登录 [阿里云控制台](https://www.aliyun.com/) → [AccessKey 管理](https://usercenter.console.aliyun.com/#/manage/ak)
  - 示例格式：`LTAI5txxxxxxxxxxxxx`（请使用您自己的 AccessKey ID）
- 点击 **Add secret**

#### 2. ALIYUN_REGISTRY_PASSWORD

- **Name**: `ALIYUN_REGISTRY_PASSWORD`
- **Secret**: 您的阿里云 AccessKey Secret
  - 获取方式：与 AccessKey ID 一起创建（只在创建时显示一次）
  - 示例格式：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（请使用您自己的 AccessKey Secret）
- 点击 **Add secret**

**⚠️ 重要提示**：
- AccessKey Secret 只在创建时显示一次，请妥善保管
- **不要将 AccessKey Secret 提交到代码仓库**
- 如果不小心泄露，请立即在阿里云控制台删除并重新创建

#### 3. ALIYUN_NAMESPACE

- **Name**: `ALIYUN_NAMESPACE`
- **Secret**: 您的命名空间名称（例如：`your-username` 或 `your-org`）
  - 获取方式：登录 [阿里云容器镜像服务](https://www.aliyun.com/product/acr) → 实例列表 → 命名空间
  - 如果还没有命名空间，请先创建一个
- 点击 **Add secret**

### 第三步：获取命名空间（如果还没有）

1. 登录 [阿里云控制台](https://www.aliyun.com/)
2. 进入 [容器镜像服务](https://www.aliyun.com/product/acr)
3. 点击 **实例列表** → 选择您的实例
4. 点击 **命名空间** → 查看或创建命名空间
5. 记录命名空间名称

---

## 📝 配置清单

确保以下三个 Secrets 已配置：

- ✅ `ALIYUN_REGISTRY_USERNAME` = 您的 AccessKey ID
- ✅ `ALIYUN_REGISTRY_PASSWORD` = 您的 AccessKey Secret
- ✅ `ALIYUN_NAMESPACE` = `your-namespace`（替换为实际值）

---

## 🧪 测试配置

### 方式一：手动触发 GitHub Actions

1. 访问 GitHub 仓库的 **Actions** 页面
2. 选择 **Docker Build and Push to Aliyun** workflow
3. 点击 **Run workflow**
4. 输入版本标签（例如：`v1.0.0`）
5. 查看构建日志，确认是否成功

### 方式二：本地测试（可选）

```bash
# 登录阿里云容器镜像服务
# 将 YOUR_ACCESS_KEY_ID 和 YOUR_ACCESS_KEY_SECRET 替换为您的实际值
docker login registry.cn-hangzhou.aliyuncs.com \
  -u YOUR_ACCESS_KEY_ID \
  -p YOUR_ACCESS_KEY_SECRET

# 如果登录成功，您会看到 "Login Succeeded"
```

---

## ⚠️ 安全注意事项

1. **AccessKey Secret 安全**：
   - AccessKey Secret 只在创建时显示一次，请妥善保管
   - **不要将 AccessKey Secret 提交到代码仓库**
   - **不要将 AccessKey Secret 分享给他人**
   - 如果不小心泄露，请立即在阿里云控制台删除并重新创建

2. **命名空间**：
   - 确保命名空间已创建且 AccessKey 有访问权限
   - 命名空间名称区分大小写

3. **权限**：
   - 确保 AccessKey 有容器镜像服务的读写权限
   - 建议为 GitHub Actions 创建专用的 AccessKey，而不是使用主账号的 AccessKey

4. **GitHub Secrets 安全**：
   - GitHub Secrets 是加密存储的，只有有权限的用户才能查看
   - 不要在代码、文档或日志中暴露 AccessKey Secret

---

## 🔗 相关文档

- [详细配置指南](./GitHub-Actions配置指南.md)
- [Docker 部署指南](./Docker部署指南.md)
- [GitHub Actions 配置指南](./GitHub-Actions配置指南.md)
- [阿里云 AccessKey 管理](https://usercenter.console.aliyun.com/#/manage/ak)
- [阿里云容器镜像服务](https://www.aliyun.com/product/acr)

---

## 🆘 遇到问题？

如果遇到问题，请查看：
1. [故障排查](./GitHub-Actions配置指南.md#故障排查)
2. [GitHub Actions 配置指南](./GitHub-Actions配置指南.md)
3. 提交 Issue 或联系维护者
