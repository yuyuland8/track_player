import { useEffect, useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import Modal from "./Modal";
import diskImg from "../assets/music-player-disk.png";
import styles from "./InviteModal.module.css";

const W = 1080;
const H = 1440;
const COVER_RATIO = 0.285;
const HOLE_OFFSET_Y = -0.0046;

type Props = {
  open: boolean;
  trackTitle: string;
  artist: string;
  coverSrc: string;
  friendCount: number;
  onClose: () => void;
  onToast: (message: string) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function renderInvite(
  trackTitle: string,
  artist: string,
  coverSrc: string,
  friendCount: number,
  code: string,
): Promise<string> {
  const [disk, cover] = await Promise.all([
    loadImage(diskImg),
    loadImage(coverSrc),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: number, size: number) =>
    `${weight} ${size}px "PingFang SC", -apple-system, sans-serif`;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#C9E5FD");
  bg.addColorStop(0.5, "#EFF6FF");
  bg.addColorStop(1, "#F0FBFD");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 品牌胶囊
  ctx.fillStyle = "#169AF3";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 118, 72, 236, 68, 34);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(600, 32);
  ctx.fillText("唱片跑道", W / 2, 106);

  // 主标题
  ctx.fillStyle = "#17181A";
  ctx.font = font(600, 60);
  ctx.fillText("来陪我跑一段", W / 2, 236);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = font(400, 30);
  ctx.fillText(
    friendCount > 0
      ? `已经有 ${friendCount} 位好友在跑道上了`
      : "跑道刚开，等你第一个上来",
    W / 2,
    296,
  );

  // 唱片
  const diskSize = 600;
  const dcx = W / 2;
  const dcy = 660;
  const r = diskSize * COVER_RATIO;
  const ccy = dcy + diskSize * HOLE_OFFSET_Y;
  ctx.save();
  ctx.beginPath();
  ctx.arc(dcx, ccy, r, 0, Math.PI * 2);
  ctx.clip();
  const s = Math.max((r * 2) / cover.naturalWidth, (r * 2) / cover.naturalHeight);
  ctx.drawImage(
    cover,
    dcx - (cover.naturalWidth * s) / 2,
    ccy - (cover.naturalHeight * s) / 2,
    cover.naturalWidth * s,
    cover.naturalHeight * s,
  );
  ctx.restore();
  ctx.drawImage(disk, dcx - diskSize / 2, dcy - diskSize / 2, diskSize, diskSize);

  // 歌曲
  ctx.fillStyle = "#17181A";
  ctx.font = font(600, 40);
  ctx.fillText(trackTitle, W / 2, 1024);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = font(400, 28);
  ctx.fillText(artist, W / 2, 1072);

  // 邀请码
  ctx.strokeStyle = "rgba(22,154,243,0.45)";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.roundRect(W / 2 - 200, 1140, 400, 96, 24);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#169AF3";
  ctx.font = font(600, 46);
  ctx.fillText(code, W / 2, 1190);

  // 标语与 Demo 标注
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.font = font(600, 38);
  ctx.fillText("这一首，陪你一起跑", W / 2, 1310);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.font = font(400, 24);
  ctx.fillText("Demo 演示卡片 · 不会真的发送邀请", W / 2, 1370);

  return canvas.toDataURL("image/png");
}

export default function InviteModal({
  open,
  trackTitle,
  artist,
  coverSrc,
  friendCount,
  onClose,
  onToast,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) {
      setUrl(null);
      return;
    }
    const next = makeCode();
    setCode(next);
    let cancelled = false;
    renderInvite(trackTitle, artist, coverSrc, friendCount, next)
      .then((data) => {
        if (!cancelled) setUrl(data);
      })
      .catch(() => {
        if (!cancelled) onToast("邀请卡生成失败，请稍后再试");
      });
    return () => {
      cancelled = true;
    };
    // 打开时按当下歌曲与人数生成一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const text = useMemo(
    () =>
      `「唱片跑道」邀请你一起听歌陪跑\n正在听：${trackTitle} - ${artist}\n邀请码：${code}\n这一首，陪你一起跑。\n（Demo 演示文案，不会真的发送）`,
    [trackTitle, artist, code],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onToast("邀请文案已复制");
    } catch {
      // 无剪贴板权限时退回选中兜底
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      onToast(ok ? "邀请文案已复制" : "复制失败，请手动长按选择");
    }
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel="邀请好友" variant="center">
      <div className={styles.head}>
        <h3 className={styles.title}>邀请好友</h3>
        <span className={styles.demoTag}>Demo</span>
      </div>
      <div className={styles.previewBox}>
        {url ? (
          <img className={styles.preview} src={url} alt="陪跑邀请卡预览" />
        ) : (
          <span className={styles.loading}>生成中…</span>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.copy} onClick={copy}>
          <Copy size={16} strokeWidth={2} />
          复制邀请文案
        </button>
        <a
          className={`${styles.download} ${url ? "" : styles.disabled}`}
          href={url ?? undefined}
          download={`run-invite-${code}.png`}
          aria-disabled={!url}
        >
          <Download size={16} strokeWidth={2} />
          下载
        </a>
      </div>
    </Modal>
  );
}
