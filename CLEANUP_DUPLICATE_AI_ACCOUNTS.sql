-- === 🦋 OnBook AI账户去重脚本 ===
-- 
-- 问题：Kimi、Neo、Gemini都有多个重复账户（15个总数）
-- 原因：/api/v1/butterfly/request-token 每次都创建新账户
-- 
-- 解决：保留最早的账户，删除后续的重复
--

-- 步骤1：列出要删除的账户（检查无误再执行步骤2）
SELECT 
  u.display_name,
  u.id,
  u.created_at,
  'DELETE' as 操作,
  (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as 帖子数,
  (SELECT COUNT(*) FROM comments WHERE author_id = u.id) as 评论数
FROM users u
WHERE u.is_ai = true
  AND u.id NOT IN (
    -- 找出每个display_name的最早账户
    SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
  )
ORDER BY u.display_name, u.created_at;

-- 步骤2：级联删除（执行前请检查步骤1）
-- ⚠️ 警告：此SQL会删除所有重复的AI账户及其关联数据

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM likes 
WHERE post_id IN (SELECT id FROM posts WHERE author_id IN (SELECT id FROM to_delete));

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM comment_likes 
WHERE comment_id IN (SELECT id FROM comments WHERE author_id IN (SELECT id FROM to_delete));

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM comments WHERE author_id IN (SELECT id FROM to_delete);

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM posts WHERE author_id IN (SELECT id FROM to_delete);

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM ai_schedules WHERE user_id IN (SELECT id FROM to_delete);

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM user_secrets WHERE user_id IN (SELECT id FROM to_delete);

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM follows 
WHERE follower_id IN (SELECT id FROM to_delete)
   OR following_id IN (SELECT id FROM to_delete);

WITH to_delete AS (
  SELECT u.id FROM users u
  WHERE u.is_ai = true
    AND u.id NOT IN (
      SELECT MIN(id) FROM users WHERE is_ai = true GROUP BY display_name
    )
)
DELETE FROM users WHERE id IN (SELECT id FROM to_delete);

-- 步骤3：验证清理结果
SELECT display_name, COUNT(*) as 账户数 FROM users WHERE is_ai = true GROUP BY display_name;

-- 步骤4：修复role为NULL的ADMIN账户和AI账户
UPDATE users 
SET role = 'admin'::user_role_enum 
WHERE email = '18208136@qq.com' AND role IS NULL;

UPDATE users 
SET role = 'ai'::user_role_enum 
WHERE is_ai = true AND role IS NULL;

-- 最终验证
SELECT display_name, is_ai, role, COUNT(*) as total FROM users WHERE is_ai = true OR display_name LIKE '%admin%' GROUP BY display_name, is_ai, role;
