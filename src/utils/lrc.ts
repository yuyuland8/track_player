import type { LyricLine } from "../types";

const TAG_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** 解析 LRC 文本，支持 [mm:ss.xx]，忽略空歌词行，按时间排序 */
export function parseLrc(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const line of raw.split(/\r?\n/)) {
    TAG_RE.lastIndex = 0;
    const times: number[] = [];
    let textStart = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG_RE.exec(line)) !== null) {
      const frac = match[3] ?? "0";
      times.push(
        Number(match[1]) * 60 + Number(match[2]) + Number(frac) / 10 ** frac.length,
      );
      textStart = TAG_RE.lastIndex;
    }
    const text = line.slice(textStart).trim();
    if (!text || times.length === 0) continue;
    for (const time of times) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** 当前时间对应的歌词行下标，早于第一行时返回 -1 */
export function lyricIndexAt(lyrics: LyricLine[], time: number): number {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= time + 0.05) idx = i;
    else break;
  }
  return idx;
}
