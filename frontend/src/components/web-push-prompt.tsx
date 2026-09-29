'use client';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { aktifkanWebPush } from '@/lib/web-push';

export function WebPushPrompt() {
  const [error, setError] = useState('');
  const [aktif, setAktif] = useState(false);
  if (aktif || typeof Notification !== 'undefined' && Notification.permission === 'granted') return null;
  return (
    <button
      type="button"
      onClick={() =>
        void aktifkanWebPush()
          .then(() => setAktif(true))
          .catch((e: unknown) => {
            setError(e instanceof Error ? e.message : 'Notifikasi gagal diaktifkan.');
          })
      }
      style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000, border: 0, borderRadius: 999, padding: '12px 16px', background: '#0868f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
      title={error || 'Aktifkan notifikasi browser'}
    >
      <Bell size={16} /> {error || 'Aktifkan notifikasi'}
    </button>
  );
}
