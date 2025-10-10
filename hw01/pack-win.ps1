powershell -NoProfile -ExecutionPolicy Bypass -Command "pyinstaller -F -w -n WatermarkTool --add-data 'app;app' main.py"
Write-Host "打包完成，输出路径: dist/WatermarkTool.exe"


