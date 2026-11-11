"use client";

import { Plus, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import styles from "./eprom-create-panel.module.css";

type EpromCreatePanelProps = {
  children: ReactNode;
  label?: string;
  title?: string;
  disabled?: boolean;
};

export function EpromCreatePanel({
  children,
  label = "Tambah Data",
  title = "Input Data Baru",
  disabled = false,
}: EpromCreatePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.section}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={open ? styles.closeButton : styles.addButton}
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={open}
        >
          {open ? <X size={17} /> : <Plus size={17} />}
          {open ? "Tutup Form" : label}
        </button>
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelTitle}>{title}</div>
          {children}
        </div>
      )}
    </section>
  );
}
