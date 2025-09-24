import argparse
import os
from pathlib import Path
from typing import Optional, Tuple, List

from PIL import Image, ImageDraw, ImageFont, ExifTags


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def parse_color(color_str: str) -> Tuple[int, int, int, int]:
	"""Parse a color string like '#RRGGBB' or 'rgba(r,g,b,a)' or 'white' into RGBA.
	Falls back to black if parsing fails.
	"""
	color_str = color_str.strip()
	# Try hex
	if color_str.startswith('#'):
		hex_val = color_str[1:]
		if len(hex_val) == 6:
			r = int(hex_val[0:2], 16)
			g = int(hex_val[2:4], 16)
			b = int(hex_val[4:6], 16)
			return r, g, b, 255
		elif len(hex_val) == 8:
			r = int(hex_val[0:2], 16)
			g = int(hex_val[2:4], 16)
			b = int(hex_val[4:6], 16)
			a = int(hex_val[6:8], 16)
			return r, g, b, a

	# Try simple names via PIL (ImageColor)
	try:
		from PIL import ImageColor
		rgba = ImageColor.getcolor(color_str, "RGBA")
		return rgba
	except Exception:
		pass

	# Try rgba(r,g,b,a)
	if color_str.lower().startswith("rgba(") and color_str.endswith(")"):
		try:
			inside = color_str[color_str.find('(') + 1:-1]
			parts = [p.strip() for p in inside.split(',')]
			if len(parts) == 4:
				r, g, b = [int(parts[i]) for i in range(3)]
				a = int(float(parts[3]) * 255) if '.' in parts[3] else int(parts[3])
				return r, g, b, a
		except Exception:
			pass

	# Default
	return 0, 0, 0, 255


def load_font(font_size: int, font_path: Optional[str]) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
	"""Load a truetype font if possible, else fallback to default."""
	if font_path:
		font_file = Path(font_path)
		if font_file.exists():
			try:
				return ImageFont.truetype(str(font_file), font_size)
			except Exception:
				pass
	# Try common Windows font
	win_arial = Path(r"C:\Windows\Fonts\arial.ttf")
	if win_arial.exists():
		try:
			return ImageFont.truetype(str(win_arial), font_size)
		except Exception:
			pass
	# Fallback
	return ImageFont.load_default()


def get_exif_datetime_str(img: Image.Image) -> Optional[str]:
	"""Extract date string from EXIF and return as 'YYYY-MM-DD'."""
	exif = None
	try:
		exif = img.getexif()
	except Exception:
		pass
	if not exif:
		return None

	# Build reverse tag map once
	tag_map = {ExifTags.TAGS.get(k, str(k)): v for k, v in exif.items()}
	value = None
	for key in ("DateTimeOriginal", "DateTime", "DateTimeDigitized"):
		if key in tag_map:
			value = tag_map[key]
			break
	if not value or not isinstance(value, (str, bytes)):
		return None
	if isinstance(value, bytes):
		try:
			value = value.decode('utf-8', errors='ignore')
		except Exception:
			return None

	# Expected format: 'YYYY:MM:DD HH:MM:SS'
	try:
		date_part = value.split()[0]
		y, m, d = date_part.split(':')[0:3]
		return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
	except Exception:
		return None


