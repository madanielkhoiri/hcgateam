'use client';

import { CalendarDays, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAccessToken } from '@/lib/access-control';
import { type MiningApiRow, rowsForDate, toEntryPayload } from './mining-template';
import styles from './order-pack-meal-mining.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function todayPontianak() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Pontianak', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function final(row: MiningApiRow, type: 'Lunch' | 'Dinner' | 'SpecialMeal' | 'SpecialSnack') {
  return Number(row[`roster${type}`] || 0) + Number(row[`additional${type}`] || 0);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`)).replaceAll(' ', '-');
}

export default function MiningOrderRecapPage() {
  const [date, setDate] = useState(todayPontianak());
  const [monthRows, setMonthRows] = useState<MiningApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/order-pack-meal-mining?month=${date.slice(0, 7)}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` }, cache: 'no-store',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Gagal memuat rekap order.');
      setMonthRows(result as MiningApiRow[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuat rekap order.');
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { void load(); }, [load]);
  const rows = useMemo(() => rowsForDate(monthRows, date), [monthRows, date]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({
    lunch: sum.lunch + final(row, 'Lunch'), dinner: sum.dinner + final(row, 'Dinner'),
    specialMeal: sum.specialMeal + final(row, 'SpecialMeal'),
    specialSnack: sum.specialSnack + final(row, 'SpecialSnack'),
  }), { lunch: 0, dinner: 0, specialMeal: 0, specialSnack: 0 }), [rows]);

  function editNotes(index: number, notes: string) {
    const target = rows[index];
    setMonthRows((current) => {
      const found = current.some((row) => row.date.slice(0, 10) === date && row.area.toUpperCase() === target.area);
      if (!found) return [...current, { ...target, notes }];
      return current.map((row) => row.date.slice(0, 10) === date && row.area.toUpperCase() === target.area ? { ...row, notes } : row);
    });
    setMessage('');
  }

  async function saveNotes() {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${API_URL}/order-pack-meal-mining/bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: rows.map((row) => toEntryPayload(row, date)) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(Array.isArray(result?.message) ? result.message.join(', ') : result?.message || 'Gagal menyimpan notes.');
      setMessage('Notes rekap berhasil disimpan.'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal menyimpan notes.'); }
    finally { setSaving(false); }
  }

  return <main className={styles.recapPage}>
    <section className={styles.sheetHeader}>
      <div className={styles.brandBlock}><img className={styles.ppaLogo} src="/logos/ppa.png" alt="PPA"/><div><h1>Rekap Order PackMeal</h1><p>Area Tambang PPA Wara</p><strong>TANGGAL&nbsp;&nbsp;&nbsp;&nbsp;{dateLabel(date)}</strong></div></div>
      <div className={styles.dailyTotals}><TotalRow label="Makan Siang" value={totals.lunch} tone="yellow"/><TotalRow label="Makan Malam" value={totals.dinner} tone="red"/><TotalRow label="Makan Spesial" value={totals.specialMeal} tone="green"/><TotalRow label="Snack Spesial" value={totals.specialSnack} tone="blue"/></div>
    </section>
    <section className={styles.recapControls}><label><CalendarDays size={16}/> Pilih tanggal rekap</label><input type="date" value={date} onChange={(event)=>setDate(event.target.value)}/><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Muat Ulang</button><button type="button" onClick={()=>void saveNotes()} disabled={saving||loading}><Save size={15}/> {saving?'Menyimpan...':'Simpan Notes'}</button></section>
    {(error||message)&&<div className={error?styles.error:styles.success}>{error||message}</div>}
    <section className={styles.recapTableWrap}><table className={styles.recapTable}><thead><tr><th>List Order</th><th>Tanggal</th><th>Makan Siang</th><th>Makan Malam</th><th>Makan Spesial</th><th>Snack Spesial</th><th>Area Drop Packmeal</th><th>Waktu Drop Packmeal (WITA)</th><th>Order By</th><th>Notes</th></tr></thead><tbody>{loading?<tr><td colSpan={10} className={styles.empty}>Memuat rekap...</td></tr>:rows.map((row,index)=><tr key={row.area}><td>{row.area}</td><td>{dateLabel(date)}</td><td className={styles.qty}>{final(row,'Lunch')||''}</td><td className={styles.qty}>{final(row,'Dinner')||''}</td><td className={styles.qty}>{final(row,'SpecialMeal')||''}</td><td className={styles.qty}>{final(row,'SpecialSnack')||''}</td><td>{row.dropLocation}</td><td className={styles.multiline}>{row.dropTimes}</td><td><span className={styles.orderBy}>GA PPA MINING</span></td><td><textarea value={row.notes??''} placeholder="Notes" onChange={(event)=>editNotes(index,event.target.value)}/></td></tr>)}</tbody></table></section>
  </main>;
}

function TotalRow({label,value,tone}:{label:string;value:number;tone:string}) { return <div className={styles[`total_${tone}`]}><strong>{label}</strong><b>{value.toLocaleString('id-ID')} Kotak</b></div>; }
