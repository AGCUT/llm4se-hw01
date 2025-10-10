import os
from dataclasses import dataclass
from typing import List, Optional, Tuple

from PIL import Image
from .utils import qimage_to_pil_rgba, render_text_overlay_qimage


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
    # text watermark
    wm_text: str = ""
    wm_font_family: str = "Microsoft YaHei"
    wm_font_size: int = 32
    wm_bold: bool = False
    wm_italic: bool = False
    wm_color_rgba: Tuple[int, int, int, int] = (255, 255, 255, 128)
    wm_shadow: bool = False
    wm_outline: bool = False
    # image watermark
    img_wm_path: str = ""
    # (mode, percent, width, height) where mode in {"percent","size"}
    img_wm_scale: Tuple[str, Optional[int], Optional[int], Optional[int]] = ("percent", 30, None, None)
    img_wm_opacity: int = 60
    # layout & rotation
    position_mode: str = "preset"  # "preset" | "manual"
    preset_position: str = "bottom-right"  # 9-grid keys
    manual_pos_norm: Tuple[float, float] = (0.8, 0.8)  # top-left normalized (0..1)
    rotation_deg: float = 0.0
    # which watermark to use
    wm_use_text: bool = True
    wm_use_image: bool = True
    # per-layer manual positions (normalized top-left)
    text_manual_enabled: bool = False
    image_manual_enabled: bool = False
    text_manual_pos_norm: Tuple[float, float] = (0.8, 0.8)
    image_manual_pos_norm: Tuple[float, float] = (0.8, 0.8)


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
                    # apply text watermark if provided
                    # 先叠加图片水印，再叠加文本水印，确保文本可见
                    final = self._apply_image_watermark(resized)
                    final = self._apply_text_watermark(final)
                    out_name = self._build_output_name(src)
                    out_path = os.path.join(self.settings.output_dir, out_name)
                    self._save(final, out_path)
                    ok += 1
            except Exception:
                fail += 1
        return ok, fail

    def _apply_text_watermark(self, img: Image.Image) -> Image.Image:
        if not self.settings.wm_use_text:
            return img
        text = (self.settings.wm_text or "").strip()
        if not text:
            return img
        # render overlay via Qt for high-quality font rendering
        overlay_qimg = render_text_overlay_qimage(
            text=text,
            font_family=self.settings.wm_font_family,
            point_size=int(self.settings.wm_font_size),
            bold=bool(self.settings.wm_bold),
            italic=bool(self.settings.wm_italic),
            rgba=self.settings.wm_color_rgba,
            shadow=bool(self.settings.wm_shadow),
            outline=bool(self.settings.wm_outline),
        )
        overlay = qimage_to_pil_rgba(overlay_qimg)
        if img.mode != "RGBA":
            base = img.convert("RGBA")
        else:
            base = img.copy()

        # rotate
        rotation = float(self.settings.rotation_deg or 0)
        if abs(rotation) > 0.01:
            overlay = overlay.rotate(-rotation, resample=Image.BICUBIC, expand=True)

        bx, by = base.size
        ox, oy = overlay.size
        # choose position: use text-specific manual if enabled
        if self.settings.text_manual_enabled:
            pos = self._compute_manual_position(bx, by, ox, oy, self.settings.text_manual_pos_norm)
        else:
            pos = self._compute_position(bx, by, ox, oy)
        base.alpha_composite(overlay, dest=pos)
        return base

    def _apply_image_watermark(self, img: Image.Image) -> Image.Image:
        if not self.settings.wm_use_image:
            return img
        path = (self.settings.img_wm_path or "").strip()
        if not path or not os.path.isfile(path):
            return img
        try:
            with Image.open(path) as wm:
                wm = wm.convert("RGBA")
                # scale
                mode, percent, w, h = self.settings.img_wm_scale
                if mode == "percent" and percent:
                    bx, by = img.size
                    target_w = max(1, int(bx * (percent / 100.0)))
                    ratio = target_w / wm.width
                    target_h = max(1, int(wm.height * ratio))
                    wm = wm.resize((target_w, target_h), Image.LANCZOS)
                elif mode == "size" and w and h:
                    wm = wm.resize((int(w), int(h)), Image.LANCZOS)

                # opacity
                opacity = max(0, min(100, int(self.settings.img_wm_opacity)))
                if opacity < 100:
                    alpha = wm.split()[-1]
                    alpha = alpha.point(lambda p: p * (opacity / 100.0))
                    wm.putalpha(alpha)

                # rotate
                rotation = float(self.settings.rotation_deg or 0)
                if abs(rotation) > 0.01:
                    wm = wm.rotate(-rotation, resample=Image.BICUBIC, expand=True)

                # compose by position
                if img.mode != "RGBA":
                    base = img.convert("RGBA")
                else:
                    base = img.copy()
                bx, by = base.size
                wx, wy = wm.size
                # choose position: use image-specific manual if enabled
                if self.settings.image_manual_enabled:
                    pos = self._compute_manual_position(bx, by, wx, wy, self.settings.image_manual_pos_norm)
                else:
                    pos = self._compute_position(bx, by, wx, wy)
                base.alpha_composite(wm, dest=pos)
                return base
        except Exception:
            return img
        return img

    def _compute_position(self, bw: int, bh: int, ow: int, oh: int) -> Tuple[int, int]:
        mode = self.settings.position_mode
        margin = max(8, int(min(bw, bh) * 0.01))
        if mode == "manual":
            # fallback manual for both when per-layer not enabled
            nx, ny = self.settings.manual_pos_norm
            return self._compute_manual_position(bw, bh, ow, oh, (nx, ny))
        key = (self.settings.preset_position or "bottom-right").lower()
        # map keys to anchor positions
        anchors = {
            "top-left": (margin, margin),
            "top-center": ((bw - ow) // 2, margin),
            "top-right": (bw - ow - margin, margin),
            "center-left": (margin, (bh - oh) // 2),
            "center": ((bw - ow) // 2, (bh - oh) // 2),
            "center-right": (bw - ow - margin, (bh - oh) // 2),
            "bottom-left": (margin, bh - oh - margin),
            "bottom-center": ((bw - ow) // 2, bh - oh - margin),
            "bottom-right": (bw - ow - margin, bh - oh - margin),
        }
        return anchors.get(key, anchors["bottom-right"])

    def _compute_manual_position(self, bw: int, bh: int, ow: int, oh: int, norm: Tuple[float, float]) -> Tuple[int, int]:
        nx, ny = norm
        x = int(max(0, min(1.0, nx)) * bw)
        y = int(max(0, min(1.0, ny)) * bh)
        x = max(0, min(bw - ow, x))
        y = max(0, min(bh - oh, y))
        return (x, y)


