import { useRef, useState, type PointerEvent } from "react";
import { formatTime } from "../utils/time";
import styles from "./ProgressBar.module.css";

type Props = {
  time: number;
  duration: number;
  onSeek: (target: number) => void;
};

export default function ProgressBar({ time, duration, onSeek }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const ratio =
    dragRatio ?? (duration > 0 ? Math.min(time / duration, 1) : 0);

  const ratioFromEvent = (e: PointerEvent) => {
    const rect = railRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragRatio(ratioFromEvent(e));
  };

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRatio === null) return;
    setDragRatio(ratioFromEvent(e));
  };

  const handleUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRatio === null) return;
    onSeek(ratioFromEvent(e) * duration);
    setDragRatio(null);
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.touch}
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(ratio * duration)}
        aria-valuetext={formatTime(ratio * duration)}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={() => setDragRatio(null)}
      >
        <div ref={railRef} className={styles.rail}>
          <div
            className={styles.fill}
            style={{ width: `${(ratio * 100).toFixed(2)}%` }}
          >
            <span className={styles.knob} />
          </div>
        </div>
      </div>
      <div className={styles.times}>
        <span>{formatTime(ratio * duration)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
