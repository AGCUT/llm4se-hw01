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
        # 若当前无选中项，则自动选中第一项
        if self.count() > 0 and self.currentRow() == -1:
            self.setCurrentRow(0)

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
        # per-layer manual flags and positions
        self._textManual: bool = False
        self._imageManual: bool = False
        self._textNorm: Tuple[float, float] = (0.8, 0.8)
        self._imageNorm: Tuple[float, float] = (0.8, 0.8)
        # hit rects and dragging state
        self._textRectPx: QtCore.QRect = QtCore.QRect(0, 0, 0, 0)
        self._imageRectPx: QtCore.QRect = QtCore.QRect(0, 0, 0, 0)
        self._dragTarget: Optional[str] = None  # 'text' | 'image'
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

        imgLayer, textLayer = self._build_layers()
        if (imgLayer is None or imgLayer.isNull()) and (textLayer is None or textLayer.isNull()):
            painter.end()
            return
        rotation = self._settings.rotation_deg if self._settings else 0.0
        bx = self._scaledBase.width()
        by = self._scaledBase.height()

        def rotate_pm(qimg: Optional[QtGui.QImage]) -> Optional[QtGui.QPixmap]:
            if qimg is None or qimg.isNull():
                return None
            pm = QtGui.QPixmap.fromImage(qimg)
            if abs(rotation) > 0.01:
                transform = QtGui.QTransform()
                transform.rotate(rotation)
                pm = pm.transformed(transform, QtCore.Qt.SmoothTransformation)
            return pm

        imgPm = rotate_pm(imgLayer)
        textPm = rotate_pm(textLayer)

        margin = max(8, int(min(bx, by) * 0.01))
        key = (self._settings.preset_position if self._settings else "bottom-right").lower()

        def compute_pos(ow: int, oh: int, which: str) -> Tuple[int, int]:
            if self._manual or (which == 'image' and self._imageManual) or (which == 'text' and self._textManual):
                nx, ny = (
                    self._imageNorm if which == 'image' else self._textNorm
                ) if (which == 'image' and self._imageManual) or (which == 'text' and self._textManual) else self._manualNorm
                px = int(max(0.0, min(1.0, nx)) * bx)
                py = int(max(0.0, min(1.0, ny)) * by)
                px = max(0, min(bx - ow, px))
                py = max(0, min(by - oh, py))
                return (px, py)
            anchors = {
                "top-left": (margin, margin),
                "top-center": ((bx - ow) // 2, margin),
                "top-right": (bx - ow - margin, margin),
                "center-left": (margin, (by - oh) // 2),
                "center": ((bx - ow) // 2, (by - oh) // 2),
                "center-right": (bx - ow - margin, (by - oh) // 2),
                "bottom-left": (margin, by - oh - margin),
                "bottom-center": ((bx - ow) // 2, by - oh - margin),
                "bottom-right": (bx - ow - margin, by - oh - margin),
            }
            return anchors.get(key, anchors["bottom-right"])

        baseX = (self.width() - bx) // 2
        baseY = (self.height() - by) // 2
        if imgPm is not None:
            ow, oh = imgPm.width(), imgPm.height()
            px, py = compute_pos(ow, oh, 'image')
            drawX = baseX + px
            drawY = baseY + py
            self._imageRectPx = QtCore.QRect(drawX, drawY, ow, oh)
            painter.drawPixmap(drawX, drawY, imgPm)
        else:
            self._imageRectPx = QtCore.QRect(0, 0, 0, 0)

        if textPm is not None:
            ow, oh = textPm.width(), textPm.height()
            px, py = compute_pos(ow, oh, 'text')
            drawX = baseX + px
            drawY = baseY + py
            self._textRectPx = QtCore.QRect(drawX, drawY, ow, oh)
            painter.drawPixmap(drawX, drawY, textPm)
        else:
            self._textRectPx = QtCore.QRect(0, 0, 0, 0)
        painter.end()

    def _build_layers(self) -> Tuple[Optional[QtGui.QImage], Optional[QtGui.QImage]]:
        if not self._settings:
            return None, None
        show_image = getattr(self._settings, 'wm_use_image', True)
        show_text = getattr(self._settings, 'wm_use_text', True)

        img_layer: Optional[QtGui.QImage] = None
        text_layer: Optional[QtGui.QImage] = None

        if show_image:
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
                        img = tmp
                    img_layer = img

        if show_text and (self._settings.wm_text or "").strip():
            from .utils import render_text_overlay_qimage
            text_layer = render_text_overlay_qimage(
                text=self._settings.wm_text,
                font_family=self._settings.wm_font_family,
                point_size=int(self._settings.wm_font_size),
                bold=bool(self._settings.wm_bold),
                italic=bool(self._settings.wm_italic),
                rgba=self._settings.wm_color_rgba,
                shadow=bool(self._settings.wm_shadow),
                outline=bool(self._settings.wm_outline),
            )

        return img_layer, text_layer

    def mousePressEvent(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.LeftButton:
            if self._textRectPx.contains(event.pos()):
                self._dragTarget = 'text'
                self._lastMousePos = event.pos()
                event.accept()
                return
            if self._imageRectPx.contains(event.pos()):
                self._dragTarget = 'image'
                self._lastMousePos = event.pos()
                event.accept()
                return
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QtGui.QMouseEvent) -> None:
        if self._lastMousePos is not None and self._dragTarget is not None:
            delta = event.pos() - self._lastMousePos
            self._lastMousePos = event.pos()
            r = self._textRectPx if self._dragTarget == 'text' else self._imageRectPx
            r.translate(delta)
            bx = self._scaledBase.width()
            by = self._scaledBase.height()
            baseX = (self.width() - bx) // 2
            baseY = (self.height() - by) // 2
            r.moveLeft(max(baseX, min(baseX + bx - r.width(), r.left())))
            r.moveTop(max(baseY, min(baseY + by - r.height(), r.top())))
            if self._dragTarget == 'text':
                self._textRectPx = r
            else:
                self._imageRectPx = r
            px = r.left() - baseX
            py = r.top() - baseY
            nx = px / max(1, bx)
            ny = py / max(1, by)
            if self._dragTarget == 'text':
                self._textManual = True
                self._textNorm = (nx, ny)
            else:
                self._imageManual = True
                self._imageNorm = (nx, ny)
            self.manualPosChanged.emit(nx, ny)
            self.update()
            event.accept()
            return
        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QtGui.QMouseEvent) -> None:
        if event.button() == QtCore.Qt.LeftButton and self._lastMousePos is not None:
            self._lastMousePos = None
            self._dragTarget = None
            event.accept()
            return
        super().mouseReleaseEvent(event)

    # getters for per-layer manual state
    def is_text_manual(self) -> bool:
        return self._textManual

    def is_image_manual(self) -> bool:
        return self._imageManual

    def get_text_norm(self) -> Tuple[float, float]:
        return self._textNorm

    def get_image_norm(self) -> Tuple[float, float]:
        return self._imageNorm

    # reset helpers
    def reset_text_manual(self) -> None:
        self._textManual = False
        # keep norm as-is; preset计算不使用该值
        self.update()

    def reset_image_manual(self) -> None:
        self._imageManual = False
        self.update()

class MainWindow(QtWidgets.QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("水印批处理工具")
        self.resize(1100, 700)

        self.imageList = ImageListWidget()
        self.preview = PreviewCanvas()

        # 模板存储路径
        self._tpl_dir = os.path.join(os.path.expanduser("~"), ".watermark_tool", "templates")
        os.makedirs(self._tpl_dir, exist_ok=True)
        self._last_file = os.path.join(self._tpl_dir, "last.json")

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

        # 水印使用选择
        self.useTextCheck = QtWidgets.QCheckBox("使用文本水印")
        self.useImageCheck = QtWidgets.QCheckBox("使用图片水印")
        self.useTextCheck.setChecked(True)
        self.useImageCheck.setChecked(True)

        # 模板管理
        self.tplNameEdit = QtWidgets.QLineEdit()
        self.tplSaveBtn = QtWidgets.QPushButton("保存模板")
        self.tplListCombo = QtWidgets.QComboBox()
        self.tplLoadBtn = QtWidgets.QPushButton("载入")
        self.tplDeleteBtn = QtWidgets.QPushButton("删除")

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

        # 模板管理
        tplRow1 = QtWidgets.QHBoxLayout()
        tplRow1.addWidget(QtWidgets.QLabel("模板名:"))
        tplRow1.addWidget(self.tplNameEdit, 1)
        tplRow1.addWidget(self.tplSaveBtn)
        tplRow2 = QtWidgets.QHBoxLayout()
        tplRow2.addWidget(QtWidgets.QLabel("模板列表:"))
        tplRow2.addWidget(self.tplListCombo, 1)
        tplRow2.addWidget(self.tplLoadBtn)
        tplRow2.addWidget(self.tplDeleteBtn)
        tplBox = QtWidgets.QGroupBox("模板管理")
        v = QtWidgets.QVBoxLayout()
        v.addLayout(tplRow1)
        v.addLayout(tplRow2)
        tplBox.setLayout(v)
        form.addRow(tplBox)

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

        # 水印类型选择
        useGroup = QtWidgets.QGroupBox("水印类型")
        useLay = QtWidgets.QHBoxLayout()
        useLay.addWidget(self.useTextCheck)
        useLay.addWidget(self.useImageCheck)
        useLay.addStretch(1)
        useGroup.setLayout(useLay)
        form.addRow(useGroup)

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
        self.imageList.filesChanged.connect(self._on_list_selection_changed)
        self.preview.manualPosChanged.connect(lambda _x, _y: self._on_manual_pos_changed())
        self.imgWmOpacitySlider.valueChanged.connect(lambda v: (self.imgWmOpacityLabel.setText(f"透明度: {v}%"), self._refresh_preview()))
        self.imgWmBrowseBtn.clicked.connect(self._browse_img_wm)
        # 文本水印：任何变更都刷新
        self.wmTextEdit.textChanged.connect(self._refresh_preview)
        self.wmFontCombo.currentFontChanged.connect(lambda _f: self._refresh_preview())
        self.wmFontSizeSpin.valueChanged.connect(lambda _v: self._refresh_preview())
        self.wmBoldCheck.toggled.connect(lambda _b: self._refresh_preview())
        self.wmItalicCheck.toggled.connect(lambda _b: self._refresh_preview())
        self.wmShadowCheck.toggled.connect(lambda _b: self._refresh_preview())
        self.wmOutlineCheck.toggled.connect(lambda _b: self._refresh_preview())
        self.wmOpacitySlider.valueChanged.connect(lambda _v: self._refresh_preview())
        self.wmColorBtn.clicked.connect(lambda: (self._choose_wm_color(), self._refresh_preview()))
        # 图片水印：路径/缩放/透明度变更都刷新
        self.imgWmPathEdit.textChanged.connect(self._refresh_preview)
        self.imgWmScaleByPercent.toggled.connect(lambda _b: self._refresh_preview())
        self.imgWmScaleBySize.toggled.connect(lambda _b: self._refresh_preview())
        self.imgWmPercentSpin.valueChanged.connect(lambda _v: self._refresh_preview())
        self.imgWmWidthSpin.valueChanged.connect(lambda _v: self._refresh_preview())
        self.imgWmHeightSpin.valueChanged.connect(lambda _v: self._refresh_preview())
        # 类型选择联动
        self.useTextCheck.toggled.connect(lambda _b: self._refresh_preview())
        self.useImageCheck.toggled.connect(lambda _b: self._refresh_preview())
        # 模板事件
        self.tplSaveBtn.clicked.connect(self._save_template_clicked)
        self.tplLoadBtn.clicked.connect(self._load_template_clicked)
        self.tplDeleteBtn.clicked.connect(self._delete_template_clicked)
        self._reload_template_list()
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
            wm_use_text=self.useTextCheck.isChecked(),
            wm_use_image=self.useImageCheck.isChecked(),
            text_manual_enabled=self.preview.is_text_manual(),
            image_manual_enabled=self.preview.is_image_manual(),
            text_manual_pos_norm=self.preview.get_text_norm(),
            image_manual_pos_norm=self.preview.get_image_norm(),
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
        # 文本水印遵循九宫格，重置其手动定位；图片水印保持原有状态
        if hasattr(self.preview, 'reset_text_manual'):
            self.preview.reset_text_manual()
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
            wm_use_text=self.useTextCheck.isChecked(),
            wm_use_image=self.useImageCheck.isChecked(),
            text_manual_enabled=self.preview.is_text_manual(),
            image_manual_enabled=self.preview.is_image_manual(),
            text_manual_pos_norm=self.preview.get_text_norm(),
            image_manual_pos_norm=self.preview.get_image_norm(),
        )
        self.preview.apply_settings(settings)

    # ===== 模板管理逻辑 =====
    def _collect_template_dict(self) -> dict:
        # 收集与水印相关的全部设置（不含输入列表与输出目录）
        fmt = self.formatCombo.currentText().upper()
        resize_mode, resize_value = self._collect_resize()
        img_wm_path = self.imgWmPathEdit.text().strip()
        if self.imgWmScaleByPercent.isChecked():
            img_wm_scale = ("percent", int(self.imgWmPercentSpin.value()), None, None)
        else:
            img_wm_scale = ("size", None, int(self.imgWmWidthSpin.value()), int(self.imgWmHeightSpin.value()))

        data = {
            "output_format": fmt,
            "jpeg_quality": int(self.jpegQualitySlider.value()) if fmt == "JPEG" else None,
            "naming_rule": (
                "prefix", self.prefixEdit.text()
            ) if self.namingPrefixRadio.isChecked() else (
                ("suffix", self.suffixEdit.text()) if self.namingSuffixRadio.isChecked() else ("keep", "")
            ),
            "resize_mode": resize_mode,
            "resize_value": resize_value,
            "wm_text": self.wmTextEdit.text(),
            "wm_font_family": self.wmFontCombo.currentFont().family(),
            "wm_font_size": int(self.wmFontSizeSpin.value()),
            "wm_bold": self.wmBoldCheck.isChecked(),
            "wm_italic": self.wmItalicCheck.isChecked(),
            "wm_color_rgba": (self._wmColor.red(), self._wmColor.green(), self._wmColor.blue(), self._wmColor.alpha()),
            "wm_shadow": self.wmShadowCheck.isChecked(),
            "wm_outline": self.wmOutlineCheck.isChecked(),
            "img_wm_path": img_wm_path,
            "img_wm_scale": img_wm_scale,
            "img_wm_opacity": int(self.imgWmOpacitySlider.value()),
            "position_mode": "manual" if self.preview.is_manual() else "preset",
            "preset_position": getattr(self, "_presetKey", "bottom-right"),
            "manual_pos_norm": self.preview.get_manual_norm(),
            "rotation_deg": float(self.rotationSpin.value()),
            "wm_use_text": self.useTextCheck.isChecked(),
            "wm_use_image": self.useImageCheck.isChecked(),
            "text_manual_enabled": self.preview.is_text_manual(),
            "image_manual_enabled": self.preview.is_image_manual(),
            "text_manual_pos_norm": self.preview.get_text_norm(),
            "image_manual_pos_norm": self.preview.get_image_norm(),
        }
        return data

    def _apply_template_dict(self, data: dict) -> None:
        # 安全读取字段
        def g(key, default=None):
            return data.get(key, default)

        fmt = g("output_format", "PNG")
        idx = self.formatCombo.findText(fmt)
        if idx >= 0:
            self.formatCombo.setCurrentIndex(idx)
        if fmt == "JPEG" and g("jpeg_quality") is not None:
            self.jpegQualitySlider.setValue(int(g("jpeg_quality", 90)))

        naming = g("naming_rule", ("keep", ""))
        if naming and isinstance(naming, (list, tuple)):
            rule, val = naming
            if rule == "prefix":
                self.namingPrefixRadio.setChecked(True)
                self.prefixEdit.setText(str(val))
            elif rule == "suffix":
                self.namingSuffixRadio.setChecked(True)
                self.suffixEdit.setText(str(val))
            else:
                self.namingKeepRadio.setChecked(True)

        rm = g("resize_mode", "none")
        if rm == "width":
            self.resizeByWidthRadio.setChecked(True)
            self.widthSpin.setValue(int(g("resize_value", self.widthSpin.value()) or self.widthSpin.value()))
        elif rm == "height":
            self.resizeByHeightRadio.setChecked(True)
            self.heightSpin.setValue(int(g("resize_value", self.heightSpin.value()) or self.heightSpin.value()))
        elif rm == "percent":
            self.resizeByPercentRadio.setChecked(True)
            self.percentSpin.setValue(int(g("resize_value", self.percentSpin.value()) or self.percentSpin.value()))
        else:
            self.resizeNoneRadio.setChecked(True)

        self.wmTextEdit.setText(str(g("wm_text", "")))
        # 字体
        fam = g("wm_font_family", self.wmFontCombo.currentFont().family())
        fidx = self.wmFontCombo.findText(fam)
        if fidx >= 0:
            self.wmFontCombo.setCurrentIndex(fidx)
        self.wmFontSizeSpin.setValue(int(g("wm_font_size", self.wmFontSizeSpin.value())))
        self.wmBoldCheck.setChecked(bool(g("wm_bold", self.wmBoldCheck.isChecked())))
        self.wmItalicCheck.setChecked(bool(g("wm_italic", self.wmItalicCheck.isChecked())))
        rgba = g("wm_color_rgba", (255, 255, 255, 128))
        if isinstance(rgba, (list, tuple)) and len(rgba) == 4:
            self._wmColor = QtGui.QColor(int(rgba[0]), int(rgba[1]), int(rgba[2]), int(rgba[3]))
            self._update_wm_color_preview()
            self.wmOpacitySlider.setValue(int(round(self._wmColor.alpha() / 255 * 100)))
        self.wmShadowCheck.setChecked(bool(g("wm_shadow", False)))
        self.wmOutlineCheck.setChecked(bool(g("wm_outline", False)))

        self.imgWmPathEdit.setText(str(g("img_wm_path", "")))
        scale = g("img_wm_scale", ("percent", 30, None, None))
        if isinstance(scale, (list, tuple)) and scale:
            mode = scale[0]
            if mode == "percent":
                self.imgWmScaleByPercent.setChecked(True)
                self.imgWmPercentSpin.setValue(int(scale[1] or self.imgWmPercentSpin.value()))
            else:
                self.imgWmScaleBySize.setChecked(True)
                self.imgWmWidthSpin.setValue(int(scale[2] or self.imgWmWidthSpin.value()))
                self.imgWmHeightSpin.setValue(int(scale[3] or self.imgWmHeightSpin.value()))
        self.imgWmOpacitySlider.setValue(int(g("img_wm_opacity", self.imgWmOpacitySlider.value())))

        self.useTextCheck.setChecked(bool(g("wm_use_text", True)))
        self.useImageCheck.setChecked(bool(g("wm_use_image", True)))

        # 位置 & 旋转
        self._presetKey = str(g("preset_position", getattr(self, "_presetKey", "bottom-right")))
        for b in getattr(self, "_posBtns", []):
            b.setChecked(b.text() == self._presetKey)
        self.rotationSpin.setValue(int(g("rotation_deg", 0)))

        # 手动定位（全局与分层）
        pos_mode = g("position_mode", "preset")
        self.preview.set_manual(pos_mode == "manual")
        if pos_mode == "manual":
            self.preview._manualNorm = tuple(g("manual_pos_norm", self.preview.get_manual_norm()))  # type: ignore
        self.preview._textManual = bool(g("text_manual_enabled", self.preview.is_text_manual()))  # type: ignore
        self.preview._imageManual = bool(g("image_manual_enabled", self.preview.is_image_manual()))  # type: ignore
        self.preview._textNorm = tuple(g("text_manual_pos_norm", self.preview.get_text_norm()))  # type: ignore
        self.preview._imageNorm = tuple(g("image_manual_pos_norm", self.preview.get_image_norm()))  # type: ignore

        self._refresh_preview()

    def _tpl_path(self, name: str) -> str:
        safe = "".join(c for c in name if c not in "\\/:*?\"<>|").strip()
        return os.path.join(self._tpl_dir, f"{safe}.json")

    def _reload_template_list(self) -> None:
        self.tplListCombo.clear()
        try:
            files = [f[:-5] for f in os.listdir(self._tpl_dir) if f.endswith('.json') and f != 'last.json']
            files.sort()
            self.tplListCombo.addItems(files)
        except Exception:
            pass

    def _save_template_clicked(self) -> None:
        name = self.tplNameEdit.text().strip()
        if not name:
            QtWidgets.QMessageBox.warning(self, "提示", "请输入模板名称")
            return
        data = self._collect_template_dict()
        path = self._tpl_path(name)
        try:
            import json
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self._reload_template_list()
            QtWidgets.QMessageBox.information(self, "提示", "模板已保存")
        except Exception as e:
            QtWidgets.QMessageBox.critical(self, "错误", f"保存失败: {e}")

    def _load_template_clicked(self) -> None:
        name = self.tplListCombo.currentText().strip()
        if not name:
            return
        path = self._tpl_path(name)
        try:
            import json
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._apply_template_dict(data)
        except Exception as e:
            QtWidgets.QMessageBox.critical(self, "错误", f"载入失败: {e}")

    def _delete_template_clicked(self) -> None:
        name = self.tplListCombo.currentText().strip()
        if not name:
            return
        path = self._tpl_path(name)
        try:
            if os.path.isfile(path):
                os.remove(path)
            self._reload_template_list()
        except Exception as e:
            QtWidgets.QMessageBox.critical(self, "错误", f"删除失败: {e}")

    def closeEvent(self, event: QtGui.QCloseEvent) -> None:
        # 自动保存最后一次设置
        try:
            data = self._collect_template_dict()
            import json
            with open(self._last_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
        super().closeEvent(event)


class WatermarkApp:
    def __init__(self, argv: List[str]) -> None:
        self._qt_app = QtWidgets.QApplication(argv)
        self._qt_app.setApplicationName("水印批处理工具")
        self._win = MainWindow()
        # 启动时尝试加载上次设置
        try:
            last = self._win._last_file
            if os.path.isfile(last):
                import json
                with open(last, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self._win._apply_template_dict(data)
        except Exception:
            pass

    def run(self) -> int:
        self._win.show()
        return self._qt_app.exec_()


