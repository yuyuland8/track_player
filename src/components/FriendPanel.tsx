import { Mail, MailOpen, RotateCcw, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import { HAS_TRACK_LIMIT, MAX_ON_TRACK } from "../data/friends";
import type { Friend } from "../types";
import Modal from "./Modal";
import styles from "./FriendPanel.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  demoMode: boolean;
  friends: Friend[];
  guests: Friend[];
  onlineIds: string[];
  onTrackIds: string[];
  exitingIds: string[];
  trackFull: boolean;
  onToggleOnline: (id: string, online: boolean) => void;
  onToggleTrack: (id: string, onTrack: boolean) => void;
  reinviteIds: string[];
  onReinvite: (f: Friend) => void;
  onInvite: () => void;
  onAddGuest: () => void;
  onRemoveGuest: (f: Friend) => void;
  /** 有推歌的好友 id */
  recommendIds: string[];
  /** 已读推歌的好友 id */
  readRecIds: string[];
  onOpenRecommend: (f: Friend) => void;
};

export default function FriendPanel({
  open,
  onClose,
  demoMode,
  friends,
  guests,
  onlineIds,
  onTrackIds,
  exitingIds,
  trackFull,
  onToggleOnline,
  onToggleTrack,
  reinviteIds,
  onReinvite,
  onInvite,
  onAddGuest,
  onRemoveGuest,
  recommendIds,
  readRecIds,
  onOpenRecommend,
}: Props) {
  const renderRow = (f: Friend) => {
    const online = onlineIds.includes(f.id);
    const onTrack = onTrackIds.includes(f.id);
    const joinBlocked = !online || (!onTrack && trackFull);
    const hasRec = recommendIds.includes(f.id);
    const unread = hasRec && !readRecIds.includes(f.id);
    const canReinvite =
      !demoMode &&
      !onTrack &&
      !exitingIds.includes(f.id) &&
      reinviteIds.includes(f.id);

    return (
      <li key={f.id} className={styles.row}>
        <span
          className={styles.avatar}
          style={{ background: f.color }}
          aria-hidden="true"
        >
          {f.name.slice(-1)}
        </span>
        <span className={styles.who}>
          <span className={styles.nameRow}>
            <span className={styles.name}>{f.name}</span>
            {hasRec && (
              <button
                type="button"
                className={styles.mail}
                aria-label={`${f.name} 推荐的歌曲${unread ? "（未读）" : ""}`}
                onClick={() => onOpenRecommend(f)}
              >
                {unread ? (
                  <Mail size={15} strokeWidth={1.9} />
                ) : (
                  <MailOpen size={15} strokeWidth={1.9} />
                )}
                {unread && <span className={styles.dot} aria-hidden="true" />}
              </button>
            )}
          </span>
          <span className={online ? styles.stateOn : styles.stateOff}>
            {online ? (onTrack ? "在线 · 在跑道" : "在线 · 未上跑道") : "离线"}
          </span>
        </span>

        {demoMode && (
          <>
            <button
              type="button"
              className={`${styles.trackBtn} ${onTrack ? styles.trackBtnOn : ""}`}
              aria-label={`${f.name} ${onTrack ? "请下跑道" : "加入跑道"}`}
              aria-disabled={joinBlocked}
              onClick={() => onToggleTrack(f.id, !onTrack)}
            >
              {onTrack ? "在跑道" : "加入"}
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={online}
              aria-label={`${f.name} ${online ? "设为离线" : "设为在线"}`}
              className={`${styles.switch} ${online ? styles.switchOn : ""}`}
              onClick={() => onToggleOnline(f.id, !online)}
            >
              <span className={styles.thumb} />
            </button>
          </>
        )}

        {demoMode && f.isGuest && (
          <button
            type="button"
            className={styles.del}
            aria-label={`删除观众 ${f.name}`}
            onClick={() => onRemoveGuest(f)}
          >
            <Trash2 size={15} strokeWidth={1.8} />
          </button>
        )}

        {canReinvite && !f.isGuest && (
          <button
            type="button"
            className={styles.reinvite}
            onClick={() => onReinvite(f)}
          >
            <RotateCcw size={14} strokeWidth={2} />
            重新邀请
          </button>
        )}
      </li>
    );
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel="好友管理">
      <div className={styles.header}>
        <Users size={18} strokeWidth={2} className={styles.headerIcon} />
        <h3 className={styles.title}>好友管理</h3>
        {demoMode && <span className={styles.demoTag}>Demo</span>}
      </div>
      <p className={styles.hint}>
        {demoMode
          ? `左边开关控制在线状态，右边「加入」控制是否上跑道。离线会自动退出跑道，${
              HAS_TRACK_LIMIT
                ? `跑道最多 ${MAX_ON_TRACK} 人（含你自己）。`
                : "当前不限跑道人数。"
            }`
          : "这里只显示通过邀请加入的真实好友，生产模式不会加载预设好友。"}
      </p>

      {demoMode && (
        <div className={styles.actions}>
          <button type="button" className={styles.actionMain} onClick={onAddGuest}>
            <UserPlus size={17} strokeWidth={1.9} />
            添加现场观众
          </button>
        </div>
      )}

      {demoMode && trackFull && (
        <p className={styles.fullTip}>跑道已满，最多 {MAX_ON_TRACK} 人</p>
      )}

      {demoMode && guests.length > 0 && (
        <>
          <h4 className={styles.sectionTitle}>
            现场观众
            <span className={styles.sectionNote}>已保存在本机，刷新不丢</span>
          </h4>
          <ul className={styles.list}>{guests.map(renderRow)}</ul>
        </>
      )}

      <h4 className={styles.sectionTitle}>
        {demoMode ? "预设好友" : "跑道好友"}
      </h4>
      {friends.length > 0 ? (
        <ul className={styles.list}>{friends.map(renderRow)}</ul>
      ) : (
        <p className={styles.empty}>
          还没有好友，发送邀请后，对方加入就会显示在这里。
        </p>
      )}

      {!demoMode && (
        <button
          type="button"
          className={`${styles.actionMain} ${styles.inviteAction}`}
          onClick={onInvite}
        >
          <Sparkles size={17} strokeWidth={1.9} />
          邀请好友
        </button>
      )}
    </Modal>
  );
}
