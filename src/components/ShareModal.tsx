import { useEffect, useState } from "react";
import QRCode from "qrcode";
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
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrEnlarged, setQrEnlarged] = useState(false);

  // 生成高清二维码（SVG 转 data URL，保证放大清晰）
  useEffect(() => {
    if (!open || !shareLink) return;
    let cancelled = false;
    QRCode.toDataURL(shareLink, { width: 400, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, shareLink]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      onToast("链接已复制，发给朋友吧！");
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
      handleCopy();
    }
  };

  return (
    <>
      {/* 主弹窗 */}
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          <div className={styles.sessionBadge}>
            <span className={styles.sessionDot} />
            跑道已就绪 · {memberCount} 人在线
          </div>

          <h2 className={styles.title}>邀请好友一起跑</h2>
          <p className={styles.subtitle}>扫码或分享链接，朋友就能加入你的跑道</p>

          {/* 二维码 */}
          {qrDataUrl && (
            <div className={styles.qrWrap} onClick={() => setQrEnlarged(true)}>
              <img
                className={styles.qrImg}
                src={qrDataUrl}
                alt="扫码加入跑道"
              />
              <span className={styles.qrHint}>点击放大</span>
            </div>
          )}

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
            朋友只会看到你和他们自己，不会看到其他陌生人
          </p>

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={onClose}>
              关闭
            </button>
            <button className={styles.btnPrimary} onClick={handleShare}>
              分享 / 复制链接
            </button>
          </div>
        </div>
      </div>

      {/* 二维码放大浮层 */}
      {qrEnlarged && qrDataUrl && (
        <div className={styles.zoomOverlay} onClick={() => setQrEnlarged(false)}>
          <div className={styles.zoomCard} onClick={(e) => e.stopPropagation()}>
            <img
              className={styles.zoomQr}
              src={qrDataUrl}
              alt="扫码加入跑道"
            />
            <p className={styles.zoomLabel}>扫一扫，加入跑道</p>
            <button
              className={styles.zoomClose}
              onClick={() => setQrEnlarged(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
