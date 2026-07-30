import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileImage, MoreHorizontal, Users } from "lucide-react";
import { TRACKS } from "./data/tracks";
import {
  BESTIE_ID,
  FRIENDS,
  MAX_ON_TRACK,
  ME,
  ME_ID,
  friendById,
} from "./data/friends";
import { parseLrc } from "./utils/lrc";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useToasts } from "./hooks/useToasts";
import DiskStage from "./components/DiskStage";
import Lyrics from "./components/Lyrics";
import ProgressBar from "./components/ProgressBar";
import Controls from "./components/Controls";
import FriendPanel from "./components/FriendPanel";
import FriendCard from "./components/FriendCard";
import ConfirmDialog from "./components/ConfirmDialog";
import ReportModal, { type ReportData } from "./components/ReportModal";
import type { Friend, LyricLine } from "./types";
import styles from "./App.module.css";

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

  // ---- 陪跑名单 ----
  const [companionOn, setCompanionOn] = useState(true);
  const [onlineIds, setOnlineIds] = useState<string[]>([
    "ajie",
    "momo",
    "tang",
    "yuyu",
  ]);
  const [onTrackIds, setOnTrackIds] = useState<string[]>([
    ME_ID,
    "ajie",
    "momo",
    "tang",
  ]);
  const [exitingIds, setExitingIds] = useState<string[]>([]);

  const runners = useMemo(() => onTrackIds.map(friendById), [onTrackIds]);
  const trackFull = onTrackIds.length >= MAX_ON_TRACK;

  const leaveTrack = useCallback((id: string) => {
    setExitingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleExitDone = useCallback((id: string) => {
    setOnTrackIds((prev) => prev.filter((x) => x !== id));
    setExitingIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const joinTrack = useCallback(
    (ids: string[], silent = false) => {
      setOnTrackIds((prev) => {
        const merged = [...prev];
        for (const id of ids) {
          if (merged.length >= MAX_ON_TRACK) break;
          if (!merged.includes(id)) merged.push(id);
        }
        return merged;
      });
      if (!silent && ids.length === 1) {
        showToast(`${friendById(ids[0]).name}来陪你了`);
      }
    },
    [showToast],
  );

  const handleToggleCompanion = () => {
    if (companionOn) {
      setCompanionOn(false);
      const others = onTrackIds.filter((id) => id !== ME_ID);
      others.forEach((id, i) => {
        window.setTimeout(() => leaveTrack(id), i * 120);
      });
      showToast("已关闭陪跑，好友们挥手先撤啦");
    } else {
      setCompanionOn(true);
      const candidates = onlineIds.filter(
        (id) => !onTrackIds.includes(id) && !exitingIds.includes(id),
      );
      joinTrack(candidates, true);
      showToast(
        candidates.length > 0 ? "陪跑开启，好友们来了" : "陪跑已开启",
      );
    }
  };

  const handleToggleOnline = (id: string, online: boolean) => {
    const friend = friendById(id);
    if (online) {
      if (companionOn && !onTrackIds.includes(id) && trackFull) {
        showToast("跑道已满，最多 8 人");
        return;
      }
      setOnlineIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (companionOn && !exitingIds.includes(id)) {
        joinTrack([id]);
      }
    } else {
      setOnlineIds((prev) => prev.filter((x) => x !== id));
      if (onTrackIds.includes(id) && !exitingIds.includes(id)) {
        leaveTrack(id);
        showToast(`${friend.name}下线了，正在跑出跑道`);
      }
    }
  };

  const handlePreset = (count: 2 | 4 | 8) => {
    const targets = FRIENDS.slice(0, count - 1).map((f) => f.id);
    setCompanionOn(true);
    setOnlineIds((prev) => Array.from(new Set([...prev, ...targets])));
    const toLeave = onTrackIds.filter(
      (id) => id !== ME_ID && !targets.includes(id) && !exitingIds.includes(id),
    );
    toLeave.forEach((id, i) => {
      window.setTimeout(() => leaveTrack(id), i * 120);
    });
    joinTrack(
      targets.filter((id) => !onTrackIds.includes(id)),
      true,
    );
    showToast(`已切换为 ${count} 人陪跑场景`);
  };

  // ---- 会话统计 ----
  const [sessionLaps, setSessionLaps] = useState(0);
  const [fivesWith, setFivesWith] = useState<Record<string, number>>({});

  const handleHighFive = useCallback((a: Friend, b: Friend) => {
    setFivesWith((prev) => {
      const next = { ...prev };
      for (const f of [a, b]) {
        if (!f.isMe) next[f.id] = (next[f.id] ?? 0) + 1;
      }
      return next;
    });
  }, []);

  const handleLap = useCallback(() => setSessionLaps((v) => v + 1), []);
  const handleRelay = useCallback(() => {}, []);

  const weeklyMinutes =
    ME.baseMinutes + Math.floor(player.getListenedSeconds() / 60);
  const totalLaps = ME.baseLaps + sessionLaps;

  // ---- 浮层 ----
  const [cardFriendId, setCardFriendId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<Friend | null>(null);

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

  const handleKickConfirm = () => {
    if (!kickTarget) return;
    leaveTrack(kickTarget.id);
    setOnlineIds((prev) => prev.filter((x) => x !== kickTarget.id));
    showToast(`已请${kickTarget.name}离开跑道`);
    setKickTarget(null);
    setCardFriendId(null);
  };

  const cardFriend = cardFriendId ? friendById(cardFriendId) : null;

  const reportData: ReportData = useMemo(() => {
    const bestie = friendById(BESTIE_ID);
    return {
      friendCount: Math.max(onTrackIds.length - 1, 0),
      minutes: weeklyMinutes,
      laps: totalLaps,
      fives: bestie.baseHighFives + (fivesWith[BESTIE_ID] ?? 0),
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
          onClick={() => showToast("这一程，有人陪你跑")}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
        </button>
      </header>

      <div className={styles.summaryRow}>
        <span className={styles.summaryPill}>
          {onTrackIds.length} 人正在陪跑 · 本周 {weeklyMinutes} 分钟
        </span>
      </div>

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
          role="switch"
          aria-checked={companionOn}
          className={styles.companionToggle}
          onClick={handleToggleCompanion}
        >
          <span
            className={`${styles.toggleTrack} ${companionOn ? styles.toggleTrackOn : ""}`}
          >
            <span className={styles.toggleThumb} />
          </span>
          陪跑
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => setPanelOpen(true)}
        >
          <Users size={17} strokeWidth={1.8} />
          好友管理
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
        friends={FRIENDS}
        onlineIds={onlineIds}
        onTrackIds={onTrackIds}
        trackFull={trackFull}
        onToggleOnline={handleToggleOnline}
        onPreset={handlePreset}
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
        fives={
          cardFriend
            ? cardFriend.baseHighFives + (fivesWith[cardFriend.id] ?? 0)
            : 0
        }
        onKick={(f) => setKickTarget(f)}
        onClose={() => setCardFriendId(null)}
      />

      <ConfirmDialog
        open={kickTarget !== null}
        title={`请${kickTarget?.name ?? ""}离开跑道？`}
        description="TA 会减速挥手后跑出跑道，之后可以在好友管理里重新上线。"
        confirmText="确认请离"
        onConfirm={handleKickConfirm}
        onCancel={() => setKickTarget(null)}
      />

      <ReportModal
        open={reportOpen}
        data={reportData}
        onClose={() => setReportOpen(false)}
        onError={showToast}
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
