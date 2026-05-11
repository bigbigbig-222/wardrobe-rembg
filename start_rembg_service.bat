@echo off
REM 启动REMBG后端服务的批处理脚本

echo.
echo ======================================
echo REMBG后端服务启动脚本
echo ======================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未检测到Python。请先安装Python 3.8及以上版本
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python已找到，正在检查依赖...
echo.

REM 检查并安装依赖
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)

echo 激活虚拟环境并安装依赖...
call venv\Scripts\activate.bat

echo 安装Python包...
pip install -r requirements.txt

if errorlevel 1 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo.
echo ======================================
echo 正在启动REMBG服务...
echo ======================================
echo 服务地址: http://127.0.0.1:5000
echo 按 Ctrl+C 停止服务
echo.

REM 启动Flask应用
python rembg_service.py

pause
