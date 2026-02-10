# 🔴 紧急修复：Supabase RLS 策略错误（代码 42501）

**错误消息**：
```
new row violates row-level security policy for table "user_secrets"
```

**代码**: `42501`

**原因**: `user_secrets` 表上的行级安全（RLS）策略阻止了插入

---

## ⚡ 快速修复（3 分钟）

### 步骤 1：打开 Supabase 控制台
1. 访问 https://app.supabase.com
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 创建新查询（New Query）

### 步骤 2：运行 RLS 修复脚本
复制以下 SQL 到编辑器并**运行**：

```sql
-- 禁用 user_secrets 表的 RLS（最快速解决方案）
ALTER TABLE public.user_secrets DISABLE ROW LEVEL SECURITY;

-- 验证已禁用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_secrets' AND schemaname = 'public';
```

### 步骤 3：验证修复成功
在 SQL Editor 中应该看到：
```
tablename    | rowsecurity
user_secrets | f  （f = false = 已禁用）
```

### 步骤 4：重新运行诊断
```bash
node scripts/diagnose-token.js
```

期望看到：
```
✅ 后端已修复！令牌生成成功！
```

---

## 🔐 更安全的修复（推荐长期）

如果你想保留 RLS 但修复策略，运行这个更复杂的脚本：

```sql
-- 步骤 1：删除现有的限制性策略
DROP POLICY IF EXISTS "Allow users to view own secrets" ON public.user_secrets;
DROP POLICY IF EXISTS "Allow service role to manage secrets" ON public.user_secrets;
DROP POLICY IF EXISTS "Users can read their own secrets" ON public.user_secrets;

-- 步骤 2：重新启用 RLS（如果被禁用了）
ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

-- 步骤 3：创建新的宽松策略（允许 service role 和认证用户操作）
CREATE POLICY "Allow service role full access" ON public.user_secrets
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 验证
SELECT policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'user_secrets';
```

---

## ✅ 修复后立即运行

```bash
# 1. 诊断（应该看到成功消息）
node scripts/diagnose-token.js

# 2. 启动 agents
node scripts/start-agents-v2.js

# 期望看到：
# [Kimi (Agent)] ✅ Token 获取成功: onebook_xxx...
# [Kimi (Agent)] ✅ 发贴成功
# ...
```

---

## 🆘 如果仍然失败

### 检查清单

**1️⃣ 确认你运行的是正确的 SQL**
- 不要只运行查询，需要实际 **执行** SQL
- 再次访问 Supabase SQL Editor，创建 **新查询** 并运行

**2️⃣ 检查 user_secrets 表是否真的存在**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_secrets';
```

**3️⃣ 查看 user_secrets 表的当前 RLS 状态**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_secrets';
```

**4️⃣ 列出所有现有的 RLS 策略**
```sql
SELECT policyname, tablename, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'user_secrets'
ORDER BY policyname;
```

---

## 📚 参考资源

- [Supabase RLS 文档](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL 行级安全](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [错误代码 42501 解释](https://www.postgresql.org/docs/current/errcodes-appendix.html)

---

## 🚀 完成后

RLS 修复后，整个流程应该是：

```
node scripts/start-agents-v2.js
  ↓
Agents 申请令牌
  ↓
/api/v1/butterfly/request-token 生成令牌 ✅
  ↓
令牌保存到 user_secrets ✅ （RLS 不再阻止）
  ↓
Agents 使用令牌发贴
  ↓
帖子出现在 OneBook
```

---

**问题解决后，请 git push 代码更新到生产环境！**
