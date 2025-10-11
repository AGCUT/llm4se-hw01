# GitHub Release 发布指南

本指南将帮助您在GitHub上发布水印批处理工具的可执行文件。

## 准备工作

### 1. 初始化Git仓库并提交代码

在项目目录 `llm4se-hw01/hw01` 下执行以下命令：

```bash
# 初始化Git仓库
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "feat: 水印批处理工具初始版本

功能特性:
- 批量图片导入和处理
- 文本水印和图片水印支持
- 实时预览和位置调整
- 九宫格预设位置和手动拖拽
- 旋转功能
- 模板保存和管理
- 自动保存上次设置"
```

### 2. 在GitHub上创建仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `watermark-tool` (或您喜欢的名称)
   - **Description**: `一个功能强大的Windows桌面应用程序，用于批量添加水印到图片`
   - **Public/Private**: 根据需求选择
   - **不要勾选** "Initialize this repository with a README"（因为我们已有代码）
4. 点击 "Create repository"

### 3. 推送代码到GitHub

在创建仓库后，GitHub会显示推送命令，执行以下命令：

```bash
# 添加远程仓库（替换<username>为您的GitHub用户名）
git remote add origin https://github.com/<username>/watermark-tool.git

# 推送代码到main分支
git branch -M main
git push -u origin main
```

## 创建Release

### 4. 在GitHub上创建Release

1. 在您的GitHub仓库页面，点击右侧的 "Releases"
2. 点击 "Create a new release" 或 "Draft a new release"
3. 填写Release信息：

   **Tag version**: `v1.0.0`
   
   **Release title**: `水印批处理工具 v1.0.0`
   
   **Description**（描述内容建议）:
   ```markdown
   # 水印批处理工具 v1.0.0
   
   ## 功能特性
   
   ### ✨ 核心功能
   - 📁 批量导入图片（拖拽/选择文件/文件夹）
   - 🖼️ 支持多种格式：JPEG, PNG, BMP, TIFF
   - 🎨 文本水印和图片水印（支持PNG透明）
   - 👁️ 实时预览效果
   - 📍 九宫格预设位置 + 手动拖拽定位
   - 🔄 0-360度任意旋转
   - 💾 模板保存和管理
   - ⚡ 自动保存上次设置
   
   ### 🎯 文本水印
   - 自定义文本内容
   - 系统字体选择、字号调节
   - 粗体/斜体支持
   - 颜色选择和透明度调节
   - 阴影和描边效果
   
   ### 🖼️ 图片水印
   - 支持PNG透明图片
   - 缩放比例调节
   - 透明度调节
   - 独立拖拽定位
   
   ## 系统要求
   - Windows 10/11 (64位)
   - 无需安装Python或其他依赖
   
   ## 使用方法
   1. 下载 `watermark_tool_windows.zip`
   2. 解压缩得到 `watermark_tool.exe`
   3. 双击运行即可使用
   
   ## 文件说明
   - **watermark_tool_windows.zip**: Windows系统可执行文件（压缩包，约274MB）
   - 解压后exe文件约277MB
   - 模板文件保存在：`%USERPROFILE%\.watermark_tool\templates\`
   
   ## 注意事项
   ⚠️ 首次运行可能会被Windows Defender标记，请选择"仍要运行"
   ⚠️ 建议不要将输出目录设置为原图片所在目录
   ```

4. **上传Release文件**：
   - 在 "Attach binaries by dropping them here or selecting them." 区域
   - 拖拽或选择 `watermark_tool_windows.zip` 文件上传

5. 检查无误后，点击 "Publish release"

## 验证Release

### 5. 测试下载和运行

1. 在Release页面点击下载链接
2. 下载完成后解压缩
3. 双击 `watermark_tool.exe` 确认能正常运行
4. 测试基本功能：导入图片、添加水印、预览、导出

## 文件大小说明

当前打包文件大小约290MB，主要原因：
- PyQt5 GUI框架（约100MB）
- NumPy科学计算库（约100MB，Pillow依赖）
- Pillow图像处理库（约50MB）
- Python运行时（约40MB）

压缩后约274MB，压缩率约5.5%。

### 进一步减小文件的方法：

1. **使用多文件打包**（不推荐，用户体验差）：
   ```bash
   pyinstaller --onedir main.py
   ```
   
2. **移除NumPy依赖**（不推荐，可能影响Pillow功能）：
   - 需要修改代码避免使用NumPy相关功能
   
3. **使用Web技术栈**（需要重写）：
   - Electron等框架可能体积更小
   
4. **接受现状**（推荐）：
   - 290MB对于现代桌面应用是可接受的大小
   - GitHub Release支持最大2GB的文件
   - 用户只需下载一次

## 更新Release

如果需要更新Release：

1. 修改代码后重新打包
2. 提交新代码到Git：
   ```bash
   git add .
   git commit -m "fix: 修复xxx问题"
   git push
   ```
3. 创建新的Release（使用新的版本号，如v1.0.1, v1.1.0等）
4. 上传新的可执行文件

## 版本号规范

建议使用语义化版本号（Semantic Versioning）：
- **v1.0.0**: 主版本.次版本.修订版本
- **主版本号**：重大功能变更或不兼容的API修改
- **次版本号**：新增功能，向后兼容
- **修订版本号**：bug修复，向后兼容

示例：
- v1.0.0 - 初始版本
- v1.0.1 - 修复bug
- v1.1.0 - 新增功能
- v2.0.0 - 重大更新

## MacOS版本说明

由于当前是在Windows环境下开发，无法直接打包MacOS版本。如需MacOS支持：

1. 需要在MacOS系统上安装Python和依赖
2. 使用PyInstaller打包：
   ```bash
   pyinstaller --onefile --windowed --name watermark_tool main.py
   ```
3. 创建独立的Release或在同一Release中添加MacOS版本

建议：
- 在Release标题中标明 "Windows版本"
- 或在描述中说明 "当前仅支持Windows系统"
- 如有MacOS用户需求，可后续添加

