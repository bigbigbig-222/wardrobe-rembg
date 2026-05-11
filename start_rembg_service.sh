#!/bin/bash

# 启动REMBG后端服务的Bash脚本（macOS/Linux）

echo ""
echo "======================================"
echo "REMBG后端服务启动脚本"
echo "======================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未检测到Python3。请先安装Python 3.8及以上版本"
    echo "macOS: brew install python3"
    echo "Ubuntu: sudo apt-get install python3 python3-venv"
    exit 1
fi

echo "Python已找到: $(python3 --version)"
echo ""

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "安装Python依赖..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败"
    exit 1
fi

echo ""
echo "======================================"
echo "正在启动REMBG服务..."
echo "======================================"
echo "服务地址: http://127.0.0.1:5000"
echo "按 Ctrl+C 停止服务"
echo ""

# 启动Flask应用
python rembg_service.py
