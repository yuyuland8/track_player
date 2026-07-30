-- 唱片跑道 · Supabase 数据库初始化
-- 在 Supabase SQL Editor 中执行此文件

-- 1. 跑道会话（每一条分享链接对应一个 session）
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  host_member_id UUID,
  track_id TEXT DEFAULT 'runaway-baby',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 会话成员（加入跑道的每个人）
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT true,
  is_on_track BOOLEAN DEFAULT true,
  device_token TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 击掌事件
CREATE TABLE IF NOT EXISTS high_five_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_members_session ON members(session_id);
CREATE INDEX IF NOT EXISTS idx_members_device ON members(device_token);
CREATE INDEX IF NOT EXISTS idx_high_fives_session ON high_five_events(session_id);

-- 4. 开启 Realtime（Supabase 需要在 Publication 中开启对应表）
-- 在 Supabase Dashboard → Database → Publications → supabase_realtime 中勾选 members 和 high_five_events

-- 5. RLS 策略（可选，Demo 级别可跳过，应用层做隔离）
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE high_five_events ENABLE ROW LEVEL SECURITY;

-- 允许所有已认证用户读取（Demo 简化）
-- CREATE POLICY "allow_all_select" ON members FOR SELECT USING (true);
-- CREATE POLICY "allow_all_insert" ON members FOR INSERT WITH CHECK (true);
-- CREATE POLICY "allow_all_update" ON members FOR UPDATE USING (true);
