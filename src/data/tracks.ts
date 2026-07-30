import type { TrackMeta } from "../types";
import runawayCover from "../assets/runaway-baby-cover.jpeg";
import youthCover from "../assets/youth-training-manual-cover.png";
import starCover from "../assets/star-crossing-night-cover.png";

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
    artist: "颜人中 / GALI",
    cover: starCover,
    audioSrc: `${BASE}assets/audio/star-crossing-night.mp3`,
    lyricsSrc: `${BASE}assets/lyrics/star-crossing-night.lrc`,
    bpm: 84,
    durationFallback: 205.04,
    style: "duo",
    sceneCues: [
      { id: "first-meet", start: 81.95, end: 88.45, type: "firstMeet" },
    ],
  },
];
