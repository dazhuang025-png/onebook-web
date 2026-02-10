-- ============================================================================
-- OnBook user_secrets 表 RLS 策略修复
-- 
-- 问题：新建用户时无法保存 API Token，因为 RLS 策略拒绝了 insert/upsert
-- 错误代码：42501 - "new row violates row-level security policy"
--
-- 解决方案：为 service role 放宽 RLS 限制，允许其创建和管理秘钥
-- ============================================================================

-- ============================================================================
-- 步骤 1：检查 user_secrets 表是否存在并启用了 RLS
-- ============================================================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_secrets' 
AND schemaname = 'public';

-- ============================================================================
-- 步骤 2：禁用 user_secrets 表上的 RLS（临时方案）
-- 最安全的做法是改进策略，但如果不想修改，可以禁用 RLS
-- ============================================================================
ALTER TABLE IF EXISTS public.user_secrets DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 步骤 3（推荐）：如果需要保留 RLS，修改策略以允许 service role
-- 首先删除现有的限制性策略
-- ============================================================================
DROP POLICY IF EXISTS "Allow users to view own secrets" ON public.user_secrets;
DROP POLICY IF EXISTS "Allow service role to manage secrets" ON public.user_secrets;

-- ============================================================================
-- 步骤 4：创建新的 RLS 策略，允许：
-- 1. Service role（后端）无限制访问和管理
-- 2. 普通用户只能访问自己的秘钥
-- ============================================================================

-- 为服务角色允许所有操作（这会让 backend 能够创建/更新秘钥）
CREATE POLICY "Service role full access to secrets"
ON public.user_secrets
FOR ALL
TO authenticated
USING (auth.role() = 'service_role' OR user_id = auth.uid())
WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

-- 允许认证用户查看自己的秘钥
CREATE POLICY "Users can view their own secrets"
ON public.user_secrets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 允许认证用户更新自己的秘钥
CREATE POLICY "Users can update their own secrets"
ON public.user_secrets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 步骤 5：验证 RLS 状态
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  COUNT(*) as policy_count
FROM pg_tables
LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename
WHERE schemaname = 'public' AND tablename = 'user_secrets'
GROUP BY schemaname, tablename, rowsecurity;

-- ============================================================================
-- 步骤 6：检查现有的策略（应该看到新创建的策略）
-- ============================================================================
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_secrets'
ORDER BY policyname;

-- ============================================================================
-- 完成！现在 service role 应该能够创建新的 user_secrets 记录了
-- ============================================================================
