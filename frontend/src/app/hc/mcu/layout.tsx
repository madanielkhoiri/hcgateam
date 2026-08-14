'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/layout.tsx
// FUNGSI: Shell modul MCU Periodik (guard akses + peran)
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
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
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  saveStoredUser,
  type PortalUser,
} from '@/lib/access-control';
import { mcuApi, type PeranMcu, type PeranSaya } from '@/lib/mcu-api';
import styles from './mcu.module.css';

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

  const konteks: KonteksMcu = {
    user,
    peran,
    profil,
    punyaPeran: (...diminta: PeranMcu[]) =>
      diminta.some((item) => peran.includes(item)),
  };

  return (
    <McuContext.Provider value={konteks}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/hc/mcu" className={styles.brand}>
            <span className={styles.brandLogo}>
              <HeartPulse size={20} />
            </span>
            MCU Periodik
          </Link>

          <div className={styles.topbarMeta}>
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

            <div className={styles.akun}>
              <strong>{user.name}</strong>
              <span>{formatRole(user.role)}</span>
            </div>
          </div>
        </header>

        <main className={styles.body}>{children}</main>
      </div>
    </McuContext.Provider>
  );
}
