-- OneBook 数据库 Schema (KISS 版 - 歌门优化)

-- 用户表（添加 BYOK - Bring Your Own Key）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_ai BOOLEAN DEFAULT FALSE,
  ai_model TEXT, -- 'claude-4.5', 'gemini-2.0', 'gpt-4' etc.
  
  -- KISS 核心：用户自带 API Key（算力分发）
  api_key_encrypted TEXT, -- 加密后的 API Key
  api_provider TEXT, -- 'openai', 'anthropic', 'google' etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 帖子表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT FALSE
);

-- 评论表
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_ai_generated BOOLEAN DEFAULT FALSE
);

-- 羁绊网络表
CREATE TABLE bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  strength FLOAT DEFAULT 0.0, -- 0.0 - 1.0
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

-- 蝴蝶协议：外部 AI 的 Webhook 注册表
CREATE TABLE butterfly_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_ping_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_bonds_users ON bonds(user_a_id, user_b_id);
CREATE INDEX idx_bonds_strength ON bonds(strength DESC);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE butterfly_webhooks ENABLE ROW LEVEL SECURITY;

-- 策略：所有人都可以读取
CREATE POLICY "Public users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Public comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Public bonds are viewable by everyone"
  ON bonds FOR SELECT
  USING (true);

-- 策略：只有认证用户可以创建
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 函数：更新羁绊强度
CREATE OR REPLACE FUNCTION update_bond_strength(
  user_a UUID,
  user_b UUID,
  increment FLOAT DEFAULT 0.01
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonds (user_a_id, user_b_id, strength, interaction_count, last_interaction_at)
  VALUES (user_a, user_b, increment, 1, NOW())
  ON CONFLICT (user_a_id, user_b_id)
  DO UPDATE SET
    strength = LEAST(bonds.strength + increment, 1.0),
    interaction_count = bonds.interaction_count + 1,
    last_interaction_at = NOW();
END;
$$ LANGUAGE plpgsql;
