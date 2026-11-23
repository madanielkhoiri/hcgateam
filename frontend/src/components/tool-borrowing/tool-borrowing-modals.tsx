'use client';

// Komponen bersama modul Peminjaman Alat (GA): modal pinjam/kembali
// (Scan QR / Manual NRP + inspeksi) dan lembar ceklist format PDF HCGA-94.

import { useEffect, useRef, useState } from 'react';
import { Camera, ClipboardCheck, Keyboard, QrCode } from 'lucide-react';
import {
  toolBorrowingApi,
  type ToolAsset,
  type ToolInspectionInput,
  type ToolInspectionResult,
  type ToolInspectionTemplate,
  type ToolLoan,
} from '@/lib/tool-borrowing-api';
import styles from './tool-borrowing.module.css';

import { formatTanggal } from '@/lib/format-tanggal';
export const STATUS_ALAT: Record<ToolAsset['status'], string> = { AVAILABLE: 'Tersedia', BORROWED: 'Dipinjam', DAMAGED: 'Rusak', LOST: 'Hilang' };
export const CONDITION = { GOOD: 'Baik', DAMAGED: 'Rusak', LOST: 'Hilang' } as const;
export const METODE = { SCAN: 'Scan QR', MANUAL: 'Manual NRP' } as const;
const KODE_BAHAYA = [
  { kode: 'H', label: 'H — Kritikal: Stop & Perbaiki (Segera)' },
  { kode: 'S', label: 'S — Tinggi: Perbaiki dalam 12 jam' },
  { kode: 'M', label: 'M — Sedang: Perbaiki dalam 3 hari' },
];

/** Baca nama dari QR untuk ditampilkan; keabsahan tetap dicek server. */
function namaDariQr(raw: string): { nrp: string; name: string } | null {
  try {
    const data = JSON.parse(raw) as { type?: string; nrp?: string; name?: string };
    if (data.type !== 'HCGA_TOOL_EMPLOYEE' || !data.nrp || !data.name) return null;
    return { nrp: String(data.nrp), name: String(data.name).toUpperCase() };
  } catch { return null; }
}

