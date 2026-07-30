import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileImage, MoreHorizontal, Users } from "lucide-react";
import { TRACKS } from "./data/tracks";
import { BESTIE_ID, FRIENDS, MAX_ON_TRACK, ME, ME_ID } from "./data/friends";
import { RECOMMENDS, RECOMMEND_BY_FRIEND } from "./data/recommends";
import { parseLrc } from "./utils/lrc";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useToasts } from "./hooks/useToasts";
import { useGuests } from "./hooks/useGuests";
import { useSession } from "./hooks/useSession";
import { HAS_SUPABASE } from "./lib/supabase";
import { getUser, getInviteUserIdFromURL } from "./lib/db";
import DiskStage from "./components/DiskStage";
import Lyrics from "./components/Lyrics";
import ProgressBar from "./components/ProgressBar";
import Controls from "./components/Controls";
import FriendPanel from "./components/FriendPanel";
import FriendCard from "./components/FriendCard";
import ConfirmDialog from "./components/ConfirmDialog";
import ReportModal, { type ReportData } from "./components/ReportModal";
import AddGuestModal from "./components/AddGuestModal";
import RecommendModal from "./components/RecommendModal";
import LoginModal from "./components/LoginModal";
import ShareModal from "./components/ShareModal";
import type { Friend, LyricLine } from "./types";
import styles from "./App.module.css";

