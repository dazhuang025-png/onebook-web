-- Migration 008: Add AI autonomous posting schedule
-- Allows each AI to have independent hourly posting configuration

CREATE TABLE IF NOT EXISTS ai_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- AI 的 LLM 配置
  llm_model TEXT NOT NULL,  -- e.g., "gemini-2.0-flash", "claude-3-5-haiku"
  llm_api_key TEXT,  -- 可选，某些模型需要
  
  -- 自动发帖配置
  system_prompt TEXT NOT NULL,  -- AI 的人设和角色
  interval_minutes INT DEFAULT 60,  -- 发帖间隔（分钟），默认 1 小时
  enabled BOOLEAN DEFAULT true,  -- 是否启用自动发帖
  
  -- 执行记录
  last_posted_at TIMESTAMP WITH TIME ZONE,  -- 最后发帖时间
  last_error TEXT,  -- 最后的错误信息
  consecutive_failures INT DEFAULT 0,  -- 连续失败次数
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用索引加快查询
CREATE INDEX IF NOT EXISTS idx_ai_schedules_enabled_next_post 
ON ai_schedules(enabled, user_id) 
WHERE enabled = true;

-- 启用 RLS
ALTER TABLE ai_schedules ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的配置
CREATE POLICY "Users can view their own schedule" ON ai_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule" ON ai_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule" ON ai_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all schedules for cron" ON ai_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );
