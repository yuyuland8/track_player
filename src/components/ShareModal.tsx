import { useState } from "react";
import styles from "./ShareModal.module.css";

interface Props {
  open: boolean;
  shareLink: string;
  memberCount: number;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function ShareModal({ open, shareLink, memberCount, onClose, onToast }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      onToast("链接已复制，发给朋友吧！");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      onToast("链接已复制！");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "唱片跑道",
        text: "来和我一起跑步听歌吧！",
        url: shareLink,
      });
    } catch {
      // 不支持或用户取消，降级到复制
      handleCopy();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sessionBadge}>
          <span className={styles.sessionDot} />
          跑道已就绪 · {memberCount} 人在线
        </div>

        <h2 className={styles.title}>邀请好友一起跑</h2>
        <p className={styles.subtitle}>
          分享这条链接，朋友点击后输入名字就能加入你的跑道
        </p>

        <div className={styles.linkBox}>
          <span className={styles.linkText}>{shareLink}</span>
          <button
            className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
            onClick={handleCopy}
          >
            {copied ? "已复制 ✓" : "复制"}
          </button>
        </div>

        <p className={styles.hint}>
          朋友只会看到你和他们自己，不会看到其他陌生人 🫶
        </p>

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onClose}>
            关闭
          </button>
          <button className={styles.btnPrimary} onClick={handleShare}>
            {"分享 / 复制链接"}
          </button>
        </div>
      </div>
    </div>
  );
}