export function LoanModal({ tool, mode, template, templateTitle, onClose, onDone }: {
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
    location: '',
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
        {template.withLocation && <div className={styles.manualGrid}><label>Lokasi<input placeholder="Lokasi pemakaian alat" value={inspection.location} onChange={(e) => setInspection((current) => ({ ...current, location: e.target.value }))}/></label></div>}
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

const BAHAYA = [
  ['Kematian atau Kerugian Barang Besar >US$ 10000', 'Bahaya Resiko KRITIKAL', 'Stop & Perbaiki (Segera)', 'H'],
  ['Cidera Serius / Kerugian Barang US$ 5000 to 10000', 'Bahaya Resiko Tinggi', 'Perbaiki Dalam12 Jam', 'S'],
  ['Perlu tindakan Medis / Kerugian Barang US$ 1000 to 5000', 'Bahaya Resiko Sedang', 'Perbaiki Dalam 3 Hari', 'M'],
] as const;

function tanggalForm(value: string) {
  return formatTanggal(new Date(value));
}

/** Lembar ceklist dengan format sama seperti form PDF PPA-ADRO-F-HCGA-94. */
export function InspectionView({ loan, result, onClose }: { loan: ToolLoan; result: ToolInspectionResult; onClose: () => void }) {
  const tanggal = tanggalForm(result.inspectedAt);
  const lokasi = result.templateKey === 'JACK_HAMMER';
  return <div className={styles.modalBackdrop}>
    <section className={`${styles.modal} ${styles.modalSheet}`}>
      <div className={styles.sheetToolbar}>
        <span>{loan.tool.code} — {loan.tool.name} · {loan.borrowMethod ? METODE[loan.borrowMethod] : '-'}</span>
        <div>
          <button type="button" className={styles.secondaryButton} onClick={() => window.print()}>Cetak / Simpan PDF</button>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Tutup</button>
        </div>
      </div>
      <div className={styles.sheetScroll}>
        <div className={styles.sheet} id="lembar-inspeksi">
          <table className={styles.sheetHead}>
            <colgroup><col style={{ width: '18%' }}/><col style={{ width: '56%' }}/><col style={{ width: '12%' }}/><col style={{ width: '14%' }}/></colgroup>
            <tbody>
              <tr>
                <td rowSpan={4} className={styles.sheetLogo}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logos/ppa.png" alt="PPA"/></td>
                <td rowSpan={4} className={styles.sheetTitle}>CEKLIST INSPEKSI<br/>PERALATAN KERJA<br/>{result.title.toUpperCase()}</td>
                <td className={styles.sheetMeta}>No.Dokumen:</td><td className={styles.sheetMeta}>{result.form}</td>
              </tr>
              <tr><td className={styles.sheetMeta}>Revisi:</td><td className={styles.sheetMeta}>0</td></tr>
              <tr><td className={styles.sheetMeta}>Tgl Efektif:</td><td className={styles.sheetMeta}>7-Jun-22</td></tr>
              <tr><td className={styles.sheetMeta}>Halaman:</td><td className={styles.sheetMeta}>1 dari 1</td></tr>
            </tbody>
          </table>
          <table className={styles.sheetInfo}>
            <colgroup><col style={{ width: '18%' }}/><col/></colgroup>
            <tbody>
              <tr><th>DEPARTEMEN :</th><td>HCGA</td></tr>
              {lokasi
                ? <><tr><th>DATE :</th><td>{tanggal}</td></tr><tr><th>LOKASI :</th><td>{result.location ?? ''}</td></tr></>
                : <tr><th>TANGGAL INSPEKSI :</th><td>{tanggal}</td></tr>}
            </tbody>
          </table>
          <table className={styles.sheetTable}>
            <colgroup><col style={{ width: '5%' }}/><col style={{ width: '27%' }}/><col style={{ width: '34%' }}/><col style={{ width: '8%' }}/><col style={{ width: '8%' }}/><col style={{ width: '18%' }}/></colgroup>
            <thead>
              <tr><th rowSpan={2}>NO</th><th rowSpan={2}>HAL YANG DIPERIKSA</th><th rowSpan={2}>STANDAR</th><th colSpan={2}>Kondisi</th><th rowSpan={2}>KETERANGAN</th></tr>
              <tr><th className={styles.sheetSub}>Baik</th><th className={styles.sheetSub}>Tidak Baik</th></tr>
            </thead>
            <tbody>
              {result.items.map((item) => <tr key={item.no}>
                <td className={styles.sheetCenter}>{item.no}</td>
                <td>{item.item}</td>
                <td>{item.standard}</td>
                <td className={styles.sheetCheck}>{item.condition === 'BAIK' ? '✓' : ''}</td>
                <td className={styles.sheetCheck}>{item.condition === 'TIDAK_BAIK' ? '✓' : ''}</td>
                <td>{item.condition === 'TIDAK_BAIK' ? [item.hazardCode ? `Kode ${item.hazardCode}` : '', item.note ?? ''].filter(Boolean).join(' — ') : ''}</td>
              </tr>)}
              <tr className={styles.sheetBlank}><td/><td/><td/><td/><td/><td/></tr>
              <tr className={styles.sheetLegendHead}><td/><th>KEMUNGKINAN AKIBAT</th><th>TIPE BAHAYA</th><th colSpan={1}>TINDAKAN DIPERLUKAN</th><th colSpan={2}>KODE BAHAYA</th></tr>
              {BAHAYA.map(([akibat, tipe, tindakan, kode]) => <tr key={kode} className={styles.sheetLegend}>
                <td/><td className={styles.sheetCenter}>{akibat}</td><td className={styles.sheetCenter}><b>{tipe}</b></td><td className={styles.sheetCenter}><b>{tindakan}</b></td><td colSpan={2} className={styles.sheetCenter}><b>{kode}</b></td>
              </tr>)}
              <tr><td colSpan={6} className={styles.sheetNotes}>Catatan : {result.notes ?? ''}</td></tr>
              <tr className={styles.sheetSign}><td/><td>Diinspeksi Oleh : <b>{result.inspectedBy.name}</b><br/><small>NRP {result.inspectedBy.nrp}</small></td><td>Tanda Tangan:</td><td colSpan={3}>Tanggal : {tanggal}</td></tr>
              <tr className={styles.sheetSign}><td/><td>Diperiksa Oleh : <b>{result.checkedBy.name ?? ''}</b></td><td>Tanda Tangan:</td><td colSpan={3}>Tanggal : {tanggal}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>;
}
