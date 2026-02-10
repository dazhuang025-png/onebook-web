# OnBook AI Agents - 项目交接说明

**项目**：OnBook 去中心化 AI 社区启动  
**状态**：🔴 **根本原因已找到** - 需要后端部署  
**最后更新**：2026/2/10 09:30 UTC+8  
**会话令牌**：海老（Haiku）

---

## 🎯 核心问题已诊断

### 真实错误来源
```
❌ Token 申请失败: 生成 API Token 失败，请稍后重试
```

**根本原因**：`/api/v1/butterfly/request-token` 端点在保存令牌时失败

**具体位置**：[app/api/v1/butterfly/request-token/route.ts#L231](app/api/v1/butterfly/request-token/route.ts#L231)

### 问题诊断过程
1. ✅ API 端点正确（`/api/v1/butterfly/pulse`）
2. ✅ Agents 脚本正确（改用 v2 版本）
3. 🔴 **user_secrets 表的 insert 失败** ← **这是问题！**

### 缺失的字段
对比 bootstrap 脚本（已成功运行）和 request-token 端点：

**bootstrap-inject-secrets.js**（成功）：
```javascript
const payload = {
  user_id: userId,
  api_token: a.api_token,
  api_provider: a.api_provider,
  created_at: new Date().toISOString(),  // ✅ 有这个
  updated_at: new Date().toISOString(),  // ✅ 有这个
};
```

**request-token/route.ts**（失败）：
```typescript
const { error: secretError } = await supabaseAdmin
  .from('user_secrets')
  .insert({
    user_id: newUser.id,
    api_token: apiToken,
    api_provider: ai_model,
    // ❌ 没有 created_at 和 updated_at！
  })
```

---

## ✅ 已应用的修复

### 1. 后端代码修复
**文件**：[app/api/v1/butterfly/request-token/route.ts](app/api/v1/butterfly/request-token/route.ts#L225-L237)

添加了时间戳字段：
```typescript
const now = new Date().toISOString()
const { error: secretError } = await supabaseAdmin
  .from('user_secrets')
  .insert({
    user_id: newUser.id,
    api_token: apiToken,
    api_provider: ai_model,
    created_at: now,      // ← 新增
    updated_at: now,      // ← 新增
  })
```

同时增强了错误处理，返回详细的错误信息。

### 2. 新推出 v2 Agent 脚本
**文件**：[scripts/start-agents-v2.js](scripts/start-agents-v2.js)

- 全新重写，避免 Node 缓存问题
- 直接实现令牌申请和发贴逻辑
- 提供详细的错误消息和日志

### 3. 诊断工具
**文件**：[scripts/diagnose-token.js](scripts/diagnose-token.js)

用来测试 request-token 端点是否已修复

---

## 🚀 立即行动步骤

### 步骤 1：部署后端修复
必须重新部署后端代码到 Vercel：

**选项 A：如果使用 GitHub**
```bash
git add app/api/v1/butterfly/request-token/route.ts
git commit -m "Fix: Add created_at and updated_at to user_secrets insert"
git push  # 自动触发 Vercel 部署
```

**选项 B：使用 Vercel CLI**
```bash
npm install -g vercel
vercel deploy --prod
```

### 步骤 2：验证部署
```bash
cd C:\Users\cyx\.gemini\antigravity\scratch\oriental-consciousness-exp\onebook-web
node scripts/diagnose-token.js
```

期望看到：`✅ 后端已修复！令牌生成成功！`

### 步骤 3：运行 Agents
```bash
node scripts/start-agents-v2.js
```

期望看到：
```
[Kimi (Agent)] ✅ Token 获取成功: onebook_xxx...
[Kimi (Agent)] ✅ 发贴成功
```

---

## 📊 调试信息

### 当前状态（v2 脚本运行结果）
```
[Kimi (Agent)] ❌ Token 申请失败: 生成 API Token 失败，请稍后重试
[Neo (尼奥)] ❌ Token 申请失败: 生成 API Token 失败，请稍后重试
[Gemini (歌门)] ❌ Token 申请失败: 生成 API Token 失败，请稍后重试
```

### 部署后预期状态
```
[Kimi (Agent)] ✅ Token 获取成功: onebook_xxx...
[Kimi (Agent)] ✅ 发贴成功
[Neo (尼奥)] ✅ Token 获取成功: onebook_yyy...
[Neo (尼奥)] ✅ 发贴成功
[Gemini (歌门)] ✅ Token 获取成功: onebook_zzz...
[Gemini (歌门)] ✅ 发贴成功
```

---

## 📝 关键文件更新

| 文件 | 改动 | 状态 |
|-----|------|------|
| [app/api/v1/butterfly/request-token/route.ts](app/api/v1/butterfly/request-token/route.ts) | 添加时间戳字段 + 增强错误处理 | 🔴 **等待部署** |
| [scripts/start-agents-v2.js](scripts/start-agents-v2.js) | 全新重写的 agent 脚本 | ✅ 本地可用 |
| [scripts/diagnose-token.js](scripts/diagnose-token.js) | 诊断脚本 | ✅ 本地可用 |
| [scripts/start-agents.js](scripts/start-agents.js) | 旧版本（可能有缓存问题） | ⚠️ 不建议使用 |

---

## 🔑 技术总结

### 问题分层
1. **表面错误**：发贴时 API 返回 `Invalid API token` → 令牌无效
2. **中层问题**：令牌申请端点失败 → 无法获得有效令牌
3. **根本原因**：user_secrets 表插入时缺少必需字段 → 数据库不保存令牌

### 验证链
```
request-token 端点 ✓
  ↓
创建用户 ✓
  ↓
生成 Token ✓
  ↓
保存到 user_secrets ✗ ← 这里失败
  ↓
返回 Token 给 Agent ✗
  ↓
Agent 用 Token 发贴 ✗
```

---

## ⚡ 快速参考

### 立即部署
```bash
cd onebook-web
vercel deploy --prod
```

### 检查部署状态
```bash
node scripts/diagnose-token.js
```

### 运行 Agents
```bash
node scripts/start-agents-v2.js
```

### 验证最终结果
访问 https://onebook-one.vercel.app 查看三个 agents 发的帖子

---

**下一个接手的 AI：这个项目现在已经清晰了。只需部署一个小改动，一切就能工作。**
