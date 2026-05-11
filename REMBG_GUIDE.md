# REMBG AI抠图集成指南

## 简介

本项目已集成REMBG库，可以使用AI技术自动移除衣服背景，相比手动标记更加高效准确。

## 安装和启动

### 前置条件

- Python 3.8 或更高版本
- Windows 10/11、macOS 或 Linux

### 安装步骤

#### Windows

1. **下载并安装Python**
   - 访问 https://www.python.org/downloads/
   - 下载Python 3.9或更高版本
   - 安装时勾选"Add Python to PATH"

2. **启动服务**
   - 在Wardrobe项目目录下双击 `start_rembg_service.bat`
   - 首次运行会自动安装依赖（可能需要3-5分钟）
   - 看到"Serving Flask app..."表示服务已启动

#### macOS / Linux

```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux

# 安装依赖
pip install -r requirements.txt

# 启动服务
python rembg_service.py
```

## 使用方法

### 启动服务

1. 运行 `start_rembg_service.bat`（Windows）或执行上述macOS/Linux命令
2. 等待显示"Running on http://127.0.0.1:5000"

### 在应用中使用

1. 打开电子衣柜网页应用
2. 编辑衣服图片时，在工具栏中找到"AI抠图"按钮
3. 点击"AI抠图"按钮
4. 等待处理完成（通常10-30秒，取决于图片大小）
5. 点击"应用到预览"保存编辑结果

## API接口

### POST /remove_background

移除图像背景

**请求**
```json
{
  "image": "base64编码的图像数据",
  "format": "png"  // 可选，png或jpg
}
```

**响应**
```json
{
  "status": "success",
  "image": "base64编码的处理结果",
  "message": "背景移除成功"
}
```

### POST /remove_background_url

通过URL移除背景（需要网络连接）

**请求**
```json
{
  "url": "图像的完整URL"
}
```

### GET /health

健康检查端点

## 故障排除

### 问题1: "连接被拒绝" 或 "无法连接到服务"

**解决**
- 确认已启动REMBG服务
- 检查服务是否运行在http://127.0.0.1:5000
- 检查防火墙是否阻止了5000端口

### 问题2: 依赖安装失败

**解决**
- 确认Python版本 >= 3.8: `python --version`
- 尝试升级pip: `pip install --upgrade pip`
- 清除缓存: `pip install -r requirements.txt --no-cache-dir`

### 问题3: "No module named 'rembg'"

**解决**
- 确认虚拟环境已激活
- 重新运行安装: `pip install -r requirements.txt`

### 问题4: 处理速度很慢

**说明**
- 首次运行REMBG需要下载模型文件（~50MB）
- 处理时间取决于图片大小和CPU性能
- 建议使用GPU加速（需要CUDA支持）

## 性能提示

### 图片优化

- 建议图片分辨率在1000x1000以内以加快处理
- 更高分辨率的图片可能需要30-60秒处理

### GPU加速（可选）

如果有NVIDIA GPU，可以启用CUDA加速：

```bash
# 安装GPU版本（Windows）
pip install onnxruntime-gpu

# 或使用TensorRT（更快）
pip install onnxruntime-gpu tensorrt
```

## 常见问题

### Q: 是否可以离线使用？
**A**: 是的，一旦REMBG后端服务启动，图片处理完全离线进行。

### Q: 支持哪些图片格式？
**A**: 支持PNG、JPG、JPEG、BMP、GIF等所有常见格式。输出为PNG格式（保留透明度）。

### Q: 如何提高抠图精度？
**A**: 
- 确保图片背景与衣服颜色差异大
- 尽量避免过暗或过亮的环境
- 衣服应该尽量占据整个画面

### Q: 可以批量处理吗？
**A**: 目前前端不支持批量处理。可以修改后端API支持批量处理。

## 切换回手动标记模式

如果AI抠图效果不理想，可以点击"智能抠图"按钮切换回手动标记模式：
- 点击"标记前景"标记要保留的区域
- 点击"标记背景"标记要移除的区域
- 点击"执行抠图"执行处理
- 若同时标记前景和背景，会执行2轮refinement以获得更精准效果

## 许可证

REMBG库基于MIT许可证，详见 https://github.com/danielgatis/rembg

## 更新日志

### v1.0 (2024-05-11)
- 集成REMBG库
- 实现Flask后端服务
- 集成到图片编辑器UI
- 支持PNG输出和透明度保留
