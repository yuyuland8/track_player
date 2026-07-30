import { useState } from "react";
import { HAS_SUPABASE } from "../lib/supabase";
import styles from "./SessionModals.module.css";

interface Props {
  open: boolean;
  onCreate: (name: string) => Promise<void>;
  onSkipDemo: () => void;
  onClose: () => void;
}

export default function CreateSessionModal({ open, onCreate, onSkipDemo, onClose }: Props) {
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
      await onCreate(trimmed);
    } catch (e: any) {
      setError(e.message ?? "创建失败");
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
        <h2 className={styles.title}>
          {HAS_SUPABASE ? "创建你的跑道" : "起个名字"}
        </h2>
        <p className={styles.subtitle}>
          {HAS_SUPABASE
            ? "创建后生成分享链接，邀请好友一起听歌跑步"
            : "Demo 模式下和虚拟好友一起跑"}
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
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "创建中..." : "开始跑步"}
          </button>
        </div>

        {HAS_SUPABASE && (
          <button className={styles.btnDemo} onClick={onSkipDemo}>
            跳过，先用 Demo 体验
          </button>
        )}
      </div>
    </div>
  );
}
