import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackMeta } from "../types";

type Options = {
  tracks: TrackMeta[];
  onError: (message: string) => void;
};

export function useAudioPlayer({ tracks, onError }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(tracks[0].durationFallback);
  const listenedRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const track = tracks[index];

  if (!audioRef.current && typeof window !== "undefined") {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
  }

  useEffect(() => {
    const audio = audioRef.current!;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      onErrorRef.current("音频加载失败，请检查网络后重试");
    };
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.pause();
    };
  }, []);

  // 切歌：换源，必要时续播
  useEffect(() => {
    const audio = audioRef.current!;
    audio.src = track.audioSrc;
    audio.load();
    setTime(0);
    setDuration(track.durationFallback);
    const handleMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      wasPlayingRef.current = true;
      setIndex((i) => (i + 1) % tracks.length);
    };
    audio.addEventListener("loadedmetadata", handleMeta);
    audio.addEventListener("ended", handleEnded);
    if (wasPlayingRef.current) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
    return () => {
      audio.removeEventListener("loadedmetadata", handleMeta);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [track.audioSrc, track.durationFallback, tracks.length]);

  // 以 audio.currentTime 为唯一时间源，节流同步到 React 状态
  // 用 setInterval 而非 rAF：页面不可见时也保持歌词/进度与音频对齐
  useEffect(() => {
    let lastNow = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const audio = audioRef.current!;
      if (!audio.paused) {
        listenedRef.current += Math.min((now - lastNow) / 1000, 1.5);
      }
      lastNow = now;
      setTime(audio.currentTime);
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current!;
    if (audio.paused) {
      wasPlayingRef.current = true;
      audio.play().catch(() => {
        onErrorRef.current("播放失败，请再点一次播放");
      });
    } else {
      wasPlayingRef.current = false;
      audio.pause();
    }
  }, []);

  const step = useCallback(
    (delta: number) => {
      const audio = audioRef.current!;
      wasPlayingRef.current = !audio.paused;
      setIndex((i) => (i + delta + tracks.length) % tracks.length);
    },
    [tracks.length],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const seek = useCallback((target: number) => {
    const audio = audioRef.current!;
    const max = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.max(0, Math.min(target, max - 0.2));
    setTime(audio.currentTime);
  }, []);

  const getListenedSeconds = useCallback(() => listenedRef.current, []);

  return {
    audioRef,
    track,
    index,
    isPlaying,
    time,
    duration,
    toggle,
    next,
    prev,
    seek,
    getListenedSeconds,
  };
}
