'use client';

import { useEffect, useMemo, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { LoanModal, STATUS_ALAT } from '@/components/tool-borrowing/tool-borrowing-modals';
import { toolBorrowingApi, type ToolAsset, type ToolInspectionTemplate } from '@/lib/tool-borrowing-api';
import tp from '@/components/transport/transport.module.css';
import tb from '@/components/tool-borrowing/tool-borrowing.module.css';

export default function MonitoringAlat() {
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [templates, setTemplates] = useState<ToolInspectionTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<{ tool: ToolAsset; mode: 'borrow' | 'return' } | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const [toolRows, templateRows] = await Promise.all([toolBorrowingApi.tools(), toolBorrowingApi.inspectionTemplates()]);
      setTools(toolRows); setTemplates(templateRows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat data'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) =>
      (owner === 'ALL' || tool.owner === owner) &&
      (status === 'ALL' || tool.status === status) &&
      (!q || `${tool.code} ${tool.name} ${tool.loans[0]?.borrower.nrp || ''} ${tool.loans[0]?.borrower.name || ''}`.toLowerCase().includes(q)));
  }, [tools, search, owner, status]);

  const judulTemplate = (key: string) => templates.find((item) => item.key === key)?.title ?? key;

  return (
    <section>
      <div className={tp.hero}>
        <div>
          <span className={tp.heroIcon}><PackageCheck /></span>
          <div>
            <h1>Monitoring Alat</h1>
            <p>Pinjam dan kembalikan alat. Identitas lewat Scan QR atau NRP manual; peminjaman wajib inspeksi alat.</p>
          </div>
        </div>
      </div>

      {error && <p className={tp.pageError}>{error}</p>}
      {success && <p className={tb.pageSuccess}>{success}</p>}

      <div className={tp.filterPanel} style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(140px, 180px) minmax(140px, 180px) auto' }}>
        <input placeholder="Cari kode, nama alat, NRP, atau peminjam..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari alat" />
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter tim"><option value="ALL">Semua tim</option><option value="GA">GA</option><option value="ELECTRIC">Electric</option></select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="ALL">Semua status</option>{Object.entries(STATUS_ALAT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button type="button" onClick={() => { setSearch(''); setOwner('ALL'); setStatus('ALL'); }}>Reset</button>
      </div>

      <div className={tp.tablePanel}>
        <div className={tp.tableTitle}><h3>Daftar Alat</h3><span>Total {rows.length} alat</span></div>
        <div className={tp.tableScroll}>
          <table>
            <thead><tr><th>No</th><th>Tim</th><th>Kode Alat</th><th>Nama Alat</th><th>Checklist</th><th>Peminjam</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.map((tool, index) => {
                const aktif = tool.loans[0];
                return <tr key={tool.id}>
                  <td>{index + 1}</td>
                  <td>{tool.owner}</td>
                  <td><b>{tool.code}</b></td>
                  <td>{tool.name}</td>
                  <td>{judulTemplate(tool.inspectionKey)}</td>
                  <td>{aktif ? <>{aktif.borrower.name}<div className={tb.subText}>NRP {aktif.borrower.nrp}</div></> : '-'}</td>
                  <td><span className={`${tb.badge} ${tb[tool.status.toLowerCase()]}`}>{STATUS_ALAT[tool.status]}</span></td>
                  <td>
                    {tool.status === 'AVAILABLE' && <button className={tb.actionPrimary} onClick={() => { setSuccess(''); setTarget({ tool, mode: 'borrow' }); }}>Pinjam</button>}
                    {tool.status === 'BORROWED' && <button className={tb.actionSecondary} onClick={() => { setSuccess(''); setTarget({ tool, mode: 'return' }); }}>Kembalikan</button>}
                    {(tool.status === 'DAMAGED' || tool.status === 'LOST') && <span className={tb.subText}>-</span>}
                  </td>
                </tr>;
              })}
              {!rows.length && <tr><td colSpan={8} className={tp.empty}>{loading ? 'Memuat data...' : 'Tidak ada alat.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {target && <LoanModal
        tool={target.tool}
        mode={target.mode}
        template={templates.find((item) => item.key === target.tool.inspectionKey) ?? templates.find((item) => item.key === 'UMUM')}
        templateTitle={judulTemplate(target.tool.inspectionKey)}
        onClose={() => setTarget(null)}
        onDone={async (message) => { setTarget(null); setSuccess(message); await load(); }}
      />}
    </section>
  );
}
