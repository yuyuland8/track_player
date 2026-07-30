import { Users } from "lucide-react";
import type { Friend } from "../types";
import Modal from "./Modal";
import styles from "./FriendPanel.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  friends: Friend[];
  onlineIds: string[];
  onTrackIds: string[];
  trackFull: boolean;
  onToggleOnline: (id: string, online: boolean) => void;
  onPreset: (count: 2 | 4 | 8) => void;
};

export default function FriendPanel({
  open,
  onClose,
  friends,
  onlineIds,
  onTrackIds,
  trackFull,
  onToggleOnline,
  onPreset,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="好友管理">
      <div className={styles.header}>
        <Users size={18} strokeWidth={2} className={styles.headerIcon} />
        <h3 className={styles.title}>好友管理</h3>
        <span className={styles.demoTag}>Demo</span>
      </div>
      <p className={styles.hint}>
        模拟好友上线 / 下线。跑道最多 8 人（含你自己）。
      </p>
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
      <ul className={styles.list}>
        {friends.map((f) => {
          const online = onlineIds.includes(f.id);
          const onTrack = onTrackIds.includes(f.id);
          const blocked = !online && trackFull;
          return (
            <li key={f.id} className={styles.row}>
              <span
                className={styles.avatar}
                style={{ background: f.color }}
                aria-hidden="true"
              >
                {f.name.slice(-1)}
              </span>
              <span className={styles.name}>{f.name}</span>
              {onTrack ? (
                <span className={styles.tagOnTrack}>在跑道</span>
              ) : online ? (
                <span className={styles.tagOnline}>在线</span>
              ) : (
                <span className={styles.tagOffline}>离线</span>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={online}
                aria-disabled={blocked}
                aria-label={`${f.name} ${online ? "下线" : "上线"}`}
                className={`${styles.switch} ${online ? styles.switchOn : ""} ${blocked ? styles.switchBlocked : ""}`}
                onClick={() => onToggleOnline(f.id, !online)}
              >
                <span className={styles.thumb} />
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
