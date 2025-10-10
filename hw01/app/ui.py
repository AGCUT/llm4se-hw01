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


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("水印批处理工具")
        self.resize(1100, 700)

        self.imageList = ImageListWidget()

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

        self.importFilesBtn = QtWidgets.QPushButton("导入图片…")
        self.importFolderBtn = QtWidgets.QPushButton("导入文件夹…")
        self.clearBtn = QtWidgets.QPushButton("清空列表")
        self.exportBtn = QtWidgets.QPushButton("开始导出")

        self._build_layout()
        self._connect_signals()

    def _build_layout(self) -> None:
        splitter = QtWidgets.QSplitter()
        splitter.addWidget(self.imageList)

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
        self._on_format_changed(self.formatCombo.currentText())

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

        return ExportSettings(
            input_paths=input_paths,
            output_dir=output_dir,
            output_format=fmt,
            jpeg_quality=quality,
            naming_rule=naming,
            resize_mode=resize_mode,
            resize_value=resize_value,
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


class WatermarkApp:
    def __init__(self, argv: List[str]) -> None:
        self._qt_app = QtWidgets.QApplication(argv)
        self._qt_app.setApplicationName("水印批处理工具")
        self._win = MainWindow()

    def run(self) -> int:
        self._win.show()
        return self._qt_app.exec_()


