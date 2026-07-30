import { supabase } from "./supabase";
import type { Friend } from "../types";

// ---- 类型 ----

export interface UserRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TrackRow {
  id: string;
  user_id: string;
  created_at: string;
}

export interface TrackFriendRow {
  id: string;
  track_id: string;
  user_id: string;
  is_online: boolean;
  is_on_track: boolean;
  joined_at: string;
}

export interface TrackFriendWithUser extends TrackFriendRow {
  user_name: string;
  user_color: string;
}

export interface HighFiveRow {
  id: string;
  track_id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
}

// ---- 用户 ----

export async function getUser(id: string): Promise<UserRow | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("users").select().eq("id", id).maybeSingle();
  return data;
}

export async function createUser(
  id: string,
  name: string,
  color: string,
): Promise<{ user: UserRow; track: TrackRow }> {
  if (!supabase) throw new Error("Supabase 未配置");

  // 1. 创建用户
  const { data: user, error: uErr } = await supabase
    .from("users")
    .insert({ id, name, color })
    .select()
    .single();
  if (uErr || !user) {
    if (uErr?.code === "23505") throw new Error("这个 ID 已被占用，换一个吧～");
    throw new Error(uErr?.message ?? "创建用户失败");
  }

  // 2. 自动创建专属跑道
  const { data: track, error: tErr } = await supabase
    .from("tracks")
    .insert({ user_id: user.id })
    .select()
    .single();
  if (tErr || !track) throw new Error(tErr?.message ?? "创建跑道失败");

  return { user, track };
}

/** 登录 = 检查是否存在，不存在则创建 */
export async function ensureUser(
  id: string,
  name: string,
  color: string,
): Promise<{ user: UserRow; track: TrackRow; isNew: boolean }> {
  const existing = await getUser(id);
  if (existing) {
    const track = await getUserTrack(existing.id);
    if (!track) throw new Error("跑道数据异常");
    return { user: existing, track, isNew: false };
  }
  const { user, track } = await createUser(id, name, color);
  return { user, track, isNew: true };
}

// ---- 跑道 ----

export async function getUserTrack(userId: string): Promise<TrackRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("tracks")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

// ---- 跑友 ----

export async function getTrackFriends(
  trackId: string,
): Promise<TrackFriendWithUser[]> {
  if (!supabase) return [];
  const { data: friends } = await supabase
    .from("track_friends")
    .select()
    .eq("track_id", trackId)
    .order("joined_at", { ascending: true });

  if (!friends || friends.length === 0) return [];

  const userIds = [...new Set(friends.map((f) => f.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("id, name, color")
    .in("id", userIds);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return friends.map((f) => {
    const u = userMap.get(f.user_id);
    return { ...f, user_name: u?.name ?? "?", user_color: u?.color ?? "#ccc" };
  });
}

/** 查找某个用户在指定跑道上的跑友记录 */
export async function getFriendOnTrack(
  trackId: string,
  userId: string,
): Promise<TrackFriendRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("track_friends")
    .select()
    .eq("track_id", trackId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function addFriendToTrack(
  trackId: string,
  friendUserId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("track_friends").insert({
    track_id: trackId,
    user_id: friendUserId,
    is_online: true,
    is_on_track: true,
  });
}

/** 双向加好友：我→TA，TA→我 */
export async function joinFriendBidirectional(
  myUserId: string,
  targetUserId: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase 未配置");

  // 获取双方的跑道
  const [myTrack, targetTrack] = await Promise.all([
    getUserTrack(myUserId),
    getUserTrack(targetUserId),
  ]);

  if (!myTrack) throw new Error("你的跑道不存在");
  if (!targetTrack) throw new Error("对方的跑道不存在");

  // 双向添加（忽略已存在的 UNIQUE 冲突）
  await Promise.allSettled([
    addFriendToTrack(targetTrack.id, myUserId), // 我出现在对方的跑道
    addFriendToTrack(myTrack.id, targetUserId), // 对方出现在我的跑道
  ]);
}

export async function updateFriendStatus(
  trackId: string,
  friendUserId: string,
  updates: { is_online?: boolean; is_on_track?: boolean },
): Promise<void> {
  if (!supabase) return;

  // 找到对应记录
  const { data: friend } = await supabase
    .from("track_friends")
    .select("id")
    .eq("track_id", trackId)
    .eq("user_id", friendUserId)
    .maybeSingle();

  if (friend) {
    await supabase.from("track_friends").update(updates).eq("id", friend.id);
  }
}

// ---- 击掌 ----

export async function recordHighFive(
  trackId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("high_five_events").insert({
    track_id: trackId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
  });
}

// ---- Realtime 订阅 ----

export function subscribeTrackFriends(
  trackId: string,
  onInsert: (f: TrackFriendRow) => void,
  onUpdate: (f: TrackFriendRow) => void,
  onDelete: (f: TrackFriendRow) => void,
) {
  if (!supabase) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`track_friends:${trackId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "track_friends",
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => onInsert(payload.new as TrackFriendRow),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "track_friends",
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => onUpdate(payload.new as TrackFriendRow),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "track_friends",
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => onDelete(payload.old as TrackFriendRow),
    )
    .subscribe();

  return { unsubscribe: () => { supabase?.removeChannel(channel); } };
}

export function subscribeHighFives(
  trackId: string,
  onInsert: (h: HighFiveRow) => void,
) {
  if (!supabase) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`high_fives:${trackId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "high_five_events",
        filter: `track_id=eq.${trackId}`,
      },
      (payload) => onInsert(payload.new as HighFiveRow),
    )
    .subscribe();

  return { unsubscribe: () => { supabase?.removeChannel(channel); } };
}

// ---- 转换函数 ----

export function trackFriendToFriend(
  f: TrackFriendWithUser,
): Friend {
  return {
    id: f.user_id,
    name: f.user_name,
    color: f.user_color,
    relationDays: 1,
    baseMinutes: 0,
    baseLaps: 0,
    baseHighFives: 0,
    isMe: false,
    isGuest: false,
  };
}

// ---- 工具 ----

const COLORS = [
  "#FF8A5C", "#F473B9", "#FFC53D", "#8B7CF6",
  "#2EC4B6", "#5B8DEF", "#FF6B81", "#7BC96F",
];

export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/** 从 URL 读取邀请用户 ID（?s=xxx） */
export function getInviteUserIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("s");
}

/** 清除 URL 中的邀请参数 */
export function clearInviteFromURL(): void {
  if (window.location.search.includes("?s=") || window.location.search.includes("&s=")) {
    window.history.replaceState({}, "", window.location.pathname);
  }
}
