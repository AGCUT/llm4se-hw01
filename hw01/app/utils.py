import os
from typing import Iterable, List, Tuple

from PIL import Image
from PyQt5 import QtGui, QtCore


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


def generate_thumbnail_qimage(path: str, max_size: int = 96) -> QtGui.QImage:
    with Image.open(path) as im:
        im.thumbnail((max_size, max_size), Image.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA") if "A" in im.getbands() else im.convert("RGB")
        if im.mode == "RGBA":
            data = im.tobytes("raw", "RGBA")
            qimg = QtGui.QImage(data, im.width, im.height, QtGui.QImage.Format_RGBA8888)
        else:
            data = im.tobytes("raw", "RGB")
            qimg = QtGui.QImage(data, im.width, im.height, QtGui.QImage.Format_RGB888)
        return qimg.copy()


def qimage_to_pil_rgba(qimg: QtGui.QImage) -> Image.Image:
    converted = qimg.convertToFormat(QtGui.QImage.Format_RGBA8888)
    width = converted.width()
    height = converted.height()
    ptr = converted.bits()
    ptr.setsize(converted.byteCount())
    arr = bytes(ptr)
    return Image.frombuffer("RGBA", (width, height), arr, "raw", "RGBA", 0, 1)


def render_text_overlay_qimage(
    text: str,
    font_family: str,
    point_size: int,
    bold: bool,
    italic: bool,
    rgba: Tuple[int, int, int, int],
    shadow: bool,
    outline: bool,
) -> QtGui.QImage:
    if not text:
        img = QtGui.QImage(1, 1, QtGui.QImage.Format_RGBA8888)
        img.fill(QtCore.Qt.transparent)
        return img

    font = QtGui.QFont(font_family, point_size)
    font.setBold(bold)
    font.setItalic(italic)

    fm = QtGui.QFontMetrics(font)
    br = fm.boundingRect(text)
    # extra padding for outline/shadow
    pad = 4 if (shadow or outline) else 2
    w = max(1, br.width() + pad * 2)
    h = max(1, br.height() + pad * 2)

    img = QtGui.QImage(w, h, QtGui.QImage.Format_RGBA8888)
    img.fill(QtCore.Qt.transparent)

    painter = QtGui.QPainter(img)
    painter.setRenderHint(QtGui.QPainter.Antialiasing, True)
    painter.setRenderHint(QtGui.QPainter.TextAntialiasing, True)
    painter.setFont(font)

    x = pad
    y = pad + fm.ascent()

    r, g, b, a = rgba
    color = QtGui.QColor(r, g, b, a)

    if shadow:
        shadow_color = QtGui.QColor(0, 0, 0, int(a * 0.6))
        painter.setPen(shadow_color)
        painter.drawText(x + 2, y + 2, text)

    if outline:
        outline_color = QtGui.QColor(0, 0, 0, a)
        painter.setPen(outline_color)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            painter.drawText(x + dx, y + dy, text)

    painter.setPen(color)
    painter.drawText(x, y, text)
    painter.end()
    return img


