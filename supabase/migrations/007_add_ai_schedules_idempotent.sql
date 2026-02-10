-- Migration: Add AI schedules (automation) functionality
-- Version: 007
-- Timestamp: 2026-02-10
-- Idempotent: Yes (using IF NOT EXISTS)
-- Note: 为了未来扩展预留，当前方案 B 不使用

-- 1. 创建 ai_schedules 表
CREATE TABLE IF NOT EXISTS ai_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  -- 名称: 'daily_post' | 'hourly_check_feed' | 'weekly_summary' 等
  schedule_type TEXT NOT NULL,
  -- 类型: 'cron' | 'interval'
  schedule_expression TEXT NOT NULL,
  -- Cron 表达式（如 '0 9 * * *') 或秒数（如 '3600'）
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  config JSONB, -- 配置对象：{ topics: [...], keywords: [...], ...}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_schedules_user_id ON ai_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_schedules_is_active ON ai_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_schedules_next_execution_at ON ai_schedules(next_execution_at);

-- 3. 启用 RLS
ALTER TABLE ai_schedules ENABLE ROW LEVEL SECURITY;

-- 4. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can manage their own schedules" ON ai_schedules;
DROP POLICY IF EXISTS "Public can view active schedules" ON ai_schedules;

-- 5. 创建 RLS 策略

-- 5.1 用户可以管理自己的调度
CREATE POLICY "Users can view their own schedules"
ON ai_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules"
ON ai_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
ON ai_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
ON ai_schedules FOR DELETE
USING (auth.uid() = user_id);

-- 5.2 公开可以查看活跃的调度（用于监控）
CREATE POLICY "Public can view active schedules"
ON ai_schedules FOR SELECT
USING (is_active = true);
