'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
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
function statusOf(session: MessRecapSession): 'SUDAH' | 'TIDAK' | 'PROSES' {
  if (!session.finishedAt) return 'PROSES';
  return session.status === 'TIDAK_DIBERSIHKAN' ? 'TIDAK' : 'SUDAH';
}
type RoomRef = MessRecap['rooms'][number];
type DayLists = { SUDAH: MessRecapSession[]; TIDAK: MessRecapSession[]; PROSES: MessRecapSession[]; BELUM: RoomRef[] };
type DetailTab = 'SUDAH' | 'TIDAK' | 'BELUM';
const roomSort = (a: RoomRef, b: RoomRef) => a.building.localeCompare(b.building) || a.number.localeCompare(b.number, 'id', { numeric: true });
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
  const [detail, setDetail] = useState<{ day: string; tab: DetailTab } | null>(null);
  const [detailQuery, setDetailQuery] = useState('');

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true); setError('');
    try { setData(await messApi.recap(f, t)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat rekap'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const role = getStoredUser()?.role ?? '';
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) { router.replace(role === 'HOUSE_MAN' ? '/ga/mess/operasional' : '/ga/mess/dashboard'); return; }
    void load(todayWita(-6), todayWita());
  }, [router, load]);

  // Pop-up detail: tutup dengan Esc dan kunci scroll halaman di belakangnya.
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [detail]);

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
      const lists: DayLists = { SUDAH: [], TIDAK: [], PROSES: [], BELUM: [] };
      let totalDur = 0; let countDur = 0;
      latest.forEach((s) => {
        const st = statusOf(s);
        lists[st].push(s);
        if (st === 'SUDAH' && s.durationSec != null) { totalDur += s.durationSec; countDur++; }
      });
      lists.BELUM = data.rooms.filter((room) => (building === 'ALL' || room.building === building) && !latest.has(room.id));
      const petugasHari = new Set(scoped.filter((s) => s.day === day).map((s) => s.houseMan.id)).size;
      return { day, lists, sudah: lists.SUDAH.length, tidak: lists.TIDAK.length, proses: lists.PROSES.length, belum: lists.BELUM.length, rataRata: countDur ? Math.round(totalDur / countDur) : null, petugas: petugasHari };
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

  function exportExcel() {
    if (!data) return;
    const periode = `Periode: ${formatDay(data.from)} s/d ${formatDay(data.to)} (${data.days} hari)`;
    const filterInfo = [
      `Gedung: ${building === 'ALL' ? 'Semua' : buildingLabel(building)}`,
      `Petugas: ${petugas === 'ALL' ? 'Semua' : daftarPetugas.find(([id]) => String(id) === petugas)?.[1] ?? '-'}`,
      `Status: ${status === 'ALL' ? 'Semua' : STATUS_LABEL[status]}`,
      query ? `Cari: "${query}"` : '',
    ].filter(Boolean).join('   |   ');
    const dicetak = `Diekspor: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WITA`;

    /** Sheet rapi: judul, periode, filter, header dengan AutoFilter, lebar kolom, dan baris total (opsional). */
    const buatSheet = (judul: string, headers: string[], rows: (string | number)[][], widths: number[], total?: (string | number)[]) => {
      const aoa: (string | number)[][] = [
        [`REKAP KEBERSIHAN KAMAR MESS — ${judul.toUpperCase()}`],
        [periode],
        [filterInfo],
        [dicetak],
        [],
        headers,
        ...rows,
        ...(total ? [[], total] : []),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const lastCol = headers.length - 1;
      ws['!merges'] = [0, 1, 2, 3].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));
      ws['!cols'] = widths.map((wch) => ({ wch }));
      ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 22 }];
      const headerRow = 5;
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow + Math.max(rows.length, 1), c: lastCol } }) };
      return ws;
    };

    const wb = XLSX.utils.book_new();
    wb.Props = { Title: 'Rekap Kebersihan Kamar Mess', Subject: periode, Author: 'HCGA CONNECT' };

    const sum = (key: 'sudah' | 'tidak' | 'belum' | 'proses') => harian.reduce((t, h) => t + h[key], 0);
    XLSX.utils.book_append_sheet(wb, buatSheet('Per Hari',
      ['No', 'Tanggal', 'Dibersihkan', 'Tidak Dibersihkan', 'Belum Dibersihkan', 'Sedang Proses', '% Dibersihkan', 'Rata-rata Durasi', 'Jumlah Petugas'],
      harian.map((h, i) => {
        const total = h.sudah + h.tidak + h.belum + h.proses;
        return [i + 1, formatDay(h.day), h.sudah, h.tidak, h.belum, h.proses, total ? `${Math.round(h.sudah / total * 100)}%` : '0%', formatDuration(h.rataRata), h.petugas];
      }),
      [6, 22, 14, 18, 18, 15, 15, 17, 16],
      ['', 'TOTAL', sum('sudah'), sum('tidak'), sum('belum'), sum('proses'), '', '', ''],
    ), 'Per Hari');

    XLSX.utils.book_append_sheet(wb, buatSheet('Detail Kamar',
      ['No', 'Tanggal', 'Gedung', 'Kamar', 'Petugas', 'Status', 'Mulai', 'Selesai', 'Durasi', 'Alasan'],
      filtered.map((s, i) => [
        i + 1, formatDay(s.day), buildingLabel(s.room.building), `Kamar ${s.room.number}`, s.houseMan.name, STATUS_LABEL[statusOf(s)],
        s.status === 'TIDAK_DIBERSIHKAN' ? '-' : formatTime(s.startedAt), s.status === 'TIDAK_DIBERSIHKAN' ? '-' : formatTime(s.finishedAt),
        formatDuration(s.durationSec), s.alasan ?? '-',
      ]),
      [6, 22, 12, 14, 26, 20, 9, 9, 11, 40],
      ['', 'TOTAL', '', `${filtered.length} catatan`, '', '', '', '', '', ''],
    ), 'Detail Kamar');

    XLSX.utils.book_append_sheet(wb, buatSheet('Per Petugas',
      ['No', 'Petugas', 'NRP', 'Hari Kerja', 'Kamar Dibersihkan', 'Tidak Dibersihkan', 'Rata-rata / Hari', 'Rata-rata Durasi'],
      perPetugas.map((p, i) => [
        i + 1, p.name, p.nrp ?? '-', p.hari.size, p.sudah, p.tidak,
        p.hari.size ? Number((p.sudah / p.hari.size).toFixed(1)) : 0, formatDuration(p.countDur ? Math.round(p.totalDur / p.countDur) : null),
      ]),
      [6, 28, 14, 12, 19, 19, 17, 17],
      ['', 'TOTAL', '', '', perPetugas.reduce((t, p) => t + p.sudah, 0), perPetugas.reduce((t, p) => t + p.tidak, 0), '', ''],
    ), 'Per Petugas');

    XLSX.writeFile(wb, `Rekap-Kebersihan-Mess_${data.from}_sd_${data.to}.xlsx`);
  }

  const resetFilter = () => { setBuilding('ALL'); setPetugas('ALL'); setStatus('ALL'); setQuery(''); };

  return <>
    <header className={styles.heading}>
      <div><span>GENERAL AFFAIRS</span><h1>Rekap Kebersihan Kamar</h1><p>Tabel riwayat pembersihan kamar per hari, per kamar, dan per petugas houseman. Grafik ringkasan ada di Dashboard.</p></div>
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
      Periode {data ? `${formatDay(data.from)} – ${formatDay(data.to)} (${data.days} hari)` : '-'}
      {(building !== 'ALL' || petugas !== 'ALL' || status !== 'ALL' || query) && <> · <a href="#" onClick={(e) => { e.preventDefault(); resetFilter(); }}>Reset filter</a></>}
    </div>

    <div className={rk.tabs}>
      <button className={tab === 'harian' ? rk.active : ''} onClick={() => setTab('harian')}>Per Hari</button>
      <button className={tab === 'detail' ? rk.active : ''} onClick={() => setTab('detail')}>Detail Kamar ({filtered.length})</button>
      <button className={tab === 'petugas' ? rk.active : ''} onClick={() => setTab('petugas')}>Per Petugas ({perPetugas.length})</button>
    </div>

    {tab === 'harian' && <section className={styles.tableWrap}>
      <table>
        <thead><tr><th>Tanggal</th><th>Dibersihkan</th><th>Tidak Dibersihkan</th><th>Belum Dibersihkan</th><th>Progres</th><th>Rata-rata Durasi</th><th>Petugas</th><th>Aksi</th></tr></thead>
        <tbody>{harian.map((h) => {
          const total = Math.max(1, h.sudah + h.tidak + h.belum + h.proses);
          const buka = (t: DetailTab) => { setDetailQuery(''); setDetail({ day: h.day, tab: t }); };
          return <tr key={h.day}>
            <td><b>{formatDay(h.day)}</b></td>
            <td><button className={`${styles.done} ${rk.countBtn}`} onClick={() => buka('SUDAH')} title="Lihat kamar yang dibersihkan">{h.sudah}</button></td>
            <td><button className={`${styles.skipped} ${rk.countBtn}`} onClick={() => buka('TIDAK')} title="Lihat kamar yang tidak dibersihkan">{h.tidak}</button></td>
            <td><button className={`${styles.pending} ${rk.countBtn}`} onClick={() => buka('BELUM')} title="Lihat kamar yang belum dibersihkan">{h.belum + h.proses}</button>{h.proses > 0 && <small className={rk.sub}>termasuk {h.proses} sedang proses</small>}</td>
            <td><div className={rk.bar} title={`${Math.round(h.sudah / total * 100)}% dibersihkan`}><i style={{ width: `${h.sudah / total * 100}%`, background: '#16a34a' }} /><i style={{ width: `${h.tidak / total * 100}%`, background: '#f59e0b' }} /><i style={{ width: `${h.proses / total * 100}%`, background: '#3b82f6' }} /></div><small className={rk.sub}>{Math.round(h.sudah / total * 100)}% dibersihkan</small></td>
            <td>{formatDuration(h.rataRata)}</td>
            <td>{h.petugas}</td>
            <td><button className={rk.detailBtn} onClick={() => buka('SUDAH')}>Detail</button></td>
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

    {detail && (() => {
      const h = harian.find((item) => item.day === detail.day);
      if (!h) return null;
      const q = detailQuery.trim().toLowerCase();
      const cocok = (room: RoomRef, extra = '') => !q || `${buildingLabel(room.building)} ${room.number} ${extra}`.toLowerCase().includes(q);
      const sesi = (detail.tab === 'SUDAH' ? h.lists.SUDAH : h.lists.TIDAK)
        .filter((s) => cocok(s.room, `${s.houseMan.name} ${s.alasan ?? ''}`))
        .sort((a, b) => roomSort(a.room, b.room));
      const belum = [
        ...h.lists.PROSES.map((s): { room: RoomRef; proses?: MessRecapSession } => ({ room: s.room, proses: s })),
        ...h.lists.BELUM.map((room): { room: RoomRef; proses?: MessRecapSession } => ({ room })),
      ].filter((item) => cocok(item.room, item.proses?.houseMan.name)).sort((a, b) => roomSort(a.room, b.room));
      const jumlah = detail.tab === 'BELUM' ? belum.length : sesi.length;
      return createPortal(<div className={rk.detailBackdrop} onClick={() => setDetail(null)}>
        <div className={rk.detailModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detail kamar">
          <div className={rk.detailHead}>
            <div><h2>Detail Kamar</h2><p>{formatDay(h.day)}{building !== 'ALL' && ` · ${buildingLabel(building)}`}</p></div>
            <button className={rk.closeBtn} onClick={() => setDetail(null)} aria-label="Tutup">×</button>
          </div>
          <div className={rk.choice}>
            <button className={`${rk.choiceSudah} ${detail.tab === 'SUDAH' ? rk.choiceOn : ''}`} onClick={() => setDetail({ ...detail, tab: 'SUDAH' })}>Dibersihkan <b>{h.sudah}</b></button>
            <button className={`${rk.choiceTidak} ${detail.tab === 'TIDAK' ? rk.choiceOn : ''}`} onClick={() => setDetail({ ...detail, tab: 'TIDAK' })}>Tidak Dibersihkan <b>{h.tidak}</b></button>
            <button className={`${rk.choiceBelum} ${detail.tab === 'BELUM' ? rk.choiceOn : ''}`} onClick={() => setDetail({ ...detail, tab: 'BELUM' })}>Belum Dibersihkan <b>{h.belum + h.proses}</b></button>
          </div>
          <label className={rk.searchBox}>
            <Search size={18} aria-hidden />
            <input value={detailQuery} onChange={(e) => setDetailQuery(e.target.value)} placeholder={detail.tab === 'TIDAK' ? 'Cari kamar, gedung, petugas, atau alasan...' : 'Cari kamar, gedung, atau petugas...'} aria-label="Cari kamar" autoFocus />
            {detailQuery && <button type="button" onClick={() => setDetailQuery('')} aria-label="Hapus pencarian"><X size={14} /></button>}
          </label>
          <div className={rk.detailTable}>
            <table>
              {detail.tab === 'BELUM'
                ? <>
                  <thead><tr><th>No</th><th>Gedung</th><th>Kamar</th><th>Keterangan</th></tr></thead>
                  <tbody>{belum.map((item, i) => <tr key={item.room.id}>
                    <td>{i + 1}</td><td><b>{buildingLabel(item.room.building)}</b></td><td><b>Kamar {item.room.number}</b></td>
                    <td>{item.proses ? <span className={styles.inProgress}>Sedang dibersihkan · {item.proses.houseMan.name} (mulai {formatTime(item.proses.startedAt)})</span> : <span className={styles.pending}>Belum dibersihkan</span>}</td>
                  </tr>)}</tbody>
                </>
                : <>
                  <thead><tr><th>No</th><th>Gedung</th><th>Kamar</th><th>Petugas</th>{detail.tab === 'SUDAH' ? <><th>Mulai</th><th>Selesai</th><th>Durasi</th></> : <><th>Dicatat</th><th>Alasan</th></>}</tr></thead>
                  <tbody>{sesi.map((s, i) => <tr key={s.id}>
                    <td>{i + 1}</td><td><b>{buildingLabel(s.room.building)}</b></td><td><b>Kamar {s.room.number}</b></td><td>{s.houseMan.name}</td>
                    {detail.tab === 'SUDAH'
                      ? <><td>{formatTime(s.startedAt)}</td><td>{formatTime(s.finishedAt)}</td><td>{formatDuration(s.durationSec)}</td></>
                      : <><td>{formatTime(s.startedAt)}</td><td><div className={rk.reason}>{s.alasan || '-'}</div></td></>}
                  </tr>)}</tbody>
                </>}
            </table>
            {!jumlah && <div className={styles.empty}>Tidak ada kamar pada kategori ini.</div>}
          </div>
          <div className={rk.detailFoot}>{jumlah} kamar ditampilkan</div>
        </div>
      </div>, document.body);
    })()}
  </>;
}

