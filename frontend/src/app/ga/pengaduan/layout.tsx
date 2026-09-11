'use client';

// ==================================================
// FILE: frontend/src/app/ga/pengaduan/layout.tsx
// FUNGSI: Shell modul Pengaduan Layanan (GA) - ModuleShell sidebar.
// Guard akses & pengambilan user tetap ditangani masing-masing halaman
// (PengaduanLayananPage / RekapPerformaPage, komponen bersama HC/GA/CIVIL
// yang tidak boleh diubah) - layout ini murni bungkus tampilan sidebar.
// ==================================================

import { type ReactNode } from 'react';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';

const MENU_PENGADUAN_GA: ModuleShellMenuItem[] = [
  { label: 'Aduan Layanan', href: '/ga/pengaduan', initial: 'AL' },
  { label: 'Rekap Performa', href: '/ga/pengaduan/rekap', initial: 'RP' },
];

export default function LayoutPengaduanGa({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      title="Pengaduan Layanan"
      subtitle="General Affairs"
      deptBadge={{ text: 'GA', color: '#0a9f59', soft: '#e8f8ef' }}
      menuItems={MENU_PENGADUAN_GA}
      backHref="/ga"
      backLabel="Kembali ke GA"
    >
      {children}
    </ModuleShell>
  );
}
