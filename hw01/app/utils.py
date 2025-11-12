import os
from typing import Iterable, List, Tuple
from PIL import Image, ImageDraw, ImageFont


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def is_supported_image_path(path: str) -> bool:
    ext = os.path.splitext(path)[1].lower()
    return ext in SUPPORTED_EXTS


def unique_paths_preserve_order(paths: Iterable[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for p in paths:
        ap = os.path.abspath(p)
        if ap not in seen:
            seen.add(ap)
            result.append(ap)
    return result


def generate_thumbnail(path: str, max_size: int = 96) -> Image.Image:
    """生成缩略图"""
    with Image.open(path) as im:
        im.thumbnail((max_size, max_size), Image.LANCZOS)
        return im.copy()


def render_text_overlay(
    text: str,
    font_family: str,
    point_size: int,
    bold: bool,
    italic: bool,
    rgba: Tuple[int, int, int, int],
    shadow: bool,
    outline: bool,
) -> Image.Image:
    """渲染文本水印为 PIL Image"""
    if not text:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    # 尝试加载字体
    try:
        # Windows 系统字体路径
        if font_family == "Microsoft YaHei" or font_family == "微软雅黑":
            font_path = "C:/Windows/Fonts/msyh.ttc"
        elif font_family == "SimSun" or font_family == "宋体":
            font_path = "C:/Windows/Fonts/simsun.ttc"
        elif font_family == "Arial":
            font_path = "C:/Windows/Fonts/arial.ttf"
        else:
            font_path = None
        
        if font_path and os.path.exists(font_path):
            font = ImageFont.truetype(font_path, point_size)
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # 计算文本大小
    dummy = Image.new("RGBA", (1, 1))
    draw = ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    # 添加边距
    pad = 6 if (shadow or outline) else 4
    w = text_w + pad * 2
    h = text_h + pad * 2

    # 创建透明图像
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    x = pad
    y = pad

    r, g, b, a = rgba

    # 绘制阴影
    if shadow:
        shadow_color = (0, 0, 0, int(a * 0.6))
        draw.text((x + 2, y + 2), text, font=font, fill=shadow_color)

    # 绘制描边
    if outline:
        outline_color = (0, 0, 0, a)
        for dx, dy in ((-1, -1), (-1, 1), (1, -1), (1, 1), (-2, 0), (2, 0), (0, -2), (0, 2)):
            draw.text((x + dx, y + dy), text, font=font, fill=outline_color)

    # 绘制主文本
    draw.text((x, y), text, font=font, fill=(r, g, b, a))

    return img


