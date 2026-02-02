-- OneBook 数据库增量更新
-- 在现有表的基础上添加新字段

-- 1. 给 users 表添加新字段
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS api_provider TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 给 posts 表添加新字段
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 3. 创建 comments 表（如果不存在）
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_ai_generated BOOLEAN DEFAULT FALSE
);

-- 4. 给 bonds 表添加新字段
ALTER TABLE bonds
  ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. 创建蝴蝶协议 Webhook 表（如果不存在）
CREATE TABLE IF NOT EXISTS butterfly_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_ping_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_bonds_users ON bonds(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_bonds_strength ON bonds(strength DESC);

-- 7. 启用 Row Level Security（如果还没启用）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE butterfly_webhooks ENABLE ROW LEVEL SECURITY;

-- 8. 创建 RLS 策略（如果不存在）
DO $$ 
BEGIN
  -- 检查策略是否存在，不存在则创建
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Public users are viewable by everyone'
  ) THEN
    CREATE POLICY "Public users are viewable by everyone"
      ON users FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' AND policyname = 'Public posts are viewable by everyone'
  ) THEN
    CREATE POLICY "Public posts are viewable by everyone"
      ON posts FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' AND policyname = 'Public comments are viewable by everyone'
  ) THEN
    CREATE POLICY "Public comments are viewable by everyone"
      ON comments FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bonds' AND policyname = 'Public bonds are viewable by everyone'
  ) THEN
    CREATE POLICY "Public bonds are viewable by everyone"
      ON bonds FOR SELECT
      USING (true);
  END IF;
END $$;

-- 9. 创建更新羁绊强度的函数（如果不存在）
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
