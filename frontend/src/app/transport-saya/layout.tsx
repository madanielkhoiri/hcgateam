'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, LogOut } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { clearSession, getAccessToken, getStoredUser, type PortalUser } from '@/lib/access-control';
import { KaryawanRingkas, TransportApiError, transportApi } from '@/lib/transport-api';
import styles from './transport-saya.module.css';

export default function TransportSayaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [siap, setSiap] = useState(false);
  const [profil, setProfil] = useState<KaryawanRingkas | null>(null);
  const [cekProfil, setCekProfil] = useState(true);
  const [nik, setNik] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      clearSession();
      router.replace('/login');
      return;
    }

    setUser(storedUser);
    setSiap(true);

    if (storedUser.role === 'DRIVER') {
      setCekProfil(false);
      return;
    }

    transportApi.tiket
      .profilSaya()
      .then(setProfil)
      .catch(() => setProfil(null))
      .finally(() => setCekProfil(false));
  }, [router]);

  async function tautkanNik(event: FormEvent) {
    event.preventDefault();
    setClaimError('');
    setClaiming(true);
    try {
      setProfil(await transportApi.tiket.tautkanNik(nik));
    } catch (err) {
      setClaimError(err instanceof TransportApiError ? err.message : 'NIK gagal ditautkan');
    } finally {
      setClaiming(false);
    }
  }

  function logout() {
    clearSession();
    router.replace('/login');
    router.refresh();
  }

  if (!siap || cekProfil) return null;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href={user?.role === 'DRIVER' ? '/transport-saya/driver' : '/dashboard'}>
          <ChevronLeft size={16} /> {user?.role === 'DRIVER' ? 'Trip Saya' : 'Dashboard'}
        </Link>
        <h1>Tiket & Travel Saya</h1>
        <button
          type="button"
          onClick={logout}
          title="Keluar"
          aria-label="Keluar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'none',
            color: '#b02031',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} /> Keluar
        </button>
      </header>
      <main className={styles.main}>
        {user?.role !== 'DRIVER' && !profil ? (
          <form className={styles.card} onSubmit={tautkanNik}>
            <h3>Tautkan Akun ke Data Karyawan</h3>
            <p>
              Akun Anda belum terhubung ke database Karyawan HC, dan NRP akun ini tidak cocok otomatis dengan data
              Karyawan manapun. Masukkan NRP Anda secara manual untuk menautkannya (cukup sekali).
            </p>
            <input
              placeholder="NRP"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                margin: '10px 0',
                padding: '0 12px',
                border: '1px solid #cbd9e8',
                borderRadius: 11,
                fontSize: 14,
              }}
            />
            {claimError && <p className={styles.errorText}>{claimError}</p>}
            <button className={styles.primaryButton} disabled={claiming || !nik.trim()}>
              {claiming ? 'Menautkan...' : 'Tautkan NRP'}
            </button>
          </form>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
