import { supabase } from "./supabase";
import type { Friend } from "../types";

// ---- 类型 ----

export interface SessionRow {
  id: string;
  share_code: string;
  host_member_id: string | null;
  track_id: string;
  created_at: string;
}

export interface MemberRow {
  id: string;
  session_id: string;
  name: string;
  color: string;
  is_host: boolean;
  is_online: boolean;
  is_on_track: boolean;
  device_token: string;
  joined_at: string;
}

export interface HighFiveRow {
  id: string;
  session_id: string;
  from_member_id: string;
  to_member_id: string;
  created_at: string;
}

/** 将 DB 的 MemberRow 转为 UI 用的 Friend */
export function memberToFriend(m: MemberRow): Friend {
  return {
    id: m.id,
    name: m.name,
    color: m.color,
    relationDays: 1,
    baseMinutes: 0,
    baseLaps: 0,
    baseHighFives: 0,
    isMe: false,
    isGuest: false,
    _memberRow: m as unknown as Record<string, unknown>,
  };
}

// ---- Session 操作 ----

/** 创建新跑道会话，返回 share_code */
export async function createSession(
  hostName: string,
  hostColor: string,
  deviceToken: string,
  trackId = "runaway-baby",
): Promise<{ session: SessionRow; hostMember: MemberRow }> {
  if (!supabase) throw new Error("Supabase 未配置");

  const shareCode = generateShareCode();

  // 1. 创建 session
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({ share_code: shareCode, track_id: trackId })
    .select()
    .single();
  if (sErr || !session) throw new Error(sErr?.message ?? "创建会话失败");

  // 2. 创建 host member
  const { data: host, error: mErr } = await supabase
    .from("members")
    .insert({
      session_id: session.id,
      name: hostName,
      color: hostColor,
      is_host: true,
      is_online: true,
      is_on_track: true,
      device_token: deviceToken,
    })
    .select()
    .single();
  if (mErr || !host) throw new Error(mErr?.message ?? "创建成员失败");

  // 3. 回写 host_member_id
  await supabase
    .from("sessions")
    .update({ host_member_id: host.id })
    .eq("id", session.id);

  return { session: { ...session, host_member_id: host.id }, hostMember: host };
}

/** 通过 share_code 加入已有会话 */
export async function joinSession(
  shareCode: string,
  name: string,
  color: string,
  deviceToken: string,
): Promise<{ session: SessionRow; member: MemberRow }> {
  if (!supabase) throw new Error("Supabase 未配置");

  // 查找 session
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select()
    .eq("share_code", shareCode)
    .single();
  if (sErr || !session) throw new Error("找不到这个跑道，链接可能已失效");

  // 检查是否已用同设备加入过
  const { data: existing } = await supabase
    .from("members")
    .select()
    .eq("session_id", session.id)
    .eq("device_token", deviceToken)
    .maybeSingle();

  if (existing) {
    return { session, member: existing };
  }

  // 创建新成员
  const { data: member, error: mErr } = await supabase
    .from("members")
    .insert({
      session_id: session.id,
      name,
      color,
      is_host: false,
      is_online: true,
      is_on_track: true,
      device_token: deviceToken,
    })
    .select()
    .single();
  if (mErr || !member) throw new Error(mErr?.message ?? "加入失败");

  return { session, member };
}

/** 通过 device_token 查找已有成员身份 */
export async function findMyMember(
  sessionId: string,
  deviceToken: string,
): Promise<MemberRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("members")
    .select()
    .eq("session_id", sessionId)
    .eq("device_token", deviceToken)
    .maybeSingle();
  return data;
}

// ---- 成员查询（社交隔离） ----

/**
 * 获取某个 session 中"我"能看到的成员列表。
 * - Host: 看到所有人
 * - Guest: 只看到自己 + Host
 */
export async function getVisibleMembers(
  sessionId: string,
  myMemberId: string,
  isHost: boolean,
): Promise<MemberRow[]> {
  if (!supabase) return [];

  if (isHost) {
    const { data } = await supabase
      .from("members")
      .select()
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });
    return data ?? [];
  }

  // Guest: 自己 + Host
  const { data } = await supabase
    .from("members")
    .select()
    .eq("session_id", sessionId)
    .or(`id.eq.${myMemberId},is_host.eq.true`)
    .order("joined_at", { ascending: true });
  return data ?? [];
}

/** 获取 session 信息 */
export async function getSessionByCode(
  shareCode: string,
): Promise<SessionRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("sessions")
    .select()
    .eq("share_code", shareCode)
    .maybeSingle();
  return data;
}

// ---- 在线/跑道状态更新 ----

export async function updateMemberStatus(
  memberId: string,
  updates: { is_online?: boolean; is_on_track?: boolean },
) {
  if (!supabase) return;
  await supabase.from("members").update(updates).eq("id", memberId);
}

// ---- 击掌 ----

export async function recordHighFive(
  sessionId: string,
  fromMemberId: string,
  toMemberId: string,
) {
  if (!supabase) return;
  await supabase.from("high_five_events").insert({
    session_id: sessionId,
    from_member_id: fromMemberId,
    to_member_id: toMemberId,
  });
}

export async function getHighFiveCount(
  sessionId: string,
  memberId: string,
): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("high_five_events")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`);
  return count ?? 0;
}

// ---- Realtime 订阅 ----

export function subscribeMembers(
  sessionId: string,
  onInsert: (m: MemberRow) => void,
  onUpdate: (m: MemberRow) => void,
  onDelete: (m: MemberRow) => void,
) {
  if (!supabase) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`members:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "members",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onInsert(payload.new as MemberRow),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "members",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onUpdate(payload.new as MemberRow),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "members",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onDelete(payload.old as MemberRow),
    )
    .subscribe();

  return { unsubscribe: () => { supabase?.removeChannel(channel); } };
}

export function subscribeHighFives(
  sessionId: string,
  onInsert: (h: HighFiveRow) => void,
) {
  if (!supabase) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`high_fives:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "high_five_events",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onInsert(payload.new as HighFiveRow),
    )
    .subscribe();

  return { unsubscribe: () => { supabase?.removeChannel(channel); } };
}

// ---- 工具 ----

const ADJECTIVES = [
  "奔跑", "跳跃", "旋转", "飞驰", "流动", "闪耀", "温暖", "自由",
  "轻快", "活力", "阳光", "微醺", "沉醉", "追风", "踏浪", "听海",
];
const NOUNS = [
  "唱片", "音符", "旋律", "节拍", "和弦", "跑道", "黑胶", "舞步",
  "星光", "彩虹", "微风", "晨曦", "晚霞", "流星", "极光", "潮汐",
];

function generateShareCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${adj}${noun}${num}`;
}

/** 随机分配颜色 */
const COLORS = [
  "#FF8A5C", "#F473B9", "#FFC53D", "#8B7CF6",
  "#2EC4B6", "#5B8DEF", "#FF6B81", "#7BC96F",
];
export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}
