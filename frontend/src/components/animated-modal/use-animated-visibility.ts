'use client';

// ==================================================
// FILE: frontend/src/components/animated-modal/use-animated-visibility.ts
// FUNGSI: Hook kecil supaya modal/overlay yang di-render kondisional
// ({open && <div>...</div>}) punya animasi masuk DAN keluar yang
// nyata. React biasanya unmount elemen SEKETIKA saat `open` jadi
// false, jadi animasi keluar tidak sempat kelihatan - hook ini
// menahan elemen tetap ter-mount sebentar (durasi EXIT_MS) sambil
// className "closing" aktif, baru benar-benar dilepas dari DOM.
//
// Sengaja berupa hook (bukan komponen pembungkus) supaya TIDAK
// menambah elemen DOM baru - jadi tidak mengganggu layout modal yang
// sudah ada (mis. modalOverlay yang pakai flex/grid buat nge-center
// panelnya). Tinggal tempel className closing ke elemen yang sudah
// ada.
//
// Pakai:
//   const modal = useAnimatedVisibility(open);
//   if (!modal.mounted) return null;
//   <div className={`${styles.modalOverlay} ${modal.closing ? styles.closing : ''}`}>
//     <section className={`${styles.accountModal} ${modal.closing ? styles.panelClosing : ''}`}>
// ==================================================

import { useEffect, useState } from 'react';

const DEFAULT_EXIT_MS = 180;

export function useAnimatedVisibility(open: boolean, exitMs: number = DEFAULT_EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    setMounted((wasMounted) => {
      if (!wasMounted) return wasMounted;
      setClosing(true);
      return wasMounted;
    });

    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, exitMs);

    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  return { mounted, closing };
}
