import { useCallback, useEffect, useRef, useState } from "react";
import {
  HAS_SUPABASE,
  getDeviceToken,
} from "../lib/supabase";
import {
  createSession,
  joinSession,
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

export type SessionState =
  | { phase: "idle" }
  | { phase: "creating" }
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
