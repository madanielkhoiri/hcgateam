'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { STATUS_ALAT } from '@/components/tool-borrowing/tool-borrowing-modals';
import { toolBorrowingApi, type ToolAsset } from '@/lib/tool-borrowing-api';
import tp from '@/components/transport/transport.module.css';
import tb from '@/components/tool-borrowing/tool-borrowing.module.css';

export default function DashboardPeminjamanAlat() {
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toolBorrowingApi.tools()
      .then(setTools)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  const hitung = useMemo(() => {
    const by = (status: ToolAsset['status']) => tools.filter((tool) => tool.status === status).length;
    return { total: tools.length, tersedia: by('AVAILABLE'), dipinjam: by('BORROWED'), rusak: by('DAMAGED'), hilang: by('LOST') };
  }, [tools]);

  const cards: StatCard[] = [
    { label: 'Total Alat', value: hitung.total, initial: 'AL', iconBg: '#eaf2ff', iconColor: '#0868f6', trend: `GA ${tools.filter((t) => t.owner === 'GA').length} · Electric ${tools.filter((t) => t.owner === 'ELECTRIC').length}` },
    { label: 'Tersedia', value: hitung.tersedia, initial: 'OK', iconBg: '#e4f7ec', iconColor: '#07984c' },
    { label: 'Sedang Dipinjam', value: hitung.dipinjam, initial: 'PJ', iconBg: '#fff2df', iconColor: '#d97706' },
    { label: 'Rusak / Hilang', value: hitung.rusak + hitung.hilang, initial: '!', iconBg: '#fff0f3', iconColor: '#b02031', trend: `Rusak ${hitung.rusak} · Hilang ${hitung.hilang}`, trendColor: '#b02031' },
  ];

  const pie = [
    { label: 'Tersedia', value: hitung.tersedia, color: '#07984c' },
    { label: 'Dipinjam', value: hitung.dipinjam, color: '#d97706' },
    { label: 'Rusak', value: hitung.rusak, color: '#dc2626' },
    { label: 'Hilang', value: hitung.hilang, color: '#64748b' },
  ];

  const dipinjam = tools.filter((tool) => tool.status === 'BORROWED' && tool.loans[0]);

  return (
    <section>
      <div className={tp.hero}>
        <div>
          <span className={tp.heroIcon}><Wrench /></span>
          <div>
            <h1>Dashboard Peminjaman Alat</h1>
            <p>Ringkasan alat GA &amp; Electric. Setiap peminjaman wajib inspeksi sesuai form PPA-ADRO-F-HCGA-94.</p>
          </div>
        </div>
        <div className={tp.heroActions}>
          <Link className={tp.primary} href="/ga/peminjaman-alat/monitoring">Pinjam / Kembalikan Alat</Link>
        </div>
      </div>

      {error && <p className={tp.pageError}>{error}</p>}
      {loading ? <p className={tb.emptyText}>Memuat dashboard...</p> : <>
        <StatCardRow cards={cards} />
        <div className={tb.dashGrid}>
          <div className={tp.tablePanel}>
            <div className={tp.tableTitle}><h3>Alat Sedang Dipinjam</h3><span>{dipinjam.length} alat</span></div>
            <div className={tp.tableScroll}>
              <table>
                <thead><tr><th>No</th><th>Tim</th><th>Kode</th><th>Nama Alat</th><th>Peminjam</th><th>Sejak</th></tr></thead>
                <tbody>
                  {dipinjam.map((tool, index) => <tr key={tool.id}>
                    <td>{index + 1}</td><td>{tool.owner}</td><td><b>{tool.code}</b></td><td>{tool.name}</td>
                    <td>{tool.loans[0].borrower.name}<div className={tb.subText}>NRP {tool.loans[0].borrower.nrp}</div></td>
                    <td>{new Date(tool.loans[0].borrowedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>)}
                  {!dipinjam.length && <tr><td colSpan={6} className={tp.empty}>Tidak ada alat yang sedang dipinjam.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <SimplePieChart title="Status Alat" subtitle={`${hitung.total} alat terdaftar`} data={pie} satuan="alat" />
        </div>
        <div className={tb.legendNote}>Status: {Object.values(STATUS_ALAT).join(' · ')}</div>
      </>}
    </section>
  );
}
