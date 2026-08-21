'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-penolakan-magang/layout.tsx
// FUNGSI: Shell modul Surat Penolakan Magang (guard akses)
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileX2, UsersRound } from 'lucide-react';
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
import styles from '../anak-magang/anak-magang.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type KonteksSuratPenolakan = {
  user: PortalUser;
};

const SuratPenolakanContext = createContext<KonteksSuratPenolakan | null>(
  null,
);

export function useSuratPenolakan(): KonteksSuratPenolakan {
  const konteks = useContext(SuratPenolakanContext);

  if (!konteks) {
    throw new Error(
      'useSuratPenolakan harus dipakai di dalam layout Surat Penolakan Magang',
    );
  }

  return konteks;
}

export default function LayoutSuratPenolakanMagang({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

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

      if (!hasAccess(sekarang, ACCESS_KEYS.HC_SURAT_PENOLAKAN_MAGANG)) {
        router.replace('/hc');
        return;
      }

      if (aktif) {
        setUser(sekarang);
      }
    }

    void muat();

    return () => {
      aktif = false;
    };
  }, [router]);

  if (!user) {
    return (
      <main className={styles.memuat}>
        Memuat modul Surat Penolakan Magang...
      </main>
    );
  }

  return (
    <SuratPenolakanContext.Provider value={{ user }}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/hc/surat-penolakan-magang" className={styles.brand}>
            <span className={styles.brandLogo}>
              <FileX2 size={20} />
            </span>
            Surat Penolakan Magang
          </Link>

          <div className={styles.profile}>
            <span className={styles.profileIcon}>
              <UsersRound size={20} />
            </span>
            <div className={styles.akun}>
              <strong>{user.name}</strong>
              <span>{formatRole(user.role)}</span>
            </div>
          </div>
        </header>

        <main className={styles.body}>{children}</main>
      </div>
    </SuratPenolakanContext.Provider>
  );
}
