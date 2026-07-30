import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Modal from "./Modal";
import diskImg from "../assets/music-player-disk.png";
import styles from "./ReportModal.module.css";

export type ReportData = {
  friendCount: number;
  minutes: number;
  laps: number;
  fives: number;
  fiveName: string;
  trackTitle: string;
  coverSrc: string;
  colors: string[];
};

type Props = {
  open: boolean;
  data: ReportData;
  onClose: () => void;
  onError: (message: string) => void;
};

const W = 1080;
const H = 1920;
const GOLDEN = 2.399963;
/* 与 DiskStage 保持一致：中孔占盘面 55.14%（孔心高 0.46%），车道在纹路区 */
const LANE_RX = [0.65, 0.76, 0.87];
const COVER_RATIO = 0.285;
const HOLE_OFFSET_Y = -0.0046;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });
}

function drawCoverCircle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  radius: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max(
    (radius * 2) / img.naturalWidth,
    (radius * 2) / img.naturalHeight,
  );
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

async function renderReport(data: ReportData): Promise<string> {
  const [disk, cover] = await Promise.all([
    loadImage(diskImg),
    loadImage(data.coverSrc),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: number, size: number) =>
    `${weight} ${size}px "PingFang SC", -apple-system, sans-serif`;

  // 冰蓝渐变背景
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#C9E5FD");
  bg.addColorStop(0.48, "#EFF6FF");
  bg.addColorStop(1, "#F0FBFD");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 品牌胶囊
  ctx.fillStyle = "#169AF3";
  ctx.beginPath();
  ctx.roundRect(72, 84, 236, 72, 36);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(600, 34);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("唱片跑道", 190, 122);

  const now = new Date();
  const dateText = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = font(400, 32);
  ctx.textAlign = "right";
  ctx.fillText(dateText, W - 72, 122);

  // 主标题
  ctx.fillStyle = "#17181A";
  ctx.font = font(600, 62);
  ctx.textAlign = "center";
  ctx.fillText(`这一周，有 ${data.friendCount} 位好友陪我跑`, W / 2, 300);

  // 唱片画面
  const diskSize = 720;
  const dcx = W / 2;
  const dcy = 760;
  drawCoverCircle(
    ctx,
    cover,
    dcx,
    dcy + diskSize * HOLE_OFFSET_Y,
    diskSize * COVER_RATIO,
  );
  ctx.drawImage(disk, dcx - diskSize / 2, dcy - diskSize / 2, diskSize, diskSize);
  // 跑道上的小伙伴
  data.colors.forEach((color, i) => {
    const theta = i * GOLDEN + 0.6;
    const r = (diskSize / 2) * LANE_RX[i % 3];
    const x = dcx + r * Math.cos(theta);
    const y = dcy + r * 0.94 * Math.sin(theta);
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();
  });

  // 数据区
  const stats: Array<[string, string]> = [
    [`${data.minutes}`, "本周同听（分钟）"],
    [`${data.laps}`, "合跑圈数"],
    [`${data.fives}`, `和${data.fiveName}击掌（次）`],
  ];
  const colW = 300;
  const statY = 1300;
  stats.forEach(([value, label], i) => {
    const x = W / 2 + (i - 1) * colW;
    ctx.fillStyle = "#169AF3";
    ctx.font = font(600, 84);
    ctx.textAlign = "center";
    ctx.fillText(value, x, statY);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = font(400, 30);
    ctx.fillText(label, x, statY + 76);
  });

  // 情绪文案
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.font = font(400, 36);
  ctx.fillText("最长的一程不是单曲循环", W / 2, 1540);
  ctx.fillText("是有人一直没下线", W / 2, 1598);

  // 歌曲与日期
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = font(400, 32);
  ctx.fillText(`♪ ${data.trackTitle} · ${dateText}`, W / 2, 1710);

  // 标语
  ctx.fillStyle = "#169AF3";
  ctx.font = font(600, 44);
  ctx.fillText("这一程，有人陪你跑", W / 2, 1800);

  return canvas.toDataURL("image/png");
}

export default function ReportModal({ open, data, onClose, onError }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    renderReport(data)
      .then((dataUrl) => {
        if (!cancelled) setUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) onError("周报生成失败，请稍后再试");
      });
    return () => {
      cancelled = true;
    };
    // 打开时用当下数据生成一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="陪跑周报" variant="center">
      <h3 className={styles.title}>陪跑周报</h3>
      <div className={styles.previewBox}>
        {url ? (
          <img className={styles.preview} src={url} alt="陪跑周报分享卡预览" />
        ) : (
          <span className={styles.loading}>生成中…</span>
        )}
      </div>
      <a
        className={`${styles.download} ${url ? "" : styles.downloadDisabled}`}
        href={url ?? undefined}
        download="run-weekly-report.png"
        aria-disabled={!url}
      >
        <Download size={17} strokeWidth={2} />
        下载 PNG
      </a>
    </Modal>
  );
}
