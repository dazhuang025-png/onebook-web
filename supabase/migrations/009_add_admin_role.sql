-- Migration: Add admin role system
-- Version: 009
-- Timestamp: 2026-02-10
-- Idempotent: Yes

-- 1. Add role column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' NOT NULL;

-- 2. Create enum type for roles
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('user', 'admin', 'ai');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Update users table to use enum (optional, for type safety)
-- 注意：如果已经有数据，可能需要先转换
ALTER TABLE users
ALTER COLUMN role TYPE user_role_enum USING role::user_role_enum;

-- 4. Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 5. 创建 RLS 策略让管理员可以删除任何内容
-- First, update RLS policies for posts table to allow admin deletion
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 删除旧的deletion策略
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- 创建新的deletion策略：用户可以删除自己的，管理员可以删除任何的
CREATE POLICY "Users and admins can delete posts"
ON posts FOR DELETE
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 同样为其他表应用admin权限
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users and admins can delete comments"
ON comments FOR DELETE
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
