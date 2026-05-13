# AI 抠图服务 - Render 部署指南

## 一、在 Render 上部署服务

### 步骤 1：创建 Render 账号
1. 打开 https://render.com
2. 点击 **Sign Up**，用 GitHub 账号登录（推荐）

### 步骤 2：创建 Web Service
1. 进入 Dashboard
2. 点击 **New +** → **Web Service**
3. 选择 **Connect a repository** → 选择 `wardrobe-rembg` 仓库
4. 填写服务信息：
   - **Name**: `wardrobe-rembg-api`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn rembg_api:app`
   - **Plan**: Standard（或 Free，但会自动 sleep）

### 步骤 3：部署
1. 点击 **Create Web Service**
2. 等待部署完成（约 5-10 分钟）
3. 部署完成后会看到 Service URL，例如：
   ```
   https://wardrobe-rembg-api.onrender.com
   ```

---

## 二、前端集成

### 获取 Service URL
部署完成后，从 Render Dashboard 复制 Service URL。

### 在浏览器中配置 API 端点
打开网页，在浏览器开发者工具控制台执行：

```javascript
// 设置 rembg API 端点
localStorage.setItem('rembgApiUrl', 'https://wardrobe-rembg-api.onrender.com');
console.log('已设置 rembg API:', localStorage.getItem('rembgApiUrl'));
```

### 测试抠图功能
1. 上传或选择一张衣服照片
2. 点击"去除背景"按钮
3. 应该会显示处理中，完成后返回透明背景的 PNG

---

## 三、API 文档

### 端点 1: `/health`
**用途**: 健康检查

```bash
GET https://wardrobe-rembg-api.onrender.com/health
```

**响应**:
```json
{
  "status": "ok",
  "service": "rembg-api"
}
```

### 端点 2: `/remove-bg`
**用途**: 去除单张图片背景

**请求**:
```bash
POST https://wardrobe-rembg-api.onrender.com/remove-bg
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...(base64编码的图片)"
}
```

**响应**:
```json
{
  "success": true,
  "image": "data:image/png;base64,...(透明背景PNG)"
}
```

### 端点 3: `/remove-bg-batch`
**用途**: 批量处理图片

**请求**:
```bash
POST https://wardrobe-rembg-api.onrender.com/remove-bg-batch
Content-Type: application/json

{
  "images": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```

**响应**:
```json
{
  "success": true,
  "results": [
    {"success": true, "image": "data:image/png;base64,..."},
    {"success": false, "error": "..."}
  ]
}
```

---

## 四、前端代码集成示例

在 `app.js` 中添加以下函数：

```javascript
const REMBG_CONFIG = {
  getApiUrl() {
    return localStorage.getItem('rembgApiUrl') || '';
  },
  
  setApiUrl(url) {
    if (url) {
      localStorage.setItem('rembgApiUrl', url);
    } else {
      localStorage.removeItem('rembgApiUrl');
    }
  },
  
  isEnabled() {
    return !!this.getApiUrl();
  }
};

// 调用 API 去除背景
async function removeImageBackground(imageData) {
  try {
    if (!REMBG_CONFIG.isEnabled()) {
      showAppMessage('Please configure rembg API URL first');
      return null;
    }

    const response = await fetch(`${REMBG_CONFIG.getApiUrl()}/remove-bg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });

    const result = await response.json();
    if (result.success) {
      return result.image;
    } else {
      showAppMessage(`背景去除失败: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error('Remove BG error:', error);
    showAppMessage(`请求失败: ${error.message}`);
    return null;
  }
}
```

---

## 五、首次部署检查清单

- [ ] Render 账号已创建
- [ ] 仓库已推送到 GitHub
- [ ] render.yaml 文件存在
- [ ] requirements.txt 包含所有依赖
- [ ] Web Service 已部署
- [ ] Service URL 已获取
- [ ] 在浏览器设置了 API URL
- [ ] 测试 `/health` 端点返回 200
- [ ] 测试图片上传和抠图功能

---

## 六、常见问题

### Q: 首次部署很慢？
A: rembg 需要下载预训练模型（~200MB），首次部署可能需要 10-15 分钟。

### Q: Service 报 503 Service Unavailable？
A: Free 计划的 Service 会在 15 分钟无请求后自动 sleep。可升级到 Standard 或更高计划。

### Q: 如何查看实时日志？
A: Render Dashboard → 选择 Service → **Logs** 标签页

### Q: 如何增加 timeout？
A: 如果 rembg 处理超时，可以在 Render 设置中增加 **Health Check Grace Period**。

---

## 七、后续优化

1. **缓存**: 使用 Redis 缓存已处理的图片
2. **队列**: 用 Celery 处理大量图片（异步）
3. **模型优化**: 尝试轻量级抠图模型加速处理
4. **成本控制**: 根据使用量选择合适的 Render 计划
