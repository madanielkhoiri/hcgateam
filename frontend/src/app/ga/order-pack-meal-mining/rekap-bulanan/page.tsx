'use client';

import { CalendarDays, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAccessToken } from '@/lib/access-control';
import { type MiningApiRow } from '../mining-template';
import styles from '../order-pack-meal-mining.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Pontianak', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).slice(0, 7);
}

function final(row: MiningApiRow, type: 'Lunch' | 'Dinner' | 'SpecialMeal' | 'SpecialSnack') {
  return Number(row[`roster${type}`] || 0) + Number(row[`additional${type}`] || 0);
}

function labelDate(date: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export default function RekapBulananMiningPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<MiningApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/order-pack-meal-mining?month=${month}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` }, cache: 'no-store',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Gagal memuat rekap bulanan.');
      setRows(result as MiningApiRow[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuat rekap bulanan.');
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  const daily = useMemo(() => {
    const grouped = new Map<string, { lunch: number; dinner: number; specialMeal: number; specialSnack: number }>();
    rows.forEach((row) => {
      const date = row.date.slice(0, 10);
      const current = grouped.get(date) ?? { lunch: 0, dinner: 0, specialMeal: 0, specialSnack: 0 };
      current.lunch += final(row, 'Lunch');
      current.dinner += final(row, 'Dinner');
      current.specialMeal += final(row, 'SpecialMeal');
      current.specialSnack += final(row, 'SpecialSnack');
      grouped.set(date, current);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const total = daily.reduce((sum, [, value]) => ({
    lunch: sum.lunch + value.lunch, dinner: sum.dinner + value.dinner,
    specialMeal: sum.specialMeal + value.specialMeal,
    specialSnack: sum.specialSnack + value.specialSnack,
  }), { lunch: 0, dinner: 0, specialMeal: 0, specialSnack: 0 });

  return <main className={styles.recapPage}>
    <section className={styles.inputHero}>
      <div><span>ORDER PACK MEAL MINING</span><h1>Rekap Bulanan</h1><p>Total order otomatis dikelompokkan per tanggal selama periode yang dipilih.</p></div>
      <label><CalendarDays size={16}/> Periode<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
    </section>
    <section className={styles.inputToolbar}><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Muat Ulang</button></section>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.dailySummaryGrid}>
      <MonthlyTotal label="Makan Siang" value={total.lunch} tone="yellow" />
      <MonthlyTotal label="Makan Malam" value={total.dinner} tone="red" />
      <MonthlyTotal label="Makan Spesial" value={total.specialMeal} tone="green" />
      <MonthlyTotal label="Snack Spesial" value={total.specialSnack} tone="blue" />
    </section>
    <section className={styles.recapTableWrap}>
      <table className={styles.monthTable}><thead><tr><th>Tanggal</th><th>Makan Siang</th><th>Makan Malam</th><th>Makan Spesial</th><th>Snack Spesial</th><th>Total Hari</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className={styles.empty}>Memuat rekap bulanan...</td></tr> : daily.length === 0 ? <tr><td colSpan={6} className={styles.empty}>Belum ada order pada bulan ini.</td></tr> : daily.map(([date, value]) => <tr key={date}><td>{labelDate(date)}</td><td>{value.lunch.toLocaleString('id-ID')} Kotak</td><td>{value.dinner.toLocaleString('id-ID')} Kotak</td><td>{value.specialMeal.toLocaleString('id-ID')} Kotak</td><td>{value.specialSnack.toLocaleString('id-ID')} Kotak</td><td className={styles.monthTotal}>{(value.lunch + value.dinner + value.specialMeal + value.specialSnack).toLocaleString('id-ID')} Kotak</td></tr>)}</tbody>
        {!loading && daily.length > 0 && <tfoot><tr><th>TOTAL BULAN</th><th>{total.lunch.toLocaleString('id-ID')} Kotak</th><th>{total.dinner.toLocaleString('id-ID')} Kotak</th><th>{total.specialMeal.toLocaleString('id-ID')} Kotak</th><th>{total.specialSnack.toLocaleString('id-ID')} Kotak</th><th>{(total.lunch + total.dinner + total.specialMeal + total.specialSnack).toLocaleString('id-ID')} Kotak</th></tr></tfoot>}
      </table>
    </section>
  </main>;
}

function MonthlyTotal({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`${styles.monthlyTotalCard} ${styles[`total_${tone}`]}`}><span>{label}</span><strong>{value.toLocaleString('id-ID')} Kotak</strong></div>;
}
