import { useEffect, useRef, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import Modal from "./Modal";
import { GUEST_COLORS } from "../hooks/useGuests";
import styles from "./AddGuestModal.module.css";

const RELATIONS = ["刚在市集认识", "同事", "同学", "老跑友"];

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string, relationLabel: string) => void;
};

export default function AddGuestModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(GUEST_COLORS[0]);
  const [relation, setRelation] = useState(RELATIONS[0]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 每次打开都重置成一套新的随机配色，避免观众都是同一个颜色
  useEffect(() => {
    if (!open) return;
    setName("");
    setRelation(RELATIONS[0]);
    setColor(GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)]);
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  const submit = () => {
    if (!valid) return;
    onSubmit(trimmed, color, relation);
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel="添加现场观众">
      <div className={styles.header}>
        <UserPlus size={18} strokeWidth={2} className={styles.headerIcon} />
        <h3 className={styles.title}>加入这条跑道</h3>
      </div>
      <p className={styles.hint}>填个名字、挑个颜色，就能上唱片跑道一起跑。</p>

      <label className={styles.label} htmlFor="guest-name">
        名字
      </label>
      <input
        id="guest-name"
        ref={inputRef}
        className={styles.input}
        type="text"
        value={name}
        maxLength={6}
        placeholder="例如：小林"
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />

      <span className={styles.label}>队服颜色</span>
      <div className={styles.swatches} role="radiogroup" aria-label="队服颜色">
        {GUEST_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`颜色 ${c}`}
            className={styles.swatch}
            style={{ background: c }}
            onClick={() => setColor(c)}
          >
            {c === color && <Check size={16} strokeWidth={3} />}
          </button>
        ))}
      </div>

      <span className={styles.label}>关系</span>
      <div className={styles.chips} role="radiogroup" aria-label="关系">
        {RELATIONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={r === relation}
            className={`${styles.chip} ${r === relation ? styles.chipOn : ""}`}
            onClick={() => setRelation(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <div className={styles.preview}>
        <span
          className={styles.previewAvatar}
          style={{ background: color }}
          aria-hidden="true"
        >
          {(trimmed || "?").slice(-1)}
        </span>
        <span className={styles.previewText}>
          <strong>{trimmed || "还没填名字"}</strong>
          <span>跑友 · {relation}</span>
        </span>
      </div>

      <button
        type="button"
        className={styles.submit}
        aria-disabled={!valid}
        onClick={submit}
      >
        上跑道
      </button>
    </Modal>
  );
}
