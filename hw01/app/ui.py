import os
import sys
from typing import List, Optional, Tuple

from PyQt5 import QtCore, QtGui, QtWidgets

from .utils import (
    is_supported_image_path,
    generate_thumbnail_qimage,
    unique_paths_preserve_order,
)
from .exporter import ExportSettings, Exporter


class ImageListItemWidget(QtWidgets.QWidget):
    def __init__(self, pixmap: QtGui.QPixmap, filename: str, full_path: str, parent: Optional[QtWidgets.QWidget] = None) -> None:
        super().__init__(parent)
        self.full_path = full_path
        layout = QtWidgets.QHBoxLayout()
        layout.setContentsMargins(6, 6, 6, 6)
        thumb_label = QtWidgets.QLabel()
        thumb_label.setPixmap(pixmap)
        thumb_label.setFixedSize(pixmap.size())
        name_label = QtWidgets.QLabel(filename)
        name_label.setTextInteractionFlags(QtCore.Qt.TextSelectableByMouse)
        layout.addWidget(thumb_label)
        layout.addSpacing(8)
        layout.addWidget(name_label, 1)
        self.setLayout(layout)


class ImageListWidget(QtWidgets.QListWidget):
    filesChanged = QtCore.pyqtSignal()

    def __init__(self, parent: Optional[QtWidgets.QWidget] = None) -> None:
        super().__init__(parent)
        self.setSelectionMode(QtWidgets.QAbstractItemView.ExtendedSelection)
        self.setResizeMode(QtWidgets.QListView.Adjust)
        self.setSpacing(6)
        self.setAcceptDrops(True)
        self.setDragDropMode(QtWidgets.QAbstractItemView.DropOnly)
        self.setAlternatingRowColors(True)
        self.setMinimumWidth(380)

    def dragEnterEvent(self, event: QtGui.QDragEnterEvent) -> None:
        mime = event.mimeData()
        if mime.hasUrls():
            for url in mime.urls():
                local = url.toLocalFile()
                if os.path.isdir(local) or is_supported_image_path(local):
                    event.acceptProposedAction()
                    return
        event.ignore()

    def dragMoveEvent(self, event: QtGui.QDragMoveEvent) -> None:
        self.dragEnterEvent(event)

    def dropEvent(self, event: QtGui.QDropEvent) -> None:
        paths: List[str] = []
        for url in event.mimeData().urls():
            local = url.toLocalFile()
            if os.path.isdir(local):
                for root, _, files in os.walk(local):
                    for name in files:
                        candidate = os.path.join(root, name)
                        if is_supported_image_path(candidate):
                            paths.append(candidate)
            elif is_supported_image_path(local):
                paths.append(local)
        if paths:
            self.add_files(paths)
            self.filesChanged.emit()

    def add_files(self, file_paths: List[str]) -> None:
        file_paths = unique_paths_preserve_order(file_paths)
        for path in file_paths:
            if not is_supported_image_path(path):
                continue
            qimage = generate_thumbnail_qimage(path, max_size=96)
            pixmap = QtGui.QPixmap.fromImage(qimage)
            item = QtWidgets.QListWidgetItem()
            item.setSizeHint(QtCore.QSize(320, max(96, pixmap.height() + 12)))
            widget = ImageListItemWidget(pixmap, os.path.basename(path), path)
            item.setData(QtCore.Qt.UserRole, path)
            self.addItem(item)
            self.setItemWidget(item, widget)

    def get_all_paths(self) -> List[str]:
        result: List[str] = []
        for row in range(self.count()):
            item = self.item(row)
            path = item.data(QtCore.Qt.UserRole)
            if isinstance(path, str):
                result.append(path)
        return result

    def clear_list(self) -> None:
        self.clear()
        self.filesChanged.emit()


