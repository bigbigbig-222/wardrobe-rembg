# 本地 AI 背景去除指南 - MediaPipe 方案

## 方案概述

**完全免费，无需服务器！** 使用 Google MediaPipe Selfie Segmentation，在浏览器中本地处理图片。

| 特点 | 说明 |
|-----|------|
| **成本** | ✅ 完全免费 |
| **隐私** | ✅ 数据不上传，完全本地处理 |
| **无限制** | ✅ 无请求次数限制 |
| **速度** | ⚠️ 首次加载 10-20 秒，后续 5-15 秒 |
| **效果** | ✅ 保留衣服完整轮廓，去掉背景 |
| **部署** | ✅ 无需配置，自动下载模型 |

---

## 使用步骤

### 第一次使用（首次加载模型）
1. **打开网页** - http://127.0.0.1:5501
2. **上传衣服照片**
3. **点击 "AI去除背景"**
4. **等待 10-20 秒**
   - 首次会下载 MediaPipe 模型（~1-2 MB）
   - 浏览器控制台会显示加载进度
5. **完成！** 得到透明背景的衣服图片

### 后续使用（模型已缓存）
- 模型会被浏览器缓存
- 后续处理只需 5-15 秒
- 无需任何配置

---

## 工作原理

```
图片上传
  ↓
加载 MediaPipe 模型（首次）
  ↓
运行分割算法（找出衣服轮廓）
  ↓
应用透明蒙版（去掉背景）
  ↓
输出透明背景 PNG
```

---

## 适用场景

✅ **适合**
- 衣服在明确背景前
- 轮廓清晰的照片
- 自然光拍摄的照片

⚠️ **可能不理想**
- 复杂背景（如图案背景）
- 衣服与背景颜色相近
- 低质量或模糊照片

---

## 技术细节

### 使用的库
- **MediaPipe Selfie Segmentation** - Google 官方人体分割模型
- CDN 加载：https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation

### 模型大小
- ~1-2 MB（通过浏览器缓存优化）

### 兼容性
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 性能
- 需要至少 4GB RAM
- 建议使用 GPU（显著加速）
- 移动设备可能较慢（10-30 秒）

---

## 常见问题

### Q: 为什么第一次这么慢？
A: 首次需要下载并初始化 MediaPipe 模型（~2 MB），之后会缓存在浏览器。后续使用会快很多。

### Q: 效果和 remove.bg 一样好吗？
A: 接近但略差一点。remove.bg 是专业商业模型（95%+ 准确率），MediaPipe 是开源模型（80-90% 准确率）。但对大多数衣服照片足够了。

### Q: 我可以跳过这个功能吗？
A: 可以。这个功能是可选的，直接上传图片不使用也没问题。

### Q: 在手机上能用吗？
A: 可以，但会比较慢（30 秒-1 分钟）。建议在电脑上使用。

### Q: 数据会发送到哪里？
A: 完全不发送！模型和处理都在你的浏览器中本地运行，所有数据都在本地。

### Q: 处理失败了怎么办？
A: 
1. 刷新页面重试
2. 检查浏览器控制台是否有错误信息
3. 换一张图片试试

---

## 浏览器控制台日志

正常的加载过程会看到：
```
[Segmentation] Loading MediaPipe Selfie Segmentation...
[Segmentation] Model loaded successfully
[Segmentation] Processing image: 1080x1440
[Segmentation] Background removed successfully
```

---

## 后续改进

如果觉得速度慢，可以考虑：

1. **升级到更快的方案**
   - Google Cloud Vision API（1000 次/月免费）
   - 联系我配置

2. **使用离线增强模式**
   - 本地缓存常见图片的处理结果
   - 相似图片快速处理

3. **移到 Render 部署**
   - 更快但需要费用
   - 支持批量处理

---

## 文件结构

```
local-segmentation.js  - MediaPipe 集成代码
app.js                - 前端逻辑（removeImageBackground 等）
index.html            - 脚本引入
```

---

## 相关函数

前端可使用的公开函数：

```javascript
// 单张图片处理
await removeImageBackground(imageDataUrl)
// 返回: data URL 或 null

// 批量处理
await removeMultipleBackgrounds([imageDataUrl1, imageDataUrl2, ...])
// 返回: [{success, image/error}, ...]

// 检查功能是否启用
REMBG_CONFIG.isEnabled()
// 返回: true（本地模式总是启用）
```
