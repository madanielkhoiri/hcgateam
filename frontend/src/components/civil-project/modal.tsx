"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";
import styles from "./modal.module.css";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <strong>{title}</strong>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
