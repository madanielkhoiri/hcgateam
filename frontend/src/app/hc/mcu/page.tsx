'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/page.tsx
// FUNGSI: Root modul MCU - redirect ke halaman pertama yang relevan
// untuk role akun ini. Dashboard cuma masuk akal untuk role yang
// mengelola lintas karyawan (HC/Admin Dept/Dokter) — role lain
// (Karyawan/SHE/Klinik) diarahkan ke menu utamanya sendiri, karena
// Dashboard sekarang ditolak backend untuk role tersebut.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMcu } from './layout';

export default function McuRootPage() {
  const router = useRouter();
  const { punyaPeran } = useMcu();

  useEffect(() => {
    if (punyaPeran('HC', 'ADMIN_DEPT', 'DOKTER')) {
      router.replace('/hc/mcu/dashboard');
    } else if (punyaPeran('KARYAWAN')) {
      router.replace('/hc/mcu/jadwal');
    } else if (punyaPeran('SHE')) {
      router.replace('/hc/mcu/induksi-ulang');
    } else if (punyaPeran('KLINIK')) {
      router.replace('/hc/mcu/hasil');
    } else {
      router.replace('/hc/mcu/notifikasi');
    }
  }, [router, punyaPeran]);

  return null;
}
