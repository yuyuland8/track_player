import { useCallback, useRef, useState } from "react";

export type ToastItem = { id: number; text: string };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((text: string, duration = 2000) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return { toasts, showToast };
}
