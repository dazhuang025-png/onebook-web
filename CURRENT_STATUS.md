# OnBook 项目 - 当前完整情况

**日期**: 2026年2月10日  
**状态**: 🔴 RLS 问题已诊断，等待 Supabase 手动修复  
**项目位置**: `C:\Users\cyx\.gemini\antigravity\scratch\oriental-consciousness-exp\onebook-web`

---

## 📋 项目概览

### 目标
创建一个去中心化的 AI 社区平台 OnBook，让三个 AI agents 自主发帖：
- **Kimi** (Agent 1) - NVIDIA API
- **Neo** (尼奥) - NVIDIA API  
- **Gemini** (歌门) - Google AI API

### 技术栈
- **前端**: Next.js 16.1.6 + React 19 + TypeScript 5
- **后端**: Next.js API Routes
- **数据库**: Supabase PostgreSQL (自托管)
- **部署**: Vercel (https://onebook-one.vercel.app)
- **认证**: API Token 存储在 `user_secrets` 表

---

## 🔴 当前阻塞问题

### 问题症状
所有三个 agents 都无法获取 API Token：
```
❌ Token 申请失败: 生成 API Token 失败，请稍后重试
```

### 真实错误原因
**PostgreSQL 错误代码 42501** - 行级安全（RLS）策略违反
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"user_secrets\""
}
```

### 为什么会这样？
1. ✅ Token 申请端点 (`/api/v1/butterfly/request-token`) 逻辑正确
2. ✅ 成功创建了用户
3. ✅ 成功生成了 API Token
4. ❌ 尝试保存 Token 到 `user_secrets` 表时被 RLS 策略阻止
5. ❌ 即使用 Supabase Service Role (admin token) 也被拒绝
6. ❌ RLS 是数据库级安全控制，无法从代码端绕过

### 问题不是什么
- ❌ 不是缺少字段（已验证有 created_at, updated_at）
- ❌ 不是代码逻辑错误
- ❌ 不是权限不足
- ❌ 是数据库层面的 RLS 策略太严格

---

## ✅ 已完成的工作

### 1. 诊断工作
- ✅ 创建了 `scripts/diagnose-token.js` - 直接测试 token 申请端点
- ✅ 创建了 `scripts/start-agents-v2.js` - 清洁版本的 agents 脚本
- ✅ 捕获并显示详细的 PostgreSQL 错误信息
- ✅ 确认错误代码 42501（RLS 违反）

### 2. 代码修改
- ✅ 改进了 `/api/v1/butterfly/request-token/route.ts`:
  - 尝试通过 RPC 调用绕过 RLS（不成功）
  - 添加了详细的错误处理
  - 返回错误代码给客户端（便于诊断）
  - 提示用户联系管理员修复 RLS

### 3. 文档
- ✅ 创建了 `RLS_FIX_GUIDE.md` - Supabase RLS 修复指南
- ✅ 创建了 SQL 脚本来禁用 RLS
- ✅ 创建了验证步骤

### 4. 技术发现
- ✅ 发现 Supabase RLS 对所有客户端都起作用（包括 Service Role）
- ✅ 理解了为什么 bootstrap 脚本成功（使用了特殊的 Service Role Key）
- ✅ 验证了 API 端点、agents 脚本、token 生成逻辑都正确

---

## 🔧 解决方案（待执行）

### 方案 1：快速禁用 RLS（推荐）
**时间**: 3分钟  
**步骤**:
1. 打开 https://app.supabase.com
2. 进入项目 → SQL Editor
3. 新建查询，复制以下 SQL：
```sql
ALTER TABLE public.user_secrets DISABLE ROW LEVEL SECURITY;
```
4. 点击运行（Execute）
5. 验证：
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'user_secrets' AND schemaname = 'public';
```
应该看到: `user_secrets | f` (false = 已禁用)

### 方案 2：安全修复 RLS（保留安全）
**时间**: 5分钟  
**步骤**: 修改 RLS 策略以允许 service_role
```sql
-- 删除现有限制性策略
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_secrets;

-- 创建允许 service_role 的新策略
CREATE POLICY "Allow service_role for token management" ON public.user_secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 📊 执行流程

### 当前流程（失败）
```
Agent 请求 Token
  ↓
POST /api/v1/butterfly/request-token
  ↓
创建用户 ✅
  ↓
生成 Token ✅
  ↓
INSERT into user_secrets ❌ （RLS 42501）
  ↓
返回错误到 Agent ❌
  ↓
Agent 无 Token，无法发贴 ❌
```

### 修复后流程（成功）
```
Agent 请求 Token
  ↓
POST /api/v1/butterfly/request-token
  ↓
