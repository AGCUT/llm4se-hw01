# 清理 Git 历史中的敏感信息

## ⚠️ 重要提示

如果您的代码仓库中已经包含了敏感信息（如 AccessKey ID、AccessKey Secret），请立即采取以下措施：

1. **立即删除泄露的 AccessKey**：
   - 登录 [阿里云控制台](https://usercenter.console.aliyun.com/#/manage/ak)
   - 删除已泄露的 AccessKey
   - 创建新的 AccessKey

2. **清理 Git 历史**：
   - 使用 `git filter-branch` 或 `BFG Repo-Cleaner` 清理历史记录
   - 强制推送更新后的历史记录

3. **更新 GitHub Secrets**：
   - 使用新的 AccessKey ID 和 AccessKey Secret
   - 更新 GitHub Secrets 配置

---

## 🔧 清理 Git 历史

### 方式一：使用 git filter-branch（推荐）

#### 1. 备份仓库

```bash
# 创建备份
git clone --mirror https://github.com/your-username/your-repo.git your-repo-backup.git
```

#### 2. 清理历史记录

```bash
# 删除包含敏感信息的文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch 'docs/GitHub-Actions-Secrets配置指南.md' 'docs/快速配置GitHub-Actions-Secrets.md'" \
  --prune-empty --tag-name-filter cat -- --all

# 清理敏感信息（替换敏感字符串）
git filter-branch --force --tree-filter \
  "find . -type f -name '*.md' -exec sed -i 's/LTAI5tPSWhPjQEgbjRem3yad/YOUR_ACCESS_KEY_ID/g' {} +" \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --tree-filter \
  "find . -type f -name '*.md' -exec sed -i 's/QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv/YOUR_ACCESS_KEY_SECRET/g' {} +" \
  --prune-empty --tag-name-filter cat -- --all
```

#### 3. 清理引用

```bash
# 清理备份引用
rm -rf .git/refs/original/

# 清理 reflog
git reflog expire --expire=now --all

# 清理未使用的对象
git gc --prune=now --aggressive
```

#### 4. 强制推送

```bash
# ⚠️ 警告：这将重写 Git 历史，请确保已备份
git push origin --force --all
git push origin --force --tags
```

### 方式二：使用 BFG Repo-Cleaner（更简单）

#### 1. 安装 BFG Repo-Cleaner

```bash
# 下载 BFG Repo-Cleaner
# Windows: 从 https://rtyley.github.io/bfg-repo-cleaner/ 下载
# Linux/Mac: 
brew install bfg
# 或
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

#### 2. 清理敏感信息

```bash
# 创建敏感信息列表文件
echo "LTAI5tPSWhPjQEgbjRem3yad" > sensitive.txt
echo "QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv" >> sensitive.txt

# 清理敏感信息
java -jar bfg-1.14.0.jar --replace-text sensitive.txt your-repo.git

# 清理引用
cd your-repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

#### 3. 强制推送

```bash
git push origin --force --all
git push origin --force --tags
```

---

## 🔄 更新 GitHub Secrets

### 1. 创建新的 AccessKey

1. 登录 [阿里云控制台](https://usercenter.console.aliyun.com/#/manage/ak)
2. 删除已泄露的 AccessKey
3. 创建新的 AccessKey
4. 记录新的 AccessKey ID 和 AccessKey Secret

### 2. 更新 GitHub Secrets

1. 访问 GitHub 仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 更新 `ALIYUN_REGISTRY_USERNAME` 为新的 AccessKey ID
3. 更新 `ALIYUN_REGISTRY_PASSWORD` 为新的 AccessKey Secret

---

## ✅ 验证清理结果

### 1. 检查 Git 历史

```bash
# 检查是否还有敏感信息
git log --all --full-history --source -p | grep -i "LTAI5tPSWhPjQEgbjRem3yad"
git log --all --full-history --source -p | grep -i "QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv"

# 如果没有输出，说明清理成功
```

### 2. 检查文件内容

```bash
# 检查当前文件是否还有敏感信息
grep -r "LTAI5tPSWhPjQEgbjRem3yad" .
grep -r "QdGFfa5kZvl1u5Q9noJmF5dkMi0mhv" .

# 如果没有输出，说明清理成功
```

---

## ⚠️ 注意事项

1. **备份重要**：清理 Git 历史会重写历史记录，请务必先备份
2. **团队协作**：如果团队其他成员已经拉取了包含敏感信息的代码，需要通知他们重新克隆仓库
3. **AccessKey 安全**：泄露的 AccessKey 可能已被滥用，请立即删除并创建新的
4. **GitHub 安全**：GitHub 可能已经检测到敏感信息，请按照 GitHub 的提示处理

---

## 🔗 相关链接

- [Git filter-branch 文档](https://git-scm.com/docs/git-filter-branch)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub 安全最佳实践](https://docs.github.com/en/code-security/secret-scanning)
- [阿里云 AccessKey 管理](https://usercenter.console.aliyun.com/#/manage/ak)

---

## 🆘 需要帮助？

如果遇到问题，请：
1. 查看 [GitHub 安全文档](https://docs.github.com/en/code-security/secret-scanning)
2. 提交 Issue 或联系维护者
3. 联系 GitHub 支持获取帮助

