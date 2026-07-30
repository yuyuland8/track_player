import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Modal from "./Modal";
import styles from "./ReportModal.module.css";

export type ReportRank = {
  name: string;
  color: string;
  minutes: number;
  laps: number;
};

export type ReportData = {
  friendCount: number;
  minutes: number;
  laps: number;
  fives: number;
  leaderboard: ReportRank[];
};

type Props = {
  open: boolean;
  data: ReportData;
  onClose: () => void;
  onError: (message: string) => void;
};

const W = 1080;
const H = 1920;

async function renderReport(data: ReportData): Promise<string> {
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

  // 伴听陪跑榜：不绑定任何单曲，突出这一周真实发生的陪伴关系
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.beginPath();
  ctx.roundRect(90, 390, 900, 720, 48);
  ctx.fill();
  ctx.strokeStyle = "rgba(22,154,243,0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#17181A";
  ctx.font = font(600, 48);
  ctx.textAlign = "left";
  ctx.fillText("伴听陪跑榜", 150, 480);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.font = font(400, 28);
  ctx.textAlign = "right";
  ctx.fillText("本周一起跑得最久的朋友", 930, 480);

  if (data.leaderboard.length === 0) {
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.font = font(400, 34);
    ctx.textAlign = "center";
    ctx.fillText("本周还没有伴听记录，下周约个朋友一起跑", W / 2, 760);
  }

  data.leaderboard.slice(0, 3).forEach((friend, i) => {
    const y = 610 + i * 190;
    if (i > 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(150, y - 96);
      ctx.lineTo(930, y - 96);
      ctx.stroke();
    }

    ctx.fillStyle = i === 0 ? "#169AF3" : "rgba(22,154,243,0.12)";
    ctx.beginPath();
    ctx.arc(174, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i === 0 ? "#FFFFFF" : "#169AF3";
    ctx.font = font(600, 30);
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), 174, y + 1);

    ctx.fillStyle = friend.color;
    ctx.beginPath();
    ctx.arc(278, y, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = font(600, 30);
    ctx.fillText(friend.name.slice(-1), 278, y + 1);

    ctx.fillStyle = "#17181A";
    ctx.font = font(600, 38);
    ctx.textAlign = "left";
    const displayName =
      friend.name.length > 8 ? `${friend.name.slice(0, 8)}…` : friend.name;
    ctx.fillText(displayName, 354, y - 16);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.font = font(400, 27);
    ctx.fillText(`一起跑了 ${friend.laps} 圈`, 354, y + 35);

    ctx.fillStyle = "#169AF3";
    ctx.font = font(600, 56);
    ctx.textAlign = "right";
    ctx.fillText(String(friend.minutes), 900, y - 4);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.font = font(400, 24);
    ctx.fillText("伴听分钟", 900, y + 38);
  });

  // 数据区
  const stats: Array<[string, string]> = [
    [`${data.minutes}`, "累计伴听（分钟）"],
    [`${data.laps}`, "并肩合跑（圈）"],
    [`${data.fives}`, "默契击掌（次）"],
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
  ctx.fillText("歌可以不同，脚步却总能同频", W / 2, 1540);
  ctx.fillText("有人陪着，普通的一圈也值得分享", W / 2, 1598);

  // 榜单说明与日期
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = font(400, 32);
  ctx.fillText(`伴听榜每周更新 · ${dateText}`, W / 2, 1710);

  // 标语
  ctx.fillStyle = "#169AF3";
  ctx.font = font(600, 44);
  ctx.fillText("这一首，陪你一起跑", W / 2, 1800);

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