const SHOWCASE_SHORTCUTS: Record<string, { time: number; label: string }[]> = {
  "star-crossing-night": [{ time: 76, label: "彩蛋 1:16" }],
  "mayday-loving": [{ time: 20, label: "彩蛋 0:20" }],
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export default function App() {
  const { toasts, showToast } = useToasts();
  const reducedMotion = useReducedMotion();
  const player = useAudioPlayer({ tracks: TRACKS, onError: showToast });

  // ---- 歌词 ----
  const [lyricsMap, setLyricsMap] = useState<Record<string, LyricLine[]>>({});
  const [lyricsFailed, setLyricsFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const { id, lyricsSrc } = player.track;
    if (lyricsMap[id] || lyricsFailed[id]) return;
    let cancelled = false;
    fetch(lyricsSrc)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setLyricsMap((m) => ({ ...m, [id]: parseLrc(text) }));
      })
      .catch(() => {
        if (cancelled) return;
        setLyricsFailed((m) => ({ ...m, [id]: true }));
        showToast("歌词加载失败，可继续听歌");
      });
    return () => {
      cancelled = true;
    };
  }, [player.track, lyricsMap, lyricsFailed, showToast]);

  // ---- 真实会话 (Supabase) ----
  const session = useSession(showToast);

  // ---- Demo 模式下首次进入弹窗 ----
  const [showCreateModal, setShowCreateModal] = useState(true);

  // ---- 邀请人名字（URL 带 ?s= 时查询） ----
  const [inviterName, setInviterName] = useState<string | undefined>();
  useEffect(() => {
    if (!HAS_SUPABASE) return;
    const inviteId = getInviteUserIdFromURL();
    if (!inviteId) return;
    getUser(inviteId).then((u) => {
      if (u) setInviterName(u.name);
    });
  }, []);

  // ---- 名册：真实会话 > 我 + 预设好友 + 现场观众 ----
  const { guests, addGuest, removeGuest, recordHighFive } = useGuests();
  const demoRoster = useMemo(() => [ME, ...FRIENDS, ...guests], [guests]);
  const realMe = useMemo<Friend>(() => {
    if (!session.currentUser) return ME;
    return {
      ...ME,
      name: session.currentUser.name,
      color: session.currentUser.color,
    };
  }, [session.currentUser]);
  const byId = useCallback(
    (id: string): Friend => {
      if (session.isRealSession) {
        if (id === ME_ID) return realMe;
        return session.visibleMembers.find((f) => f.id === id)
          ?? demoRoster.find((f) => f.id === id)
          ?? realMe;
      }
      return demoRoster.find((f) => f.id === id) ?? ME;
    },
    [demoRoster, realMe, session.isRealSession, session.visibleMembers],
  );

  // ---- 陪跑名单 ----
  const [onlineIds, setOnlineIds] = useState<string[]>(() => [
    ...guests.map((g) => g.id),
    "ajie",
    "momo",
    "tang",
    "yuyu",
  ]);
  const [onTrackIds, setOnTrackIds] = useState<string[]>(() => {
    if (session.isRealSession) {
      return session.visibleMembers.map((f) => f.isMe ? ME_ID : f.id);
    }
    return [
      ME_ID,
      ...guests.map((g) => g.id).reverse(),
      "ajie",
      "momo",
      "tang",
    ].slice(0, MAX_ON_TRACK);
  });
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const [reinviteIds, setReinviteIds] = useState<string[]>([]);

  const runners = useMemo(() => onTrackIds.map(byId), [onTrackIds, byId]);
  const trackFull = onTrackIds.length >= (Number.isFinite(MAX_ON_TRACK) ? MAX_ON_TRACK : 8) && !session.isRealSession;

  // 真实会话模式下，自动同步 runners 与 visibleMembers
  useEffect(() => {
    if (session.isRealSession) {
      const meMember = session.visibleMembers.find((f) => f.isMe);
      const others = session.visibleMembers.filter(
        (f) =>
          !f.isMe &&
          (exitingIds.includes(f.id) ||
            (f._onTrack !== false && !reinviteIds.includes(f.id))),
      );
      setOnTrackIds([
        meMember ? ME_ID : ME_ID,
        ...others.map((f) => f.id),
      ]);
    }
  }, [
    session.isRealSession,
    session.visibleMembers,
    exitingIds,
    reinviteIds,
  ]);

  const leaveTrack = useCallback((id: string) => {
    setExitingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleExitDone = useCallback((id: string) => {
    setOnTrackIds((prev) => prev.filter((x) => x !== id));
    setExitingIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const joinTrack = useCallback(
    (ids: string[], silent = false) => {
      setReinviteIds((prev) => prev.filter((id) => !ids.includes(id)));
      setOnTrackIds((prev) => {
        const merged = [...prev];
        for (const id of ids) {
          if (merged.length >= MAX_ON_TRACK) break;
          if (!merged.includes(id)) merged.push(id);
        }
        return merged;
      });
      if (!silent && ids.length === 1) {
        showToast(`${byId(ids[0]).name}来陪你了`);
      }
    },
    [showToast, byId],
  );

  /** 在线开关：只管在线状态；下线必然退出跑道（离线不可能在跑道上） */
  const handleToggleOnline = (id: string, online: boolean) => {
    const friend = byId(id);
    if (online) {
      setOnlineIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      showToast(`${friend.name}上线了`);
    } else {
      setOnlineIds((prev) => prev.filter((x) => x !== id));
      if (onTrackIds.includes(id) && !exitingIds.includes(id)) {
        leaveTrack(id);
        showToast(`${friend.name}下线了，正在跑出跑道`);
      } else {
        showToast(`${friend.name}已离线`);
      }
    }
  };

  /** 跑道开关：只对在线好友生效，受 MAX_ON_TRACK 上限约束（当前不限人数） */
  const handleToggleTrack = (id: string, onTrack: boolean) => {
    const friend = byId(id);
    if (onTrack) {
      if (!onlineIds.includes(id)) {
        showToast(`${friend.name}还没上线，先打开在线开关`);
        return;
      }
      if (trackFull) {
        showToast(`跑道已满，最多 ${MAX_ON_TRACK} 人`);
        return;
      }
      if (exitingIds.includes(id)) return;
      joinTrack([id]);
    } else {
      if (!onTrackIds.includes(id) || exitingIds.includes(id)) return;
      leaveTrack(id);
      showToast(`${friend.name}下跑道了，仍然在线`);
    }
  };

  // ---- 会话统计 ----
  const [sessionLaps, setSessionLaps] = useState(0);
  const [fivesWith, setFivesWith] = useState<Record<string, number>>({});

  const handleHighFive = useCallback(
    (a: Friend, b: Friend) => {
      // 真实会话：记录到 Supabase
      if (session.isRealSession) {
        session.handleHighFive(a, b);
      }
      setFivesWith((prev) => {
        const next = { ...prev };
        for (const f of [a, b]) {
          if (!f.isMe && !f.isGuest) next[f.id] = (next[f.id] ?? 0) + 1;
        }
        return next;
      });
      // 观众的击掌次数直接累加到 localStorage，下次来还看得到
      for (const f of [a, b]) {
        if (f.isGuest) recordHighFive(f.id);
      }
    },
    [recordHighFive, session.isRealSession, session.handleHighFive],
  );

  /** 观众的次数取持久化值，预设好友取基础值 + 本次会话增量 */
  const fivesFor = useCallback(
    (f: Friend) =>
      f.isGuest ? f.baseHighFives : f.baseHighFives + (fivesWith[f.id] ?? 0),
    [fivesWith],
  );

  const handleLap = useCallback(() => setSessionLaps((v) => v + 1), []);
  const handleRelay = useCallback(() => {}, []);

  const weeklyMinutes =
    ME.baseMinutes + Math.floor(player.getListenedSeconds() / 60);
  const totalLaps = ME.baseLaps + sessionLaps;

  // ---- 浮层 ----
  const [cardFriendId, setCardFriendId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<Friend | null>(null);
  const [guestToRemove, setGuestToRemove] = useState<Friend | null>(null);
  // 好友推歌：已读列表只存会话内，刷新后红点重新出现，方便反复演示
  const [readRecIds, setReadRecIds] = useState<string[]>([]);
  const [recFriendId, setRecFriendId] = useState<string | null>(null);

  const handleRunnerClick = useCallback(
    (f: Friend) => {
      if (f.isMe) {
        showToast("这是你自己，跑得不错！");
        return;
      }
      setCardFriendId(f.id);
    },
    [showToast],
  );

  const handleAddGuest = (name: string, color: string, relation: string) => {
    const guest = addGuest(name, color, relation);
    setAddGuestOpen(false);
    setOnlineIds((prev) => [...prev, guest.id]);

    // 满员时让最后一位预设好友让位，保证现场观众一定能上跑道
    if (onTrackIds.length >= MAX_ON_TRACK) {
      const yielder = [...onTrackIds]
        .reverse()
        .find((id) => id !== ME_ID && !byId(id).isGuest && !exitingIds.includes(id));
      if (!yielder) {
        showToast(`跑道已满，${guest.name}先在场边等一会儿`);
        return;
      }
      leaveTrack(yielder);
      showToast(`${byId(yielder).name}让位，${guest.name}上跑道啦`);
      window.setTimeout(() => joinTrack([guest.id], true), 700);
      return;
    }
    joinTrack([guest.id], true);
    showToast(`${guest.name}上跑道啦，去跑道上找找`);
  };

  const handleRemoveGuestConfirm = () => {
    if (!guestToRemove) return;
    const { id, name } = guestToRemove;
    setOnlineIds((prev) => prev.filter((x) => x !== id));
    if (onTrackIds.includes(id)) {
      // 先退场再删除记录，避免动画途中数据被抽走
      leaveTrack(id);
      window.setTimeout(() => removeGuest(id), 1000);
    } else {
      removeGuest(id);
    }
    if (cardFriendId === id) setCardFriendId(null);
    showToast(`已删除观众 ${name}`);
    setGuestToRemove(null);
  };

  const handleOpenRecommend = (f: Friend) => {
    setRecFriendId(f.id);
    setReadRecIds((prev) => (prev.includes(f.id) ? prev : [...prev, f.id]));
  };

  const handlePlayRecommend = () => {
    const rec = recFriendId ? RECOMMEND_BY_FRIEND[recFriendId] : undefined;
    if (!rec) return;
    player.selectTrack(rec.trackId);
    showToast(`正在播放 ${byId(rec.friendId).name} 推荐的歌`);
    setRecFriendId(null);
    setPanelOpen(false);
  };

  const handleKickConfirm = () => {
    if (!kickTarget) return;
    const target = kickTarget;
    leaveTrack(target.id);
    if (session.isRealSession) {
      setReinviteIds((prev) =>
        prev.includes(target.id) ? prev : [...prev, target.id],
      );
      setOnlineIds((prev) => prev.filter((x) => x !== target.id));
      session
        .updateFriendStatus(target.id, {
          is_online: false,
          is_on_track: false,
        })
        .catch(() => showToast("跑友状态保存失败，请稍后重试"));
    }
    showToast(`已请${target.name}离开跑道`);
    setKickTarget(null);
    setCardFriendId(null);
  };

  const handleReinvite = (friend: Friend) => {
    if (exitingIds.includes(friend.id)) {
      showToast(`${friend.name}还在退场，请稍等一下`);
      return;
    }
    if (trackFull) {
      showToast(`跑道已满，最多 ${MAX_ON_TRACK} 人`);
      return;
    }

    if (session.isRealSession) {
      session
        .updateFriendStatus(friend.id, {
          is_online: true,
          is_on_track: true,
        })
        .then(() => {
          setReinviteIds((prev) => prev.filter((id) => id !== friend.id));
          setOnlineIds((prev) =>
            prev.includes(friend.id) ? prev : [...prev, friend.id],
          );
          showToast(`${friend.name}已重新加入跑道`);
        })
        .catch(() => showToast("重新邀请失败，请稍后重试"));
      return;
    }

    setOnlineIds((prev) =>
      prev.includes(friend.id) ? prev : [...prev, friend.id],
    );
    joinTrack([friend.id], true);
    showToast(`${friend.name}已重新加入跑道`);
  };

  const cardFriend = cardFriendId ? byId(cardFriendId) : null;

  const reportData: ReportData = useMemo(() => {
    const bestie = byId(BESTIE_ID);
    return {
      friendCount: Math.max(onTrackIds.length - 1, 0),
      minutes: weeklyMinutes,
      laps: totalLaps,
      fives: fivesFor(bestie),
      fiveName: bestie.name,
      trackTitle: player.track.title,
      coverSrc: player.track.cover,
      colors: runners.map((f) => f.color),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportOpen, onTrackIds, weeklyMinutes, totalLaps, fivesWith, player.track, runners]);

  const lyrics = lyricsMap[player.track.id] ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.topBtn}
          aria-label="返回"
          onClick={() => showToast("Demo：这里是演示页面")}
        >
          <ChevronLeft size={24} strokeWidth={1.8} />
        </button>
        <h1 className={styles.topTitle}>唱片跑道</h1>
        <button
          type="button"
          className={styles.topBtn}
          aria-label="更多"
          onClick={() => showToast("这一首，陪你一起跑")}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
        </button>
      </header>

      <div className={styles.summaryRow}>
        <span className={styles.summaryPill}>
          {onTrackIds.length} 人正在陪跑 · 本周 {weeklyMinutes} 分钟
        </span>
        {/* 高度恒定：无提示的歌曲也占位，切歌时唱片不会上下跳 */}
        <p className={styles.sceneHint} key={player.track.id}>
          {player.track.sceneHint}
        </p>
      </div>

      <div className={styles.stageWrap}>
        <DiskStage
          track={player.track}
          audioRef={player.audioRef}
          isPlaying={player.isPlaying}
          runners={runners}
          exitingIds={exitingIds}
          reducedMotion={reducedMotion}
          onExitDone={handleExitDone}
          onHighFive={handleHighFive}
          onLap={handleLap}
          onRelay={handleRelay}
          onRunnerClick={handleRunnerClick}
        />
      </div>

      <Lyrics
        lyrics={lyrics}
        time={player.time}
        error={!!lyricsFailed[player.track.id]}
      />

      <div className={styles.trackInfo}>
        <h2 className={styles.trackTitle}>{player.track.title}</h2>
        <p className={styles.trackArtist}>{player.track.artist}</p>
      </div>

      <ProgressBar
        time={player.time}
        duration={player.duration}
        onSeek={player.seek}
        shortcuts={SHOWCASE_SHORTCUTS[player.track.id]}
        onShortcut={(target) => {
          player.seek(target);
          player.play();
        }}
      />

      <Controls
        isPlaying={player.isPlaying}
        onToggle={player.toggle}
        onPrev={player.prev}
        onNext={player.next}
      />

      <div className={styles.secondaryRow}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => setPanelOpen(true)}
        >
          <Users size={17} strokeWidth={1.8} />
          我的酷跑团
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => setReportOpen(true)}
        >
          <FileImage size={17} strokeWidth={1.8} />
          生成陪跑周报
        </button>
      </div>

      <FriendPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        demoMode={!session.isRealSession}
        friends={session.isRealSession ? session.visibleMembers : FRIENDS}
        guests={session.isRealSession ? [] : guests}
        onlineIds={
          session.isRealSession
            ? session.visibleMembers.filter((f) => f._online).map((f) => f.id)
            : onlineIds
        }
        onTrackIds={
          session.isRealSession
            ? session.visibleMembers.filter((f) => f._onTrack).map((f) => f.id)
            : onTrackIds
        }
        exitingIds={exitingIds}
        trackFull={trackFull}
        onToggleOnline={handleToggleOnline}
        onToggleTrack={handleToggleTrack}
        reinviteIds={reinviteIds}
        onReinvite={handleReinvite}
        onInvite={() => {
          setPanelOpen(false);
          setShareOpen(true);
        }}
        onAddGuest={() => setAddGuestOpen(true)}
        onRemoveGuest={(f) => setGuestToRemove(f)}
        recommendIds={
          session.isRealSession ? [] : RECOMMENDS.map((r) => r.friendId)
        }
        readRecIds={readRecIds}
        onOpenRecommend={handleOpenRecommend}
      />

      <RecommendModal
        friend={recFriendId ? byId(recFriendId) : null}
        track={
          recFriendId
            ? (TRACKS.find(
                (t) => t.id === RECOMMEND_BY_FRIEND[recFriendId]?.trackId,
              ) ?? null)
            : null
        }
        message={
          recFriendId ? (RECOMMEND_BY_FRIEND[recFriendId]?.message ?? "") : ""
        }
        onPlay={handlePlayRecommend}
        onClose={() => setRecFriendId(null)}
      />

      <AddGuestModal
        open={addGuestOpen}
        onClose={() => setAddGuestOpen(false)}
        onSubmit={handleAddGuest}
      />

      <FriendCard
        friend={cardFriend}
        online={cardFriend ? onlineIds.includes(cardFriend.id) : false}
        onTrack={
          cardFriend
            ? onTrackIds.includes(cardFriend.id) &&
              !exitingIds.includes(cardFriend.id)
            : false
        }
        minutes={
          cardFriend
            ? Math.min(cardFriend.baseMinutes, weeklyMinutes) +
              Math.floor(player.getListenedSeconds() / 60)
            : 0
        }
        laps={cardFriend ? cardFriend.baseLaps + sessionLaps : 0}
        fives={cardFriend ? fivesFor(cardFriend) : 0}
        onKick={(f) => setKickTarget(f)}
        onClose={() => setCardFriendId(null)}
      />

      <ConfirmDialog
        open={kickTarget !== null}
        title={`请${kickTarget?.name ?? ""}离开跑道？`}
        description={
          session.isRealSession
            ? "TA 会减速挥手后跑出跑道，之后可以在酷跑团里重新邀请。"
            : "TA 会减速挥手后跑出跑道，之后可以在好友管理里重新加入。"
        }
        confirmText="确认请离"
        onConfirm={handleKickConfirm}
        onCancel={() => setKickTarget(null)}
      />

      <ConfirmDialog
        open={guestToRemove !== null}
        title={`删除观众 ${guestToRemove?.name ?? ""}？`}
        description="TA 会跑出跑道，本机保存的陪跑记录也会一起清掉。"
        confirmText="确认删除"
        onConfirm={handleRemoveGuestConfirm}
        onCancel={() => setGuestToRemove(null)}
      />

      <ReportModal
        open={reportOpen}
        data={reportData}
        onClose={() => setReportOpen(false)}
        onError={showToast}
      />

      <LoginModal
        open={showCreateModal && !session.isRealSession && HAS_SUPABASE}
        restoring={session.state.phase === "restoring"}
        inviteUserName={inviterName}
        onLogin={async (id, name) => {
          try {
            await session.handleLogin(id, name);
            setShowCreateModal(false);
          } catch (e: any) {
            showToast(e.message ?? "登录失败");
          }
        }}
        onSkipDemo={() => {
          setShowCreateModal(false);
        }}
        onClose={() => {
          if (session.state.phase !== "restoring") setShowCreateModal(false);
        }}
      />

      <ShareModal
        open={shareOpen}
        shareLink={session.getShareLink()}
        memberCount={session.visibleMembers.length}
        onClose={() => setShareOpen(false)}
        onToast={showToast}
      />

      <div className={styles.toastWrap} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
