'use client';

// ==================================================
// FILE: frontend/src/app/civil/tps-3r/terkelola/page.tsx
// FUNGSI: Sampah Terkelola TPS 3R (penanganan sampah) - format kolom mengikuti Excel
// ==================================================

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { tps3rApi, type SampahTerkelolaTps3r } from '@/lib/tps3r-api';
import { FormRincian, GRUP_PENANGANAN, TabelRincian, type BarisRincian } from '@/components/tps3r/rincian-tps3r';
import { formatTanggal } from '@/lib/format-tanggal';
import styles from '../../project/tender/tender.module.css';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const gayaSelect = { minWidth: 130, padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12 };

export default function Page() {
  const sekarang = new Date();
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState('');
  const [data, setData] = useState<SampahTerkelolaTps3r[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ baris: BarisRincian | null } | null>(null);

  const load = useCallback(() => {
    setMemuat(true);
    return tps3rApi
      .daftarTerkelola(bulan ? Number(bulan) : undefined, tahun ? Number(tahun) : undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setMemuat(false));
  }, [bulan, tahun]);

  useEffect(() => {
    void load();
  }, [load]);

  async function hapus(baris: BarisRincian) {
    if (!confirm(`Hapus data sampah terkelola tanggal ${formatTanggal(baris.tanggal, { timeZone: 'UTC' })}?`)) return;
    try {
      await tps3rApi.hapusTerkelola(baris.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Sampah Terkelola</h1>
          <p>Penanganan sampah per tujuan (kg), mengikuti format laporan Excel TPS 3R.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} style={gayaSelect}>
            <option value="">Semua Bulan</option>
            {NAMA_BULAN.map((nama, index) => <option key={nama} value={index + 1}>{nama}</option>)}
          </select>
          <select value={tahun} onChange={(e) => setTahun(e.target.value)} style={{ ...gayaSelect, minWidth: 100 }}>
            <option value="">Semua Tahun</option>
            {Array.from({ length: 7 }, (_, i) => sekarang.getFullYear() - 5 + i).map((th) => <option key={th} value={th}>{th}</option>)}
          </select>
          <button type="button" className={styles.primaryButton} onClick={() => setForm({ baris: null })}>
            <Plus size={16} />
            Tambah Data
          </button>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {memuat && !data.length ? (
        <p className={styles.emptyText} style={{ padding: 16 }}>Memuat...</p>
      ) : !data.length ? (
        <p className={styles.emptyText} style={{ padding: 16 }}>Belum ada data sampah terkelola pada periode ini.</p>
      ) : (
        <TabelRincian
          grup={GRUP_PENANGANAN}
          data={data as unknown as BarisRincian[]}
          onEdit={(baris) => setForm({ baris })}
          onHapus={(baris) => void hapus(baris)}
        />
      )}

      {form && (
        <FormRincian
          judul={form.baris ? 'Ubah Sampah Terkelola' : 'Tambah Sampah Terkelola'}
          labelTanggal="Tanggal Penanganan"
          grup={GRUP_PENANGANAN}
          baris={form.baris}
          onTutup={() => setForm(null)}
          onSimpan={async (payload) => {
            if (form.baris) await tps3rApi.ubahTerkelola(form.baris.id, payload);
            else await tps3rApi.buatTerkelola(payload);
            setForm(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
