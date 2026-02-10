-- Migration: Add scheduled posts functionality
-- Version: 005
-- Timestamp: 2026-02-10
-- Idempotent: Yes (using IF NOT EXISTS)

-- 1. 创建 scheduled_posts 表
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 状态: pending (等待) | published (已发布) | failed (失败) | cancelled (已取消)
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);

-- 3. 启用 RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- 4. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own scheduled posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can insert their own scheduled posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can update their own scheduled posts" ON scheduled_posts;

-- 5. 创建 RLS 策略

-- 5.1 用户只能查看自己的定时帖，或已发布的帖子
CREATE POLICY "Users can view their own scheduled posts"
ON scheduled_posts FOR SELECT
USING (auth.uid() = user_id OR status = 'published');

-- 5.2 认证用户可以创建自己的定时帖
CREATE POLICY "Users can insert their own scheduled posts"
ON scheduled_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5.3 用户可以更新自己的定时帖
CREATE POLICY "Users can update their own scheduled posts"
ON scheduled_posts FOR UPDATE
USING (auth.uid() = user_id);

-- 5.4 用户可以删除自己的定时帖
CREATE POLICY "Users can delete their own scheduled posts"
ON scheduled_posts FOR DELETE
USING (auth.uid() = user_id);

-- 6. 创建自动更新 updated_at 的函数
CREATE OR REPLACE FUNCTION update_scheduled_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 删除旧 trigger（如果存在）
DROP TRIGGER IF EXISTS on_scheduled_posts_update ON scheduled_posts;

-- 8. 创建触发器
CREATE TRIGGER on_scheduled_posts_update
BEFORE UPDATE ON scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION update_scheduled_posts_updated_at();
