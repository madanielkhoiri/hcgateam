"use client";
import "./hc-globals.css";

import type { ReactNode } from "react";
import {
  ModuleShell,
  type ModuleShellMenuItem,
} from "@/components/module-shell/module-shell";

const MENU_DEKLARASI_DINAS: ModuleShellMenuItem[] = [
  { label: "Beranda", href: "/hc/deklarasi-dinas", initial: "BR", exact: true },
  {
    label: "Saldo Aktif",
    href: "/hc/deklarasi-dinas#saldo-aktif-dashboard",
    initial: "SA",
  },
  { label: "Upload Nota", href: "/hc/upload-nota", initial: "UN" },
  {
    label: "Surat Tugas Dinas",
    href: "/hc/surat-tugas-dinas-saya",
    initial: "ST",
  },
  { label: "Riwayat & Status", href: "/hc/riwayat", initial: "RS" },
  {
    label: "Perlu Revisi",
    href: "/hc/riwayat?status=DITOLAK",
    initial: "PR",
  },
];

/* <--- layout karyawan dengan bottom navigation mobile seperti livin ---> */

type LayoutKaryawanProps = {
  children: ReactNode;
};

export default function LayoutKaryawan({ children }: LayoutKaryawanProps) {
  return (
    <ModuleShell
        title="Deklarasi Dinas"
        subtitle="Human Capital"
        deptBadge={{ text: "HC", color: "#0868f6", soft: "#eaf2ff" }}
        menuItems={MENU_DEKLARASI_DINAS}
        backHref="/hc"
        backLabel="Kembali ke HC"
      >
        {children}
      </ModuleShell>
  );
}

/* <--- end ---> */
