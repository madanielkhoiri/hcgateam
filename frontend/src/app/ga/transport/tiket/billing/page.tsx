'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/tiket/billing/page.tsx
// FUNGSI: Upload ZIP invoice tiket -> gabung jadi 1 PDF rekap grid
// 8 kotak (otomatis turun ke 6 kotak kalau ada invoice yang kepanjangan)
// ==================================================

import { ChangeEvent, useState } from 'react';
import { FileStack, Loader2, UploadCloud } from 'lucide-react';
import { getAccessToken } from '@/lib/access-control';
import transportStyles from '@/components/transport/transport.module.css';
import styles from './billing.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function TiketBillingPage() {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const [sukses, setSukses] = useState('');

  function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (file && !file.name.toLowerCase().endsWith('.zip')) {
      setGalat('File wajib berformat ZIP');
      setBerkas(null);
      return;
    }

    setGalat('');
    setSukses('');
    setBerkas(file);
  }

  async function buatRekap() {
    if (!berkas) {
      setGalat('Pilih file ZIP terlebih dahulu');
      return;
    }

    setGalat('');
    setSukses('');
    setProses(true);

    // Popup dibuka SEBELUM fetch supaya tidak diblokir popup blocker
    // (fetch-nya asinkron dan bisa makan waktu untuk banyak invoice).
    const popup = window.open('', '_blank');

    try {
      const formData = new FormData();
      formData.append('zip', berkas);

      const response = await fetch(`${API_URL}/tiket/billing/rekap`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const teks = await response.text();
        let pesan = 'Gagal membuat rekap billing';

        try {
          const data = JSON.parse(teks) as { message?: string | string[] };
          pesan = Array.isArray(data.message)
            ? data.message[0]
            : data.message || pesan;
        } catch {
          // Biarkan pesan default kalau body bukan JSON.
        }

        throw new Error(pesan);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (popup) {
        popup.location.href = url;
      } else {
        window.location.href = url;
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);

      setSukses('Rekap billing berhasil dibuat dan dibuka di tab baru.');
    } catch (error) {
      popup?.close();
      setGalat(error instanceof Error ? error.message : 'Rekap gagal dibuat');
    } finally {
      setProses(false);
    }
  }

  return (
    <>
      <div className={transportStyles.hero}>
        <div>
          <span className={transportStyles.heroIcon}>
            <FileStack size={24} />
          </span>
          <div>
            <h1>Billing</h1>
            <p>
              Unggah 1 file ZIP berisi invoice (PDF), sistem otomatis
              menggabungkannya jadi 1 PDF rekap dengan tata letak 8
              invoice per halaman (2 kolom x 4 baris), turun otomatis ke 6
              per halaman kalau ada invoice yang terlalu panjang untuk
              muat rapi.
            </p>
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <label className={styles.uploadBox}>
          <UploadCloud size={28} />
          <div>
            <strong>
              {berkas ? berkas.name : 'Pilih atau tarik file ZIP ke sini'}
            </strong>
            <small>
              1 file ZIP berisi invoice PDF, urut sesuai nama file di
              dalamnya
            </small>
          </div>
          <input type="file" accept=".zip" onChange={pilihBerkas} />
        </label>

        {galat ? <div className={styles.errorMessage}>{galat}</div> : null}
        {sukses ? (
          <div className={styles.successMessage}>{sukses}</div>
        ) : null}

        <button
          type="button"
          className={transportStyles.primary}
          onClick={() => void buatRekap()}
          disabled={proses || !berkas}
        >
          {proses ? (
            <>
              <Loader2 size={16} className={styles.spin} />
              Memproses rekap...
            </>
          ) : (
            <>
              <FileStack size={16} />
              Buat Rekap PDF
            </>
          )}
        </button>
      </section>
    </>
  );
}
