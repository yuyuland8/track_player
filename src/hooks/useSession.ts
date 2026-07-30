import { useCallback, useEffect, useRef, useState } from "react";
import { HAS_SUPABASE, getDeviceToken } from "../lib/supabase";
import {
  getUser,
  ensureUser,
  getUserTrack,
  getTrackFriends,
  joinFriendBidirectional,
  recordHighFive,
  subscribeTrackFriends,
  subscribeHighFives,
  trackFriendToFriend,
  randomColor,
  getInviteUserIdFromURL,
  clearInviteFromURL,
  type UserRow,
  type TrackRow,
  type TrackFriendWithUser,
} from "../lib/db";
import type { Friend } from "../types";

const LS_USER_KEY = "track_player_user_id";

export type SessionState =
  | { phase: "idle" }
  | { phase: "restoring" }
  | { phase: "active"; user: UserRow; track: TrackRow };

/**
 * 跑道真实会话 Hook（v2：每人专属跑道，双向好友）
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

  // ---- Realtime 订阅（监视自己跑道的 track_friends 变化） ----
  const setupRealtime = useCallback(
    (trackId: string) => {
      cleanupSubs();

      const sub1 = subscribeTrackFriends(
        trackId,
        (newFriend) => {
          // 异步查询新好友的用户信息，再加入列表
          getUser(newFriend.user_id).then((u) => {
            if (!u) return;
            setVisibleMembers((prev) => {
              if (prev.find((m) => m.id === u.id)) return prev;
              return [
                ...prev,
                {
                  id: u.id,
                  name: u.name,
                  color: u.color,
                  relationDays: 1,
                  baseMinutes: 0,
                  baseLaps: 0,
                  baseHighFives: 0,
                  isMe: false,
                  isGuest: false,
                },
              ];
            });
            onToast(`${u.name} 加入了你的跑道 🎉`);
          });
        },
        (updated) => {
          // 状态更新：在线/跑道
          setVisibleMembers((prev) =>
            prev.map((m) =>
              m.id === updated.user_id
                ? { ...m, _online: updated.is_online, _onTrack: updated.is_on_track }
                : m,
            ),
          );
        },
        (deleted) => {
          setVisibleMembers((prev) => prev.filter((m) => m.id !== deleted.user_id));
        },
      );

      const sub2 = subscribeHighFives(trackId, (hf) => {
        setHighFiveCounts((prev) => {
          const next = { ...prev };
          next[hf.from_user_id] = (next[hf.from_user_id] ?? 0) + 1;
          next[hf.to_user_id] = (next[hf.to_user_id] ?? 0) + 1;
          return next;
        });
      });

      subsRef.current = [sub1, sub2];
    },
    [cleanupSubs, onToast],
  );

  // ---- 加载我的跑友列表 ----
  const loadFriends = useCallback(async (trackId: string) => {
    const rows: TrackFriendWithUser[] = await getTrackFriends(trackId);
    const friends: Friend[] = rows.map(trackFriendToFriend);
    setVisibleMembers(friends);
  }, []);

  // ---- 登录 / 注册 ----
  const handleLogin = useCallback(
    async (userId: string, displayName: string) => {
      if (!HAS_SUPABASE) {
        onToast("未配置 Supabase，使用 Demo 模式");
        return;
      }
      try {
        const color = randomColor();
        const { user, track, isNew } = await ensureUser(userId, displayName, color);

        // 持久化
        localStorage.setItem(LS_USER_KEY, user.id);

        setState({ phase: "active", user, track });
        await loadFriends(track.id);
        setupRealtime(track.id);

        if (isNew) {
          onToast(`身份创建成功！你的跑道已就绪`);
        } else {
          onToast(`欢迎回来，${user.name}！`);
        }

        // 如果 URL 带了邀请参数，自动双向加入
        const inviteId = getInviteUserIdFromURL();
        if (inviteId && inviteId !== user.id) {
          await handleJoin(inviteId);
        } else {
          // 清除残留的 URL 参数
          clearInviteFromURL();
        }
      } catch (e: any) {
        throw e; // 让 LoginModal 显示错误
      }
    },
    [onToast, loadFriends, setupRealtime],
  );

  // ---- 双向加入：A 加入 B ——
  const handleJoin = useCallback(
    async (targetUserId: string) => {
      const s = state as { phase: "active"; user: UserRow; track: TrackRow };
      if (s.phase !== "active" || !HAS_SUPABASE) return;

      // 防止加入自己
      if (targetUserId === s.user.id) {
        onToast("这是你自己的跑道～");
        clearInviteFromURL();
        return;
      }

      try {
        // 先查对方是否存在
        const targetUser = await getUser(targetUserId);
        if (!targetUser) {
          onToast("找不到这个用户，链接可能已失效");
          clearInviteFromURL();
          return;
        }

        await joinFriendBidirectional(s.user.id, targetUserId);

        // 重新加载自己的跑友列表（已包含对方）
        await loadFriends(s.track.id);

        onToast(`你已和 ${targetUser.name} 互相加入跑道！`);
        clearInviteFromURL();
      } catch (e: any) {
        onToast(e.message ?? "加入失败");
        clearInviteFromURL();
      }
    },
    [state, onToast, loadFriends],
  );

  // ---- 更新好友状态 ----
  const updateMyStatus = useCallback(
    async (_updates: { is_online?: boolean; is_on_track?: boolean }) => {
      // 新版中个人状态由 track_friends 中的记录管理
      // 暂时留空，后续按需实现
    },
    [],
  );

  // ---- 记录击掌 ----
  const handleHighFiveAction = useCallback(
    async (from: Friend, to: Friend) => {
      const s = state as { phase: "active"; user: UserRow; track: TrackRow };
      if (s.phase !== "active" || !HAS_SUPABASE) return;

      const fromId = from.isMe ? s.user.id : from.id;
      const toId = to.isMe ? s.user.id : to.id;
      if (fromId && toId) {
        await recordHighFive(s.track.id, fromId, toId);
      }
    },
    [state],
  );

  // ---- 获取分享链接 ----
  const getShareLink = useCallback(() => {
    const s = state as { phase: "active"; user: UserRow };
    if (s.phase !== "active") return "";
    const base = window.location.origin + window.location.pathname;
    return `${base}?s=${s.user.id}`;
  }, [state]);

  // ---- 页面刷新时自动恢复 ----
  useEffect(() => {
    if (!HAS_SUPABASE) return;

    const savedUserId = localStorage.getItem(LS_USER_KEY);
    if (!savedUserId) return;

    let cancelled = false;
    setState({ phase: "restoring" });

    (async () => {
      try {
        const user = await getUser(savedUserId);
        if (!user || cancelled) {
          localStorage.removeItem(LS_USER_KEY);
          setState({ phase: "idle" });
          return;
        }

        const track = await getUserTrack(user.id);
        if (!track || cancelled) {
          localStorage.removeItem(LS_USER_KEY);
          setState({ phase: "idle" });
          return;
        }

        setState({ phase: "active", user, track });
        await loadFriends(track.id);
        setupRealtime(track.id);

        // 检查是否有待处理的邀请
        const inviteId = getInviteUserIdFromURL();
        if (inviteId && inviteId !== user.id) {
          // 需要延迟执行 handleJoin，因为它依赖 state
          const targetUser = await getUser(inviteId);
          if (targetUser) {
            await joinFriendBidirectional(user.id, inviteId);
            await loadFriends(track.id);
            if (!cancelled) onToast(`已和 ${targetUser.name} 互相加入跑道！`);
          }
          clearInviteFromURL();
        }

        if (!cancelled) onToast("欢迎回来！跑道已恢复");
      } catch {
        if (!cancelled) {
          localStorage.removeItem(LS_USER_KEY);
          setState({ phase: "idle" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 计算属性 ----
  const isRealSession = HAS_SUPABASE && state.phase === "active";

  const currentUser = state.phase === "active" ? state.user : null;

  // ---- 暴露 ----
  return {
    state,
    isRealSession,
    visibleMembers,
    highFiveCounts,
    currentUser,
    handleLogin,
    handleJoin,
    updateMyStatus,
    handleHighFive: handleHighFiveAction,
    getShareLink,
    deviceToken: deviceToken.current,
    cleanupSubs,
  };
}
