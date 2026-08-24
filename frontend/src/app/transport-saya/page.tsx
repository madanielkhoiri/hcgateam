'use client';

import Link from 'next/link';
import { Bus, Ticket } from 'lucide-react';
import styles from './transport-saya.module.css';

export default function TransportSayaLandingPage() {
  return (
    <div className={styles.landingGrid}>
      <Link href="/transport-saya/tiket" className={styles.landingCard}>
        <Ticket />
        <strong>Tiket Saya</strong>
        <span>Riwayat cuti dan unduh tiket dari Admin.</span>
      </Link>
      <Link href="/transport-saya/travel" className={styles.landingCard}>
        <Bus />
        <strong>Travel Saya</strong>
        <span>Jadwal travel, check-in, dan check-out.</span>
      </Link>
    </div>
  );
}
