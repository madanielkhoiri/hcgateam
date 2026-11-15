'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { getStoredUser } from '@/lib/access-control';
import { messApi, type MessRecap, type MessRecapSession } from '@/lib/mess-monitoring-api';
import styles from '../mess.module.css';
import rk from './rekap.module.css';

type Tab = 'harian' | 'detail' | 'petugas';
const BUILDINGS = ['A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3'];
const buildingLabel = (value: string) => /^[123]$/.test(value) ? `Staff ${value}` : `Mess ${value}`;

/** Tanggal hari ini (WITA) dalam format YYYY-MM-DD. */
function todayWita(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function firstOfMonthWita() { return `${todayWita().slice(0, 8)}01`; }
function formatDay(key: string) {
  return new Date(`${key}T00:00:00+08:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace('.', ':');
}
function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '-';
  const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
function statusOf(session: MessRecapSession) {
  if (!session.finishedAt) return 'PROSES';
  return session.status === 'TIDAK_DIBERSIHKAN' ? 'TIDAK' : 'SUDAH';
}
const STATUS_LABEL: Record<string, string> = { SUDAH: 'Dibersihkan', TIDAK: 'Tidak Dibersihkan', PROSES: 'Sedang Dibersihkan' };

function daysBetween(from: string, to: string) {
  const out: string[] = [];
  let t = new Date(`${to}T00:00:00+08:00`).getTime();
  const stop = new Date(`${from}T00:00:00+08:00`).getTime();
  while (t >= stop && out.length < 100) {
    out.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)));
    t -= 86_400_000;
  }
  return out;
}

export default function RekapKebersihan() {
  const router = useRouter();
  const [from, setFrom] = useState(todayWita(-6));
  const [to, setTo] = useState(todayWita());
  const [data, setData] = useState<MessRecap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('harian');
  const [building, setBuilding] = useState('ALL');
  const [petugas, setPetugas] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [query, setQuery] = useState('');

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true); setError('');
    try { setData(await messApi.recap(f, t)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat rekap'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (getStoredUser()?.role === 'HOUSE_MAN') { router.replace('/ga/mess/operasional'); return; }
    void load(todayWita(-6), todayWita());
  }, [router, load]);

  function pilihRentang(f: string, t: string) { setFrom(f); setTo(t); void load(f, t); }

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const daftarPetugas = useMemo(() => {
    const map = new Map<number, string>();
    sessions.forEach((s) => map.set(s.houseMan.id, s.houseMan.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) =>
      (building === 'ALL' || s.room.building === building) &&
      (petugas === 'ALL' || String(s.houseMan.id) === petugas) &&
      (status === 'ALL' || statusOf(s) === status) &&
      (!q || `${s.room.number} ${buildingLabel(s.room.building)} ${s.houseMan.name} ${s.alasan ?? ''}`.toLowerCase().includes(q)));
  }, [sessions, building, petugas, status, query]);

  // Ringkasan per hari: status akhir tiap kamar per hari (sesi terakhir hari itu).
  const harian = useMemo(() => {
    if (!data) return [];
    const scoped = sessions.filter((s) => building === 'ALL' || s.room.building === building);
    return daysBetween(data.from, data.to).map((day) => {
      const latest = new Map<number, MessRecapSession>();
      scoped.filter((s) => s.day === day).forEach((s) => { if (!latest.has(s.room.id)) latest.set(s.room.id, s); }); // sudah urut terbaru dulu
      let sudah = 0; let tidak = 0; let proses = 0; let totalDur = 0; let countDur = 0;
      latest.forEach((s) => {
        const st = statusOf(s);
        if (st === 'SUDAH') { sudah++; if (s.durationSec != null) { totalDur += s.durationSec; countDur++; } }
        else if (st === 'TIDAK') tidak++; else proses++;
      });
      const petugasHari = new Set(scoped.filter((s) => s.day === day).map((s) => s.houseMan.id)).size;
      return { day, sudah, tidak, proses, belum: Math.max(0, (building === 'ALL' ? data.totalRooms : data.roomsByBuilding[building] ?? 0) - latest.size), rataRata: countDur ? Math.round(totalDur / countDur) : null, petugas: petugasHari };
    });
  }, [data, sessions, building]);

  const perPetugas = useMemo(() => {
    const map = new Map<number, { name: string; nrp?: string | null; sudah: number; tidak: number; totalDur: number; countDur: number; hari: Set<string> }>();
    filtered.forEach((s) => {
      const row = map.get(s.houseMan.id) ?? { name: s.houseMan.name, nrp: s.houseMan.nrp, sudah: 0, tidak: 0, totalDur: 0, countDur: 0, hari: new Set<string>() };
      const st = statusOf(s);
      if (st === 'SUDAH') { row.sudah++; if (s.durationSec != null) { row.totalDur += s.durationSec; row.countDur++; } }
      if (st === 'TIDAK') row.tidak++;
      row.hari.add(s.day);
      map.set(s.houseMan.id, row);
    });
    return [...map.values()].sort((a, b) => b.sudah - a.sudah);
  }, [filtered]);

  const totals = useMemo(() => {
    const sudah = filtered.filter((s) => statusOf(s) === 'SUDAH');
    const durs = sudah.map((s) => s.durationSec).filter((v): v is number => v != null);
    return {
      sudah: sudah.length,
      tidak: filtered.filter((s) => statusOf(s) === 'TIDAK').length,
      rata: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null,
      petugas: new Set(filtered.map((s) => s.houseMan.id)).size,
    };
  }, [filtered]);

  function exportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(harian.map((h) => ({
      Tanggal: formatDay(h.day), 'Dibersihkan': h.sudah, 'Tidak Dibersihkan': h.tidak, 'Belum Disentuh': h.belum, 'Sedang Proses': h.proses, 'Rata-rata Durasi': formatDuration(h.rataRata), 'Jumlah Petugas': h.petugas,
    }))), 'Per Hari');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map((s, i) => ({
      No: i + 1, Tanggal: formatDay(s.day), Gedung: buildingLabel(s.room.building), Kamar: s.room.number, Petugas: s.houseMan.name, Status: STATUS_LABEL[statusOf(s)],
      Mulai: s.status === 'TIDAK_DIBERSIHKAN' ? '-' : formatTime(s.startedAt), Selesai: s.status === 'TIDAK_DIBERSIHKAN' ? '-' : formatTime(s.finishedAt),
      Durasi: formatDuration(s.durationSec), Alasan: s.alasan ?? '',
    }))), 'Detail');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perPetugas.map((p, i) => ({
      No: i + 1, Petugas: p.name, NRP: p.nrp ?? '', 'Hari Kerja': p.hari.size, 'Kamar Dibersihkan': p.sudah, 'Tidak Dibersihkan': p.tidak, 'Rata-rata Durasi': formatDuration(p.countDur ? Math.round(p.totalDur / p.countDur) : null),
    }))), 'Per Petugas');
    XLSX.writeFile(wb, `Rekap-Kebersihan-Mess_${data.from}_sd_${data.to}.xlsx`);
  }

  const resetFilter = () => { setBuilding('ALL'); setPetugas('ALL'); setStatus('ALL'); setQuery(''); };

  return <>
    <header className={styles.heading}>
      <div><span>GENERAL AFFAIRS</span><h1>Rekap Kebersihan Kamar</h1><p>Riwayat pembersihan kamar per hari, per kamar, dan per petugas houseman.</p></div>
      <div className={rk.headActions}><button className={rk.export} onClick={exportExcel} disabled={!data || loading}>Export Excel</button></div>
    </header>

    {error && <div className={styles.error}>{error}</div>}

    <div className={rk.quick}>
      <button onClick={() => pilihRentang(todayWita(), todayWita())}>Hari ini</button>
      <button onClick={() => pilihRentang(todayWita(-1), todayWita(-1))}>Kemarin</button>
      <button onClick={() => pilihRentang(todayWita(-6), todayWita())}>7 hari terakhir</button>
      <button onClick={() => pilihRentang(firstOfMonthWita(), todayWita())}>Bulan ini</button>
      <button onClick={() => pilihRentang(todayWita(-29), todayWita())}>30 hari terakhir</button>
    </div>

    <section className={`${styles.filters} ${rk.filters}`}>
      <label>Dari<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
      <label>Sampai<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
      <label>Gedung<select value={building} onChange={(e) => setBuilding(e.target.value)}><option value="ALL">Semua Gedung</option>{BUILDINGS.map((b) => <option key={b} value={b}>{buildingLabel(b)}</option>)}</select></label>
      <label>Petugas<select value={petugas} onChange={(e) => setPetugas(e.target.value)}><option value="ALL">Semua Petugas</option>{daftarPetugas.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}</select></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Semua Status</option><option value="SUDAH">Dibersihkan</option><option value="TIDAK">Tidak Dibersihkan</option><option value="PROSES">Sedang Dibersihkan</option></select></label>
      <label>Cari<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kamar, petugas, alasan..." /></label>
      <button className={styles.filterReset} onClick={() => from && to && void load(from, to)} disabled={loading}>{loading ? 'Memuat...' : 'Tampilkan'}</button>
    </section>
    <div className={rk.note}>
      Periode {data ? `${formatDay(data.from)} – ${formatDay(data.to)} (${data.days} hari)` : '-'} · Maksimal 93 hari per tampilan.
      {(building !== 'ALL' || petugas !== 'ALL' || status !== 'ALL' || query) && <> · <a href="#" onClick={(e) => { e.preventDefault(); resetFilter(); }}>Reset filter</a></>}
    </div>

    <section className={styles.cards}>
      <article><small>Kamar Dibersihkan</small><strong>{totals.sudah}</strong></article>
      <article><small>Tidak Dibersihkan</small><strong>{totals.tidak}</strong></article>
      <article><small>Rata-rata Durasi</small><strong>{formatDuration(totals.rata)}</strong></article>
      <article><small>Petugas Aktif</small><strong>{totals.petugas}</strong></article>
      <article><small>Total Kamar</small><strong>{data ? (building === 'ALL' ? data.totalRooms : data.roomsByBuilding[building] ?? 0) : '-'}</strong></article>
    </section>

    <div className={rk.tabs}>
      <button className={tab === 'harian' ? rk.active : ''} onClick={() => setTab('harian')}>Per Hari</button>
      <button className={tab === 'detail' ? rk.active : ''} onClick={() => setTab('detail')}>Detail Kamar ({filtered.length})</button>
      <button className={tab === 'petugas' ? rk.active : ''} onClick={() => setTab('petugas')}>Per Petugas ({perPetugas.length})</button>
    </div>

    {tab === 'harian' && <section className={styles.tableWrap}>
      <table>
        <thead><tr><th>Tanggal</th><th>Dibersihkan</th><th>Tidak Dibersihkan</th><th>Belum Disentuh</th><th>Progres</th><th>Rata-rata Durasi</th><th>Petugas</th></tr></thead>
        <tbody>{harian.map((h) => {
          const total = Math.max(1, h.sudah + h.tidak + h.belum + h.proses);
          return <tr key={h.day}>
            <td><b>{formatDay(h.day)}</b></td>
            <td><span className={styles.done}>{h.sudah}</span></td>
            <td><span className={styles.skipped}>{h.tidak}</span></td>
            <td><span className={styles.pending}>{h.belum}</span>{h.proses > 0 && <small className={rk.sub}>{h.proses} sedang proses</small>}</td>
            <td><div className={rk.bar} title={`${Math.round(h.sudah / total * 100)}% dibersihkan`}><i style={{ width: `${h.sudah / total * 100}%`, background: '#16a34a' }} /><i style={{ width: `${h.tidak / total * 100}%`, background: '#f59e0b' }} /><i style={{ width: `${h.proses / total * 100}%`, background: '#3b82f6' }} /></div><small className={rk.sub}>{Math.round(h.sudah / total * 100)}% dibersihkan</small></td>
            <td>{formatDuration(h.rataRata)}</td>
            <td>{h.petugas}</td>
          </tr>;
        })}</tbody>
      </table>
      {!harian.length && <div className={styles.empty}>{loading ? 'Memuat rekap...' : 'Tidak ada data.'}</div>}
    </section>}

    {tab === 'detail' && <section className={styles.tableWrap}>
      <table>
        <thead><tr><th>No</th><th>Tanggal</th><th>Gedung</th><th>Kamar</th><th>Petugas</th><th>Status</th><th>Mulai</th><th>Selesai</th><th>Durasi</th><th>Alasan</th></tr></thead>
        <tbody>{filtered.map((s, i) => {
          const st = statusOf(s);
          return <tr key={s.id}>
            <td>{i + 1}</td>
            <td>{formatDay(s.day)}</td>
            <td><b>{buildingLabel(s.room.building)}</b></td>
            <td><b>Kamar {s.room.number}</b></td>
            <td>{s.houseMan.name}</td>
            <td><span className={st === 'SUDAH' ? styles.done : st === 'TIDAK' ? styles.skipped : styles.inProgress}>{STATUS_LABEL[st]}</span></td>
            <td>{st === 'TIDAK' ? '-' : formatTime(s.startedAt)}</td>
            <td>{st === 'TIDAK' ? '-' : formatTime(s.finishedAt)}</td>
            <td>{formatDuration(s.durationSec)}</td>
            <td>{s.alasan ? <div className={rk.reason}>{s.alasan}</div> : '-'}</td>
          </tr>;
        })}</tbody>
      </table>
      {!filtered.length && <div className={styles.empty}>{loading ? 'Memuat rekap...' : 'Belum ada catatan kebersihan pada periode ini.'}</div>}
    </section>}

    {tab === 'petugas' && <section className={styles.tableWrap}>
      <table>
        <thead><tr><th>No</th><th>Petugas</th><th>Hari Kerja</th><th>Kamar Dibersihkan</th><th>Tidak Dibersihkan</th><th>Rata-rata / Hari</th><th>Rata-rata Durasi</th></tr></thead>
        <tbody>{perPetugas.map((p, i) => <tr key={`${p.name}-${i}`}>
          <td>{i + 1}</td>
          <td><b>{p.name}</b>{p.nrp && <small className={rk.sub}>NRP {p.nrp}</small>}</td>
          <td>{p.hari.size}</td>
          <td><span className={styles.done}>{p.sudah}</span></td>
          <td><span className={styles.skipped}>{p.tidak}</span></td>
          <td>{p.hari.size ? (p.sudah / p.hari.size).toFixed(1) : '-'} kamar</td>
          <td>{formatDuration(p.countDur ? Math.round(p.totalDur / p.countDur) : null)}</td>
        </tr>)}</tbody>
      </table>
      {!perPetugas.length && <div className={styles.empty}>{loading ? 'Memuat rekap...' : 'Belum ada data petugas pada periode ini.'}</div>}
    </section>}
  </>;
}

