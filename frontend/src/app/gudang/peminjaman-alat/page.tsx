'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, ClipboardCheck, Download, History, Keyboard, PackageCheck, QrCode, Search, Users, Wrench } from 'lucide-react';
import { getAccessToken, getStoredUser } from '@/lib/access-control';
import {
  toolBorrowingApi,
  type ToolAsset,
  type ToolEmployee,
  type ToolInspectionInput,
  type ToolInspectionResult,
  type ToolInspectionTemplate,
  type ToolLoan,
} from '@/lib/tool-borrowing-api';
import styles from './tool-borrowing.module.css';

const ALLOWED = ['GUDANG', 'SECTION_HEAD', 'ADMIN', 'SUPER_ADMIN', 'ELEKTRIK', 'GRUP_LEADER_GA'];
type Tab = 'monitoring' | 'employees' | 'tools' | 'history';

const STATUS: Record<ToolAsset['status'], string> = { AVAILABLE: 'Tersedia', BORROWED: 'Dipinjam', DAMAGED: 'Rusak', LOST: 'Hilang' };
const CONDITION = { GOOD: 'Baik', DAMAGED: 'Rusak', LOST: 'Hilang' } as const;
const METODE = { SCAN: 'Scan QR', MANUAL: 'Manual NRP' } as const;
const KODE_BAHAYA = [
  { kode: 'H', label: 'H — Kritikal: Stop & Perbaiki (Segera)' },
  { kode: 'S', label: 'S — Tinggi: Perbaiki dalam 12 jam' },
  { kode: 'M', label: 'M — Sedang: Perbaiki dalam 3 hari' },
];

