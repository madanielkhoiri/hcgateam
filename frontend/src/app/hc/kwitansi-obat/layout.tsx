"use client";

import type { ReactNode } from "react";
import { ModuleShell, type ModuleShellMenuItem } from "@/components/module-shell/module-shell";

const menuItems: ModuleShellMenuItem[] = [
  { label: "Input Kwitansi", href: "/hc/kwitansi-obat#input", initial: "IK" },
  { label: "Rekap Bulanan", href: "/hc/kwitansi-obat#rekap", initial: "RB" },
];

export default function KwitansiObatLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      title="Kwitansi Obat"
      subtitle="Human Capital"
      deptBadge={{ text: "HC", color: "#0868f6", soft: "#eaf2ff" }}
      menuItems={menuItems}
      backHref="/hc"
      backLabel="Kembali ke HC"
    >
      {children}
    </ModuleShell>
  );
}
