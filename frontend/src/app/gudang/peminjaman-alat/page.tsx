'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Download, History, PackageCheck, QrCode, Search, Users, Wrench } from 'lucide-react';
import { getAccessToken, getStoredUser } from '@/lib/access-control';
import { toolBorrowingApi, type ToolAsset, type ToolEmployee, type ToolLoan } from '@/lib/tool-borrowing-api';
import styles from './tool-borrowing.module.css';

const ALLOWED = ['GUDANG', 'SECTION_HEAD', 'ADMIN', 'SUPER_ADMIN', 'ELEKTRIK', 'GRUP_LEADER_GA'];
type Tab = 'monitoring' | 'employees' | 'tools' | 'history';

const STATUS: Record<ToolAsset['status'], string> = { AVAILABLE: 'Tersedia', BORROWED: 'Dipinjam', DAMAGED: 'Rusak', LOST: 'Hilang' };
const CONDITION = { GOOD: 'Baik', DAMAGED: 'Rusak', LOST: 'Hilang' } as const;

export default function ToolBorrowingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('monitoring');
  const [canManage, setCanManage] = useState(false);
  const [employees, setEmployees] = useState<ToolEmployee[]>([]);
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [history, setHistory] = useState<ToolLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('ALL');
  const [employeeForm, setEmployeeForm] = useState({ nrp: '', name: '' });
  const [toolForm, setToolForm] = useState({ owner: 'GA', code: '', name: '' });
  const [target, setTarget] = useState<{ tool: ToolAsset; mode: 'borrow' | 'return' } | null>(null);
  const [condition, setCondition] = useState('GOOD');
  const [returnNote, setReturnNote] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const user = getStoredUser();
      const manager = Boolean(user && user.role !== 'GUDANG');
      const [employeeRows, toolRows, historyRows] = await Promise.all([
        manager ? toolBorrowingApi.employees() : Promise.resolve([]),
        toolBorrowingApi.tools(),
        manager ? toolBorrowingApi.history() : Promise.resolve([]),
      ]);
      setEmployees(employeeRows); setTools(toolRows); setHistory(historyRows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat data'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const user = getStoredUser();
    if (!getAccessToken() || !user || !ALLOWED.includes(user.role)) { router.replace('/dashboard'); return; }
    setCanManage(user.role !== 'GUDANG');
    void load();
  }, [router]);

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => (owner === 'ALL' || tool.owner === owner) && (!q || `${tool.code} ${tool.name} ${tool.loans[0]?.borrower.nrp || ''} ${tool.loans[0]?.borrower.name || ''}`.toLowerCase().includes(q)));
  }, [tools, search, owner]);

  async function addEmployee() {
    setBusy(true); setError(''); setSuccess('');
    try { await toolBorrowingApi.createEmployee(employeeForm); setEmployeeForm({ nrp: '', name: '' }); setSuccess('Karyawan dan QR unik berhasil dibuat.'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal menyimpan karyawan'); }
    finally { setBusy(false); }
  }

  async function addTool() {
    setBusy(true); setError(''); setSuccess('');
    try { await toolBorrowingApi.createTool(toolForm); setToolForm((current) => ({ ...current, code: '', name: '' })); setSuccess('Master alat berhasil ditambahkan.'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal menyimpan alat'); }
    finally { setBusy(false); }
  }

  async function downloadQr(employee: ToolEmployee) {
    try {
      const blob = await toolBorrowingApi.qrBlob(employee.id);
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `QR-${employee.nrp}-${employee.name}.svg`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal mengunduh QR'); }
  }

  async function scanPhoto(file?: File) {
    if (!file || !target) return;
    setBusy(true); setError(''); setSuccess('');
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      const qrData = result.getText();
      if (target.mode === 'borrow') {
        await toolBorrowingApi.borrow(target.tool.id, qrData);
        setSuccess(`${target.tool.code} berhasil dipinjam.`);
      } else {
        await toolBorrowingApi.returnTool(target.tool.id, { qrData, condition, note: returnNote });
        setSuccess(`${target.tool.code} berhasil dikembalikan dengan kondisi ${CONDITION[condition as keyof typeof CONDITION]}.`);
      }
      setTarget(null); setReturnNote(''); setCondition('GOOD'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'QR tidak terbaca'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }

  const tabs = [
    { id: 'monitoring' as Tab, label: 'Monitoring', icon: PackageCheck },
    { id: 'employees' as Tab, label: 'Database Karyawan & QR', icon: Users },
    { id: 'tools' as Tab, label: 'Master Alat', icon: Wrench },
    { id: 'history' as Tab, label: 'Riwayat', icon: History },
  ].filter((item) => canManage || item.id === 'monitoring');

  return <main className={styles.page}>
    <header className={styles.header}><button onClick={() => router.back()}><ArrowLeft size={19}/></button><div><span>GA & ELECTRIC</span><h1>Peminjaman Alat</h1><p>Kelola alat, QR karyawan, peminjaman, dan pengembalian.</p></div></header>
    <nav className={styles.tabs}>{tabs.map((item) => <button key={item.id} className={tab === item.id ? styles.activeTab : ''} onClick={() => setTab(item.id)}><item.icon size={17}/>{item.label}</button>)}</nav>
    {error && <div className={styles.error}>{error}</div>}{success && <div className={styles.success}>{success}</div>}

    {tab === 'monitoring' && <section className={styles.panel}>
      <div className={styles.toolbar}><label><Search size={17}/><input placeholder="Cari kode, alat, NRP, atau nama..." value={search} onChange={(e) => setSearch(e.target.value)}/></label><select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="ALL">Semua Tim</option><option value="GA">GA</option><option value="ELECTRIC">Electric</option></select></div>
      <ToolTable rows={filteredTools} onAction={(tool, mode) => { setTarget({ tool, mode }); setError(''); setSuccess(''); }}/>
    </section>}

    {tab === 'employees' && <section className={styles.panel}>
      <div className={styles.formRow}><input placeholder="NRP" value={employeeForm.nrp} onChange={(e) => setEmployeeForm({ ...employeeForm, nrp: e.target.value })}/><input placeholder="Nama karyawan" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}/><button disabled={busy} onClick={() => void addEmployee()}>+ Tambah Karyawan</button></div>
      <div className={styles.employeeGrid}>{employees.map((employee) => <article key={employee.id}><div className={styles.qrMark}><QrCode size={28}/></div><div><strong>{employee.name}</strong><span>NRP {employee.nrp}</span></div><button onClick={() => void downloadQr(employee)}><Download size={15}/> Unduh QR</button></article>)}</div>
    </section>}

    {tab === 'tools' && <section className={styles.panel}>
      <div className={styles.formRow}><select value={toolForm.owner} onChange={(e) => setToolForm({ ...toolForm, owner: e.target.value })}><option value="GA">GA</option><option value="ELECTRIC">Electric</option></select><input placeholder="Kode alat" value={toolForm.code} onChange={(e) => setToolForm({ ...toolForm, code: e.target.value })}/><input placeholder="Nama alat" value={toolForm.name} onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}/><button disabled={busy} onClick={() => void addTool()}>+ Tambah Alat</button></div>
      <ToolTable rows={tools} onAction={(tool, mode) => setTarget({ tool, mode })}/>
    </section>}

    {tab === 'history' && <section className={styles.panel}><div className={styles.tableWrap}><table><thead><tr><th>Tim</th><th>Kode Alat</th><th>Nama Alat</th><th>NRP</th><th>Nama Peminjam</th><th>Waktu Pinjam</th><th>Waktu Kembali</th><th>Kondisi</th></tr></thead><tbody>{history.map((row) => <tr key={row.id}><td>{row.tool.owner}</td><td>{row.tool.code}</td><td>{row.tool.name}</td><td>{row.borrower.nrp}</td><td>{row.borrower.name}</td><td>{new Date(row.borrowedAt).toLocaleString('id-ID')}</td><td>{row.returnedAt ? new Date(row.returnedAt).toLocaleString('id-ID') : '-'}</td><td>{row.returnCondition ? CONDITION[row.returnCondition] : 'Dipinjam'}</td></tr>)}</tbody></table></div></section>}

    {loading && <div className={styles.loading}>Memuat data...</div>}
    {target && <div className={styles.modalBackdrop}><section className={styles.modal}><button className={styles.close} onClick={() => setTarget(null)}>×</button><QrCode size={36}/><h2>{target.mode === 'borrow' ? 'Scan QR Peminjam' : 'Scan QR Pengembali'}</h2><p>{target.tool.code} — {target.tool.name}</p>{target.mode === 'return' && <><div className={styles.identity}>Peminjam tercatat: <strong>{target.tool.loans[0]?.borrower.nrp} — {target.tool.loans[0]?.borrower.name}</strong></div><select value={condition} onChange={(e) => setCondition(e.target.value)}><option value="GOOD">Baik</option><option value="DAMAGED">Rusak</option><option value="LOST">Hilang</option></select><textarea placeholder="Catatan kondisi (opsional)" value={returnNote} onChange={(e) => setReturnNote(e.target.value)}/></>}
      <label className={styles.scanButton}><Camera size={19}/>{busy ? 'Membaca QR...' : 'Buka Kamera Depan'}<input type="file" accept="image/*" capture="user" disabled={busy} onChange={(e) => { void scanPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label><small>Posisikan QR dengan jelas, lalu ambil foto. Identitas pengembalian wajib sama dengan peminjam awal.</small></section></div>}
  </main>;
}

function ToolTable({ rows, onAction }: { rows: ToolAsset[]; onAction: (tool: ToolAsset, mode: 'borrow' | 'return') => void }) {
  return <div className={styles.tableWrap}><table><thead><tr><th>Tim</th><th>Kode Alat</th><th>Nama Alat</th><th>NRP</th><th>Nama Peminjam</th><th>Status</th></tr></thead><tbody>{rows.map((tool) => { const active = tool.loans[0]; return <tr key={tool.id}><td>{tool.owner}</td><td><strong>{tool.code}</strong></td><td>{tool.name}</td><td>{active?.borrower.nrp || '-'}</td><td>{active?.borrower.name || '-'}</td><td><div className={styles.statusCell}><span className={`${styles.badge} ${styles[tool.status.toLowerCase()]}`}>{STATUS[tool.status]}</span>{tool.status === 'AVAILABLE' && <button onClick={() => onAction(tool, 'borrow')}>Pinjam</button>}{tool.status === 'BORROWED' && <button onClick={() => onAction(tool, 'return')}>Kembalikan</button>}</div></td></tr>; })}</tbody></table></div>;
}
