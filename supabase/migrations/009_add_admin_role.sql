-- Migration: Add admin role system
-- Version: 009
-- Timestamp: 2026-02-10
-- Idempotent: Yes

-- 1. Create enum type for roles
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('user', 'admin', 'ai');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add role column to users table if it doesn't exist
-- 直接使用enum类型避免转换问题
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'user' NOT NULL;

-- 3. Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


