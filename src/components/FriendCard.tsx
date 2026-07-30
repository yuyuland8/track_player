import { Clock3, Hand, RotateCw, UserMinus } from "lucide-react";
import type { Friend } from "../types";
import Modal from "./Modal";
import styles from "./FriendCard.module.css";

type Props = {
  friend: Friend | null;
  online: boolean;
  onTrack: boolean;
  minutes: number;
  laps: number;
  fives: number;
  onKick: (f: Friend) => void;
  onClose: () => void;
};

export default function FriendCard({
  friend,
  online,
  onTrack,
  minutes,
  laps,
  fives,
  onKick,
  onClose,
}: Props) {
  return (
    <Modal
      open={friend !== null}
      onClose={onClose}
      ariaLabel={friend ? `好友 ${friend.name} 的信息` : "好友信息"}
    >
      {friend && (
        <div className={styles.card}>
          <div className={styles.top}>
            <span className={styles.avatar} style={{ background: friend.color }}>
              {friend.name.slice(-1)}
            </span>
            <div className={styles.who}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{friend.name}</span>
                <span
                  className={online ? styles.dotOnline : styles.dotOffline}
                  aria-hidden="true"
                />
                <span className={styles.stateText}>
                  {onTrack ? "正在陪你跑" : online ? "在线" : "离线"}
                </span>
              </div>
              <span className={styles.relation}>
                跑友 · 认识 {friend.relationDays} 天
              </span>
            </div>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <Clock3 size={16} strokeWidth={2} className={styles.statIcon} />
              <strong>{minutes}</strong>
              <span>本周同听(分钟)</span>
            </div>
            <div className={styles.stat}>
              <RotateCw size={16} strokeWidth={2} className={styles.statIcon} />
              <strong>{laps}</strong>
              <span>合跑圈数</span>
            </div>
            <div className={styles.stat}>
              <Hand size={16} strokeWidth={2} className={styles.statIcon} />
              <strong>{fives}</strong>
              <span>击掌次数</span>
            </div>
          </div>
          {onTrack && (
            <button
              type="button"
              className={styles.kick}
              onClick={() => onKick(friend)}
            >
              <UserMinus size={16} strokeWidth={2} />
              请 TA 离开跑道
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
