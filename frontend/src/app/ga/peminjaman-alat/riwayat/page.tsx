'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, History } from 'lucide-react';
import { getStoredUser } from '@/lib/access-control';
import { isAdminPeminjaman } from '@/components/tool-borrowing/akses';
import { CONDITION, InspectionView, METODE } from '@/components/tool-borrowing/tool-borrowing-modals';
import { toolBorrowingApi, type ToolLoan } from '@/lib/tool-borrowing-api';
import tp from '@/components/transport/transport.module.css';
import tb from '@/components/tool-borrowing/tool-borrowing.module.css';

import { formatTanggal } from '@/lib/format-tanggal';
const waktu = (value: string) => formatTanggal(new Date(value), { waktu: true });

export default function RiwayatPeminjaman() {
  const router = useRouter();
  const [rows, setRows] = useState<ToolLoan[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lihat, setLihat] = useState<ToolLoan | null>(null);

  useEffect(() => {
    if (!isAdminPeminjaman(getStoredUser())) { router.replace('/ga/peminjaman-alat/monitoring'); return; }
    toolBorrowingApi.history()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Gagal memuat riwayat'))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      (status === 'ALL' || (status === 'ACTIVE' ? !row.returnedAt : Boolean(row.returnedAt))) &&
      (!q || `${row.tool.code} ${row.tool.name} ${row.borrower.nrp} ${row.borrower.name}`.toLowerCase().includes(q)));
  }, [rows, search, status]);

  return (
    <section>
      <div className={tp.hero}>
        <div>
          <span className={tp.heroIcon}><History /></span>
          <div>
            <h1>Riwayat &amp; Inspeksi</h1>
            <p>Riwayat peminjaman dan pengembalian. Buka lembar ceklist inspeksi (format PDF HCGA-94) dari kolom Inspeksi.</p>
          </div>
        </div>
      </div>

      {error && <p className={tp.pageError}>{error}</p>}

      <div className={tp.filterPanel} style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(150px, 200px) auto' }}>
        <input placeholder="Cari kode, alat, NRP, atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari riwayat" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="ALL">Semua</option><option value="ACTIVE">Masih dipinjam</option><option value="DONE">Sudah kembali</option></select>
        <button type="button" onClick={() => { setSearch(''); setStatus('ALL'); }}>Reset</button>
      </div>

      <div className={tp.tablePanel}>
        <div className={tp.tableTitle}><h3>Riwayat Peminjaman</h3><span>Total {filtered.length} data</span></div>
        <div className={tp.tableScroll}>
          <table>
            <thead><tr><th>No</th><th>Tim</th><th>Alat</th><th>Peminjam</th><th>Waktu Pinjam</th><th>Metode</th><th>Inspeksi</th><th>Waktu Kembali</th><th>Kondisi</th></tr></thead>
            <tbody>
              {filtered.map((row, index) => {
                const temuan = row.borrowInspection?.items.some((item) => item.condition === 'TIDAK_BAIK');
                return <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.tool.owner}</td>
                  <td><b>{row.tool.code}</b><div className={tb.subText}>{row.tool.name}</div></td>
                  <td>{row.borrower.name}<div className={tb.subText}>NRP {row.borrower.nrp}</div></td>
                  <td>{waktu(row.borrowedAt)}</td>
                  <td>{row.borrowMethod ? METODE[row.borrowMethod] : '-'}</td>
                  <td>{row.borrowInspection
                    ? <button className={temuan ? tb.actionWarn : tb.actionSecondary} onClick={() => setLihat(row)}><ClipboardCheck size={14} /> {temuan ? 'Ada temuan' : 'Semua baik'}</button>
                    : <span className={tb.subText}>Belum ada</span>}</td>
                  <td>{row.returnedAt ? waktu(row.returnedAt) : '-'}</td>
                  <td>{row.returnCondition
                    ? <span className={`${tb.badge} ${row.returnCondition === 'GOOD' ? tb.available : tb.damaged}`}>{CONDITION[row.returnCondition]}</span>
                    : <span className={`${tb.badge} ${tb.borrowed}`}>Dipinjam</span>}</td>
                </tr>;
              })}
              {!filtered.length && <tr><td colSpan={9} className={tp.empty}>{loading ? 'Memuat data...' : 'Belum ada riwayat.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {lihat?.borrowInspection && <InspectionView loan={lihat} result={lihat.borrowInspection} onClose={() => setLihat(null)} />}
    </section>
  );
}
