import os
from typing import Iterable, List

from PIL import Image
from PyQt5 import QtGui


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
        data = im.tobytes("raw", "BGRA" if im.mode == "RGBA" else "BGRX") if im.mode == "RGBA" else im.tobytes("raw", "BGRX")
        fmt = QtGui.QImage.Format_ARGB32 if im.mode == "RGBA" else QtGui.QImage.Format_RGB32
        qimg = QtGui.QImage(data, im.width, im.height, fmt)
        return qimg.copy()


