import type { TrackMeta } from "../types";
import runawayCover from "../assets/runaway-baby-cover.jpeg";
import youthCover from "../assets/youth-training-manual-cover.png";
import starCover from "../assets/star-crossing-night-cover.png";
import radishSkin from "../assets/mayday-radish-skin.png";
import lovingCover from "../assets/mayday-loving-cover.jpg";

const BASE = import.meta.env.BASE_URL;

export const TRACKS: TrackMeta[] = [
  {
    id: "runaway-baby",
    title: "Runaway Baby",
    artist: "Bruno Mars",
    cover: runawayCover,
    audioSrc: `${BASE}assets/audio/runaway-baby.mp3`,
    lyricsSrc: `${BASE}assets/lyrics/runaway-baby.lrc`,
    bpm: 128,
    durationFallback: 148.48,
    style: "run",
    sceneCues: [
      { id: "relay-1", start: 29.25, end: 37.95, type: "relay" },
      { id: "relay-2", start: 79.07, end: 87.73, type: "relay" },
    ],
  },
  {
    id: "youth-training-manual",
    title: "青春修炼手册",
    artist: "TFBOYS",
    cover: youthCover,
    audioSrc: `${BASE}assets/audio/youth-training-manual.mp3`,
    lyricsSrc: `${BASE}assets/lyrics/youth-training-manual.lrc`,
    bpm: 96,
    durationFallback: 263.11,
    style: "walk",
    sceneHint: "小彩蛋 · 看看小人们的左右手",
    sceneCues: [
      { id: "hands-1", start: 3.33, end: 12.17, type: "leftRightMove" },
      { id: "hands-2", start: 82.07, end: 90.03, type: "leftRightMove" },
      { id: "hands-3", start: 159.49, end: 167.58, type: "leftRightMove" },
      { id: "hands-4", start: 209.2, end: 217.58, type: "leftRightMove" },
    ],
  },
  {
    id: "star-crossing-night",
    title: "Star Crossing Night",
    artist: "徐明浩 / GALI",
    cover: starCover,
    audioSrc: `${BASE}assets/audio/star-crossing-night.mp3`,
    lyricsSrc: `${BASE}assets/lyrics/star-crossing-night.lrc`,
    bpm: 84,
    durationFallback: 205.04,
    style: "duo",
    sceneHint: "小彩蛋 · 跑到 副歌，留意跑道上相遇的两个人",
    sceneCues: [
      { id: "first-meet", start: 81.95, end: 88.45, type: "firstMeet" },
    ],
  },
  {
    id: "mayday-loving",
    title: "恋爱ing",
    artist: "五月天",
    cover: lovingCover,
    audioSrc: `${BASE}assets/audio/mayday-loving.mp3`,
    lyricsSrc: `${BASE}assets/lyrics/mayday-loving.lrc`,
    bpm: 132,
    durationFallback: 169.4, // 实测音频 02:49（LRC 排到 03:25，尾段歌词播不到）
    style: "fan",
    skin: radishSkin,
    sceneHint: "小彩蛋 · 副歌的 L.O.V.E，看看萝卜们在喊什么",
    /* 每行 “L o v e l o v e” 一分为二：
       第一个 LOVE 由四只萝卜逐字接龙，第二个 LOVE 显示整行霓虹。 */
    sceneCues: [
      { id: "love-call-1", start: 24.98, end: 26.785, type: "loveCall" },
      { id: "love-neon-1", start: 26.785, end: 28.59, type: "loveNeon" },
      { id: "love-call-2", start: 71.2, end: 73.025, type: "loveCall" },
      { id: "love-neon-2", start: 73.025, end: 74.85, type: "loveNeon" },
    ],
  },
];
