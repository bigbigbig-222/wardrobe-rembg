# remove.bg 免费版集成指南

## 一、获取 remove.bg API Key

### 步骤 1：注册账号
1. 打开 https://remove.bg/api
2. 点击 **Sign up**，免费注册
3. 验证邮箱

### 步骤 2：获取 API Key
1. 登录 remove.bg 账号
2. 进入 **Account** → **API** 页面
3. 复制 API Key

## 二、在 Cloudflare 部署代理 Worker

### 步骤 1：创建新 Worker
1. 打开 https://dash.cloudflare.com
2. 点击 **Workers & Pages** → **Create application** → **Create a Worker**
3. 输入名称：`wardrobe-removebg-api`
4. 点击 **Create**

### 步骤 2：添加代码
1. 点击 **Edit Code**
2. 复制 [removebg-api-worker.js](removebg-api-worker.js) 的全部内容
3. 粘贴到 Worker 编辑器
4. 点击 **Save and Deploy**

### 步骤 3：配置 API Key
1. 回到 Worker 详情页面
2. 点击 **Settings** → **Variables and Secrets**
3. 点击 **Add secret**
   - 变量名：`REMOVEBG_API_KEY`
   - 值：粘贴你的 remove.bg API Key
   - 勾选 **Encrypt** 复选框
4. 点击 **Save**

### 步骤 4：获取 Worker URL
1. 回到 Worker 概览页面
2. 复制 Worker URL，格式如：`https://wardrobe-removebg-api.xxxxx.workers.dev`

## 三、前端配置

### 在网页中配置 Worker URL
打开网页，在浏览器开发者工具控制台执行：

```javascript
REMBG_CONFIG.setApiUrl('https://wardrobe-removebg-api.xxxxx.workers.dev');
console.log('已配置:', REMBG_CONFIG.getApiUrl());
```

## 四、使用

1. **上传衣服照片**
2. **点击"AI去除背景"按钮**
3. **等待 3-5 秒**，结果会显示

## 五、免费额度信息

- **每月免费额度**：50 次请求
- **超出限制**：可升级付费计划或月底重置
- **无其他隐藏费用**

## 六、API 文档

### 端点：`POST /`

**请求体**：
```json
{
  "image": "data:image/jpeg;base64,..." 或 "base64 string"
}
```

**成功响应（200）**：
```json
{
  "success": true,
  "image": "data:image/png;base64,..."
}
```

**错误响应（400/500）**：
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 七、常见问题

### Q: 为什么需要 Cloudflare Worker？
A: remove.bg API 不支持浏览器 CORS 请求，需要服务器代理。Worker 免费且零配置。

### Q: 免费额度用完了怎么办？
A: 升级到付费计划或等月底重置。目前免费版够日常使用。

### Q: 速度如何？
A: 3-5 秒（包括网络传输和处理时间），比 Render 方案快很多。

### Q: 隐私安全吗？
A: 你的 API Key 存储在 Cloudflare 环境变量中，不暴露在客户端代码。图片通过 HTTPS 传输。

---

## 八、后续调整

如需更换 API Key 或更新配置：
1. 回到 Cloudflare Dashboard
2. Worker → Settings → Variables and Secrets
3. 修改或删除已有的 Secret
4. 保存（自动生效）
