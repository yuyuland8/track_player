import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import styles from "./Controls.module.css";

type Props = {
  isPlaying: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Controls({ isPlaying, onToggle, onPrev, onNext }: Props) {
  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.side}
        aria-label="上一首"
        onClick={onPrev}
      >
        <SkipBack size={26} strokeWidth={1.6} fill="currentColor" />
      </button>
      <button
        type="button"
        className={styles.main}
        aria-label={isPlaying ? "暂停" : "播放"}
        onClick={onToggle}
      >
        {isPlaying ? (
          <Pause size={26} strokeWidth={0} fill="currentColor" />
        ) : (
          <Play size={26} strokeWidth={0} fill="currentColor" className={styles.playIcon} />
        )}
      </button>
      <button
        type="button"
        className={styles.side}
        aria-label="下一首"
        onClick={onNext}
      >
        <SkipForward size={26} strokeWidth={1.6} fill="currentColor" />
      </button>
    </div>
  );
}