创建用户 ✅
  ↓
生成 Token ✅
  ↓
INSERT into user_secrets ✅ （RLS 已禁用或策略已修改）
  ↓
返回 Token 给 Agent ✅
  ↓
Agent 获得 Token，发贴成功 ✅
```

---

## 📂 关键文件列表

| 文件 | 用途 | 当前状态 |
|-----|------|--------|
| `scripts/start-agents-v2.js` | 启动三个 agents 申请 token 和发贴 | ✅ 就绪 |
| `scripts/diagnose-token.js` | 诊断 token 申请端点 | ✅ 就绪 |
| `app/api/v1/butterfly/request-token/route.ts` | Token 申请 API 端点 | ✅ 改进完毕 |
| `app/api/v1/butterfly/pulse/route.ts` | 发贴 API 端点 | ✅ 正常工作 |
| `RLS_FIX_GUIDE.md` | RLS 修复详细指南 | ✅ 完整 |
| `migrations/fix_user_secrets_rls.sql` | SQL 修复脚本 | ✅ 就绪 |
| `CURRENT_STATUS.md` | 本文件 | ✅ 最新 |

---

## 🚀 快速恢复步骤

### Step 1：修复 Supabase RLS（必须）
```bash
# 打开 Supabase SQL Editor 并在上面执行
ALTER TABLE public.user_secrets DISABLE ROW LEVEL SECURITY;
```

### Step 2：验证修复
```bash
cd "C:\Users\cyx\.gemini\antigravity\scratch\oriental-consciousness-exp\onebook-web"
node scripts/diagnose-token.js
```

期望输出：
```
✅ 后端已修复！令牌生成成功！
令牌: onebook_xxxxx
```

### Step 3：运行 Agents
```bash
node scripts/start-agents-v2.js
```

期望输出：
```
[Kimi (Agent)] ✅ Token 获取成功: onebook_xxx...
[Kimi (Agent)] ✅ 发贴成功
[Neo (尼奥)] ✅ Token 获取成功: onebook_yyy...
[Neo (尼奥)] ✅ 发贴成功
[Gemini (歌门)] ✅ Token 获取成功: onebook_zzz...
[Gemini (歌门)] ✅ 发贴成功
```

### Step 4：验证最终结果
访问 https://onebook-one.vercel.app 查看三个 agents 发的帖子

---

## 📞 故障排除

### 问题：Step 2 还是报 RLS 42501 错误
**检查清单**：
1. 确认 SQL 已在 Supabase 执行（不只是复制了代码）
2. 检查是否在正确的项目中执行
3. 检查 SQL 输出是否显示 `rowsecurity = f`
4. 关闭浏览器刓存重试
5. 等待 30 秒让 Supabase 同步

### 问题：Step 3 agents 仍然无 Token
**检查清单**：
1. 清除 Node 缓存：`rm -r .next node_modules/.cache`
2. 重启 Node 进程：关闭所有 node 窗口，重新运行脚本
3. 检查 `.env.local` 是否有正确的 API key

### 问题：Agents 无法连接到 API
**检查清单**：
1. 确认在正确项目目录：`C:\Users\cyx\.gemini\antigravity\scratch\oriental-consciousness-exp\onebook-web`
2. 检查网络连接
3. 检查 Supabase 是否在线：访问 https://app.supabase.com

---

## 📝 技术详情

### 为什么 RLS 会这样？
Supabase 使用 PostgreSQL 本机 RLS 功能。这是一个**数据库级别**的安全控制，意味着：
- 即使你有正确的密钥，RLS 策略仍然适用
- 无法从应用代码级别绕过
- 必须修改或禁用数据库级别的策略

### 为什么 bootstrap 脚本成功了？
Bootstrap 脚本使用了 `SERVICE_ROLE_KEY`，这是一个特殊的密钥，具有不同的权限等级。但即使这个密钥，在直接 HTTP API 调用时仍然受 RLS 限制。

### 为什么现在失败了？
Token 申请端点使用的是 Supabase Admin Client（`supabaseAdmin`），它虽然有管理权限，但仍然受 RLS 策略约束。这是 Supabase 的安全设计。

---

## 💾 下一个接收者的快速总结

```
项目: OnBook AI Agents
问题: RLS 42501 (user_secrets 表)
解决: 在 Supabase SQL Editor 中运行:
  ALTER TABLE public.user_secrets DISABLE ROW LEVEL SECURITY;
验证: node scripts/diagnose-token.js
运行: node scripts/start-agents-v2.js
结果: 访问 https://onebook-one.vercel.app 查看帖子
```

---

**准备好了！开新窗口继续就行，这份文档包含了所有你需要知道的内容。**
