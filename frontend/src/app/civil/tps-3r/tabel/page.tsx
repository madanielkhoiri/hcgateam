'use client';

// ==================================================
// FILE: frontend/src/app/civil/tps-3r/tabel/page.tsx
// FUNGSI: Tabel Laporan TPS 3R (timbulan sampah) - format kolom mengikuti Excel
// ==================================================

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tps3rApi, type LaporanTps3r } from '@/lib/tps3r-api';
import { PaginationBar, hitungTotalHalaman } from '@/components/pagination/pagination-bar';
import { FormRincian, GRUP_TIMBULAN, TabelRincian, type BarisRincian } from '@/components/tps3r/rincian-tps3r';
import { formatTanggal } from '@/lib/format-tanggal';
import styles from '../../project/tender/tender.module.css';

// 31 = satu bulan penuh muat dalam satu halaman (seperti lembar Excel bulanan).
const UKURAN_HALAMAN = 31;

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const gayaSelect = { minWidth: 130, padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12 };

export default function Tps3rTabelPage() {
  const sekarang = new Date();
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState('');

  const [laporanList, setLaporanList] = useState<LaporanTps3r[]>([]);
  const [halaman, setHalaman] = useState(1);
  const [totalLaporan, setTotalLaporan] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{ baris: BarisRincian | null } | null>(null);

  function muatUlang() {
    setMemuat(true);
    setError(null);
    tps3rApi
      .daftar(bulan ? Number(bulan) : undefined, tahun ? Number(tahun) : undefined, halaman, UKURAN_HALAMAN)
      .then((hasil) => {
        setLaporanList(hasil.data);
        setTotalLaporan(hasil.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat data'))
      .finally(() => setMemuat(false));
  }

  useEffect(() => {
    setHalaman(1);
  }, [bulan, tahun]);

  useEffect(() => {
    muatUlang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, tahun, halaman]);

  async function hapus(baris: BarisRincian) {
    if (!confirm(`Hapus laporan tanggal ${formatTanggal(baris.tanggal, { timeZone: 'UTC' })}?`)) return;
    try {
      await tps3rApi.hapus(baris.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus laporan');
    }
  }

  const totalHalaman = hitungTotalHalaman(totalLaporan, UKURAN_HALAMAN);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Tabel Laporan TPS 3R</h1>
          <p>Timbulan sampah harian per jenis (kg), mengikuti format laporan Excel TPS 3R.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} style={gayaSelect}>
            <option value="">Semua Bulan</option>
            {NAMA_BULAN.map((nama, index) => (
              <option key={nama} value={index + 1}>{nama}</option>
            ))}
          </select>

          <select value={tahun} onChange={(e) => setTahun(e.target.value)} style={{ ...gayaSelect, minWidth: 100 }}>
            <option value="">Semua Tahun</option>
            {Array.from({ length: 7 }, (_, i) => sekarang.getFullYear() - 5 + i).map((th) => (
              <option key={th} value={th}>{th}</option>
            ))}
          </select>

          <button type="button" className={styles.primaryButton} onClick={() => setForm({ baris: null })}>
            <Plus size={16} />
            Tambah Laporan
          </button>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {memuat ? (
        <p className={styles.emptyText} style={{ padding: 16 }}>Memuat...</p>
      ) : laporanList.length === 0 ? (
        <p className={styles.emptyText} style={{ padding: 16 }}>Belum ada laporan pada periode ini.</p>
      ) : (
        <TabelRincian
          grup={GRUP_TIMBULAN}
          data={laporanList as unknown as BarisRincian[]}
          tampilPelapor
          labelTotal={totalHalaman > 1 ? 'Total (halaman ini)' : 'Total'}
          onEdit={(baris) => setForm({ baris })}
          onHapus={(baris) => void hapus(baris)}
        />
      )}

      <PaginationBar halaman={halaman} totalHalaman={totalHalaman} onGanti={setHalaman} />

      {form && (
        <FormRincian
          judul={form.baris ? 'Ubah Laporan Timbulan' : 'Tambah Laporan Timbulan'}
          grup={GRUP_TIMBULAN}
          baris={form.baris}
          onTutup={() => setForm(null)}
          onSimpan={async (payload) => {
            if (form.baris) await tps3rApi.ubah(form.baris.id, payload);
            else await tps3rApi.buat(payload);
            setForm(null);
            muatUlang();
          }}
        />
      )}
    </div>
  );
}