def compute_position(pos: str, text_size: Tuple[int, int], image_size: Tuple[int, int], margin: int = 20) -> Tuple[int, int]:
	text_w, text_h = text_size
	img_w, img_h = image_size
	pos = pos.lower()
	if pos in {"left_top", "left", "top_left"}:
		return margin, margin
	if pos in {"right_top", "top_right"}:
		return max(img_w - text_w - margin, 0), margin
	if pos in {"left_bottom", "bottom_left"}:
		return margin, max(img_h - text_h - margin, 0)
	if pos in {"right_bottom", "bottom_right"}:
		return max(img_w - text_w - margin, 0), max(img_h - text_h - margin, 0)
	if pos in {"center", "middle", "centre"}:
		return max((img_w - text_w) // 2, 0), max((img_h - text_h) // 2, 0)
	# default: left_top
	return margin, margin


def is_image_file(path: Path) -> bool:
	return path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS


def list_images(target_path: Path) -> List[Path]:
	if target_path.is_file():
		return [target_path] if is_image_file(target_path) else []
	if target_path.is_dir():
		# Only files directly under the directory
		return [p for p in target_path.iterdir() if is_image_file(p)]
	return []


def watermark_image(src_path: Path, text: str, font: ImageFont.ImageFont, color: Tuple[int, int, int, int], position: str, output_dir: Path) -> Optional[Path]:
	try:
		with Image.open(src_path) as im:
			# Convert to RGBA to draw with alpha
			im_rgba = im.convert("RGBA")
			draw = ImageDraw.Draw(im_rgba)

			# Measure text
			bbox = draw.textbbox((0, 0), text, font=font)
			text_w = bbox[2] - bbox[0]
			text_h = bbox[3] - bbox[1]
			x, y = compute_position(position, (text_w, text_h), im_rgba.size)

			# Optional shadow for visibility
			shadow = (0, 0, 0, min(160, color[3]))
			for dx, dy in ((1, 1), (2, 2)):
				draw.text((x + dx, y + dy), text, font=font, fill=shadow)

			# Main text
			draw.text((x, y), text, font=font, fill=color)

			# Preserve original format when possible
			output_dir.mkdir(parents=True, exist_ok=True)
			out_name = src_path.stem + "_watermarked" + src_path.suffix
			out_path = output_dir / out_name

			# Convert back if original didn't support alpha
			if im.mode != "RGBA" and color[3] == 255:
				im_to_save = im_rgba.convert(im.mode)
			else:
				im_to_save = im_rgba

			# For JPEG, avoid saving with RGBA
			if out_path.suffix.lower() in {".jpg", ".jpeg"} and im_to_save.mode in {"RGBA", "LA"}:
				im_to_save = im_to_save.convert("RGB")

			im_to_save.save(out_path)
			return out_path
	except Exception as e:
		print(f"[WARN] Failed to process {src_path}: {e}")
		return None


def process_path(input_path: Path, font_size: int, color_str: str, position: str, font_path: Optional[str]) -> None:
	images = list_images(input_path)
	if not images:
		print("No images found to process.")
		return

	font = load_font(font_size, font_path)
	color = parse_color(color_str)

	# Determine output directory name based on original directory name
	if input_path.is_file():
		base_dir = input_path.parent
	else:
		base_dir = input_path
	orig_dir_name = base_dir.name
	output_dir = base_dir / f"{orig_dir_name}_watermark"

	processed = 0
	for img_path in images:
		try:
			with Image.open(img_path) as im:
				date_text = get_exif_datetime_str(im)
		except Exception:
			date_text = None
		if not date_text:
			# Skip images without EXIF date per requirements emphasis
			print(f"[INFO] Skipping {img_path.name}: no EXIF shooting date.")
			continue

		out = watermark_image(img_path, date_text, font, color, position, output_dir)
		if out:
			processed += 1
			print(f"Saved: {out}")

	print(f"Done. Processed {processed} image(s). Output dir: {output_dir}")


def build_arg_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description=(
			"Read EXIF shooting date from images under a path and add it as a text watermark. "
			"Saves to a new subdirectory named <original_dir_name>_watermark under the original directory."
		)
	)
	parser.add_argument("path", help="Image file path or directory containing images")
	parser.add_argument("--font-size", type=int, default=32, help="Font size in points (default: 32)")
	parser.add_argument(
		"--color",
		default="#FFFFFF",
		help="Text color. Accepts #RRGGBB[#AA], named colors (e.g., white), or rgba(r,g,b,a).",
	)
	parser.add_argument(
		"--position",
		choices=[
			"left_top",
			"right_top",
			"left_bottom",
			"right_bottom",
			"center",
		],
		default="right_bottom",
		help="Text position on the image (default: right_bottom)",
	)
	parser.add_argument(
		"--font-path",
		help="Optional path to a .ttf/.otf font file. If not provided, uses Arial on Windows or PIL default.",
	)
	return parser


def main() -> None:
	parser = build_arg_parser()
	args = parser.parse_args()
	target = Path(args.path)
	process_path(target, args.font_size, args.color, args.position, args.font_path)


if __name__ == "__main__":
	main() 