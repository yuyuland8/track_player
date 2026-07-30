/** 好友推歌演示模板：Demo 使用预设好友，生产模式映射到真实好友 */
export type Recommend = {
  friendId: string;
  trackId: string;
  message: string;
};

export const RECOMMENDS: Recommend[] = [
  {
    friendId: "ajie",
    trackId: "runaway-baby",
    message: "今天跑步就靠它了，前奏一响腿自己就动了。",
  },
  {
    friendId: "momo",
    trackId: "youth-training-manual",
    message: "突然很想你，放这首会想起我们高中的操场。",
  },
  {
    friendId: "yuyu",
    trackId: "star-crossing-night",
    message: "夜跑的时候听，抬头刚好看到星星，分享给你。",
  },
];

export const RECOMMEND_BY_FRIEND: Record<string, Recommend> =
  Object.fromEntries(RECOMMENDS.map((r) => [r.friendId, r]));
