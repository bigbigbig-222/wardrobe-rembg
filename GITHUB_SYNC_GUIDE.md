# GitHub 同步部署指南

## 📋 概述

这是一套"本地优先 + 云备份"的数据同步方案：
- 所有数据保存在手机本地 localStorage（主存储）
- 启动时自动从 GitHub 拉取远端备份并与本地合并
- 每次编辑后自动上传更新到 GitHub（5秒防抖）
- 导入导出功能完全保留

## 🔒 安全说明

采用"安全版"架构：
- **前端代码**：完全开源，不存储任何敏感信息
- **GitHub Token**：存储在 Cloudflare Worker 中（私密）
- **通信**：使用 HTTPS + CORS，安全加密

## 🚀 快速部署（Cloudflare Worker 版）

### 第一步：获取 GitHub 认证信息

#### 1.1 创建 GitHub Personal Access Token

1. 登录 GitHub：https://github.com/login
2. 进入设置：右上角头像 > Settings > Developer settings > Personal access tokens > Tokens (classic)
3. 点击 "Generate new token (classic)"
4. 填写：
   - Note: `wardrobe-sync`
   - Expiration: 90 days（或更长）
   - Scopes：勾选 `gist`
5. 点击 "Generate token"
6. **复制 token 并妥善保管**（只显示一次）

#### 1.2 创建 GitHub Gist（数据存储）

1. 进入 https://gist.github.com
2. 点击右上角 "+" 创建新 Gist
3. 填写：
   - File name: `wardrobe-backup.json`
   - File contents: 粘贴以下内容：
   ```json
   {
     "items": [],
     "favoriteLooks": [],
     "brandCatalog": [],
     "brandLogos": {}
   }
   ```
4. 勾选 "Create secret gist"（私密）
5. 点击 "Create public gist" 或 "Create secret gist"
6. 复制 URL 中的 Gist ID：
   - URL 格式：`https://gist.github.com/用户名/Gist-ID`
   - 复制 `Gist-ID` 部分

### 第二步：部署 Cloudflare Worker

1. 注册 Cloudflare：https://dash.cloudflare.com
2. 左侧菜单 > Workers and Pages > Create application
3. 点击 "Create a Worker"
4. 删除默认代码，复制 `github-sync-worker.js` 的全部内容
5. 修改文件顶部的这两行：
   ```javascript
   const GITHUB_TOKEN = 'your_github_personal_access_token_here'; // 替换为你的 Token
   const GIST_ID = 'your_gist_id_here'; // 替换为你的 Gist ID
   ```
   替换为：
   ```javascript
   const GITHUB_TOKEN = 'ghp_xxxxxxxxxxxx'; // 粘贴你的 GitHub Token
   const GIST_ID = 'abc123def456'; // 粘贴你的 Gist ID
   ```
6. 点击右上角 "Save and Deploy"
7. 复制 Worker URL（格式：`https://xxx.workers.dev`）

### 第三步：在网页中启用同步

1. 打开衣柜网页
2. **iOS Safari 中**：在浏览器菜单里找到"设置"或"更多"
3. **Web 版**：按 F12 打开开发者工具 > Console
4. 运行以下命令配置：
   ```javascript
   GITHUB_SYNC_CONFIG.setWorkerUrl('https://你的-worker-url.workers.dev');
   ```
   （替换为你复制的 Worker URL）
5. **或者**通过 iPhone 长按衣柜图标，修改快捷方式，在 URL 后添加参数临时设置

## 🧪 测试同步

### 测试上传
1. 在网页中添加/编辑一件衣服
2. 5秒后自动上传
3. 打开 Gist：https://gist.github.com/你的用户名/Gist-ID
4. 刷新，应该能看到 JSON 中出现了新衣物

### 测试下载
1. 编辑 Gist JSON，手动添加一件衣服
2. 关闭网页，再次打开
3. 应该看到 Gist 中的衣服被合并到本地

### 测试冲突合并
1. 在两个不同的设备上同时编辑同一件衣服
2. 按照"更新时间较晚"的版本合并

## ⚙️ 数据冲突规则

当同一件衣物在本地和远端都有更新时：
- **保留更新时间较晚的版本**
- 远端独有的衣物会被添加到本地
- 本地删除的衣物会在下次启动时重新出现（如果远端还有）

## 🛡️ 数据备份

虽然已有 GitHub 备份，建议定期手动导出：
1. 打开网页
2. 导入/导出 > 导出数据 > JSON
3. 保存到安全的位置

## 🔄 重置同步

如果同步出现问题，可以：

### 方案1：清除远端数据（保留本地）
1. 编辑 Gist：https://gist.github.com/你的用户名/Gist-ID
2. 清空 JSON，改为：
   ```json
   {
     "items": [],
     "favoriteLooks": [],
     "brandCatalog": [],
     "brandLogos": {}
   }
   ```
3. 关闭网页，重新打开（会重新上传本地数据）

### 方案2：禁用同步
```javascript
// 在浏览器 Console 运行
GITHUB_SYNC_CONFIG.setWorkerUrl('');
```

### 方案3：完全重置
1. 清除网页数据：设置 > 清除 Cookies 和网站数据
2. 重新打开网页（会同步 Gist 的数据）

## 📱 在 iPhone 上设置

### 使用 Web App 快捷方式
1. 打开网页
2. Safari 分享 > 添加到主屏幕
3. 创建后，长按图标 > 编辑快捷方式
4. 在 URL 中可以添加查询参数

### 通过 Safari Console 设置
1. 打开网页
2. Safari 菜单 > 高级 > Web Inspector（需在设置中启用）
3. 运行配置命令

## 🚨 故障排除

### "Push failed" / "Pull failed"
- 检查 Token 是否过期：https://github.com/settings/tokens
- 检查 Gist ID 是否正确
- 检查 Worker URL 是否正确

### "Merge error"
- 检查浏览器 Console 是否有错误提示
- 尝试禁用同步，重新启用

### 数据丢失
- 查看 Gist 中是否还有备份
- 查看浏览器本地存储：F12 > Application > LocalStorage
- 从导出的 JSON 文件手动恢复

## 🔐 安全最佳实践

1. **Token 保护**：定期更新 Token，需要时可随时撤销
2. **Gist 隐私**：确保 Gist 是 Private 的
3. **浏览器隐私**：避免在公共设备上启用同步
4. **定期审计**：检查 GitHub Token 使用日志

## 📊 监测同步

在浏览器 Console 可以看到同步日志：
```
[GitHub Sync] Merge completed
[GitHub Sync] Push succeeded
```

错误日志：
```
[GitHub Sync] Pull error: ...
[GitHub Sync] Upload failed: ...
```

## 💡 进阶配置

### 修改防抖延迟
在 `app.js` 中修改（单位：毫秒）：
```javascript
gitHubSyncTimer = setTimeout(() => {
  // ...
}, 5000); // 改为你想要的延迟
```

### 自定义冲突合并策略
修改 `mergeRemoteData()` 函数逻辑

### 改用其他云存储
参考 `github-sync-worker.js` 修改 API 调用即可

## 📞 支持

如有问题，检查以下位置：
1. Browser Console：F12 > Console 查看错误日志
2. Network Tab：F12 > Network 查看 API 调用
3. Gist 内容：检查是否正确保存

---

**注意**：部署前请备份你的数据。首次启用同步后会自动拉取远端数据并合并。
