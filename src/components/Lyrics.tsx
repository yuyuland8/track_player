import { useMemo } from "react";
import type { LyricLine } from "../types";
import { lyricIndexAt } from "../utils/lrc";
import styles from "./Lyrics.module.css";

type Props = {
  lyrics: LyricLine[];
  time: number;
  error: boolean;
};

export default function Lyrics({ lyrics, time, error }: Props) {
  const idx = useMemo(() => lyricIndexAt(lyrics, time), [lyrics, time]);

  if (error) {
    return (
      <div className={styles.wrap}>
        <p className={styles.current}>歌词加载失败</p>
        <p className={styles.next}>可以继续听歌，稍后再试</p>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.next}>歌词加载中…</p>
      </div>
    );
  }

  const current = idx >= 0 ? lyrics[idx].text : "…";
  const next = idx + 1 < lyrics.length ? lyrics[idx + 1].text : "";

  return (
    <div className={styles.wrap} aria-live="polite">
      <p key={`c-${idx}`} className={styles.current}>
        {current}
      </p>
      <p className={styles.next}>{next}</p>
    </div>
  );
}
