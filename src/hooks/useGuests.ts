import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Friend } from "../types";

const STORAGE_KEY = "vinyl-track:guests:v1";

/** 现场观众的持久化记录（路演本地展示，刷新/重启后仍在） */
type StoredGuest = {
  id: string;
  name: string;
  color: string;
  relationLabel: string;
  highFives: number;
  createdAt: number;
};

export const GUEST_COLORS = [
  "#FF8A5C",
  "#F473B9",
  "#FFC53D",
  "#8B7CF6",
  "#2EC4B6",
  "#5B8DEF",
  "#FF6B81",
  "#7BC96F",
];

function load(): StoredGuest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is StoredGuest =>
        !!g &&
        typeof (g as StoredGuest).id === "string" &&
        typeof (g as StoredGuest).name === "string" &&
        typeof (g as StoredGuest).color === "string",
    );
  } catch {
    return [];
  }
}

function toFriend(g: StoredGuest): Friend {
  return {
    id: g.id,
    name: g.name,
    color: g.color,
    relationDays: 0,
    baseMinutes: 0,
    baseLaps: 0,
    baseHighFives: g.highFives,
    isGuest: true,
    relationLabel: g.relationLabel,
  };
}

export function useGuests() {
  const [stored, setStored] = useState<StoredGuest[]>(() => load());
  const failedRef = useRef(false);

  // 每次变更落盘；隐私模式等写入失败时静默降级为仅内存
  useEffect(() => {
    if (failedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      failedRef.current = true;
    }
  }, [stored]);

  // 保持引用稳定：否则下游 useMemo/useEffect 每次渲染都会重算
  const guests = useMemo(() => stored.map(toFriend), [stored]);

  const addGuest = useCallback(
    (name: string, color: string, relationLabel: string): Friend => {
      const guest: StoredGuest = {
        id: `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        color,
        relationLabel,
        highFives: 0,
        createdAt: Date.now(),
      };
      setStored((list) => [...list, guest]);
      return toFriend(guest);
    },
    [],
  );

  const removeGuest = useCallback((id: string) => {
    setStored((list) => list.filter((g) => g.id !== id));
  }, []);

  const clearGuests = useCallback(() => setStored([]), []);

  /** 击掌计数直接累加到持久化记录，观众下次来还能看到自己的数字 */
  const recordHighFive = useCallback((id: string) => {
    setStored((list) =>
      list.map((g) => (g.id === id ? { ...g, highFives: g.highFives + 1 } : g)),
    );
  }, []);

  return { guests, addGuest, removeGuest, clearGuests, recordHighFive };
}