class PreviewCanvas(QtWidgets.QWidget):
    manualPosChanged = QtCore.pyqtSignal(float, float)

    def __init__(self) -> None:
        super().__init__()
        self.setMinimumHeight(260)
        self.setMouseTracking(True)
        self._baseImage = QtGui.QImage()
        self._scaledBase = QtGui.QImage()
        self._settings: Optional[ExportSettings] = None
        self._manual = False
        self._manualNorm: Tuple[float, float] = (0.8, 0.8)
        self._overlayRectPx: QtCore.QRect = QtCore.QRect(0, 0, 0, 0)
        self._lastMousePos: Optional[QtCore.QPoint] = None

    def set_base_image(self, path: str) -> None:
        img = QtGui.QImage(path)
        if not img.isNull():
            self._baseImage = img
            self._rescale()
            self.update()

    def is_manual(self) -> bool:
        return self._manual

    def set_manual(self, manual: bool) -> None:
        self._manual = manual

    def get_manual_norm(self) -> Tuple[float, float]:
        return self._manualNorm

    def apply_settings(self, settings: ExportSettings) -> None:
        self._settings = settings
        if settings.position_mode == "manual":
            self._manual = True
            self._manualNorm = settings.manual_pos_norm
        self._rescale()
        self.update()

    def resizeEvent(self, event: QtGui.QResizeEvent) -> None:
        self._rescale()
        super().resizeEvent(event)

    def _rescale(self) -> None:
        if self._baseImage.isNull():
            return
        target = self.size()
        self._scaledBase = self._baseImage.scaled(target, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)

    def paintEvent(self, event: QtGui.QPaintEvent) -> None:
        painter = QtGui.QPainter(self)
        painter.fillRect(self.rect(), self.palette().base())
        if self._scaledBase.isNull():
            painter.end()
            return
        x = (self.width() - self._scaledBase.width()) // 2
        y = (self.height() - self._scaledBase.height()) // 2
        painter.drawImage(x, y, self._scaledBase)

        if not self._settings:
            painter.end()
            return

        overlay = self._build_overlay_qimage()
        if overlay.isNull():
            painter.end()
            return
        rotation = self._settings.rotation_deg if self._settings else 0.0
        pm = QtGui.QPixmap.fromImage(overlay)
        if abs(rotation) > 0.01:
            transform = QtGui.QTransform()
            transform.rotate(rotation)
            pm = pm.transformed(transform, QtCore.Qt.SmoothTransformation)

        bx = self._scaledBase.width()
        by = self._scaledBase.height()
        ox = pm.width()
        oy = pm.height()
        if self._manual:
            nx, ny = self._manualNorm
            px = int(max(0.0, min(1.0, nx)) * bx)
            py = int(max(0.0, min(1.0, ny)) * by)
            px = max(0, min(bx - ox, px))
            py = max(0, min(by - oy, py))
        else:
            margin = max(8, int(min(bx, by) * 0.01))
            key = (self._settings.preset_position if self._settings else "bottom-right").lower()
            anchors = {
                "top-left": (margin, margin),
                "top-center": ((bx - ox) // 2, margin),
                "top-right": (bx - ox - margin, margin),
                "center-left": (margin, (by - oy) // 2),
                "center": ((bx - ox) // 2, (by - oy) // 2),
                "center-right": (bx - ox - margin, (by - oy) // 2),
                "bottom-left": (margin, by - oy - margin),
                "bottom-center": ((bx - ox) // 2, by - oy - margin),
                "bottom-right": (bx - ox - margin, by - oy - margin),
            }
            px, py = anchors.get(key, anchors["bottom-right"])

        drawX = (self.width() - bx) // 2 + px
        drawY = (self.height() - by) // 2 + py
        self._overlayRectPx = QtCore.QRect(drawX, drawY, ox, oy)
        painter.drawPixmap(drawX, drawY, pm)
        painter.end()

    def _build_overlay_qimage(self) -> QtGui.QImage:
        # prefer image watermark for preview; else text
        if not self._settings:
            return QtGui.QImage()
        p = (self._settings.img_wm_path or "").strip()
        if p and os.path.isfile(p):
            img = QtGui.QImage(p)
            if not img.isNull():
                bx = max(1, self._scaledBase.width())
                mode, percent, w, h = self._settings.img_wm_scale
                if mode == "percent" and percent:
                    target_w = max(1, int(bx * (percent / 100.0)))
                    img = img.scaledToWidth(target_w, QtCore.Qt.SmoothTransformation)
                elif mode == "size" and w and h:
                    img = img.scaled(int(w), int(h), QtCore.Qt.IgnoreAspectRatio, QtCore.Qt.SmoothTransformation)
                if 0 <= self._settings.img_wm_opacity < 100:
                    tmp = QtGui.QImage(img.size(), QtGui.QImage.Format_ARGB32_Premultiplied)
                    tmp.fill(QtCore.Qt.transparent)
                    p2 = QtGui.QPainter(tmp)
                    p2.setOpacity(self._settings.img_wm_opacity / 100.0)
                    p2.drawImage(0, 0, img)
                    p2.end()
                    return tmp
                return img
        # text overlay
        if (self._settings.wm_text or "").strip():
            from .utils import render_text_overlay_qimage
            return render_text_overlay_qimage(
                text=self._settings.wm_text,
                font_family=self._settings.wm_font_family,
                point_size=int(self._settings.wm_font_size),
                bold=bool(self._settings.wm_bold),
                italic=bool(self._settings.wm_italic),
                rgba=self._settings.wm_color_rgba,
                shadow=bool(self._settings.wm_shadow),
                outline=bool(self._settings.wm_outline),
            )
        return QtGui.QImage()

    def mousePressEvent(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.LeftButton and self._overlayRectPx.contains(event.pos()):
            self._lastMousePos = event.pos()
            event.accept()
            return
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QtGui.QMouseEvent) -> None:
        if self._lastMousePos is not None:
            delta = event.pos() - self._lastMousePos
            self._lastMousePos = event.pos()
            r = self._overlayRectPx
            r.translate(delta)
            bx = self._scaledBase.width()
            by = self._scaledBase.height()
            baseX = (self.width() - bx) // 2
            baseY = (self.height() - by) // 2
            r.moveLeft(max(baseX, min(baseX + bx - r.width(), r.left())))
            r.moveTop(max(baseY, min(baseY + by - r.height(), r.top())))
            self._overlayRectPx = r
            px = r.left() - baseX
            py = r.top() - baseY
            nx = px / max(1, bx)
            ny = py / max(1, by)
            self._manual = True
            self._manualNorm = (nx, ny)
            self.manualPosChanged.emit(nx, ny)
            self.update()
            event.accept()
            return
        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.LeftButton and self._lastMousePos is not None:
            self._lastMousePos = None
            event.accept()
            return
        super().mouseReleaseEvent(event)

class MainWindow(QtWidgets.QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("水印批处理工具")
        self.resize(1100, 700)

        self.imageList = ImageListWidget()
        self.preview = PreviewCanvas()

        self.outputDirEdit = QtWidgets.QLineEdit()
        self.outputDirBtn = QtWidgets.QPushButton("选择输出文件夹")
        self.formatCombo = QtWidgets.QComboBox()
        self.formatCombo.addItems(["JPEG", "PNG"])  # 输出格式

        self.namingKeepRadio = QtWidgets.QRadioButton("保留原文件名")
        self.namingPrefixRadio = QtWidgets.QRadioButton("添加前缀")
        self.namingSuffixRadio = QtWidgets.QRadioButton("添加后缀")
        self.namingKeepRadio.setChecked(True)
        self.prefixEdit = QtWidgets.QLineEdit("wm_")
        self.suffixEdit = QtWidgets.QLineEdit("_watermarked")

        self.jpegQualitySlider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.jpegQualitySlider.setRange(0, 100)
        self.jpegQualitySlider.setValue(90)
        self.jpegQualityLabel = QtWidgets.QLabel("JPEG 质量: 90")

        self.resizeNoneRadio = QtWidgets.QRadioButton("不缩放")
        self.resizeByWidthRadio = QtWidgets.QRadioButton("按宽度")
        self.resizeByHeightRadio = QtWidgets.QRadioButton("按高度")
        self.resizeByPercentRadio = QtWidgets.QRadioButton("按百分比")
        self.resizeNoneRadio.setChecked(True)
        self.widthSpin = QtWidgets.QSpinBox()
        self.widthSpin.setRange(1, 10000)
        self.widthSpin.setValue(1920)
        self.heightSpin = QtWidgets.QSpinBox()
        self.heightSpin.setRange(1, 10000)
        self.heightSpin.setValue(1080)
        self.percentSpin = QtWidgets.QSpinBox()
        self.percentSpin.setRange(1, 1000)
        self.percentSpin.setValue(100)

        # 文本水印设置
        self.wmTextEdit = QtWidgets.QLineEdit()
        self.wmFontCombo = QtWidgets.QFontComboBox()
        self.wmFontSizeSpin = QtWidgets.QSpinBox()
        self.wmFontSizeSpin.setRange(6, 300)
        self.wmFontSizeSpin.setValue(32)
        self.wmBoldCheck = QtWidgets.QCheckBox("粗体")
        self.wmItalicCheck = QtWidgets.QCheckBox("斜体")
        self.wmColorBtn = QtWidgets.QPushButton("选择颜色")
        self.wmColorPreview = QtWidgets.QLabel()
        self.wmColorPreview.setFixedSize(40, 20)
        self._wmColor = QtGui.QColor(255, 255, 255, 128)
        self._update_wm_color_preview()
        self.wmOpacitySlider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.wmOpacitySlider.setRange(0, 100)
        self.wmOpacitySlider.setValue(50)
        self.wmOpacityLabel = QtWidgets.QLabel("透明度: 50%")
        self.wmShadowCheck = QtWidgets.QCheckBox("阴影")
        self.wmOutlineCheck = QtWidgets.QCheckBox("描边")

        # 图片水印设置
        self.imgWmPathEdit = QtWidgets.QLineEdit()
        self.imgWmBrowseBtn = QtWidgets.QPushButton("选择图片…")
        self.imgWmScaleByPercent = QtWidgets.QRadioButton("按百分比缩放")
        self.imgWmScaleBySize = QtWidgets.QRadioButton("按像素缩放")
        self.imgWmScaleByPercent.setChecked(True)
        self.imgWmPercentSpin = QtWidgets.QSpinBox()
        self.imgWmPercentSpin.setRange(1, 1000)
        self.imgWmPercentSpin.setValue(30)
        self.imgWmWidthSpin = QtWidgets.QSpinBox()
        self.imgWmWidthSpin.setRange(1, 10000)
        self.imgWmWidthSpin.setValue(200)
        self.imgWmHeightSpin = QtWidgets.QSpinBox()
        self.imgWmHeightSpin.setRange(1, 10000)
        self.imgWmHeightSpin.setValue(200)
        self.imgWmOpacitySlider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.imgWmOpacitySlider.setRange(0, 100)
        self.imgWmOpacitySlider.setValue(60)
        self.imgWmOpacityLabel = QtWidgets.QLabel("透明度: 60%")

        self.importFilesBtn = QtWidgets.QPushButton("导入图片…")
        self.importFolderBtn = QtWidgets.QPushButton("导入文件夹…")
        self.clearBtn = QtWidgets.QPushButton("清空列表")
        self.exportBtn = QtWidgets.QPushButton("开始导出")

        self._build_layout()
        self._connect_signals()

    def _build_layout(self) -> None:
        splitter = QtWidgets.QSplitter()
        leftSplit = QtWidgets.QSplitter(QtCore.Qt.Vertical)
        leftSplit.addWidget(self.preview)
        leftSplit.addWidget(self.imageList)
        leftSplit.setStretchFactor(0, 3)
        leftSplit.setStretchFactor(1, 2)
        splitter.addWidget(leftSplit)

        right = QtWidgets.QWidget()
        form = QtWidgets.QFormLayout()
        form.setLabelAlignment(QtCore.Qt.AlignRight)

        # 输出目录
        outRow = QtWidgets.QHBoxLayout()
        outRow.addWidget(self.outputDirEdit, 1)
        outRow.addWidget(self.outputDirBtn)
        form.addRow("输出目录:", self._wrap(outRow))

        # 输出格式
        form.addRow("输出格式:", self.formatCombo)

        # 命名规则
        nameGroup = QtWidgets.QGroupBox("命名规则")
        nameLay = QtWidgets.QGridLayout()
        nameLay.addWidget(self.namingKeepRadio, 0, 0, 1, 2)
        nameLay.addWidget(self.namingPrefixRadio, 1, 0)
        nameLay.addWidget(self.prefixEdit, 1, 1)
        nameLay.addWidget(self.namingSuffixRadio, 2, 0)
        nameLay.addWidget(self.suffixEdit, 2, 1)
        nameGroup.setLayout(nameLay)
        form.addRow(nameGroup)

        # JPEG 质量
        jpegRow = QtWidgets.QHBoxLayout()
        jpegRow.addWidget(self.jpegQualitySlider, 1)
        jpegRow.addWidget(self.jpegQualityLabel)
        form.addRow("JPEG 质量:", self._wrap(jpegRow))

        # 尺寸调整
        resizeGroup = QtWidgets.QGroupBox("尺寸调整")
        resizeLay = QtWidgets.QGridLayout()
        resizeLay.addWidget(self.resizeNoneRadio, 0, 0)
        resizeLay.addWidget(self.resizeByWidthRadio, 1, 0)
        resizeLay.addWidget(QtWidgets.QLabel("宽度:"), 1, 1)
        resizeLay.addWidget(self.widthSpin, 1, 2)
        resizeLay.addWidget(self.resizeByHeightRadio, 2, 0)
        resizeLay.addWidget(QtWidgets.QLabel("高度:"), 2, 1)
        resizeLay.addWidget(self.heightSpin, 2, 2)
        resizeLay.addWidget(self.resizeByPercentRadio, 3, 0)
        resizeLay.addWidget(QtWidgets.QLabel("百分比:"), 3, 1)
        resizeLay.addWidget(self.percentSpin, 3, 2)
        resizeGroup.setLayout(resizeLay)
        form.addRow(resizeGroup)

        # 文本水印分组
        wmGroup = QtWidgets.QGroupBox("文本水印")
        wmLay = QtWidgets.QGridLayout()
        wmLay.addWidget(QtWidgets.QLabel("文本:"), 0, 0)
        wmLay.addWidget(self.wmTextEdit, 0, 1, 1, 3)
        wmLay.addWidget(QtWidgets.QLabel("字体:"), 1, 0)
        wmLay.addWidget(self.wmFontCombo, 1, 1, 1, 3)
        wmLay.addWidget(QtWidgets.QLabel("字号:"), 2, 0)
        wmLay.addWidget(self.wmFontSizeSpin, 2, 1)
        wmLay.addWidget(self.wmBoldCheck, 2, 2)
        wmLay.addWidget(self.wmItalicCheck, 2, 3)
        colorRow = QtWidgets.QHBoxLayout()
        colorRow.addWidget(self.wmColorBtn)
        colorRow.addWidget(self.wmColorPreview)
        colorRow.addStretch(1)
        wmLay.addWidget(QtWidgets.QLabel("颜色:"), 3, 0)
        wmLay.addLayout(colorRow, 3, 1, 1, 3)
        opRow = QtWidgets.QHBoxLayout()
        opRow.addWidget(self.wmOpacitySlider, 1)
        opRow.addWidget(self.wmOpacityLabel)
        wmLay.addWidget(QtWidgets.QLabel("透明度:"), 4, 0)
        wmLay.addLayout(opRow, 4, 1, 1, 3)
        shpRow = QtWidgets.QHBoxLayout()
        shpRow.addWidget(self.wmShadowCheck)
        shpRow.addWidget(self.wmOutlineCheck)
        shpRow.addStretch(1)
        wmLay.addLayout(shpRow, 5, 1, 1, 3)
        wmGroup.setLayout(wmLay)
        form.addRow(wmGroup)

        # 位置与旋转
        posGroup = QtWidgets.QGroupBox("位置与旋转")
        posLay = QtWidgets.QGridLayout()
        gridLay = QtWidgets.QGridLayout()
        self._posBtns: List[QtWidgets.QPushButton] = []
        posKeys = [
            ("top-left", 0, 0), ("top-center", 0, 1), ("top-right", 0, 2),
            ("center-left", 1, 0), ("center", 1, 1), ("center-right", 1, 2),
            ("bottom-left", 2, 0), ("bottom-center", 2, 1), ("bottom-right", 2, 2),
        ]
        self._presetKey = "bottom-right"
        for key, r, c in posKeys:
            btn = QtWidgets.QPushButton(key)
            btn.setCheckable(True)
            if key == self._presetKey:
                btn.setChecked(True)
            btn.clicked.connect(lambda checked, k=key: self._on_preset_clicked(k))
            self._posBtns.append(btn)
            gridLay.addWidget(btn, r, c)
        posLay.addLayout(gridLay, 0, 0, 1, 3)
        self.rotationSlider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.rotationSlider.setRange(0, 360)
        self.rotationSlider.setValue(0)
        self.rotationSpin = QtWidgets.QSpinBox()
        self.rotationSpin.setRange(0, 360)
        self.rotationSpin.setValue(0)
        rotRow = QtWidgets.QHBoxLayout()
        rotRow.addWidget(self.rotationSlider, 1)
        rotRow.addWidget(self.rotationSpin)
        posLay.addWidget(QtWidgets.QLabel("旋转 (度):"), 1, 0)
        posLay.addLayout(rotRow, 1, 1, 1, 2)
        posGroup.setLayout(posLay)
        form.addRow(posGroup)

        # 图片水印分组
        imgWmGroup = QtWidgets.QGroupBox("图片水印（支持 PNG 透明）")
        imgLay = QtWidgets.QGridLayout()
        imgPathRow = QtWidgets.QHBoxLayout()
        imgPathRow.addWidget(self.imgWmPathEdit, 1)
        imgPathRow.addWidget(self.imgWmBrowseBtn)
        imgLay.addWidget(QtWidgets.QLabel("图片路径:"), 0, 0)
        imgLay.addLayout(imgPathRow, 0, 1, 1, 3)
        imgLay.addWidget(self.imgWmScaleByPercent, 1, 0)
        imgLay.addWidget(QtWidgets.QLabel("百分比:"), 1, 1)
        imgLay.addWidget(self.imgWmPercentSpin, 1, 2)
        imgLay.addWidget(self.imgWmScaleBySize, 2, 0)
        imgLay.addWidget(QtWidgets.QLabel("宽度:"), 2, 1)
        imgLay.addWidget(self.imgWmWidthSpin, 2, 2)
        imgLay.addWidget(QtWidgets.QLabel("高度:"), 2, 3)
        imgLay.addWidget(self.imgWmHeightSpin, 2, 4)
        imgOpRow = QtWidgets.QHBoxLayout()
        imgOpRow.addWidget(self.imgWmOpacitySlider, 1)
        imgOpRow.addWidget(self.imgWmOpacityLabel)
        imgLay.addWidget(QtWidgets.QLabel("透明度:"), 3, 0)
        imgLay.addLayout(imgOpRow, 3, 1, 1, 3)
        imgWmGroup.setLayout(imgLay)
        form.addRow(imgWmGroup)

        # 操作按钮
        btnRow = QtWidgets.QHBoxLayout()
        btnRow.addWidget(self.importFilesBtn)
        btnRow.addWidget(self.importFolderBtn)
        btnRow.addWidget(self.clearBtn)
        btnRow.addStretch(1)
        btnRow.addWidget(self.exportBtn)
        form.addRow(self._wrap(btnRow))

        right.setLayout(form)
        splitter.addWidget(right)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)

        self.setCentralWidget(splitter)

    def _wrap(self, layout: QtWidgets.QLayout) -> QtWidgets.QWidget:
        w = QtWidgets.QWidget()
        w.setLayout(layout)
        return w

    def _connect_signals(self) -> None:
        self.outputDirBtn.clicked.connect(self._choose_output_dir)
        self.importFilesBtn.clicked.connect(self._import_files)
        self.importFolderBtn.clicked.connect(self._import_folder)
        self.clearBtn.clicked.connect(self.imageList.clear_list)
        self.exportBtn.clicked.connect(self._export)
        self.jpegQualitySlider.valueChanged.connect(lambda v: self.jpegQualityLabel.setText(f"JPEG 质量: {v}"))
        self.formatCombo.currentTextChanged.connect(self._on_format_changed)
        self.wmOpacitySlider.valueChanged.connect(self._on_opacity_changed)
        self.wmColorBtn.clicked.connect(self._choose_wm_color)
        # 新增：旋转与预览联动、拖拽联动
        self.rotationSlider.valueChanged.connect(self.rotationSpin.setValue)
        self.rotationSpin.valueChanged.connect(self.rotationSlider.setValue)
        self.rotationSpin.valueChanged.connect(lambda _: self._refresh_preview())
        self.imageList.itemSelectionChanged.connect(self._on_list_selection_changed)
        self.preview.manualPosChanged.connect(lambda _x, _y: self._on_manual_pos_changed())
        self.imgWmOpacitySlider.valueChanged.connect(lambda v: self.imgWmOpacityLabel.setText(f"透明度: {v}%"))
        self.imgWmBrowseBtn.clicked.connect(self._browse_img_wm)
        self._on_format_changed(self.formatCombo.currentText())
        self._refresh_preview()

    def _on_format_changed(self, fmt: str) -> None:
        is_jpeg = fmt.upper() == "JPEG"
        self.jpegQualitySlider.setEnabled(is_jpeg)
        self.jpegQualityLabel.setEnabled(is_jpeg)

    def _choose_output_dir(self) -> None:
        directory = QtWidgets.QFileDialog.getExistingDirectory(self, "选择输出文件夹")
        if directory:
            self.outputDirEdit.setText(directory)

    def _import_files(self) -> None:
        filter_str = "图像文件 (*.png *.jpg *.jpeg *.bmp *.tif *.tiff)"
        paths, _ = QtWidgets.QFileDialog.getOpenFileNames(self, "选择图片", "", filter_str)
        if paths:
            self.imageList.add_files(paths)

    def _import_folder(self) -> None:
        directory = QtWidgets.QFileDialog.getExistingDirectory(self, "选择文件夹")
        if not directory:
            return
        to_add: List[str] = []
        for root, _, files in os.walk(directory):
            for name in files:
                candidate = os.path.join(root, name)
                if is_supported_image_path(candidate):
                    to_add.append(candidate)
        if to_add:
            self.imageList.add_files(to_add)

    def _collect_resize(self) -> Tuple[str, Optional[int]]:
        if self.resizeByWidthRadio.isChecked():
            return ("width", int(self.widthSpin.value()))
        if self.resizeByHeightRadio.isChecked():
            return ("height", int(self.heightSpin.value()))
        if self.resizeByPercentRadio.isChecked():
            return ("percent", int(self.percentSpin.value()))
        return ("none", None)

    def _collect_settings(self) -> Optional[ExportSettings]:
        input_paths = self.imageList.get_all_paths()
        if not input_paths:
            QtWidgets.QMessageBox.warning(self, "提示", "请先导入图片")
            return None
        output_dir = self.outputDirEdit.text().strip()
        if not output_dir:
            QtWidgets.QMessageBox.warning(self, "提示", "请选择输出文件夹")
            return None
        if not os.path.isdir(output_dir):
            QtWidgets.QMessageBox.warning(self, "提示", "输出文件夹不存在")
            return None

        # 禁止导出到任一源目录
        src_dirs = {os.path.abspath(os.path.dirname(p)) for p in input_paths}
        if os.path.abspath(output_dir) in src_dirs:
            QtWidgets.QMessageBox.warning(self, "提示", "为防止覆盖原图，禁止导出到源目录，请选择其他目录")
            return None

        fmt = self.formatCombo.currentText().upper()
        quality = int(self.jpegQualitySlider.value()) if fmt == "JPEG" else None
        resize_mode, resize_value = self._collect_resize()

        if self.namingPrefixRadio.isChecked():
            naming = ("prefix", self.prefixEdit.text())
        elif self.namingSuffixRadio.isChecked():
            naming = ("suffix", self.suffixEdit.text())
        else:
            naming = ("keep", "")

        # 图片水印收集
        img_wm_path = self.imgWmPathEdit.text().strip()
        if self.imgWmScaleByPercent.isChecked():
            img_wm_scale = ("percent", int(self.imgWmPercentSpin.value()), None, None)
        else:
            img_wm_scale = ("size", None, int(self.imgWmWidthSpin.value()), int(self.imgWmHeightSpin.value()))
        img_wm_opacity = int(self.imgWmOpacitySlider.value())

        position_mode = "manual" if self.preview.is_manual() else "preset"
        preset_key = getattr(self, "_presetKey", "bottom-right")
        manual_norm = self.preview.get_manual_norm()

        return ExportSettings(
            input_paths=input_paths,
            output_dir=output_dir,
            output_format=fmt,
            jpeg_quality=quality,
            naming_rule=naming,
            resize_mode=resize_mode,
            resize_value=resize_value,
            wm_text=self.wmTextEdit.text(),
            wm_font_family=self.wmFontCombo.currentFont().family(),
            wm_font_size=int(self.wmFontSizeSpin.value()),
            wm_bold=self.wmBoldCheck.isChecked(),
            wm_italic=self.wmItalicCheck.isChecked(),
            wm_color_rgba=(self._wmColor.red(), self._wmColor.green(), self._wmColor.blue(), self._wmColor.alpha()),
            wm_shadow=self.wmShadowCheck.isChecked(),
            wm_outline=self.wmOutlineCheck.isChecked(),
            img_wm_path=img_wm_path,
            img_wm_scale=img_wm_scale,
            img_wm_opacity=img_wm_opacity,
            position_mode=position_mode,
            preset_position=preset_key,
            manual_pos_norm=manual_norm,
            rotation_deg=float(getattr(self, "rotationSpin", QtWidgets.QSpinBox()).value() if hasattr(self, "rotationSpin") else 0),
        )

    def _export(self) -> None:
        settings = self._collect_settings()
        if not settings:
            return
        self.exportBtn.setEnabled(False)
        try:
            exporter = Exporter(settings)
            ok_count, fail_count = exporter.export_all()
            QtWidgets.QMessageBox.information(self, "完成", f"导出完成: 成功 {ok_count} 张, 失败 {fail_count} 张")
        except Exception as e:
            QtWidgets.QMessageBox.critical(self, "错误", f"导出失败: {e}")
        finally:
            self.exportBtn.setEnabled(True)

    def _on_opacity_changed(self, v: int) -> None:
        self.wmOpacityLabel.setText(f"透明度: {v}%")
        # 同步透明度到颜色 alpha
        self._wmColor.setAlpha(int(v / 100 * 255))
        self._update_wm_color_preview()

    def _choose_wm_color(self) -> None:
        color = QtWidgets.QColorDialog.getColor(self._wmColor, self, "选择文本颜色")
        if color.isValid():
            # 保留当前透明度
            color.setAlpha(self._wmColor.alpha())
            self._wmColor = color
            self._update_wm_color_preview()

    def _update_wm_color_preview(self) -> None:
        pix = QtGui.QPixmap(self.wmColorPreview.width(), self.wmColorPreview.height())
        pix.fill(self._wmColor)
        self.wmColorPreview.setPixmap(pix)

    def _browse_img_wm(self) -> None:
        filter_str = "图像文件 (*.png *.jpg *.jpeg *.bmp *.tif *.tiff)"
        path, _ = QtWidgets.QFileDialog.getOpenFileName(self, "选择图片水印", "", filter_str)
        if path:
            self.imgWmPathEdit.setText(path)

    def _on_preset_clicked(self, key: str) -> None:
        self._presetKey = key
        # 切换为预设模式
        for b in getattr(self, "_posBtns", []):
            b.setChecked(b.text() == key)
        self.preview.set_manual(False)
        self._refresh_preview()

    def _on_list_selection_changed(self) -> None:
        paths = self.imageList.get_all_paths()
        row = self.imageList.currentRow()
        path = paths[row] if 0 <= row < len(paths) else (paths[0] if paths else "")
        if path and os.path.isfile(path):
            self.preview.set_base_image(path)
        self._refresh_preview()

    def _on_manual_pos_changed(self) -> None:
        # 预览中拖拽后，切换为手动定位
        self.preview.set_manual(True)
        self._refresh_preview()

    def _refresh_preview(self) -> None:
        # 构造一个用于预览的设置，避免阻塞性的校验和弹窗
        paths = self.imageList.get_all_paths()
        if not paths:
            return
        # 确保有基图
        if self.preview._baseImage.isNull():
            sel = self.imageList.currentRow()
            path = paths[sel] if 0 <= sel < len(paths) else paths[0]
            if path and os.path.isfile(path):
                self.preview.set_base_image(path)

        fmt = self.formatCombo.currentText().upper()
        resize_mode, resize_value = self._collect_resize()

        if self.namingPrefixRadio.isChecked():
            naming = ("prefix", self.prefixEdit.text())
        elif self.namingSuffixRadio.isChecked():
            naming = ("suffix", self.suffixEdit.text())
        else:
            naming = ("keep", "")

        img_wm_path = self.imgWmPathEdit.text().strip() if hasattr(self, 'imgWmPathEdit') else ""
        if hasattr(self, 'imgWmScaleByPercent') and self.imgWmScaleByPercent.isChecked():
            img_wm_scale = ("percent", int(self.imgWmPercentSpin.value()), None, None)
        else:
            img_wm_scale = ("size", None, int(self.imgWmWidthSpin.value()), int(self.imgWmHeightSpin.value())) if hasattr(self, 'imgWmWidthSpin') else ("percent", 30, None, None)
        img_wm_opacity = int(self.imgWmOpacitySlider.value()) if hasattr(self, 'imgWmOpacitySlider') else 60

        position_mode = "manual" if self.preview.is_manual() else "preset"
        preset_key = getattr(self, "_presetKey", "bottom-right")
        manual_norm = self.preview.get_manual_norm()

        settings = ExportSettings(
            input_paths=paths,
            output_dir=self.outputDirEdit.text().strip() or os.getcwd(),
            output_format=fmt,
            jpeg_quality=int(self.jpegQualitySlider.value()) if fmt == "JPEG" else None,
            naming_rule=naming,
            resize_mode=resize_mode,
            resize_value=resize_value,
            wm_text=self.wmTextEdit.text(),
            wm_font_family=self.wmFontCombo.currentFont().family(),
            wm_font_size=int(self.wmFontSizeSpin.value()),
            wm_bold=self.wmBoldCheck.isChecked(),
            wm_italic=self.wmItalicCheck.isChecked(),
            wm_color_rgba=(self._wmColor.red(), self._wmColor.green(), self._wmColor.blue(), self._wmColor.alpha()),
            wm_shadow=self.wmShadowCheck.isChecked(),
            wm_outline=self.wmOutlineCheck.isChecked(),
            img_wm_path=img_wm_path,
            img_wm_scale=img_wm_scale,
            img_wm_opacity=img_wm_opacity,
            position_mode=position_mode,
            preset_position=preset_key,
            manual_pos_norm=manual_norm,
            rotation_deg=float(getattr(self, "rotationSpin", QtWidgets.QSpinBox()).value() if hasattr(self, "rotationSpin") else 0),
        )
        self.preview.apply_settings(settings)


class WatermarkApp:
    def __init__(self, argv: List[str]) -> None:
        self._qt_app = QtWidgets.QApplication(argv)
        self._qt_app.setApplicationName("水印批处理工具")
        self._win = MainWindow()

    def run(self) -> int:
        self._win.show()
        return self._qt_app.exec_()


