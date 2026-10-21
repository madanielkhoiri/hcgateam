'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './global-route-transition.module.css';

type Phase = 'buffering' | 'logo' | 'leaving' | 'hidden';

export function GlobalRouteTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(pathname === '/login' ? 'hidden' : 'buffering');
  const targetRef = useRef<string | null>(null);
  const previousPathRef = useRef<string | null>(null);
  const timersRef = useRef<number[]>([]);

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function later(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    if (pathname === '/login') {
      setPhase('hidden');
      return;
    }
    clearTimers();

    if (targetRef.current) {
      targetRef.current = null;
      setPhase('leaving');
      later(() => setPhase('hidden'), 280);
      return;
    }

    // Logo hanya untuk refresh/akses URL langsung dan sesudah login.
    if (previousPath === null || previousPath === '/login') {
      setPhase('buffering');
      later(() => setPhase('logo'), 280);
      later(() => setPhase('leaving'), 850);
      later(() => setPhase('hidden'), 1100);
    } else {
      setPhase('hidden');
    }
    return clearTimers;
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (destination.pathname === '/login') return;

      event.preventDefault();
      clearTimers();
      targetRef.current = `${destination.pathname}${destination.search}${destination.hash}`;
      setPhase('buffering');
      router.prefetch(targetRef.current);
      later(() => {
        if (targetRef.current) router.push(targetRef.current);
      }, 360);
      // Pengaman jika route tujuan tidak memicu perubahan pathname.
      later(() => {
        if (targetRef.current) {
          targetRef.current = null;
          setPhase('leaving');
          later(() => setPhase('hidden'), 280);
        }
      }, 5000);
    }

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearTimers();
    };
  }, [router]);

  if (phase === 'hidden') return null;

  return (
    <div className={`${styles.overlay} ${phase === 'leaving' ? styles.leaving : ''}`} role="status" aria-live="polite">
      {phase !== 'logo' ? (
        <div className={styles.buffering}>
          <span className={styles.spinner}><i /><i /><i /></span>
          <strong>Memuat halaman</strong>
          <small>HCGA CONNECT</small>
        </div>
      ) : (
        <div className={styles.logoStage}>
          <span className={styles.logoGlow} />
          <img src="/logos/hcga-connect.png" alt="HCGA Connect" />
        </div>
      )}
    </div>
  );
}
