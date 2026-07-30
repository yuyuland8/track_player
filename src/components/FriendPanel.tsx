import { Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import type { Friend } from "../types";
import Modal from "./Modal";
import styles from "./FriendPanel.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  friends: Friend[];
  guests: Friend[];
  onlineIds: string[];
  onTrackIds: string[];
  trackFull: boolean;
  onToggleOnline: (id: string, online: boolean) => void;
  onToggleTrack: (id: string, onTrack: boolean) => void;
  onPreset: (count: 2 | 4 | 8) => void;
  onInvite: () => void;
  onAddGuest: () => void;
  onRemoveGuest: (f: Friend) => void;
};

export default function FriendPanel({
  open,
  onClose,
  friends,
  guests,
  onlineIds,
  onTrackIds,
  trackFull,
  onToggleOnline,
  onToggleTrack,
  onPreset,
  onInvite,
  onAddGuest,
  onRemoveGuest,
}: Props) {
  const renderRow = (f: Friend) => {
    const online = onlineIds.includes(f.id);
    const onTrack = onTrackIds.includes(f.id);
    const joinBlocked = !online || (!onTrack && trackFull);

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
          <span className={styles.name}>{f.name}</span>
          <span className={online ? styles.stateOn : styles.stateOff}>
            {online ? (onTrack ? "在线 · 在跑道" : "在线 · 未上跑道") : "离线"}
          </span>
        </span>

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

        {f.isGuest && (
          <button
            type="button"
            className={styles.del}
            aria-label={`删除观众 ${f.name}`}
            onClick={() => onRemoveGuest(f)}
          >
            <Trash2 size={15} strokeWidth={1.8} />
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
        <span className={styles.demoTag}>Demo</span>
      </div>
      <p className={styles.hint}>
        左边开关控制在线状态，右边「加入」控制是否上跑道。离线会自动退出跑道，跑道最多 8 人（含你自己）。
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.actionMain} onClick={onAddGuest}>
          <UserPlus size={17} strokeWidth={1.9} />
          添加现场观众
        </button>
        <button type="button" className={styles.actionGhost} onClick={onInvite}>
          <Sparkles size={17} strokeWidth={1.9} />
          邀请好友
        </button>
      </div>

      <div className={styles.presets}>
        <button type="button" className={styles.preset} onClick={() => onPreset(2)}>
          一键 2 人<span>浪漫场景</span>
        </button>
        <button type="button" className={styles.preset} onClick={() => onPreset(4)}>
          一键 4 人<span>标准场景</span>
        </button>
        <button type="button" className={styles.preset} onClick={() => onPreset(8)}>
          一键 8 人<span>满员场景</span>
        </button>
      </div>

      {trackFull && <p className={styles.fullTip}>跑道已满，最多 8 人</p>}

      {guests.length > 0 && (
        <>
          <h4 className={styles.sectionTitle}>
            现场观众
            <span className={styles.sectionNote}>已保存在本机，刷新不丢</span>
          </h4>
          <ul className={styles.list}>{guests.map(renderRow)}</ul>
        </>
      )}

      <h4 className={styles.sectionTitle}>预设好友</h4>
      <ul className={styles.list}>{friends.map(renderRow)}</ul>
    </Modal>
  );
}
