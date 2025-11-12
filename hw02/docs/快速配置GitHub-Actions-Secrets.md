# 快速配置 GitHub Actions Secrets

## 🚀 三步配置

### 第一步：进入 GitHub Secrets 配置页面

1. 打开您的 GitHub 仓库
2. 点击 **Settings**（设置）→ **Secrets and variables** → **Actions**
3. 点击 **New repository secret**（新建仓库密钥）

### 第二步：配置三个 Secrets

#### 1. ALIYUN_REGISTRY_USERNAME

- **Name**: `ALIYUN_REGISTRY_USERNAME`
- **Secret**: `LTAI5tPSWhPjQEgbjRem3yad`
- 点击 **Add secret**

#### 2. ALIYUN_REGISTRY_PASSWORD

- **Name**: `ALIYUN_REGISTRY_PASSWORD`
- **Secret**: `QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv`
- 点击 **Add secret**

#### 3. ALIYUN_NAMESPACE

- **Name**: `ALIYUN_NAMESPACE`
- **Secret**: `your-namespace`（替换为您的实际命名空间）
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

- ✅ `ALIYUN_REGISTRY_USERNAME` = `LTAI5tPSWhPjQEgbjRem3yad`
- ✅ `ALIYUN_REGISTRY_PASSWORD` = `QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv`
- ✅ `ALIYUN_NAMESPACE` = `your-namespace`（替换为实际值）

---

## 🧪 测试配置

### 方式一：手动触发 GitHub Actions

1. 访问 GitHub 仓库的 **Actions** 页面
2. 选择 **Docker Build and Push to Aliyun** workflow
3. 点击 **Run workflow**
4. 输入版本标签（例如：`v1.0.0`）
5. 查看构建日志，确认是否成功

### 方式二：本地测试

```bash
# 登录阿里云容器镜像服务
docker login registry.cn-hangzhou.aliyuncs.com \
  -u LTAI5tPSWhPjQEgbjRem3yad \
  -p QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv
```

---

## ⚠️ 注意事项

1. **AccessKey Secret 安全**：AccessKey Secret 只在创建时显示一次，请妥善保管
2. **命名空间**：确保命名空间已创建且 AccessKey 有访问权限
3. **权限**：确保 AccessKey 有容器镜像服务的读写权限

---

## 🔗 相关文档

- [详细配置指南](./GitHub-Actions-Secrets配置指南.md)
- [Docker 部署指南](./Docker部署指南.md)
- [GitHub Actions 配置指南](./GitHub-Actions配置指南.md)

