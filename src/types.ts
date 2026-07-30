export type LyricLine = { time: number; text: string };

export type SceneCueType =
  | "relay"
  | "leftRightMove"
  | "firstMeet"
  | "loveCall"
  | "loveNeon";

export type SceneCue = {
  id: string;
  start: number;
  end: number;
  type: SceneCueType;
};

/** run: 常规跑步；walk: 校园散步（青春修炼手册）；duo: 双人主角（star crossing night） */
/** fan: 粉丝萝卜皮肤，没有脚，用一蹦一蹦代替跑步 */
export type MoveStyle = "run" | "walk" | "duo" | "fan";

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
  /** 该歌曲的角色皮肤图（设置后小人整体替换为这张图） */
  skin?: string;
  sceneCues: SceneCue[];
  /** 自助体验用的彩蛋提示，显示在陪跑摘要下方；留空则不显示 */
  sceneHint?: string;
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
  /** 来自 Supabase 的真实成员行（内部使用） */
  _memberRow?: Record<string, unknown>;
  /** 生产模式中的实时在线状态（内部使用） */
  _online?: boolean;
  /** 生产模式中的实时跑道状态（内部使用） */
  _onTrack?: boolean;
};
