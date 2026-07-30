import Modal from "./Modal";
import styles from "./ConfirmDialog.module.css";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} ariaLabel={title} variant="center">
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          再想想
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
