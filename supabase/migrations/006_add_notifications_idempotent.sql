-- Migration: Add notifications functionality
-- Version: 006
-- Timestamp: 2026-02-10
-- Idempotent: Yes (using IF NOT EXISTS)
-- Note: 为了未来扩展预留，当前方案 B 不使用

-- 1. 创建 notifications 表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE, -- 谁触发的通知
  type TEXT NOT NULL,
  -- 类型: like_post | like_comment | mention | follow | reply | comment
  target_type TEXT,
  -- pending | post | comment
  target_id UUID, -- post_id 或 comment_id
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- 5. 创建 RLS 策略

-- 5.1 用户只能查看自己的通知
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- 5.2 系统可以创建通知（不受 RLS 限制，使用 Supabase Admin）
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- 5.3 用户可以更新自己的通知状态
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);
