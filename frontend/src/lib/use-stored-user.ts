'use client';

import { useEffect, useState } from 'react';
import { getStoredUser, type PortalUser } from './access-control';

/**
 * Versi hook dari getStoredUser() yang aman dari hydration mismatch.
 * getStoredUser() baca localStorage/sessionStorage — SSR tidak punya akses
 * itu, jadi selalu null di server. Kalau hasilnya dipakai LANGSUNG di body
 * komponen untuk menentukan JSX (mis. tombol "Kelola" tampil/tidak), HTML
 * dari server (anggap belum login) akan beda dari hasil client (akun asli
 * sudah login) — persis pola yang React sebut sebagai penyebab hydration
 * error di https://react.dev/link/hydration-mismatch.
 *
 * Hook ini sengaja mengembalikan null di render PERTAMA (sama seperti SSR),
 * baru diisi user asli lewat useEffect setelah mount — komponen otomatis
 * render ulang sekali dengan data asli begitu browser siap, tanpa mismatch.
 */
export function useStoredUser(): PortalUser | null {
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return user;
}
