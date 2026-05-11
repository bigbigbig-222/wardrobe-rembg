# 🚀 部署到iOS/Android - 快速指南

## 为什么需要部署？

目前的REMBG服务只能在你的电脑本地运行，**iPhone/Android无法访问**。

部署到云端后，任何设备都能使用AI抠图功能 ✨

---

## 🎯 三步快速部署

### 1️⃣ 上传项目到GitHub

```bash
# 在项目目录执行
cd D:\Self-developedProject\Wardrobe

git init
git add .
git commit -m "Initial commit"

# 设置远程仓库（替换你的用户名）
git remote add origin https://github.com/你的用户名/wardrobe-rembg.git
git branch -M main
git push -u origin main
```

### 2️⃣ 部署到Railway

1. 访问 https://railway.app → 用GitHub登录
2. 点击"Start New Project"
3. 选择"Deploy from GitHub"
4. 选择 `wardrobe-rembg` 仓库
5. 等待部署完成（2-3分钟）✓

### 3️⃣ 配置前端

获得Railway域名后（形如 `https://xxx-production.up.railway.app`），在你的HTML中添加：

```html
<script>
  window.REMBG_API_URL = 'https://你的Railway域名/remove_background';
</script>
```

**完成！** 现在可以在iPhone上使用了 🎉

---

## 📱 iOS上使用

### 添加到主屏

1. 在Safari中打开你的网页
2. 点击分享 → "添加到主屏"
3. 取个名字 → 添加
4. 现在主屏上有App图标了！

### 特性

- 🔄 自动更新（每次刷新）
- 📴 部分离线可用
- 🔒 HTTPS安全

---

## 📚 详细文档

部署过程中遇到问题？查看详细指南：

| 文档 | 内容 |
|------|------|
| **DEPLOYMENT_SUMMARY.md** | 📋 部署总结（推荐首先查看） |
| **iOS_ANDROID_DEPLOY_GUIDE.md** | 📱 完整iOS/Android指南 |
| **RAILWAY_DEPLOY_GUIDE.md** | 🚂 Railway详细步骤 |

---

## ✅ 检查清单

- [ ] GitHub账号已创建
- [ ] 项目已上传到GitHub
- [ ] Railway账号已创建
- [ ] 项目已成功部署到Railway
- [ ] 获得了Railway域名
- [ ] 前端已配置API地址
- [ ] 在Web浏览器测试过
- [ ] 在iPhone Safari测试过
- [ ] 已添加到iPhone主屏

---

## 🆘 遇到问题？

| 问题 | 解决方案 |
|------|---------|
| 部署失败 | 查看Railway日志 → 检查Procfile/requirements.txt |
| 连接被拒绝 | 确认API地址是https → 检查Railway服务状态 |
| iOS无法访问 | 检查WiFi → 尝试清除Safari缓存 |
| 处理很慢 | 第一次需要下载模型（正常）→ 升级Railway计划 |

---

## 💡 其他方案

不想用Railway？也可以试试：
- **Render** - 免费层更好
- **DigitalOcean** - $5/月，性能更稳定
- **本地局域网** - 仅在WiFi范围内使用

---

## 🎉 成功标志

✅ Railway显示"Deployed"
✅ 网页能正常打开  
✅ 点击"AI抠图"能处理图片
✅ iPhone可以访问
✅ 主屏App能打开

**恭喜！现在你可以在任何设备上使用电子衣柜了！** 🎊

---

需要帮助？📖 查看详细指南文档。
