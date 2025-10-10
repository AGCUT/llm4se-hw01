import os
from dataclasses import dataclass
from typing import List, Optional, Tuple

from PIL import Image


NamingRule = Tuple[str, str]  # ("keep"|"prefix"|"suffix", value)


@dataclass
class ExportSettings:
    input_paths: List[str]
    output_dir: str
    output_format: str  # "JPEG" | "PNG"
    jpeg_quality: Optional[int]
    naming_rule: NamingRule
    resize_mode: str  # "none"|"width"|"height"|"percent"
    resize_value: Optional[int]


class Exporter:
    def __init__(self, settings: ExportSettings) -> None:
        self.settings = settings
        os.makedirs(self.settings.output_dir, exist_ok=True)

    def _build_output_name(self, src_path: str) -> str:
        base = os.path.basename(src_path)
        name, _ = os.path.splitext(base)
        rule, val = self.settings.naming_rule
        if rule == "prefix":
            name = f"{val}{name}"
        elif rule == "suffix":
            name = f"{name}{val}"
        # keep -> no change
        ext = ".jpg" if self.settings.output_format == "JPEG" else ".png"
        return f"{name}{ext}"

    def _resize(self, img: Image.Image) -> Image.Image:
        mode = self.settings.resize_mode
        value = self.settings.resize_value
        if mode == "none" or value is None:
            return img
        w, h = img.size
        if mode == "width":
            new_w = value
            new_h = int(h * (new_w / w))
        elif mode == "height":
            new_h = value
            new_w = int(w * (new_h / h))
        elif mode == "percent":
            scale = value / 100.0
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
        else:
            return img
        if img.mode in ("P", "1"):
            img = img.convert("RGBA") if "A" in img.getbands() else img.convert("RGB")
        return img.resize((new_w, new_h), Image.LANCZOS)

    def _save(self, img: Image.Image, out_path: str) -> None:
        fmt = self.settings.output_format
        if fmt == "JPEG":
            if img.mode in ("RGBA", "LA"):
                # JPEG 不支持透明，转白底
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[-1])
                img_to_save = bg
            else:
                img_to_save = img.convert("RGB")
            params = {"quality": int(self.settings.jpeg_quality or 90), "optimize": True}
            img_to_save.save(out_path, format="JPEG", **params)
        else:  # PNG
            img.save(out_path, format="PNG")

    def export_all(self) -> Tuple[int, int]:
        ok = 0
        fail = 0
        for src in self.settings.input_paths:
            try:
                with Image.open(src) as im:
                    im.load()
                    resized = self._resize(im)
                    out_name = self._build_output_name(src)
                    out_path = os.path.join(self.settings.output_dir, out_name)
                    self._save(resized, out_path)
                    ok += 1
            except Exception:
                fail += 1
        return ok, fail


