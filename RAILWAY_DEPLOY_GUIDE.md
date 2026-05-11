# Railway部署指南 - iOS / Android / 网页全平台支持

## 📱 支持平台

部署后可在以下平台使用：
- ✅ iPhone / iPad (iOS)
- ✅ Android手机
- ✅ Windows / Mac / Linux (Web)

---

## 🚀 快速部署（5分钟）

### 第一步：准备GitHub账号

1. 访问 https://github.com/signup（如果没有账号）
2. 登录你的GitHub账号

### 第二步：上传项目到GitHub

1. 在GitHub上创建新仓库：https://github.com/new
   - Repository name: `wardrobe-rembg` (或其他名字)
   - Description: "衣柜管理系统 - AI抠图后端"
   - Public (公开)
   
2. 上传你的Wardrobe项目代码到这个仓库

### 第三步：部署到Railway

1. 访问 https://railway.app
2. 点击"Start New Project" → "Deploy from GitHub"
3. 选择你的 `wardrobe-rembg` 仓库
4. Railway会自动检测Python项目并部署

### 第四步：获取云端URL

1. 部署完成后，Railway会分配一个域名，形如：
   ```
   https://xxx-production.up.railway.app
   ```

2. 这就是你的API地址！记下来

### 第五步：配置前端

在你的网页中添加这行代码（在加载app.js之前）：

```html
<script>
  // 配置云端REMBG API地址
  window.REMBG_API_URL = 'https://xxx-production.up.railway.app/remove_background';
</script>
```

替换 `xxx-production` 为实际的Railway域名。

---

## 📲 iOS使用方法

### 方法1：添加到主屏（推荐）

1. 在Safari中打开你的网页应用
2. 点击分享 → "添加到主屏"
3. 取个名字，点击"添加"
4. 现在可以像app一样使用了

### 方法2：直接在Safari中使用

- 打开Safari
- 在地址栏输入网页地址
- 照常使用

---

## 🔐 环境配置（可选）

### 设置环境变量

如果需要在Railway中设置环境变量：

1. 在Railway仪表板中打开你的项目
2. 点击"Variables"
3. 添加变量：
   ```
   ENVIRONMENT=production
   PORT=8000
   ```

---

## 📊 部署后检查

### 验证服务是否运行

访问这个URL（用你的Railway域名替换）：
```
https://xxx-production.up.railway.app/health
```

应该返回：
```json
{
  "status": "ok",
  "service": "rembg_service",
  "message": "REMBG后端服务运行正常",
  "environment": "production"
}
```

---

## 🎯 更新前端API地址

### 临时测试（本地）

在浏览器开发者控制台运行：
```javascript
API_CONFIG.setRemoveBgApiUrl('http://127.0.0.1:5000/remove_background');
```

### 永久配置（生产）

方法A：在HTML中配置（推荐）
```html
<script>
  window.REMBG_API_URL = 'https://你的Railway域名/remove_background';
</script>
```

方法B：在JavaScript中配置
```javascript
API_CONFIG.setRemoveBgApiUrl('https://你的Railway域名/remove_background');
```

方法C：使用localStorage
```javascript
localStorage.setItem('removeBgApiUrl', 'https://你的Railway域名/remove_background');
```

---

## 🐛 故障排除

### 问题1：部署失败

**检查清单**
- Procfile文件是否存在且格式正确
- runtime.txt中是否指定了Python版本
- requirements.txt中是否包含了gunicorn
- GitHub上的代码是否完整

**查看日志**
- 在Railway仪表板中点击"Logs"查看详细信息

### 问题2：iOS上显示"无法连接"

**解决**
- 确认已添加了 `window.REMBG_API_URL` 配置
- 检查URL是否正确（https不是http）
- 验证Railway服务是否还在运行

### 问题3：处理速度很慢

**原因**
- 首次运行REMBG需要下载模型（~50MB）
- Railway免费层有资源限制

**解决**
- 等待第一次完成后会快很多
- 升级到Railway付费计划（可选）

### 问题4：Railway服务经常停止

**原因**
- 免费层有限制（每月可用时间有限）

**解决**
- 升级到Railway付费计划
- 或使用其他平台（Render、Heroku等）

---

## 💰 成本说明

### Railway免费层
- ✅ $5美元/月免费额度
- ✅ 足够小型项目使用
- ⚠️ 不活跃的项目会被暂停

### 升级到付费
- 仅按使用量计费
- 大多数用户每月不超过$10

---

## 🔄 更新部署

每次更新代码：

1. 推送到GitHub
   ```bash
   git add .
   git commit -m "更新描述"
   git push
   ```

2. Railway会自动重新部署（1-2分钟）

---

## 🛠️ 其他部署平台

如果Railway不适合，也可以试试：

### Render
- https://render.com
- 免费层更慷慨
- 部署流程类似

### Heroku
- https://www.heroku.com
- 需要信用卡验证
- 免费层已取消

### DigitalOcean App Platform
- https://www.digitalocean.com
- $5/月起
- 性能更好

---

## 📞 获得帮助

如果遇到问题：

1. 查看Railway日志了解具体错误
2. 检查requirements.txt是否完整
3. 确认Procfile格式正确
4. 查看本指南的故障排除部分

---

## ✅ 检查清单

部署前确认：
- [ ] 代码已上传到GitHub
- [ ] Procfile已创建且包含：`web: gunicorn -w 4 -b 0.0.0.0:$PORT rembg_service:app`
- [ ] runtime.txt已创建且包含：`python-3.11.5`
- [ ] requirements.txt已更新包含gunicorn
- [ ] Railway项目已创建并成功部署
- [ ] 获得了Railway分配的域名
- [ ] 前端已配置了REMBG_API_URL
- [ ] 测试了/health端点
- [ ] 在iOS上测试过应用

完成以上步骤后，你的电子衣柜就可以在任何设备上使用AI抠图功能了！🎉
