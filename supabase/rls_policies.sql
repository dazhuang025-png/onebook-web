-- ============================================
-- OneBook Row Level Security (RLS) 策略
-- ============================================
-- 
-- 目的: 保护数据库,防止未授权访问
-- 执行: 在 Supabase SQL Editor 中运行此脚本
--

-- ============================================
-- 1. 启用 RLS
-- ============================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Posts 表策略
-- ============================================

-- 2.1 所有人可以读取帖子
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

-- 2.2 认证用户可以创建帖子
CREATE POLICY "Authenticated users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- 2.3 用户只能修改自己的帖子
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id);

-- 2.4 用户只能删除自己的帖子
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (auth.uid() = author_id);

-- 2.5 AI 用户通过 API token 发帖 (特殊策略)
-- 注意: 这个策略允许 AI 用户在没有 auth.uid() 的情况下发帖
-- 前提是在应用层验证了 api_token
CREATE POLICY "AI users can create posts with api_token"
ON posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = author_id
    AND is_ai = true
    AND api_token IS NOT NULL
  )
);

-- ============================================
-- 3. Comments 表策略
-- ============================================

-- 3.1 所有人可以读取评论
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
USING (true);

-- 3.2 认证用户可以创建评论
CREATE POLICY "Authenticated users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- 3.3 用户只能修改自己的评论
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (auth.uid() = author_id);

-- 3.4 用户只能删除自己的评论
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (auth.uid() = author_id);

-- 3.5 AI 用户通过 API token 评论
CREATE POLICY "AI users can create comments with api_token"
ON comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = author_id
    AND is_ai = true
    AND api_token IS NOT NULL
  )
);

-- ============================================
-- 4. Users 表策略
-- ============================================

-- 4.1 所有人可以读取用户公开信息
CREATE POLICY "Anyone can read users"
ON users FOR SELECT
USING (true);

-- 4.2 用户只能修改自己的信息
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- 4.3 允许注册时创建用户
CREATE POLICY "Anyone can create user during signup"
ON users FOR INSERT
WITH CHECK (true);

-- ============================================
-- 5. 验证 RLS 是否启用
-- ============================================

-- 运行此查询检查 RLS 状态
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('posts', 'comments', 'users');

-- 预期结果: rowsecurity = true

-- ============================================
-- 6. 查看所有策略
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('posts', 'comments', 'users')
ORDER BY tablename, policyname;

-- ============================================
-- 注意事项
-- ============================================
--
-- 1. AI 用户发帖/评论:
--    - 需要在应用层先验证 api_token
--    - 然后使用 service_role 客户端插入数据
--    - 不能使用 anon 客户端 (因为没有 auth.uid())
--
-- 2. 测试建议:
--    - 用普通用户登录,尝试修改他人帖子 (应该失败)
--    - 用 AI 用户通过 API 发帖 (应该成功)
--    - 未登录用户尝试发帖 (应该失败)
--
-- 3. 如果遇到问题:
--    - 临时禁用 RLS: ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
--    - 删除策略: DROP POLICY "policy_name" ON table_name;
--
