# iOS/Android部署完全指南

## 🎯 三种部署方案对比

| 方案 | iOS | Android | Web | 难度 | 成本 | 推荐 |
|------|-----|---------|-----|------|------|------|
| **本地 + 局域网** | ✅* | ✅* | ✅ | 简 | 免费 | 开发测试 |
| **Railway云部署** | ✅ | ✅ | ✅ | 简 | 免费† | ✅ **推荐** |
| **其他云平台** | ✅ | ✅ | ✅ | 中 | 付费 | 备选 |

*需要在同一WiFi网络
†Railroad免费层$5/月额度

---

## 🚀 快速部署（3步）

### 第1步：创建并上传GitHub仓库

```bash
# 初始化Git（如果还未做）
cd D:\Self-developedProject\Wardrobe
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库并推送
git remote add origin https://github.com/你的用户名/wardrobe-rembg.git
git push -u origin main
```

### 第2步：部署到Railway

1. 访问 https://railway.app/dashboard
2. 选择"New Project" → "Deploy from GitHub"  
3. 连接GitHub账号并选择 `wardrobe-rembg` 仓库
4. Railway自动构建和部署（约2-3分钟）

### 第3步：配置前端

获得Railway分配的域名后（形如 `https://xxx-production.up.railway.app`），在你的网页中添加：

```html
<!-- 在 </head> 之前添加 -->
<script>
  window.REMBG_API_URL = 'https://你的Railway域名/remove_background';
</script>
```

**完成！🎉** 现在可以在任何设备上使用。

---

## 📱 iOS上使用

### 添加到主屏（App样式）

1. Safari中打开你的网页
2. 点击分享 → "添加到主屏"
3. 取名字 → 添加
4. 现在是主屏上的"App"了

### 特性

- 🔄 自动更新（每次刷新获取最新代码）
- 📴 离线可用（部分功能）
- 🔒 安全访问（HTTPS）

---

## 🔧 本地开发 + 局域网测试

如果你想先在本地测试，然后在iPhone上测试：

### 1. 启动本地REMBG服务

Windows：
```bash
start_rembg_service.bat
```

macOS/Linux：
```bash
./start_rembg_service.sh
```

### 2. 找到你电脑的IP地址

**Windows**：
```bash
ipconfig
# 找 "IPv4 Address"，形如 192.168.1.100
```

**macOS/Linux**：
```bash
ifconfig
# 找 inet 地址
```

### 3. 配置前端API地址

打开 `rembg_config.html` 并设置：
```
http://192.168.1.100:5000/remove_background
```

### 4. 在iPhone上访问

1. 确保iPhone和电脑在同一WiFi
2. 在Safari输入你的电脑IP地址，例如：
   ```
   http://192.168.1.100:8000
   ```
   （根据实际情况调整）

---

## 📂 部署文件说明

### 核心文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `rembg_service.py` | Flask后端 | AI抠图服务 |
| `Procfile` | Railway配置 | 告诉Railway如何启动应用 |
| `runtime.txt` | Python版本 | 指定Python 3.11.5 |
| `requirements.txt` | 依赖列表 | Flask, REMBG, Gunicorn等 |

### 配置文件

| 文件 | 用途 |
|------|------|
| `.gitignore` | 防止上传不必要的文件 |
| `rembg_config.html` | API配置面板 |
| 部署指南MD文件 | 文档 |

---

## 🔌 API地址配置方式

### 方式1：HTML中配置（推荐）

```html
<script>
  window.REMBG_API_URL = 'https://你的Railway域名/remove_background';
</script>
```

### 方式2：使用配置面板

1. 打开 `rembg_config.html`
2. 输入API地址
3. 点击保存
4. 配置自动保存到浏览器本地存储

### 方式3：控制台设置

在浏览器开发者工具中：
```javascript
API_CONFIG.setRemoveBgApiUrl('https://你的Railway域名/remove_background');
```

### 方式4：LocalStorage直接设置

```javascript
localStorage.setItem('removeBgApiUrl', 'https://你的Railway域名/remove_background');
```

---

## ✅ 部署检查清单

### GitHub上传
- [ ] 项目已上传到GitHub
- [ ] `.gitignore` 已配置
- [ ] 所有必要文件都已提交

### Railway部署
- [ ] Railway账号已创建
- [ ] GitHub连接已授权
- [ ] 项目已成功部署
- [ ] 获得了Railway域名

### 前端配置
- [ ] `window.REMBG_API_URL` 已在HTML中设置
- [ ] API地址格式正确（必须是https）
- [ ] 已测试过/health端点

### iOS测试
- [ ] 在Safari中可以访问
- [ ] AI抠图按钮可以使用
- [ ] 已添加到主屏
- [ ] 离线模式可以访问主页

---

## 🐛 常见问题

### Q: "连接被拒绝" / "无法连接到服务"

**A:** 检查
1. Railway服务是否还在运行（查看仪表板）
2. API地址是否正确（必须是https）
3. 是否添加了 `window.REMBG_API_URL` 配置

### Q: iOS上显示"无法加载"

**A:**
1. 检查WiFi连接
2. 确认网页地址正确
3. 尝试在Safari中私密浏览
4. 清除Safari缓存：设置 → Safari → 清除历史记录和网站数据

### Q: 部署失败

**A:** 查看Railway日志
1. Railway仪表板 → 项目 → Deployments
2. 点击失败的部署 → Logs
3. 查看具体错误信息

常见原因：
- requirements.txt缺少gunicorn
- Procfile格式错误
- Python版本不兼容

### Q: 处理很慢

**A:** 这是正常的，因为：
1. 首次下载REMBG模型需要时间
2. Railway免费层资源有限
3. 大尺寸图片处理更慢

**优化方法：**
- 缩小图片尺寸
- 升级Railway付费计划
- 使用其他性能更好的平台

---

## 🌍 其他部署平台

如果Railway不适合，可以试试：

### Render（推荐备选）
- https://render.com
- 免费层更好
- 部署流程相同

### DigitalOcean
- https://www.digitalocean.com
- $5/月起
- 性能更稳定

### Vercel（用于前端）
- https://vercel.com
- 免费部署静态网站
- 需要单独部署后端

---

## 📖 更多文档

- `RAILWAY_DEPLOY_GUIDE.md` - Railway详细部署指南
- `REMBG_QUICK_START.md` - 快速开始指南
- `REMBG_GUIDE.md` - 完整技术文档

---

## 🎉 成功标志

部署成功后应该能看到：

1. **本地测试（Windows/Mac）**
   ```
   ✓ 网页可以访问
   ✓ 点击"AI抠图"有反应
   ✓ 抠图完成
   ```

2. **iPhone测试**
   ```
   ✓ Safari可以打开网页
   ✓ 点击"AI抠图"有反应
   ✓ 抠图完成
   ✓ 可添加到主屏
   ```

3. **Railway测试**
   ```
   ✓ /health端点返回成功
   ✓ 日志显示正常运行
   ✓ 域名可以公开访问
   ```

---

## 💪 下一步

部署完成后，你可以：

1. **优化功能** - 添加更多编辑工具
2. **美化界面** - 改进UI/UX
3. **功能扩展** - 添加更多AI功能
4. **性能优化** - 加快处理速度
5. **推广应用** - 与朋友分享

---

## 🤝 遇到问题？

如果遇到无法解决的问题：

1. 检查Railway日志了解具体错误
2. 验证所有文件是否正确
3. 尝试重新部署
4. 查看对应平台的官方文档

**祝部署顺利！** 🚀
