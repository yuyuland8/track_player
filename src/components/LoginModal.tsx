import { useState } from "react";
import { HAS_SUPABASE } from "../lib/supabase";
import styles from "./SessionModals.module.css";

interface Props {
  open: boolean;
  restoring: boolean;
  inviteUserName?: string;
  onLogin: (id: string, name: string) => Promise<void>;
  onSkipDemo: () => void;
  onClose: () => void;
}

const ID_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fff]+$/;

export default function LoginModal({
  open,
  restoring,
  inviteUserName,
  onLogin,
  onSkipDemo,
  onClose,
}: Props) {
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const isRestoring = restoring;

  const handleSubmit = async () => {
    const trimmedId = id.trim();
    const trimmedName = displayName.trim() || trimmedId;

    if (!trimmedId) {
      setError("请输入你的唯一 ID");
      return;
    }
    if (trimmedId.length < 2 || trimmedId.length > 20) {
      setError("ID 需要 2-20 个字符");
      return;
    }
    if (!ID_REGEX.test(trimmedId)) {
      setError("ID 只支持字母、数字、中文和下划线");
      return;
    }
    if (trimmedName.length > 10) {
      setError("昵称最多 10 个字");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onLogin(trimmedId, trimmedName);
    } catch (e: any) {
      setError(e.message ?? "登录失败");
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
        {isRestoring ? (
          <>
            <h2 className={styles.title}>欢迎回来</h2>
            <p className={styles.subtitle}>正在恢复你的跑道...</p>
            <div className={styles.actions}>
              <button className={styles.btnPrimary} disabled>
                恢复中...
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.title}>
              {inviteUserName
                ? `${inviteUserName} 邀请你一起跑步`
                : "创建你的音乐身份"}
            </h2>
            <p className={styles.subtitle}>
              {inviteUserName
                ? `加入后你们会互相出现在对方的跑道上`
                : "选择一个唯一的 ID，以后用它登录就是你的专属跑道"}
            </p>

            <input
              className={styles.input}
              type="text"
              placeholder="唯一 ID（字母/数字/中文）"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoFocus
              style={{ marginBottom: 10 }}
            />

            <input
              className={styles.input}
              type="text"
              placeholder="显示昵称（可选，默认同 ID）"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              maxLength={10}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? "登录中..."
                  : inviteUserName
                    ? "加入跑道"
                    : "开始跑步"}
              </button>
            </div>

            {HAS_SUPABASE && !inviteUserName && (
              <button className={styles.btnDemo} onClick={onSkipDemo}>
                跳过，先用 Demo 体验
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
