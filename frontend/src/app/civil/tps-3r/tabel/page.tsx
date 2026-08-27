'use client';

// ==================================================
// FILE: frontend/src/app/civil/tps-3r/tabel/page.tsx
// FUNGSI: Tabel Laporan TPS 3R - tambah/ubah/hapus laporan timbangan
// ==================================================

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/civil-project/modal';
import {
  tps3rApi,
  type LaporanTps3r,
  type LaporanTps3rInput,
} from '@/lib/tps3r-api';
import styles from '../../project/tender/tender.module.css';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatKg(nilai: number) {
  return `${nilai.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
}

const FORM_KOSONG: LaporanTps3rInput = {
  tanggal: new Date().toISOString().slice(0, 10),
  beratOrganik: 0,
  beratNonOrganik: 0,
  beratReuse: 0,
  beratRecycle: 0,
  beratResidu: 0,
};

export default function Tps3rTabelPage() {
  const sekarang = new Date();
  const [bulan, setBulan] = useState(sekarang.getMonth() + 1);
  const [tahun, setTahun] = useState(sekarang.getFullYear());

  const [laporanList, setLaporanList] = useState<LaporanTps3r[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LaporanTps3rInput>(FORM_KOSONG);
  const [submitting, setSubmitting] = useState(false);

  function muatUlang() {
    setMemuat(true);
    setError(null);
    tps3rApi
      .daftar(bulan, tahun)
      .then(setLaporanList)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat data'))
      .finally(() => setMemuat(false));
  }

  useEffect(() => {
    muatUlang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, tahun]);

  function bukaTambah() {
    setEditingId(null);
    setForm(FORM_KOSONG);
    setFormOpen(true);
  }

  function bukaEdit(item: LaporanTps3r) {
    setEditingId(item.id);
    setForm({
      tanggal: item.tanggal.slice(0, 10),
      beratOrganik: item.beratOrganik,
      beratNonOrganik: item.beratNonOrganik,
      beratReuse: item.beratReuse,
      beratRecycle: item.beratRecycle,
      beratResidu: item.beratResidu,
    });
    setFormOpen(true);
  }

  async function simpan() {
    if (!form.tanggal) {
      setError('Tanggal wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await tps3rApi.ubah(editingId, form);
      } else {
        await tps3rApi.buat(form);
      }
      setFormOpen(false);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan laporan');
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(item: LaporanTps3r) {
    if (!confirm(`Hapus laporan tanggal ${formatTanggal(item.tanggal)}?`)) return;
    try {
      await tps3rApi.hapus(item.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus laporan');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Tabel Laporan TPS 3R</h1>
          <p>Daftar laporan timbangan sampah per periode.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            style={{ minWidth: 130, padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12 }}
          >
            {NAMA_BULAN.map((nama, index) => (
              <option key={nama} value={index + 1}>{nama}</option>
            ))}
          </select>

          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            style={{ minWidth: 100, padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12 }}
          >
            {Array.from({ length: 5 }, (_, i) => sekarang.getFullYear() - 2 + i).map((th) => (
              <option key={th} value={th}>{th}</option>
            ))}
          </select>

          <button type="button" className={styles.primaryButton} onClick={bukaTambah}>
            <Plus size={16} />
            Tambah Laporan
          </button>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.tableWrap}>
        {memuat ? (
          <p className={styles.emptyText} style={{ padding: 16 }}>Memuat...</p>
        ) : laporanList.length === 0 ? (
          <p className={styles.emptyText} style={{ padding: 16 }}>Belum ada laporan pada periode ini.</p>
        ) : (
          <table className={styles.table} style={{ textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>Tanggal</th>
                <th style={{ textAlign: 'center' }}>Organik</th>
                <th style={{ textAlign: 'center' }}>Non Organik</th>
                <th style={{ textAlign: 'center' }}>Reuse</th>
                <th style={{ textAlign: 'center' }}>Recycle</th>
                <th style={{ textAlign: 'center' }}>Residu</th>
                <th style={{ textAlign: 'center' }}>Dilaporkan Oleh</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {laporanList.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>{formatTanggal(item.tanggal)}</td>
                  <td style={{ textAlign: 'center' }}>{formatKg(item.beratOrganik)}</td>
                  <td style={{ textAlign: 'center' }}>{formatKg(item.beratNonOrganik)}</td>
                  <td style={{ textAlign: 'center' }}>{formatKg(item.beratReuse)}</td>
                  <td style={{ textAlign: 'center' }}>{formatKg(item.beratRecycle)}</td>
                  <td style={{ textAlign: 'center' }}>{formatKg(item.beratResidu)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {item.createdBy.name}
                    {item.createdBy.nrp ? <small>{item.createdBy.nrp}</small> : null}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button type="button" className={styles.iconButton} onClick={() => bukaEdit(item)}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" className={styles.iconButtonDanger} onClick={() => hapus(item)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <Modal title={editingId ? 'Ubah Laporan' : 'Tambah Laporan'} onClose={() => setFormOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: '#34506f' }}>
              Tanggal
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm((cur) => ({ ...cur, tanggal: e.target.value }))}
                style={{ padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12.5 }}
              />
            </label>

            <FieldBerat label="Organik (kg)" value={form.beratOrganik} onChange={(v) => setForm((cur) => ({ ...cur, beratOrganik: v }))} />
            <FieldBerat label="Non Organik (kg)" value={form.beratNonOrganik} onChange={(v) => setForm((cur) => ({ ...cur, beratNonOrganik: v }))} />
            <FieldBerat label="Guna Ulang / Reuse (kg)" value={form.beratReuse} onChange={(v) => setForm((cur) => ({ ...cur, beratReuse: v }))} />
            <FieldBerat label="Daur Ulang / Recycle (kg)" value={form.beratRecycle} onChange={(v) => setForm((cur) => ({ ...cur, beratRecycle: v }))} />
            <FieldBerat label="Residu (kg)" value={form.beratResidu} onChange={(v) => setForm((cur) => ({ ...cur, beratResidu: v }))} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className={styles.secondaryButton} onClick={() => setFormOpen(false)} disabled={submitting}>
                Batal
              </button>
              <button type="button" className={styles.primaryButton} onClick={simpan} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FieldBerat({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: '#34506f' }}>
      {label}
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12.5 }}
      />
    </label>
  );
}
