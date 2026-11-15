'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, QrCode, X } from 'lucide-react';
import { getStoredUser } from '@/lib/access-control';
import { isAdminPeminjaman } from '@/components/tool-borrowing/akses';
import { toolBorrowingApi, type ToolEmployee } from '@/lib/tool-borrowing-api';
import tp from '@/components/transport/transport.module.css';
import tb from '@/components/tool-borrowing/tool-borrowing.module.css';

export default function DatabaseKaryawanQr() {
  const router = useRouter();
  const [rows, setRows] = useState<ToolEmployee[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nrp: '', name: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try { setRows(await toolBorrowingApi.employees()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat data'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!isAdminPeminjaman(getStoredUser())) { router.replace('/ga/peminjaman-alat/monitoring'); return; }
    void load();
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => !q || `${row.nrp} ${row.name}`.toLowerCase().includes(q));
  }, [rows, search]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setFormError('');
    try {
      await toolBorrowingApi.createEmployee(form);
      setModal(false); setForm({ nrp: '', name: '' });
      setSuccess('Karyawan dan QR unik berhasil dibuat.');
      await load();
    } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Gagal menyimpan karyawan'); }
    finally { setBusy(false); }
  }

  async function unduhQr(employee: ToolEmployee) {
    try {
      const blob = await toolBorrowingApi.qrBlob(employee.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `QR-${employee.nrp}-${employee.name}.svg`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal mengunduh QR'); }
  }

  return (
    <section>
      <div className={tp.hero}>
        <div>
          <span className={tp.heroIcon}><QrCode /></span>
          <div>
            <h1>Database Karyawan &amp; QR</h1>
            <p>Data NRP dan nama untuk QR peminjam. NRP di sini dipakai juga saat input manual (nama terisi otomatis).</p>
          </div>
        </div>
        <div className={tp.heroActions}>
          <button className={tp.primary} onClick={() => { setFormError(''); setModal(true); }}><Plus /> Tambah Karyawan</button>
        </div>
      </div>

      {error && <p className={tp.pageError}>{error}</p>}
      {success && <p className={tb.pageSuccess}>{success}</p>}

      <div className={tp.filterPanel} style={{ gridTemplateColumns: 'minmax(220px, 420px) auto' }}>
        <input placeholder="Cari NRP atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari karyawan" />
        <button type="button" onClick={() => setSearch('')}>Reset</button>
      </div>

      <div className={tp.tablePanel}>
        <div className={tp.tableTitle}><h3>Data Karyawan</h3><span>Total {filtered.length} karyawan</span></div>
        <div className={tp.tableScroll}>
          <table>
            <thead><tr><th>No</th><th>NRP</th><th>Nama</th><th>Status</th><th>QR</th></tr></thead>
            <tbody>
              {filtered.map((row, index) => <tr key={row.id}>
                <td>{index + 1}</td>
                <td><b>{row.nrp}</b></td>
                <td>{row.name}</td>
                <td><span className={`${tb.badge} ${row.isActive ? tb.available : tb.lost}`}>{row.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                <td><button className={tb.actionSecondary} onClick={() => void unduhQr(row)}><Download size={14} /> Unduh QR</button></td>
              </tr>)}
              {!filtered.length && <tr><td colSpan={5} className={tp.empty}>{loading ? 'Memuat data...' : 'Belum ada karyawan.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <div className={tp.modalBack}>
        <form className={tp.modal} onSubmit={submit}>
          <header>
            <div><h2>Tambah Karyawan</h2><p>QR unik dibuat otomatis dari NRP dan nama.</p></div>
            <button type="button" onClick={() => setModal(false)} aria-label="Tutup"><X /></button>
          </header>
          <div className={tp.formGrid}>
            <label>NRP<input required value={form.nrp} onChange={(e) => setForm((cur) => ({ ...cur, nrp: e.target.value }))} /></label>
            <label>Nama Karyawan<input required value={form.name} onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))} /></label>
          </div>
          {formError && <p className={tp.error}>{formError}</p>}
          <footer>
            <button type="button" onClick={() => setModal(false)}>Batal</button>
            <button className={tp.primary} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
          </footer>
        </form>
      </div>}
    </section>
  );
}
