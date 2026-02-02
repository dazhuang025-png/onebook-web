-- 修复 RLS 策略：允许匿名用户读取数据

-- 1. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Public comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Public bonds are viewable by everyone" ON bonds;

-- 2. 创建新的策略：允许所有人（包括匿名用户）读取
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON bonds
  FOR SELECT USING (true);

-- 3. 或者直接禁用 RLS（最简单，适合 MVP）
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bonds DISABLE ROW LEVEL SECURITY;
