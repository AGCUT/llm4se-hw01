import os
import sys
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser
from typing import List, Optional, Tuple
from PIL import Image, ImageTk, ImageDraw

from .utils import is_supported_image_path, unique_paths_preserve_order, generate_thumbnail, render_text_overlay
from .exporter import ExportSettings, Exporter


class PreviewCanvas(tk.Canvas):
    """预览画布 - 支持拖动水印"""
    def __init__(self, parent):
        super().__init__(parent, bg='#2b2b2b', highlightthickness=0, cursor='crosshair')
        self.base_image: Optional[Image.Image] = None
        self.preview_photo: Optional[ImageTk.PhotoImage] = None
        self.settings: Optional[dict] = None
        
        # 拖动相关
        self.manual_mode = False
        self.manual_pos_norm = (0.8, 0.8)  # 归一化位置 (0-1)
        self.dragging = False
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.watermark_rect = None  # 水印区域
        
        # 绑定鼠标事件
        self.bind('<Button-1>', self._on_mouse_down)
        self.bind('<B1-Motion>', self._on_mouse_drag)
        self.bind('<ButtonRelease-1>', self._on_mouse_up)
        self.bind('<Double-Button-1>', self._on_double_click)
        
    def set_image(self, image_path: str):
        """设置基础图像"""
        try:
            self.base_image = Image.open(image_path)
            self.base_image.thumbnail((600, 400), Image.LANCZOS)
            self.update_preview()
        except Exception as e:
            print(f"加载图片失败: {e}")
    
    def update_settings(self, settings: dict):
        """更新水印设置"""
        self.settings = settings
        self.update_preview()
    
    def update_preview(self):
        """更新预览"""
        if not self.base_image:
                    return
        
        # 复制基础图像
        preview = self.base_image.copy()
        if preview.mode != 'RGBA':
            preview = preview.convert('RGBA')
        
        # 应用水印并记录位置
        if self.settings:
            preview, self.watermark_rect = self._apply_watermarks(preview)
        
        # 转换为 PhotoImage
        self.preview_photo = ImageTk.PhotoImage(preview)
        
        # 更新画布
        self.delete("all")
        w, h = preview.size
        canvas_w = self.winfo_width() or 600
        canvas_h = self.winfo_height() or 400
        x = (canvas_w - w) // 2
        y = (canvas_h - h) // 2
        self.create_image(x, y, anchor=tk.NW, image=self.preview_photo)
        
        # 绘制水印边框（手动模式下）
        if self.manual_mode and self.watermark_rect:
            rx, ry, rw, rh = self.watermark_rect
            self.create_rectangle(
                x + rx, y + ry, x + rx + rw, y + ry + rh,
                outline='#00ff00', width=2, dash=(5, 5)
            )
    
    def _apply_watermarks(self, img: Image.Image) -> Tuple[Image.Image, Optional[Tuple[int, int, int, int]]]:
        """应用水印到图像，返回 (图像, 水印矩形)"""
        settings = self.settings
        watermark_rect = None
        
        if not settings:
            return img, None
        
        # 图片水印
        if settings.get('use_image_wm') and settings.get('img_wm_path'):
            img, rect = self._apply_image_watermark(img, settings)
            if rect:
                watermark_rect = rect
        
        # 文本水印
        if settings.get('use_text_wm') and settings.get('wm_text'):
            img, rect = self._apply_text_watermark(img, settings)
            if rect:
                watermark_rect = rect
        
        return img, watermark_rect
    
    def _apply_image_watermark(self, img: Image.Image, settings: dict) -> Tuple[Image.Image, Optional[Tuple[int, int, int, int]]]:
        """应用图片水印，返回 (图像, 水印矩形)"""
        try:
            wm_path = settings['img_wm_path']
            if not os.path.isfile(wm_path):
                return img, None
            
            wm = Image.open(wm_path).convert('RGBA')
            
            # 缩放
            if settings['img_scale_mode'] == 'percent':
                percent = settings['img_percent']
                target_w = max(1, int(img.width * (percent / 100.0)))
                ratio = target_w / wm.width
                target_h = max(1, int(wm.height * ratio))
                wm = wm.resize((target_w, target_h), Image.LANCZOS)
            else:
                w, h = settings['img_width'], settings['img_height']
                wm = wm.resize((w, h), Image.LANCZOS)
            
            # 透明度
            opacity = settings['img_opacity']
            if opacity < 100:
                alpha = wm.split()[-1]
                alpha = alpha.point(lambda p: p * (opacity / 100.0))
                wm.putalpha(alpha)
            
            # 旋转
            rotation = settings.get('rotation', 0)
            if rotation != 0:
                wm = wm.rotate(-rotation, resample=Image.BICUBIC, expand=True)
            
            # 位置（手动模式或预设）
            if self.manual_mode:
                pos = self._compute_manual_position(img.size, wm.size)
            else:
                pos = self._compute_position(img.size, wm.size, settings['position'])
            
            img.alpha_composite(wm, dest=pos)
            
            # 返回水印矩形 (x, y, width, height)
            return img, (pos[0], pos[1], wm.width, wm.height)
            
        except Exception as e:
            print(f"应用图片水印失败: {e}")
        
        return img, None
    
    def _apply_text_watermark(self, img: Image.Image, settings: dict) -> Tuple[Image.Image, Optional[Tuple[int, int, int, int]]]:
        """应用文本水印，返回 (图像, 水印矩形)"""
        try:
            text = settings['wm_text']
            if not text:
                return img, None
            
            # 渲染文本
            r, g, b, _ = settings['wm_color']
            a = int(settings['text_opacity'] / 100 * 255)
            
            text_overlay = render_text_overlay(
                text=text,
                font_family=settings['font_family'],
                point_size=settings['font_size'],
                bold=settings['font_bold'],
                italic=settings['font_italic'],
                rgba=(r, g, b, a),
                shadow=settings['wm_shadow'],
                outline=settings['wm_outline']
            )
            
            # 旋转
            rotation = settings.get('rotation', 0)
            if rotation != 0:
                text_overlay = text_overlay.rotate(-rotation, resample=Image.BICUBIC, expand=True)
            
            # 位置（手动模式或预设）
            if self.manual_mode:
                pos = self._compute_manual_position(img.size, text_overlay.size)
            else:
                pos = self._compute_position(img.size, text_overlay.size, settings['position'])
            
            img.alpha_composite(text_overlay, dest=pos)
            
            # 返回水印矩形
            return img, (pos[0], pos[1], text_overlay.width, text_overlay.height)
            
        except Exception as e:
            print(f"应用文本水印失败: {e}")
        
        return img, None
    
    def _compute_position(self, base_size: Tuple[int, int], wm_size: Tuple[int, int], 
                         position: str) -> Tuple[int, int]:
        """计算水印位置"""
        bw, bh = base_size
        ww, wh = wm_size
        margin = max(8, int(min(bw, bh) * 0.02))
        
        positions = {
            'top-left': (margin, margin),
            'top-center': ((bw - ww) // 2, margin),
            'top-right': (bw - ww - margin, margin),
            'center-left': (margin, (bh - wh) // 2),
            'center': ((bw - ww) // 2, (bh - wh) // 2),
            'center-right': (bw - ww - margin, (bh - wh) // 2),
            'bottom-left': (margin, bh - wh - margin),
            'bottom-center': ((bw - ww) // 2, bh - wh - margin),
            'bottom-right': (bw - ww - margin, bh - wh - margin),
        }
        
        return positions.get(position, positions['bottom-right'])
    
    def _compute_manual_position(self, base_size: Tuple[int, int], wm_size: Tuple[int, int]) -> Tuple[int, int]:
        """计算手动位置"""
        bw, bh = base_size
        ww, wh = wm_size
        
        # 归一化坐标转换为像素坐标
        nx, ny = self.manual_pos_norm
        px = int(nx * bw)
        py = int(ny * bh)
        
        # 限制在图像范围内
        px = max(0, min(bw - ww, px))
        py = max(0, min(bh - wh, py))
        
        return (px, py)
    
    def _on_mouse_down(self, event):
        """鼠标按下事件"""
        if not self.watermark_rect or not self.base_image:
            return
        
        # 获取图像在画布上的偏移
        w, h = self.base_image.width, self.base_image.height
        canvas_w = self.winfo_width()
        canvas_h = self.winfo_height()
        offset_x = (canvas_w - w) // 2
        offset_y = (canvas_h - h) // 2
        
        # 转换为图像坐标
        img_x = event.x - offset_x
        img_y = event.y - offset_y
        
        # 检查是否点击在水印区域
        rx, ry, rw, rh = self.watermark_rect
        if rx <= img_x <= rx + rw and ry <= img_y <= ry + rh:
            self.dragging = True
            self.drag_start_x = img_x
            self.drag_start_y = img_y
            self.manual_mode = True
            self.config(cursor='hand2')
    
    def _on_mouse_drag(self, event):
        """鼠标拖动事件"""
        if not self.dragging or not self.base_image or not self.watermark_rect:
            return
        
        # 获取图像在画布上的偏移
        w, h = self.base_image.width, self.base_image.height
        canvas_w = self.winfo_width()
        canvas_h = self.winfo_height()
        offset_x = (canvas_w - w) // 2
        offset_y = (canvas_h - h) // 2
        
        # 转换为图像坐标
        img_x = event.x - offset_x
        img_y = event.y - offset_y
        
        # 计算移动距离
        dx = img_x - self.drag_start_x
        dy = img_y - self.drag_start_y
        
        # 更新水印位置
        rx, ry, rw, rh = self.watermark_rect
        new_x = rx + dx
        new_y = ry + dy
        
        # 限制在图像范围内
        new_x = max(0, min(w - rw, new_x))
        new_y = max(0, min(h - rh, new_y))
        
        # 转换为归一化坐标
        self.manual_pos_norm = (new_x / w, new_y / h)
        
        # 更新拖动起点
        self.drag_start_x = img_x
        self.drag_start_y = img_y
        
        # 更新预览
        self.update_preview()
    
    def _on_mouse_up(self, event):
        """鼠标释放事件"""
        if self.dragging:
            self.dragging = False
            self.config(cursor='crosshair')
    
    def _on_double_click(self, event):
        """双击重置为预设位置"""
        self.manual_mode = False
        self.manual_pos_norm = (0.8, 0.8)
        self.update_preview()
    
    def reset_manual_mode(self):
        """重置手动模式"""
        self.manual_mode = False
        self.manual_pos_norm = (0.8, 0.8)
        self.update_preview()


class WatermarkApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("水印批处理工具 - 实时预览版")
        self.root.geometry("1200x750")
        
        # 数据
        self.image_paths: List[str] = []
        self.wm_color = (255, 255, 255, 128)  # RGBA
        self.current_image_index = -1
        
        # 模板目录
        self.tpl_dir = os.path.join(os.path.expanduser("~"), ".watermark_tool", "templates")
        os.makedirs(self.tpl_dir, exist_ok=True)
        self.last_file = os.path.join(self.tpl_dir, "last.json")
        
        self._build_ui()
        self._load_last_settings()
        
    def _build_ui(self):
        """构建UI"""
        # 主容器 - 三列布局
        main_paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # === 左侧：预览区域 + 图片列表 ===
        left_frame = ttk.Frame(main_paned)
        main_paned.add(left_frame, weight=2)
        
        # 预览区域
        preview_header = ttk.Frame(left_frame)
        preview_header.pack(fill=tk.X, pady=5)
        
        ttk.Label(preview_header, text="实时预览", font=("Arial", 12, "bold")).pack(side=tk.LEFT, padx=5)
        ttk.Label(preview_header, text="💡 提示: 点击水印可拖动，双击恢复预设位置", 
                 font=("Arial", 8), foreground='gray').pack(side=tk.LEFT, padx=10)
        
        preview_container = ttk.Frame(left_frame, relief=tk.SUNKEN, borderwidth=2)
        preview_container.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.preview_canvas = PreviewCanvas(preview_container)
        self.preview_canvas.pack(fill=tk.BOTH, expand=True)
        
        # 图片列表
        list_label = ttk.Label(left_frame, text="图片列表", font=("Arial", 10, "bold"))
        list_label.pack(pady=(10, 5))
        
        list_frame = ttk.Frame(left_frame)
        list_frame.pack(fill=tk.X, padx=5)
        
        list_scroll = ttk.Scrollbar(list_frame)
        list_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.image_listbox = tk.Listbox(list_frame, height=6, yscrollcommand=list_scroll.set)
        self.image_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        list_scroll.config(command=self.image_listbox.yview)
        self.image_listbox.bind('<<ListboxSelect>>', self._on_image_select)
        
        # 列表操作按钮
        list_btn_frame = ttk.Frame(left_frame)
        list_btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(list_btn_frame, text="导入图片", command=self._import_files).pack(side=tk.LEFT, padx=2)
        ttk.Button(list_btn_frame, text="导入文件夹", command=self._import_folder).pack(side=tk.LEFT, padx=2)
        ttk.Button(list_btn_frame, text="清空", command=self._clear_list).pack(side=tk.LEFT, padx=2)
        
        # === 右侧：设置面板 ===
        right_frame = ttk.Frame(main_paned)
        main_paned.add(right_frame, weight=1)
        
        # 创建滚动区域
        canvas = tk.Canvas(right_frame, highlightthickness=0)
        scrollbar_r = ttk.Scrollbar(right_frame, orient=tk.VERTICAL, command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar_r.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar_r.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 鼠标滚轮支持
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # === 输出设置 ===
        output_group = ttk.LabelFrame(scrollable_frame, text="输出设置", padding=10)
        output_group.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(output_group, text="输出目录:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.output_dir = tk.StringVar()
        ttk.Entry(output_group, textvariable=self.output_dir, width=25).grid(row=0, column=1, sticky=tk.EW, padx=5)
        ttk.Button(output_group, text="选择", command=self._choose_output_dir).grid(row=0, column=2, padx=2)
        
        ttk.Label(output_group, text="输出格式:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.output_format = tk.StringVar(value="PNG")
        ttk.Combobox(output_group, textvariable=self.output_format, values=["PNG", "JPEG"], 
                     state="readonly", width=10).grid(row=1, column=1, sticky=tk.W, padx=5)
        
        ttk.Label(output_group, text="JPEG质量:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.jpeg_quality = tk.IntVar(value=90)
        ttk.Scale(output_group, from_=0, to=100, variable=self.jpeg_quality, 
                  orient=tk.HORIZONTAL, command=lambda _: self._update_preview()).grid(row=2, column=1, sticky=tk.EW, padx=5)
        ttk.Label(output_group, textvariable=self.jpeg_quality).grid(row=2, column=2)
        
        output_group.columnconfigure(1, weight=1)
        
        # === 命名规则 ===
        naming_group = ttk.LabelFrame(scrollable_frame, text="命名规则", padding=10)
        naming_group.pack(fill=tk.X, padx=5, pady=5)
        
        self.naming_rule = tk.StringVar(value="keep")
        ttk.Radiobutton(naming_group, text="保留原名", variable=self.naming_rule, 
                        value="keep").grid(row=0, column=0, sticky=tk.W)
        
        ttk.Radiobutton(naming_group, text="前缀", variable=self.naming_rule, 
                        value="prefix").grid(row=1, column=0, sticky=tk.W)
        self.prefix_text = tk.StringVar(value="wm_")
        ttk.Entry(naming_group, textvariable=self.prefix_text, width=12).grid(row=1, column=1, sticky=tk.W, padx=5)
        
        ttk.Radiobutton(naming_group, text="后缀", variable=self.naming_rule, 
                        value="suffix").grid(row=2, column=0, sticky=tk.W)
        self.suffix_text = tk.StringVar(value="_wm")
        ttk.Entry(naming_group, textvariable=self.suffix_text, width=12).grid(row=2, column=1, sticky=tk.W, padx=5)
        
        # === 尺寸调整 ===
        resize_group = ttk.LabelFrame(scrollable_frame, text="尺寸调整", padding=10)
        resize_group.pack(fill=tk.X, padx=5, pady=5)
        
        self.resize_mode = tk.StringVar(value="none")
        ttk.Radiobutton(resize_group, text="不缩放", variable=self.resize_mode, value="none").pack(anchor=tk.W)
        
        width_frame = ttk.Frame(resize_group)
        width_frame.pack(fill=tk.X)
        ttk.Radiobutton(width_frame, text="宽度", variable=self.resize_mode, value="width").pack(side=tk.LEFT)
        self.width_value = tk.IntVar(value=1920)
        ttk.Spinbox(width_frame, from_=1, to=10000, textvariable=self.width_value, width=8).pack(side=tk.LEFT, padx=5)
        
        # === 水印类型 ===
        wm_type_group = ttk.LabelFrame(scrollable_frame, text="水印类型", padding=10)
        wm_type_group.pack(fill=tk.X, padx=5, pady=5)
        
        self.use_text_wm = tk.BooleanVar(value=True)
        ttk.Checkbutton(wm_type_group, text="使用文本水印", variable=self.use_text_wm,
                       command=self._update_preview).pack(anchor=tk.W)
        
        self.use_image_wm = tk.BooleanVar(value=False)
        ttk.Checkbutton(wm_type_group, text="使用图片水印", variable=self.use_image_wm,
                       command=self._update_preview).pack(anchor=tk.W)
        
        # === 文本水印设置 ===
        text_wm_group = ttk.LabelFrame(scrollable_frame, text="文本水印", padding=10)
        text_wm_group.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(text_wm_group, text="文本:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.wm_text = tk.StringVar(value="Watermark")
        text_entry = ttk.Entry(text_wm_group, textvariable=self.wm_text, width=25)
        text_entry.grid(row=0, column=1, columnspan=2, sticky=tk.EW, padx=5)
        text_entry.bind('<KeyRelease>', lambda e: self._update_preview())
        
        ttk.Label(text_wm_group, text="字体:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.font_family = tk.StringVar(value="Microsoft YaHei")
        font_combo = ttk.Combobox(text_wm_group, textvariable=self.font_family, 
                     values=["Microsoft YaHei", "Arial", "SimSun"], 
                     state="readonly", width=15)
        font_combo.grid(row=1, column=1, sticky=tk.W, padx=5)
        font_combo.bind('<<ComboboxSelected>>', lambda e: self._update_preview())
        
        ttk.Label(text_wm_group, text="字号:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.font_size = tk.IntVar(value=32)
        font_size_spin = ttk.Spinbox(text_wm_group, from_=6, to=300, textvariable=self.font_size, 
                    width=8, command=self._update_preview)
        font_size_spin.grid(row=2, column=1, sticky=tk.W, padx=5)
        # 绑定变量变化事件
        self.font_size.trace_add('write', lambda *args: self._update_preview())
        
        self.font_bold = tk.BooleanVar(value=False)
        ttk.Checkbutton(text_wm_group, text="粗体", variable=self.font_bold,
                       command=self._update_preview).grid(row=2, column=2, sticky=tk.W)
        
        self.font_italic = tk.BooleanVar(value=False)
        ttk.Checkbutton(text_wm_group, text="斜体", variable=self.font_italic,
                       command=self._update_preview).grid(row=3, column=1, sticky=tk.W)
        
        ttk.Label(text_wm_group, text="颜色:").grid(row=4, column=0, sticky=tk.W, pady=2)
        ttk.Button(text_wm_group, text="选择颜色", command=self._choose_color).grid(row=4, column=1, 
                                                                                   sticky=tk.W, padx=5)
        
        ttk.Label(text_wm_group, text="透明度:").grid(row=5, column=0, sticky=tk.W, pady=2)
        self.text_opacity = tk.IntVar(value=50)
        ttk.Scale(text_wm_group, from_=0, to=100, variable=self.text_opacity, 
                  orient=tk.HORIZONTAL, command=lambda _: self._update_preview()).grid(row=5, column=1, sticky=tk.EW, padx=5)
        ttk.Label(text_wm_group, textvariable=self.text_opacity).grid(row=5, column=2)
        
        self.wm_shadow = tk.BooleanVar(value=False)
        ttk.Checkbutton(text_wm_group, text="阴影", variable=self.wm_shadow,
                       command=self._update_preview).grid(row=6, column=0, sticky=tk.W)
        
        self.wm_outline = tk.BooleanVar(value=False)
        ttk.Checkbutton(text_wm_group, text="描边", variable=self.wm_outline,
                       command=self._update_preview).grid(row=6, column=1, sticky=tk.W)
        
        text_wm_group.columnconfigure(1, weight=1)
        
        # === 图片水印设置 ===
        img_wm_group = ttk.LabelFrame(scrollable_frame, text="图片水印", padding=10)
        img_wm_group.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(img_wm_group, text="图片:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.img_wm_path = tk.StringVar()
        ttk.Entry(img_wm_group, textvariable=self.img_wm_path, width=20).grid(row=0, column=1, 
                                                                                sticky=tk.EW, padx=5)
        ttk.Button(img_wm_group, text="选择", command=self._choose_img_wm).grid(row=0, column=2, padx=2)
        
        self.img_scale_mode = tk.StringVar(value="percent")
        ttk.Radiobutton(img_wm_group, text="百分比", variable=self.img_scale_mode, 
                        value="percent", command=self._update_preview).grid(row=1, column=0, sticky=tk.W)
        self.img_percent = tk.IntVar(value=30)
        ttk.Spinbox(img_wm_group, from_=1, to=1000, textvariable=self.img_percent, 
                    width=8, command=self._update_preview).grid(row=1, column=1, sticky=tk.W, padx=5)
        
        ttk.Radiobutton(img_wm_group, text="像素", variable=self.img_scale_mode, 
                        value="size", command=self._update_preview).grid(row=2, column=0, sticky=tk.W)
        self.img_width = tk.IntVar(value=200)
        ttk.Spinbox(img_wm_group, from_=1, to=10000, textvariable=self.img_width, 
                    width=8, command=self._update_preview).grid(row=2, column=1, sticky=tk.W, padx=5)
        self.img_height = tk.IntVar(value=200)
        ttk.Spinbox(img_wm_group, from_=1, to=10000, textvariable=self.img_height, 
                    width=8, command=self._update_preview).grid(row=2, column=2, sticky=tk.W)
        
        ttk.Label(img_wm_group, text="透明度:").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.img_opacity = tk.IntVar(value=60)
        ttk.Scale(img_wm_group, from_=0, to=100, variable=self.img_opacity, 
                  orient=tk.HORIZONTAL, command=lambda _: self._update_preview()).grid(row=3, column=1, sticky=tk.EW, padx=5)
        ttk.Label(img_wm_group, textvariable=self.img_opacity).grid(row=3, column=2)
        
        img_wm_group.columnconfigure(1, weight=1)
        
        # === 位置设置 ===
        pos_group = ttk.LabelFrame(scrollable_frame, text="水印位置", padding=10)
        pos_group.pack(fill=tk.X, padx=5, pady=5)
        
        self.position = tk.StringVar(value="bottom-right")
        positions = [
            ("左上", "top-left"), ("上", "top-center"), ("右上", "top-right"),
            ("左", "center-left"), ("中", "center"), ("右", "center-right"),
            ("左下", "bottom-left"), ("下", "bottom-center"), ("右下", "bottom-right")
        ]
        
        for i, (label, value) in enumerate(positions):
            row, col = divmod(i, 3)
            ttk.Radiobutton(pos_group, text=label, variable=self.position, 
                            value=value, command=self._on_position_change).grid(row=row, column=col, padx=5, pady=2)
        
        ttk.Label(pos_group, text="旋转:").grid(row=3, column=0, sticky=tk.W, pady=5)
        self.rotation = tk.IntVar(value=0)
        ttk.Scale(pos_group, from_=0, to=360, variable=self.rotation, 
                  orient=tk.HORIZONTAL, command=lambda _: self._update_preview()).grid(row=3, column=1, sticky=tk.EW, padx=5)
        ttk.Label(pos_group, textvariable=self.rotation).grid(row=3, column=2)
        
        # === 模板管理 ===
        tpl_group = ttk.LabelFrame(scrollable_frame, text="模板管理", padding=10)
        tpl_group.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(tpl_group, text="模板名:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.tpl_name = tk.StringVar()
        ttk.Entry(tpl_group, textvariable=self.tpl_name, width=15).grid(row=0, column=1, sticky=tk.EW, padx=5)
        ttk.Button(tpl_group, text="保存", command=self._save_template).grid(row=0, column=2, padx=2)
        
        ttk.Label(tpl_group, text="列表:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.tpl_list = ttk.Combobox(tpl_group, state="readonly", width=13)
        self.tpl_list.grid(row=1, column=1, sticky=tk.EW, padx=5)
        self._reload_template_list()
        
        tpl_btn_frame = ttk.Frame(tpl_group)
        tpl_btn_frame.grid(row=1, column=2, sticky=tk.W)
        ttk.Button(tpl_btn_frame, text="载入", command=self._load_template, width=6).pack(side=tk.LEFT, padx=1)
        ttk.Button(tpl_btn_frame, text="删除", command=self._delete_template, width=6).pack(side=tk.LEFT, padx=1)
        
        tpl_group.columnconfigure(1, weight=1)
        
        # === 导出按钮 ===
        export_frame = ttk.Frame(scrollable_frame)
        export_frame.pack(fill=tk.X, padx=5, pady=10)
        
        ttk.Button(export_frame, text="开始导出", command=self._export).pack(fill=tk.X)
        
    def _on_image_select(self, event):
        """图片选择事件"""
        selection = self.image_listbox.curselection()
        if selection:
            idx = selection[0]
            self.current_image_index = idx
            if 0 <= idx < len(self.image_paths):
                self.preview_canvas.set_image(self.image_paths[idx])
                self._update_preview()
    
    def _on_position_change(self):
        """位置单选按钮变化 - 重置手动模式"""
        self.preview_canvas.reset_manual_mode()
        self._update_preview()
    
    def _update_preview(self):
        """更新预览"""
        settings = {
            'use_text_wm': self.use_text_wm.get(),
            'use_image_wm': self.use_image_wm.get(),
            'wm_text': self.wm_text.get(),
            'font_family': self.font_family.get(),
            'font_size': self.font_size.get(),
            'font_bold': self.font_bold.get(),
            'font_italic': self.font_italic.get(),
            'wm_color': self.wm_color,
            'text_opacity': self.text_opacity.get(),
            'wm_shadow': self.wm_shadow.get(),
            'wm_outline': self.wm_outline.get(),
            'img_wm_path': self.img_wm_path.get(),
            'img_scale_mode': self.img_scale_mode.get(),
            'img_percent': self.img_percent.get(),
            'img_width': self.img_width.get(),
            'img_height': self.img_height.get(),
            'img_opacity': self.img_opacity.get(),
            'position': self.position.get(),
            'rotation': self.rotation.get(),
        }
        self.preview_canvas.update_settings(settings)
    
    def _import_files(self):
        """导入图片文件"""
        filetypes = [("图像文件", "*.png *.jpg *.jpeg *.bmp *.tif *.tiff"), ("所有文件", "*.*")]
        files = filedialog.askopenfilenames(title="选择图片", filetypes=filetypes)
        if files:
            self._add_files(list(files))
    
    def _import_folder(self):
        """导入文件夹"""
        folder = filedialog.askdirectory(title="选择文件夹")
        if not folder:
            return
        files = []
        for root, _, filenames in os.walk(folder):
            for name in filenames:
                path = os.path.join(root, name)
                if is_supported_image_path(path):
                    files.append(path)
        if files:
            self._add_files(files)
    
    def _add_files(self, files: List[str]):
        """添加文件到列表"""
        files = unique_paths_preserve_order(files)
        for f in files:
            if f not in self.image_paths:
                self.image_paths.append(f)
                self.image_listbox.insert(tk.END, os.path.basename(f))
        
        # 自动选择第一张
        if self.current_image_index == -1 and self.image_paths:
            self.image_listbox.selection_set(0)
            self._on_image_select(None)
    
    def _clear_list(self):
        """清空列表"""
        self.image_paths.clear()
        self.image_listbox.delete(0, tk.END)
        self.current_image_index = -1
        self.preview_canvas.base_image = None
        self.preview_canvas.delete("all")
    
    def _choose_output_dir(self):
        """选择输出目录"""
        folder = filedialog.askdirectory(title="选择输出文件夹")
        if folder:
            self.output_dir.set(folder)
    
    def _choose_color(self):
        """选择颜色"""
        color = colorchooser.askcolor(title="选择水印颜色")
        if color[0]:
            r, g, b = [int(c) for c in color[0]]
            a = int(self.text_opacity.get() / 100 * 255)
            self.wm_color = (r, g, b, a)
            self._update_preview()
    
    def _choose_img_wm(self):
        """选择图片水印"""
        filetypes = [("图像文件", "*.png *.jpg *.jpeg *.bmp"), ("所有文件", "*.*")]
        file = filedialog.askopenfilename(title="选择图片水印", filetypes=filetypes)
        if file:
            self.img_wm_path.set(file)
            self._update_preview()
    
    def _collect_settings(self) -> Optional[ExportSettings]:
        """收集设置"""
        if not self.image_paths:
            messagebox.showwarning("提示", "请先导入图片")
            return None
        
        output = self.output_dir.get().strip()
        if not output:
            messagebox.showwarning("提示", "请选择输出文件夹")
            return None
        
        if not os.path.isdir(output):
            messagebox.showwarning("提示", "输出文件夹不存在")
            return None
        
        # 禁止导出到源目录
        src_dirs = {os.path.abspath(os.path.dirname(p)) for p in self.image_paths}
        if os.path.abspath(output) in src_dirs:
            messagebox.showwarning("提示", "为防止覆盖原图，禁止导出到源目录")
            return None
        
        # 命名规则
        rule = self.naming_rule.get()
        if rule == "prefix":
            naming = ("prefix", self.prefix_text.get())
        elif rule == "suffix":
            naming = ("suffix", self.suffix_text.get())
        else:
            naming = ("keep", "")
        
        # 尺寸
        resize = self.resize_mode.get()
        if resize == "width":
            resize_mode, resize_value = "width", self.width_value.get()
        else:
            resize_mode, resize_value = "none", None
        
        # 图片水印缩放
        if self.img_scale_mode.get() == "percent":
            img_scale = ("percent", self.img_percent.get(), None, None)
        else:
            img_scale = ("size", None, self.img_width.get(), self.img_height.get())
        
        # 更新颜色透明度
        r, g, b, _ = self.wm_color
        a = int(self.text_opacity.get() / 100 * 255)
        
        # 获取位置模式
        position_mode = "manual" if self.preview_canvas.manual_mode else "preset"
        manual_pos = self.preview_canvas.manual_pos_norm if self.preview_canvas.manual_mode else (0.8, 0.8)
        
        return ExportSettings(
            input_paths=self.image_paths[:],
            output_dir=output,
            output_format=self.output_format.get(),
            jpeg_quality=self.jpeg_quality.get() if self.output_format.get() == "JPEG" else None,
            naming_rule=naming,
            resize_mode=resize_mode,
            resize_value=resize_value,
            wm_text=self.wm_text.get(),
            wm_font_family=self.font_family.get(),
            wm_font_size=self.font_size.get(),
            wm_bold=self.font_bold.get(),
            wm_italic=self.font_italic.get(),
            wm_color_rgba=(r, g, b, a),
            wm_shadow=self.wm_shadow.get(),
            wm_outline=self.wm_outline.get(),
            img_wm_path=self.img_wm_path.get(),
            img_wm_scale=img_scale,
            img_wm_opacity=self.img_opacity.get(),
            position_mode=position_mode,
            preset_position=self.position.get(),
            manual_pos_norm=manual_pos,
            rotation_deg=float(self.rotation.get()),
            wm_use_text=self.use_text_wm.get(),
            wm_use_image=self.use_image_wm.get(),
        )
    
    def _export(self):
        """开始导出"""
        settings = self._collect_settings()
        if not settings:
            return
        
        try:
            exporter = Exporter(settings)
            ok_count, fail_count = exporter.export_all()
            messagebox.showinfo("完成", f"导出完成：成功 {ok_count} 张，失败 {fail_count} 张")
        except Exception as e:
            messagebox.showerror("错误", f"导出失败：{e}")
    
    def _save_template(self):
        """保存模板"""
        name = self.tpl_name.get().strip()
        if not name:
            messagebox.showwarning("提示", "请输入模板名称")
            return
        
        data = self._collect_template_dict()
        path = self._tpl_path(name)
        
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self._reload_template_list()
            messagebox.showinfo("提示", "模板已保存")
        except Exception as e:
            messagebox.showerror("错误", f"保存失败：{e}")

    def _load_template(self):
        """载入模板"""
        name = self.tpl_list.get()
        if not name:
            return
        
        path = self._tpl_path(name)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._apply_template_dict(data)
            self._update_preview()
        except Exception as e:
            messagebox.showerror("错误", f"载入失败：{e}")

    def _delete_template(self):
        """删除模板"""
        name = self.tpl_list.get()
        if not name:
            return
        
        path = self._tpl_path(name)
        try:
            if os.path.isfile(path):
                os.remove(path)
            self._reload_template_list()
            messagebox.showinfo("提示", "模板已删除")
        except Exception as e:
            messagebox.showerror("错误", f"删除失败：{e}")
    
    def _tpl_path(self, name: str) -> str:
        """获取模板路径"""
        safe = "".join(c for c in name if c not in '\\/:*?"<>|').strip()
        return os.path.join(self.tpl_dir, f"{safe}.json")
    
    def _reload_template_list(self):
        """重新加载模板列表"""
        try:
            files = [f[:-5] for f in os.listdir(self.tpl_dir) 
                     if f.endswith('.json') and f != 'last.json']
            files.sort()
            self.tpl_list['values'] = files
        except:
            pass
    
    def _collect_template_dict(self) -> dict:
        """收集模板数据"""
        rule = self.naming_rule.get()
        if rule == "prefix":
            naming = ("prefix", self.prefix_text.get())
        elif rule == "suffix":
            naming = ("suffix", self.suffix_text.get())
        else:
            naming = ("keep", "")
        
        resize = self.resize_mode.get()
        if resize == "width":
            resize_mode, resize_value = "width", self.width_value.get()
        else:
            resize_mode, resize_value = "none", None
        
        if self.img_scale_mode.get() == "percent":
            img_scale = ["percent", self.img_percent.get(), None, None]
        else:
            img_scale = ["size", None, self.img_width.get(), self.img_height.get()]
        
        return {
            "output_format": self.output_format.get(),
            "jpeg_quality": self.jpeg_quality.get(),
            "naming_rule": list(naming),
            "resize_mode": resize_mode,
            "resize_value": resize_value,
            "wm_text": self.wm_text.get(),
            "wm_font_family": self.font_family.get(),
            "wm_font_size": self.font_size.get(),
            "wm_bold": self.font_bold.get(),
            "wm_italic": self.font_italic.get(),
            "wm_color_rgba": list(self.wm_color),
            "text_opacity": self.text_opacity.get(),
            "wm_shadow": self.wm_shadow.get(),
            "wm_outline": self.wm_outline.get(),
            "img_wm_path": self.img_wm_path.get(),
            "img_wm_scale": img_scale,
            "img_opacity": self.img_opacity.get(),
            "position": self.position.get(),
            "rotation": self.rotation.get(),
            "wm_use_text": self.use_text_wm.get(),
            "wm_use_image": self.use_image_wm.get(),
        }
    
    def _apply_template_dict(self, data: dict):
        """应用模板数据"""
        self.output_format.set(data.get("output_format", "PNG"))
        self.jpeg_quality.set(data.get("jpeg_quality", 90))
        
        naming = data.get("naming_rule", ["keep", ""])
        if naming[0] == "prefix":
            self.naming_rule.set("prefix")
            self.prefix_text.set(naming[1])
        elif naming[0] == "suffix":
            self.naming_rule.set("suffix")
            self.suffix_text.set(naming[1])
        else:
            self.naming_rule.set("keep")
        
        resize_mode = data.get("resize_mode", "none")
        self.resize_mode.set(resize_mode)
        if resize_mode == "width":
            self.width_value.set(data.get("resize_value", 1920))
        
        self.wm_text.set(data.get("wm_text", ""))
        self.font_family.set(data.get("wm_font_family", "Microsoft YaHei"))
        self.font_size.set(data.get("wm_font_size", 32))
        self.font_bold.set(data.get("wm_bold", False))
        self.font_italic.set(data.get("wm_italic", False))
        
        rgba = data.get("wm_color_rgba", [255, 255, 255, 128])
        self.wm_color = tuple(rgba)
        self.text_opacity.set(data.get("text_opacity", 50))
        
        self.wm_shadow.set(data.get("wm_shadow", False))
        self.wm_outline.set(data.get("wm_outline", False))
        
        self.img_wm_path.set(data.get("img_wm_path", ""))
        
        img_scale = data.get("img_wm_scale", ["percent", 30, None, None])
        if img_scale[0] == "percent":
            self.img_scale_mode.set("percent")
            self.img_percent.set(img_scale[1])
        else:
            self.img_scale_mode.set("size")
            self.img_width.set(img_scale[2] or 200)
            self.img_height.set(img_scale[3] or 200)
        
        self.img_opacity.set(data.get("img_opacity", 60))
        self.position.set(data.get("position", "bottom-right"))
        self.rotation.set(data.get("rotation", 0))
        self.use_text_wm.set(data.get("wm_use_text", True))
        self.use_image_wm.set(data.get("wm_use_image", False))
    
    def _save_last_settings(self):
        """保存上次设置"""
        try:
            data = self._collect_template_dict()
            with open(self.last_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    def _load_last_settings(self):
        """加载上次设置"""
        try:
            if os.path.isfile(self.last_file):
                with open(self.last_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self._apply_template_dict(data)
        except:
            pass
    
    def run(self):
        """运行应用"""
        self.root.protocol("WM_DELETE_WINDOW", self._on_closing)
        self.root.mainloop()
        return 0
    
    def _on_closing(self):
        """关闭时保存设置"""
        self._save_last_settings()
        self.root.destroy()
