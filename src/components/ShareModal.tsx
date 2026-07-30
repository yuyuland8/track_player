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
    if (!open) {
      setQrEnlarged(false);
      setQrDataUrl("");
      return;
    }
    if (!shareLink) return;
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
    if (!shareLink) {
      onToast("生产模式登录后才能生成真实邀请链接");
      return;
    }
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
    if (!shareLink) {
      onToast("生产模式登录后才能邀请好友");
      return;
    }
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

          <h2 className={styles.title}>来陪我跑一段</h2>
          <p className={styles.subtitle}>
            {memberCount > 0
              ? `已经有 ${memberCount} 位好友在跑道上了`
              : "跑道刚开，等你第一个上来"}
          </p>

          {/* 二维码 */}
          {qrDataUrl && (
            <div className={styles.qrArea}>
              <button
                type="button"
                className={styles.qrWrap}
                aria-label="点击放大二维码"
                onClick={() => setQrEnlarged(true)}
              >
                <img
                  className={styles.qrImg}
                  src={qrDataUrl}
                  alt="扫码加入跑道"
                />
              </button>
              <span className={styles.qrHint}>点击二维码放大</span>
            </div>
          )}

          {shareLink && (
            <div className={styles.linkBox}>
              <span className={styles.linkText}>{shareLink}</span>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
                onClick={handleCopy}
              >
                {copied ? "已复制 ✓" : "复制"}
              </button>
            </div>
          )}

          <p className={styles.hint}>
            朋友只会看到你和他们自己，不会看到其他陌生人
          </p>
          <p className={styles.slogan}>这一首，陪你一起跑</p>

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
