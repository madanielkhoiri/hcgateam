'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/layout.tsx
// FUNGSI: Shell modul MCU Periodik (guard akses + peran)
// ==================================================

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  getAccessToken,
  getStoredUser,
  hasAccess,
  saveStoredUser,
  type PortalUser,
} from '@/lib/access-control';
import { mcuApi, type PeranMcu, type PeranSaya } from '@/lib/mcu-api';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import styles from './mcu.module.css';

type ItemMenuMcu = ModuleShellMenuItem & { peran: PeranMcu[] };

// Peran yang boleh lihat tiap menu — dicocokkan ke pengecekan role sungguhan
// di backend (McuAksesService.wajibPeran per endpoint), BUKAN sekadar
// dugaan UI. Karyawan cuma dapat menu yang datanya sudah di-scope ke
// miliknya sendiri sisi server (Jadwal, Follow Up, Notifikasi) atau punya
// tampilan ringkas khusus (Rekomendasi -> /rekomendasi/saya, Hasil MCU ->
// /hasil/saya). Menu murni administratif (Surat Pengantar, Klinik, dst)
// tetap disembunyikan karena endpoint-nya memang menolak role Karyawan.
const MENU_MCU: ItemMenuMcu[] = [
  { label: 'Dashboard', href: '/hc/mcu/dashboard', initial: 'DB', peran: ['HC', 'ADMIN_DEPT', 'DOKTER'] },
  { label: 'Jadwal', href: '/hc/mcu/jadwal', initial: 'JD', peran: ['HC', 'ADMIN_DEPT', 'KARYAWAN'] },
  { label: 'Hasil MCU', href: '/hc/mcu/hasil', initial: 'HM', peran: ['HC', 'ADMIN_DEPT', 'DOKTER', 'KLINIK', 'KARYAWAN'] },
  { label: 'Follow Up', href: '/hc/mcu/follow-up', initial: 'FU', peran: ['HC', 'ADMIN_DEPT', 'DOKTER', 'KARYAWAN', 'KLINIK'] },
  { label: 'Rekomendasi', href: '/hc/mcu/rekomendasi', initial: 'RK', peran: ['HC', 'ADMIN_DEPT', 'DOKTER', 'KARYAWAN'] },
  { label: 'Induksi Ulang', href: '/hc/mcu/induksi-ulang', initial: 'IU', peran: ['HC', 'ADMIN_DEPT', 'SHE'] },
  { label: 'Surat Pengantar', href: '/hc/mcu/surat-pengantar', initial: 'SP', peran: ['HC'] },
  { label: 'Klinik', href: '/hc/mcu/klinik', initial: 'KL', peran: ['HC'] },
  { label: 'History', href: '/hc/mcu/history', initial: 'HS', peran: ['HC'] },
  { label: 'Notifikasi', href: '/hc/mcu/notifikasi', initial: 'NT', peran: ['HC', 'ADMIN_DEPT', 'DOKTER', 'SHE', 'KLINIK', 'KARYAWAN'] },
  { label: 'Retensi', href: '/hc/mcu/retensi', initial: 'RT', peran: ['HC'] },
  { label: 'Karyawan', href: '/hc/mcu/karyawan', initial: 'KR', peran: ['HC'] },
];

function menuUntukPeran(peran: PeranMcu[]): ModuleShellMenuItem[] {
  return MENU_MCU.filter((item) => item.peran.some((p) => peran.includes(p)));
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ==================================================
// KONTEKS PERAN
// Dipakai halaman anak untuk menyembunyikan aksi
// yang bukan wewenang akun tersebut.
// ==================================================

type KonteksMcu = {
  user: PortalUser;
  peran: PeranMcu[];
  punyaPeran: (...peran: PeranMcu[]) => boolean;
  profil: PeranSaya | null;
};

const McuContext = createContext<KonteksMcu | null>(null);

export function useMcu(): KonteksMcu {
  const konteks = useContext(McuContext);

  if (!konteks) {
    throw new Error('useMcu harus dipakai di dalam layout MCU');
  }

  return konteks;
}

export default function LayoutMcu({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [profil, setProfil] = useState<PeranSaya | null>(null);

  useEffect(() => {
    let aktif = true;

    async function muat() {
      const token = getAccessToken();
      const tersimpan = getStoredUser();

      if (!token || !tersimpan) {
        clearSession();
        router.replace('/login');
        return;
      }

      let sekarang = tersimpan;

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (response.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }

        if (response.ok) {
          sekarang = (await response.json()) as PortalUser;
          saveStoredUser(sekarang);
        }
      } catch {
        // Pakai sesi terakhir bila backend sementara tidak terjangkau.
      }

      if (!hasAccess(sekarang, ACCESS_KEYS.HC_MCU)) {
        router.replace('/hc');
        return;
      }

      let peranMcu: PeranSaya | null = null;

      try {
        peranMcu = await mcuApi.ambil<PeranSaya>('/peran/saya');
      } catch {
        // Peran MCU belum diset - UI tampil mode baca saja.
      }

      if (aktif) {
        setUser(sekarang);
        setProfil(peranMcu);
      }
    }

    void muat();

    return () => {
      aktif = false;
    };
  }, [router]);

  if (!user) {
    return <main className={styles.memuat}>Memuat modul MCU Periodik...</main>;
  }

  const peran = profil?.peran ?? [];
  const menuMcu = menuUntukPeran(peran);

  const konteks: KonteksMcu = {
    user,
    peran,
    profil,
    punyaPeran: (...diminta: PeranMcu[]) =>
      diminta.some((item) => peran.includes(item)),
  };

  return (
    <McuContext.Provider value={konteks}>
      <ModuleShell
        title="Modul MCU"
        subtitle="Human Capital"
        deptBadge={{ text: 'HC', color: '#0868f6', soft: '#eaf2ff' }}
        menuItems={menuMcu}
        backHref="/hc"
        backLabel="Kembali ke HC"
      >
        <main className={styles.body}>
          <div className={styles.peranList}>
            {profil?.labelPeran.length ? (
              profil.labelPeran.map((label) => (
                <span key={label} className={styles.peranChip}>
                  {label}
                </span>
              ))
            ) : (
              <span className={styles.peranChip}>Peran MCU belum diset</span>
            )}
          </div>

          {children}
        </main>
      </ModuleShell>
    </McuContext.Provider>
  );
}
