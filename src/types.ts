export type LyricLine = { time: number; text: string };

export type SceneCueType = "relay" | "leftRightMove" | "firstMeet";

export type SceneCue = {
  id: string;
  start: number;
  end: number;
  type: SceneCueType;
};

/** run: 常规跑步；walk: 校园散步（青春修炼手册）；duo: 双人主角（star crossing night） */
export type MoveStyle = "run" | "walk" | "duo";

export type TrackMeta = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  audioSrc: string;
  lyricsSrc: string;
  bpm: number;
  durationFallback: number;
  style: MoveStyle;
  sceneCues: SceneCue[];
};

export type Friend = {
  id: string;
  name: string;
  color: string;
  relationDays: number;
  baseMinutes: number;
  baseLaps: number;
  baseHighFives: number;
  isMe?: boolean;
  /** 现场添加的观众，数据存在 localStorage */
  isGuest?: boolean;
  /** 覆盖默认的「跑友 · 认识 N 天」关系文案 */
  relationLabel?: string;
};
