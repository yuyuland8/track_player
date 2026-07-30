import { useState } from "react";
import styles from "./SessionModals.module.css";

interface Props {
  open: boolean;
  shareCode: string;
  onJoin: (name: string) => Promise<void>;
  onClose: () => void;
}

export default function JoinSessionModal({ open, onJoin, onClose }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("取个名字吧～");
      return;
    }
    if (trimmed.length > 10) {
      setError("名字最多 10 个字哦");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onJoin(trimmed);
    } catch (e: any) {
      setError(e.message ?? "加入失败");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>有人邀请你一起跑步听歌</h2>
        <p className={styles.subtitle}>
          输入你的名字，加入这条跑道
        </p>

        <input
          className={styles.input}
          type="text"
          placeholder="你的名字"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          maxLength={10}
          autoFocus
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onClose}>
            不了
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "加入中..." : "加入跑道"}
          </button>
        </div>
      </div>
    </div>
  );
}
