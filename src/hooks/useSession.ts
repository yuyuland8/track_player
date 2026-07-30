import { useCallback, useEffect, useRef, useState } from "react";
import {
  HAS_SUPABASE,
  getDeviceToken,
} from "../lib/supabase";
import {
  createSession,
  joinSession,
  getSessionByCode,
  findMyMember,
  getVisibleMembers,
  updateMemberStatus,
  recordHighFive,
  subscribeMembers,
  subscribeHighFives,
  memberToFriend,
  randomColor,
  type SessionRow,
  type MemberRow,
} from "../lib/db";
import type { Friend } from "../types";

// ---- localStorage 持久化 ----

const LS_KEY = "track_player_session";

interface SavedSession {
  sessionId: string;
  shareCode: string;
  myMemberId: string;
  isHost: boolean;
}

function saveSessionToLS(s: SavedSession) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch { /* quota exceeded, ignore */ }
}

function loadSessionFromLS(): SavedSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.sessionId || !parsed.shareCode || !parsed.myMemberId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearSessionFromLS() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}

export type SessionState =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "restoring" }
  | { phase: "joining"; shareCode: string }
  | { phase: "active"; session: SessionRow; myMember: MemberRow; isHost: boolean };

/**
 * 从 URL 检测 share_code 参数
 */
export function getShareCodeFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("s");
}

/**
 * 跑道真实会话 Hook
 *
 * - 如果未配置 Supabase → 返回 demo 模式
 * - 如果 URL 带了 ?s=xxx → 进入 joining 流程
 * - 用户主动创建 → generating share link
 */
