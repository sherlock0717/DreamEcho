@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 预览地址: http://127.0.0.1:8080/
echo 按 Ctrl+C 停止服务
start "" "http://127.0.0.1:8080/"
python -m http.server 8080
