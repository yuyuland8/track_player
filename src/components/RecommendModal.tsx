import { Play } from "lucide-react";
import type { Friend, TrackMeta } from "../types";
import Modal from "./Modal";
import styles from "./RecommendModal.module.css";

type Props = {
  friend: Friend | null;
  track: TrackMeta | null;
  message: string;
  onPlay: () => void;
  onClose: () => void;
};

export default function RecommendModal({
  friend,
  track,
  message,
  onPlay,
  onClose,
}: Props) {
  return (
    <Modal
      open={friend !== null && track !== null}
      onClose={onClose}
      ariaLabel={friend ? `${friend.name} 推荐的歌曲` : "好友推歌"}
    >
      {friend && track && (
        <div className={styles.wrap}>
          <div className={styles.from}>
            <span
              className={styles.avatar}
              style={{ background: friend.color }}
              aria-hidden="true"
            >
              {friend.name.slice(-1)}
            </span>
            <span className={styles.fromText}>
              <strong>{friend.name}</strong> 推荐给你一首歌
            </span>
          </div>

          <p className={styles.message}>{message}</p>

          <div className={styles.card}>
            <img className={styles.cover} src={track.cover} alt={`${track.title} 封面`} />
            <span className={styles.songText}>
              <strong className={styles.songTitle}>{track.title}</strong>
              <span className={styles.songArtist}>{track.artist}</span>
            </span>
          </div>

          <button type="button" className={styles.play} onClick={onPlay}>
            <Play size={17} strokeWidth={0} fill="currentColor" />
            去听这首
          </button>
        </div>
      )}
    </Modal>
  );
}
