import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  variant?: "sheet" | "center";
  children: ReactNode;
};

export default function Modal({
  open,
  onClose,
  ariaLabel,
  variant = "sheet",
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.mask} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={variant === "sheet" ? styles.sheet : styles.center}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          aria-label="关闭"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2} />
        </button>
        {children}
      </div>
    </div>
  );
}