export default function ToolBorrowingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('monitoring');
  const [canManage, setCanManage] = useState(false);
  const [employees, setEmployees] = useState<ToolEmployee[]>([]);
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [history, setHistory] = useState<ToolLoan[]>([]);
  const [templates, setTemplates] = useState<ToolInspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('ALL');
  const [employeeForm, setEmployeeForm] = useState({ nrp: '', name: '' });
  const [toolForm, setToolForm] = useState({ owner: 'GA', code: '', name: '', inspectionType: '' });
  const [target, setTarget] = useState<{ tool: ToolAsset; mode: 'borrow' | 'return' } | null>(null);
  const [viewInspection, setViewInspection] = useState<ToolLoan | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const user = getStoredUser();
      const manager = Boolean(user && user.role !== 'GUDANG');
      const [employeeRows, toolRows, historyRows, templateRows] = await Promise.all([
        manager ? toolBorrowingApi.employees() : Promise.resolve([]),
        toolBorrowingApi.tools(),
        manager ? toolBorrowingApi.history() : Promise.resolve([]),
        toolBorrowingApi.inspectionTemplates(),
      ]);
      setEmployees(employeeRows); setTools(toolRows); setHistory(historyRows); setTemplates(templateRows);
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
    try { await toolBorrowingApi.createTool(toolForm); setToolForm((current) => ({ ...current, code: '', name: '', inspectionType: '' })); setSuccess('Master alat berhasil ditambahkan.'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal menyimpan alat'); }
    finally { setBusy(false); }
  }

  async function changeInspectionType(tool: ToolAsset, inspectionType: string) {
    setError(''); setSuccess('');
    try {
      await toolBorrowingApi.updateToolInspection(tool.id, inspectionType);
      setSuccess(`Jenis inspeksi ${tool.code} diperbarui.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal mengubah jenis inspeksi'); }
  }

  async function downloadQr(employee: ToolEmployee) {
    try {
      const blob = await toolBorrowingApi.qrBlob(employee.id);
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `QR-${employee.nrp}-${employee.name}.svg`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal mengunduh QR'); }
  }

  const tabs = [
    { id: 'monitoring' as Tab, label: 'Monitoring', icon: PackageCheck },
    { id: 'employees' as Tab, label: 'Database Karyawan & QR', icon: Users },
    { id: 'tools' as Tab, label: 'Master Alat', icon: Wrench },
    { id: 'history' as Tab, label: 'Riwayat', icon: History },
  ].filter((item) => canManage || item.id === 'monitoring');

  const templateTitle = (key: string) => templates.find((item) => item.key === key)?.title ?? key;

  return <main className={styles.page}>
    <header className={styles.header}><button onClick={() => router.back()}><ArrowLeft size={19}/></button><div><span>GA & ELECTRIC</span><h1>Peminjaman Alat</h1><p>Kelola alat, QR karyawan, inspeksi, peminjaman, dan pengembalian.</p></div></header>
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
      <div className={styles.formRow}>
        <select value={toolForm.owner} onChange={(e) => setToolForm({ ...toolForm, owner: e.target.value })}><option value="GA">GA</option><option value="ELECTRIC">Electric</option></select>
        <input placeholder="Kode alat" value={toolForm.code} onChange={(e) => setToolForm({ ...toolForm, code: e.target.value })}/>
        <input placeholder="Nama alat" value={toolForm.name} onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}/>
        <select value={toolForm.inspectionType} onChange={(e) => setToolForm({ ...toolForm, inspectionType: e.target.value })} title="Checklist inspeksi saat dipinjam">
          <option value="">Jenis inspeksi: otomatis dari nama</option>
          {templates.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
        </select>
        <button disabled={busy} onClick={() => void addTool()}>+ Tambah Alat</button>
      </div>
      <ToolTable rows={tools} templates={templates} onChangeType={changeInspectionType} onAction={(tool, mode) => setTarget({ tool, mode })}/>
    </section>}

    {tab === 'history' && <section className={styles.panel}><div className={styles.tableWrap}><table><thead><tr><th>Tim</th><th>Kode Alat</th><th>Nama Alat</th><th>NRP</th><th>Nama Peminjam</th><th>Waktu Pinjam</th><th>Metode</th><th>Inspeksi</th><th>Waktu Kembali</th><th>Kondisi</th></tr></thead><tbody>{history.map((row) => <tr key={row.id}><td>{row.tool.owner}</td><td>{row.tool.code}</td><td>{row.tool.name}</td><td>{row.borrower.nrp}</td><td>{row.borrower.name}</td><td>{new Date(row.borrowedAt).toLocaleString('id-ID')}</td><td>{row.borrowMethod ? METODE[row.borrowMethod] : '-'}</td><td>{row.borrowInspection ? <button className={styles.linkButton} onClick={() => setViewInspection(row)}><ClipboardCheck size={14}/> {row.borrowInspection.items.some((item) => item.condition === 'TIDAK_BAIK') ? 'Ada temuan' : 'Semua baik'}</button> : <span className={styles.muted}>Belum ada</span>}</td><td>{row.returnedAt ? new Date(row.returnedAt).toLocaleString('id-ID') : '-'}</td><td>{row.returnCondition ? CONDITION[row.returnCondition] : 'Dipinjam'}</td></tr>)}</tbody></table></div></section>}

    {loading && <div className={styles.loading}>Memuat data...</div>}
    {target && <LoanModal
      tool={target.tool}
      mode={target.mode}
      template={templates.find((item) => item.key === target.tool.inspectionKey) ?? templates.find((item) => item.key === 'UMUM')}
      templateTitle={templateTitle(target.tool.inspectionKey)}
      onClose={() => setTarget(null)}
      onDone={async (message) => { setTarget(null); setSuccess(message); await load(); }}
    />}
    {viewInspection?.borrowInspection && <InspectionView loan={viewInspection} result={viewInspection.borrowInspection} onClose={() => setViewInspection(null)}/>}
  </main>;
}

function ToolTable({ rows, onAction, templates, onChangeType }: {
  rows: ToolAsset[];
  onAction: (tool: ToolAsset, mode: 'borrow' | 'return') => void;
  templates?: ToolInspectionTemplate[];
  onChangeType?: (tool: ToolAsset, inspectionType: string) => void;
}) {
  const showType = Boolean(templates && onChangeType);
  return <div className={styles.tableWrap}><table><thead><tr><th>Tim</th><th>Kode Alat</th><th>Nama Alat</th>{showType && <th>Jenis Inspeksi</th>}<th>NRP</th><th>Nama Peminjam</th><th>Status</th></tr></thead><tbody>{rows.map((tool) => { const active = tool.loans[0]; return <tr key={tool.id}><td>{tool.owner}</td><td><strong>{tool.code}</strong></td><td>{tool.name}</td>{showType && <td><select className={styles.typeSelect} value={tool.inspectionType ?? ''} onChange={(e) => onChangeType!(tool, e.target.value)}><option value="">Otomatis: {templates!.find((item) => item.key === tool.inspectionKey)?.title ?? tool.inspectionKey}</option>{templates!.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select></td>}<td>{active?.borrower.nrp || '-'}</td><td>{active?.borrower.name || '-'}</td><td><div className={styles.statusCell}><span className={`${styles.badge} ${styles[tool.status.toLowerCase()]}`}>{STATUS[tool.status]}</span>{tool.status === 'AVAILABLE' && <button onClick={() => onAction(tool, 'borrow')}>Pinjam</button>}{tool.status === 'BORROWED' && <button onClick={() => onAction(tool, 'return')}>Kembalikan</button>}</div></td></tr>; })}</tbody></table></div>;
}

/** Baca nama dari QR untuk ditampilkan; keabsahan tetap dicek server. */
function namaDariQr(raw: string): { nrp: string; name: string } | null {
  try {
    const data = JSON.parse(raw) as { type?: string; nrp?: string; name?: string };
    if (data.type !== 'HCGA_TOOL_EMPLOYEE' || !data.nrp || !data.name) return null;
    return { nrp: String(data.nrp), name: String(data.name).toUpperCase() };
  } catch { return null; }
}

function LoanModal({ tool, mode, template, templateTitle, onClose, onDone }: {
  tool: ToolAsset;
  mode: 'borrow' | 'return';
  template?: ToolInspectionTemplate;
  templateTitle: string;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [method, setMethod] = useState<'scan' | 'manual'>('scan');
  const [qrData, setQrData] = useState('');
  const [nrp, setNrp] = useState('');
  const [person, setPerson] = useState<{ nrp: string; name: string } | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'notfound'>('idle');
  const [step, setStep] = useState<'identity' | 'inspection'>('identity');
  const [inspection, setInspection] = useState<ToolInspectionInput>(() => ({
    items: (template?.items ?? []).map(() => ({ condition: '', hazardCode: '', note: '' })),
    notes: '',
  }));
  const [condition, setCondition] = useState('GOOD');
  const [returnNote, setReturnNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lookupSeq = useRef(0);

  // NRP manual: nama otomatis diambil dari Database Karyawan & QR.
  useEffect(() => {
    if (method !== 'manual') return;
    const value = nrp.trim();
    setPerson(null);
    if (!value) { setLookupState('idle'); return; }
    setLookupState('loading');
    const seq = ++lookupSeq.current;
    const timer = window.setTimeout(() => {
      toolBorrowingApi.lookupEmployee(value)
        .then((row) => { if (seq === lookupSeq.current) { setPerson(row); setLookupState('idle'); } })
        .catch(() => { if (seq === lookupSeq.current) setLookupState('notfound'); });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [nrp, method]);

  function gantiMetode(next: 'scan' | 'manual') {
    setMethod(next); setPerson(null); setQrData(''); setNrp(''); setLookupState('idle'); setError('');
  }

  async function scanPhoto(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      const text = result.getText();
      const dataQr = namaDariQr(text);
      if (!dataQr) throw new Error('QR bukan QR karyawan Peminjaman Alat');
      setQrData(text); setPerson(dataQr);
    } catch (caught) { setError(caught instanceof Error && caught.message.includes('QR bukan') ? caught.message : 'QR tidak terbaca. Coba foto ulang dengan lebih jelas.'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }

  const identity = method === 'scan' ? { qrData } : { nrp: nrp.trim() };
  const borrower = tool.loans[0]?.borrower;
  const terisi = inspection.items.filter((item) => item.condition).length;
  const adaKritis = inspection.items.some((item) => item.condition === 'TIDAK_BAIK' && item.hazardCode === 'H');

  function setItem(index: number, patch: Partial<ToolInspectionInput['items'][number]>) {
    setInspection((current) => ({ ...current, items: current.items.map((item, i) => (i === index ? { ...item, ...patch, ...(patch.condition === 'BAIK' ? { hazardCode: '' } : {}) } : item)) }));
  }

  function semuaBaik() {
    setInspection((current) => ({ ...current, items: current.items.map((item) => ({ ...item, condition: 'BAIK', hazardCode: '' })) }));
  }

  async function submit() {
    setBusy(true); setError('');
    try {
      if (mode === 'borrow') {
        const belum = inspection.items.findIndex((item) => !item.condition);
        if (belum >= 0) throw new Error(`Butir ${belum + 1} belum dipilih Baik / Tidak Baik`);
        const tanpaKode = inspection.items.findIndex((item) => item.condition === 'TIDAK_BAIK' && !item.hazardCode);
        if (tanpaKode >= 0) throw new Error(`Butir ${tanpaKode + 1} Tidak Baik: pilih kode bahaya`);
        await toolBorrowingApi.borrow(tool.id, { ...identity, inspection });
        await onDone(`${tool.code} berhasil dipinjam oleh ${person?.name ?? ''}. Inspeksi tersimpan.`);
      } else {
        await toolBorrowingApi.returnTool(tool.id, { ...identity, condition, note: returnNote });
        await onDone(`${tool.code} berhasil dikembalikan dengan kondisi ${CONDITION[condition as keyof typeof CONDITION]}.`);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  }

  return <div className={styles.modalBackdrop}>
    <section className={`${styles.modal} ${step === 'inspection' ? styles.modalWide : ''}`}>
      <button className={styles.close} onClick={onClose} aria-label="Tutup">×</button>
      <div className={styles.modalHead}>
        <span className={styles.modalIcon}>{step === 'inspection' ? <ClipboardCheck size={24}/> : <QrCode size={24}/>}</span>
        <div>
          <h2>{mode === 'borrow' ? (step === 'inspection' ? 'Inspeksi Alat Sebelum Dipinjam' : 'Identitas Peminjam') : 'Pengembalian Alat'}</h2>
          <p>{tool.code} — {tool.name}</p>
        </div>
      </div>
      {mode === 'borrow' && <div className={styles.steps}><span className={step === 'identity' ? styles.stepActive : styles.stepDone}>1. Identitas</span><span className={step === 'inspection' ? styles.stepActive : ''}>2. Inspeksi</span></div>}

      {step === 'identity' && <>
        {mode === 'return' && borrower && <div className={styles.identity}>Peminjam tercatat: <strong>{borrower.nrp} — {borrower.name}</strong></div>}
        <div className={styles.methodSwitch} role="tablist">
          <button type="button" className={method === 'scan' ? styles.methodActive : ''} onClick={() => gantiMetode('scan')}><QrCode size={16}/> Scan QR</button>
          <button type="button" className={method === 'manual' ? styles.methodActive : ''} onClick={() => gantiMetode('manual')}><Keyboard size={16}/> Manual NRP</button>
        </div>

        {method === 'scan' && <label className={styles.scanButton}><Camera size={19}/>{busy ? 'Membaca QR...' : qrData ? 'Scan Ulang QR' : 'Buka Kamera Depan untuk Scan QR'}<input type="file" accept="image/*" capture="user" disabled={busy} onChange={(e) => { void scanPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label>}

        {method === 'manual' && <div className={styles.manualGrid}>
          <label>NRP<input inputMode="numeric" autoFocus placeholder="Ketik NRP" value={nrp} onChange={(e) => setNrp(e.target.value)}/></label>
          <label>Nama<input readOnly value={person?.name ?? (lookupState === 'loading' ? 'Mencari...' : '')} placeholder="Terisi otomatis dari NRP"/></label>
          {lookupState === 'notfound' && <small className={styles.warnText}>NRP tidak terdaftar di Database Karyawan & QR. Daftarkan dulu di tab Database Karyawan.</small>}
        </div>}

        {person && <div className={styles.personCard}><span>{person.name.charAt(0)}</span><div><strong>{person.name}</strong><small>NRP {person.nrp} · {method === 'scan' ? 'dari QR' : 'dari database'}</small></div></div>}

        {mode === 'return' && <>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}><option value="GOOD">Kondisi kembali: Baik</option><option value="DAMAGED">Kondisi kembali: Rusak</option><option value="LOST">Kondisi kembali: Hilang</option></select>
          <textarea placeholder="Catatan kondisi (opsional)" value={returnNote} onChange={(e) => setReturnNote(e.target.value)}/>
        </>}

        {error && <div className={styles.modalError}>{error}</div>}
        {mode === 'borrow'
          ? <button type="button" className={styles.primaryButton} disabled={!person || busy} onClick={() => { setError(''); setStep('inspection'); }}>Lanjut ke Inspeksi</button>
          : <button type="button" className={styles.primaryButton} disabled={!person || busy} onClick={() => void submit()}>{busy ? 'Menyimpan...' : 'Simpan Pengembalian'}</button>}
        <small>Identitas pengembalian wajib sama dengan peminjam awal.</small>
      </>}

      {step === 'inspection' && template && <>
        <div className={styles.inspectionMeta}>
          <div><small>Checklist</small><strong>Peralatan Kerja — {templateTitle}</strong></div>
          <div><small>Diinspeksi oleh</small><strong>{person?.name} ({person?.nrp})</strong></div>
          <div><small>Terisi</small><strong>{terisi} / {inspection.items.length}</strong></div>
          <button type="button" className={styles.allGood} onClick={semuaBaik}>Tandai semua Baik</button>
        </div>
        <div className={styles.checklist}>
          {template.items.map((row, index) => {
            const value = inspection.items[index];
            return <div key={row.item} className={`${styles.checkRow} ${value.condition === 'TIDAK_BAIK' ? styles.checkRowBad : value.condition === 'BAIK' ? styles.checkRowGood : ''}`}>
              <span className={styles.checkNo}>{index + 1}</span>
              <div className={styles.checkText}><strong>{row.item}</strong><small>Standar: {row.standard}</small></div>
              <div className={styles.condSwitch}>
                <button type="button" className={value.condition === 'BAIK' ? styles.condGood : ''} onClick={() => setItem(index, { condition: 'BAIK' })}>Baik</button>
                <button type="button" className={value.condition === 'TIDAK_BAIK' ? styles.condBad : ''} onClick={() => setItem(index, { condition: 'TIDAK_BAIK' })}>Tidak Baik</button>
              </div>
              {value.condition === 'TIDAK_BAIK' && <div className={styles.badDetail}>
                <select value={value.hazardCode} onChange={(e) => setItem(index, { hazardCode: e.target.value })}><option value="">Pilih kode bahaya</option>{KODE_BAHAYA.map((item) => <option key={item.kode} value={item.kode}>{item.label}</option>)}</select>
                <input placeholder="Keterangan temuan" value={value.note} onChange={(e) => setItem(index, { note: e.target.value })}/>
              </div>}
            </div>;
          })}
        </div>
        <textarea placeholder="Catatan inspeksi (opsional)" value={inspection.notes} onChange={(e) => setInspection((current) => ({ ...current, notes: e.target.value }))}/>
        {adaKritis && <div className={styles.modalError}>Ada butir berkode H (Stop & Perbaiki Segera). Alat tidak boleh dipinjam sampai diperbaiki.</div>}
        {error && <div className={styles.modalError}>{error}</div>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => setStep('identity')} disabled={busy}>Kembali</button>
          <button type="button" className={styles.primaryButton} onClick={() => void submit()} disabled={busy || adaKritis || terisi < inspection.items.length}>{busy ? 'Menyimpan...' : 'Simpan Inspeksi & Pinjam'}</button>
        </div>
      </>}
    </section>
  </div>;
}

function InspectionView({ loan, result, onClose }: { loan: ToolLoan; result: ToolInspectionResult; onClose: () => void }) {
  return <div className={styles.modalBackdrop}>
    <section className={`${styles.modal} ${styles.modalWide}`}>
      <button className={styles.close} onClick={onClose} aria-label="Tutup">×</button>
      <div className={styles.modalHead}>
        <span className={styles.modalIcon}><ClipboardCheck size={24}/></span>
        <div><h2>Ceklist Inspeksi Peralatan Kerja — {result.title}</h2><p>{loan.tool.code} — {loan.tool.name} · {result.form}</p></div>
      </div>
      <div className={styles.inspectionMeta}>
        <div><small>Tanggal inspeksi</small><strong>{new Date(result.inspectedAt).toLocaleString('id-ID')}</strong></div>
        <div><small>Diinspeksi oleh</small><strong>{result.inspectedBy.name} ({result.inspectedBy.nrp})</strong></div>
        <div><small>Diperiksa oleh</small><strong>{result.checkedBy.name ?? '-'}</strong></div>
        <div><small>Metode identitas</small><strong>{loan.borrowMethod ? METODE[loan.borrowMethod] : '-'}</strong></div>
      </div>
      <div className={styles.tableWrap}><table className={styles.inspectionTable}><thead><tr><th>No</th><th>Hal yang Diperiksa</th><th>Standar</th><th>Kondisi</th><th>Kode Bahaya</th><th>Keterangan</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.no}><td>{item.no}</td><td>{item.item}</td><td>{item.standard}</td><td><span className={`${styles.badge} ${item.condition === 'BAIK' ? styles.available : styles.damaged}`}>{item.condition === 'BAIK' ? 'Baik' : 'Tidak Baik'}</span></td><td>{item.hazardCode ?? '-'}</td><td>{item.note ?? '-'}</td></tr>)}</tbody></table></div>
      {result.notes && <div className={styles.identity}><strong>Catatan:</strong> {result.notes}</div>}
    </section>
  </div>;
}
