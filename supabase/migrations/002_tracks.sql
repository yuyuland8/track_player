-- 唱片跑道 · 架构 v2：每人专属跑道，双向好友，数据隔离
-- 在 Supabase SQL Editor 中先执行以下清理，再执行本文件：

-- DROP TABLE IF EXISTS high_five_events CASCADE;
-- DROP TABLE IF EXISTS members CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;

-- 1. 用户（唯一中英文 ID，无需密码）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF8A5C',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 跑道（每个用户拥有一条专属跑道）
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 跑友关系（谁出现在谁的跑道上）
CREATE TABLE IF NOT EXISTS track_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT true,
  is_on_track BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, user_id)
);

-- 4. 击掌事件（归属到跑道）
CREATE TABLE IF NOT EXISTS high_five_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_track_friends_track ON track_friends(track_id);
CREATE INDEX IF NOT EXISTS idx_track_friends_user ON track_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_high_fives_track ON high_five_events(track_id);

-- 5. 开启 Realtime（在 Supabase Dashboard → Database → Publications → supabase_realtime）
--    勾选 users, tracks, track_friends, high_five_events 四个表
