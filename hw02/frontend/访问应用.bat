@echo off
echo 正在打开AI旅行规划师...
echo.
echo 尝试多个地址...
echo.

start http://127.0.0.1:5173
timeout /t 1 /nobreak >nul

start http://192.168.3.6:5173
timeout /t 1 /nobreak >nul

echo.
echo 已打开浏览器，请查看哪个地址能用
echo.
pause