export function useSession(onToast: (msg: string) => void) {
  const [state, setState] = useState<SessionState>({ phase: "idle" });
  const [visibleMembers, setVisibleMembers] = useState<Friend[]>([]);
  const [highFiveCounts, setHighFiveCounts] = useState<Record<string, number>>({});
  const deviceToken = useRef(getDeviceToken());
  const subsRef = useRef<{ unsubscribe: () => void }[]>([]);

  // 清理订阅
  const cleanupSubs = useCallback(() => {
    subsRef.current.forEach((s) => s.unsubscribe());
    subsRef.current = [];
  }, []);

  // URL 参数检测：自动进入 joining
  useEffect(() => {
    if (!HAS_SUPABASE) return;
    const code = getShareCodeFromURL();
    if (code) {
      setState({ phase: "joining", shareCode: code });
    }
  }, []);

  // 订阅实时更新
  const setupRealtime = useCallback(
    (sessionId: string, myId: string, isHost: boolean) => {
      cleanupSubs();

      const sub1 = subscribeMembers(
        sessionId,
        (newMember) => {
          // 新成员加入
          setVisibleMembers((prev) => {
            // 社交隔离：guest 看不到其他 guest
            if (!isHost && !newMember.is_host && newMember.id !== myId) return prev;
            if (prev.find((m) => m.id === newMember.id)) return prev;
            return [...prev, memberToFriend(newMember)];
          });
          if (newMember.id !== myId) {
            onToast(`${newMember.name} 加入了跑道 🎉`);
          }
        },
        (updated) => {
          setVisibleMembers((prev) =>
            prev.map((m) => (m.id === updated.id ? memberToFriend(updated) : m)),
          );
        },
        (deleted) => {
          setVisibleMembers((prev) => prev.filter((m) => m.id !== deleted.id));
        },
      );

      const sub2 = subscribeHighFives(sessionId, (hf) => {
        setHighFiveCounts((prev) => {
          const next = { ...prev };
          next[hf.from_member_id] = (next[hf.from_member_id] ?? 0) + 1;
          next[hf.to_member_id] = (next[hf.to_member_id] ?? 0) + 1;
          return next;
        });
      });

      subsRef.current = [sub1, sub2];
    },
    [cleanupSubs, onToast],
  );

  // 加载可见成员
  const loadMembers = useCallback(
    async (sessionId: string, myId: string, isHost: boolean) => {
      const members = await getVisibleMembers(sessionId, myId, isHost);
      const friends = members.map(memberToFriend);
      // 把我自己标出来
      const mapped = friends.map((f) => {
        if (f.id === myId) {
          return { ...f, isMe: true, name: f.name, id: "me" };
        }
        return f;
      });
      setVisibleMembers(mapped);
    },
    [],
  );

  /** 创建跑道 */
  const handleCreate = useCallback(
    async (name: string) => {
      if (!HAS_SUPABASE) {
        onToast("未配置 Supabase，使用 Demo 模式");
        return;
      }
      setState({ phase: "creating" });
      try {
        const color = randomColor();
        const { session, hostMember } = await createSession(
          name,
          color,
          deviceToken.current,
        );

        setState({
          phase: "active",
          session,
          myMember: hostMember,
          isHost: true,
        });

        await loadMembers(session.id, hostMember.id, true);
        setupRealtime(session.id, hostMember.id, true);

        // 🔑 持久化到 localStorage，刷新后自动恢复
        saveSessionToLS({
          sessionId: session.id,
          shareCode: session.share_code,
          myMemberId: hostMember.id,
          isHost: true,
        });

        onToast("跑道创建成功！快分享链接给朋友吧");
      } catch (e: any) {
        onToast(e.message ?? "创建失败");
        setState({ phase: "idle" });
      }
    },
    [onToast, loadMembers, setupRealtime],
  );

  /** 加入跑道 */
  const handleJoin = useCallback(
    async (name: string) => {
      if (!HAS_SUPABASE) {
        onToast("未配置 Supabase，使用 Demo 模式");
        return;
      }

      const s = state as { phase: "joining"; shareCode: string };
      const shareCode = s.shareCode;

      try {
        const color = randomColor();
        const { session, member } = await joinSession(
          shareCode,
          name,
          color,
          deviceToken.current,
        );

        setState({
          phase: "active",
          session,
          myMember: member,
          isHost: member.is_host,
        });

        await loadMembers(session.id, member.id, member.is_host);
        setupRealtime(session.id, member.id, member.is_host);

        // 🔑 持久化到 localStorage，刷新后自动恢复
        saveSessionToLS({
          sessionId: session.id,
          shareCode: shareCode,
          myMemberId: member.id,
          isHost: member.is_host,
        });

        onToast("成功加入跑道！");
      } catch (e: any) {
        onToast(e.message ?? "加入失败");
        setState({ phase: "idle" });
      }
    },
    [state, onToast, loadMembers, setupRealtime],
  );

  /** 更新自己的在线/跑道状态 */
  const updateMyStatus = useCallback(
    async (updates: { is_online?: boolean; is_on_track?: boolean }) => {
      if (!HAS_SUPABASE) return;
      const s = state as { phase: "active"; myMember: MemberRow };
      if (s.phase !== "active") return;
      await updateMemberStatus(s.myMember.id, updates);
    },
    [state],
  );

  /** 记录击掌 */
  const handleHighFive = useCallback(
    async (from: Friend, to: Friend) => {
      const s = state as { phase: "active"; session: SessionRow; myMember: MemberRow };
      if (s.phase !== "active" || !HAS_SUPABASE) return;

      // 找到真实 member id
      const fromMember = visibleMembers.find((m) => m.name === from.name && !m.isMe);
      const toMember = visibleMembers.find((m) => m.name === to.name && !m.isMe);
      const fromId = from.isMe ? s.myMember.id : fromMember?.id;
      const toId = to.isMe ? s.myMember.id : toMember?.id;

      if (fromId && toId) {
        await recordHighFive(s.session.id, fromId, toId);
      }
    },
    [state, visibleMembers],
  );

  /** 获取分享链接 */
  const getShareLink = useCallback(() => {
    const s = state as { phase: "active"; session: SessionRow };
    if (s.phase !== "active") return "";
    const base = window.location.origin + window.location.pathname;
    return `${base}?s=${s.session.share_code}`;
  }, [state]);

  // ---- 页面刷新时自动恢复会话 ----
  useEffect(() => {
    if (!HAS_SUPABASE) return;

    // URL 带 ?s= 时优先走加入流程，不恢复旧会话
    const urlCode = getShareCodeFromURL();
    if (urlCode) return;

    const saved = loadSessionFromLS();
    if (!saved) return;

    let cancelled = false;
    setState({ phase: "restoring" });

    (async () => {
      try {
        // 1. 确认 session 还存在
        const session = await getSessionByCode(saved.shareCode);
        if (!session || cancelled) { clearSessionFromLS(); setState({ phase: "idle" }); return; }

        // 2. 用 device_token 找回自己的 member 身份
        const member = await findMyMember(saved.sessionId, deviceToken.current);
        if (!member || cancelled) { clearSessionFromLS(); setState({ phase: "idle" }); return; }

        // 3. 恢复成功
        setState({
          phase: "active",
          session,
          myMember: member,
          isHost: member.is_host,
        });

        // 4. 加载成员 + 订阅实时更新
        const members = await getVisibleMembers(session.id, member.id, member.is_host);
        const friends = members.map(memberToFriend);
        const mapped = friends.map((f) => {
          if (f.id === member.id) return { ...f, isMe: true, name: f.name, id: "me" };
          return f;
        });
        setVisibleMembers(mapped);

        // 重新订阅 Realtime
        cleanupSubs();
        const sub1 = subscribeMembers(
          session.id,
          (newM) => {
            setVisibleMembers((prev) => {
              if (!member.is_host && !newM.is_host && newM.id !== member.id) return prev;
              if (prev.find((m) => m.id === newM.id)) return prev;
              return [...prev, memberToFriend(newM)];
            });
            if (newM.id !== member.id) onToast(`${newM.name} 加入了跑道 🎉`);
          },
          (updated) => {
            setVisibleMembers((prev) =>
              prev.map((m) => (m.id === updated.id ? memberToFriend(updated) : m)),
            );
          },
          (deleted) => {
            setVisibleMembers((prev) => prev.filter((m) => m.id !== deleted.id));
          },
        );
        const sub2 = subscribeHighFives(session.id, (hf) => {
          setHighFiveCounts((prev) => {
            const next = { ...prev };
            next[hf.from_member_id] = (next[hf.from_member_id] ?? 0) + 1;
            next[hf.to_member_id] = (next[hf.to_member_id] ?? 0) + 1;
            return next;
          });
        });
        subsRef.current = [sub1, sub2];

        if (!cancelled) onToast("欢迎回来！跑道已恢复");
      } catch {
        if (!cancelled) {
          clearSessionFromLS();
          setState({ phase: "idle" });
        }
      }
    })();

    return () => { cancelled = true; };
  }, []); // 只在 mount 时执行一次

  /** 是否处于真实会话模式 */
  const isRealSession =
    HAS_SUPABASE && (state as any).phase === "active";

  return {
    state,
    isRealSession,
    visibleMembers,
    highFiveCounts,
    handleCreate,
    handleJoin,
    updateMyStatus,
    handleHighFive,
    getShareLink,
    deviceToken: deviceToken.current,
    cleanupSubs,
  };
}
