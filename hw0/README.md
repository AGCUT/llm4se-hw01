# EXIF Date Watermark CLI

一个命令行工具：读取图片 EXIF 拍摄日期(年月日)，将其作为文字水印绘制到图片上，输出到原目录的子目录：`<原目录名>_watermark`。

## 运行环境
- Python 3.10+
- Windows/Mac/Linux（本示例在 Windows 11 下开发）

## 安装依赖
```bash
pip install -r requirements.txt
```

## 使用方法
```bash
# 对单个文件
python main.py "路径/到/图片.jpg" --font-size 36 --color "#FFFFFF" --position right_bottom

# 对目录（仅处理该目录下的图片文件，不递归子目录）
python main.py "路径/到/图片目录" --font-size 32 --color "rgba(255,255,255,0.9)" --position center
```

- `path`：可以是单个图片文件或包含图片的目录
- `--font-size`：字体大小，默认 `32`
- `--color`：水印颜色，支持：
  - `#RRGGBB` 或 `#RRGGBBAA`
  - 颜色名（如 `white`）
  - `rgba(r,g,b,a)`（`a` 可为 0-255 或 0-1 小数）
- `--position`：位置，可选：`left_top`、`right_top`、`left_bottom`、`right_bottom`、`center`（默认 `right_bottom`）
- `--font-path`：可选，指定 `.ttf/.otf` 字体文件路径。不指定时在 Windows 上尝试 `Arial`，否则回退到 Pillow 默认字体。

程序会读取 EXIF 中的拍摄时间（优先顺序：`DateTimeOriginal` -> `DateTime` -> `DateTimeDigitized`），解析出 `YYYY-MM-DD` 作为水印文字。如果图片无拍摄日期，会跳过该图片。

输出图片会保存在：
```
<原目录>/<原目录名>_watermark/<原文件名>_watermarked.<ext>
```

## 示例
```bash
python main.py "D:\\photos" --font-size 40 --color "#00FF88" --position left_bottom
```

## 开发说明
- 核心文件：`main.py`
- 依赖：`Pillow`

## Git 提交流程建议
- 首次提交：添加核心代码与依赖
- 第二次提交：完善 README 或调整参数
- 完成后打 tag：`version1.0` 