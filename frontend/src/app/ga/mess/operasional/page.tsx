'use client';

import { useEffect, useMemo, useState } from 'react';
import { messApi, type MessRoom } from '@/lib/mess-monitoring-api';
import styles from '../mess.module.css';

const BUILDINGS = ['A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3'];
const buildingLabel = (value: string) => /^[123]$/.test(value) ? `Staff ${value}` : `Mess ${value}`;

function duration(start: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function completedDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '-';
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function Operations() {
  const [rows, setRows] = useState<MessRoom[]>([]);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const load = () => messApi.operations().then(setRows).catch((caught) => setError(caught.message));

  useEffect(() => {
    void load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((room) => {
      const matchesQuery = !keyword || room.number.toLowerCase().includes(keyword)
        || buildingLabel(room.building).toLowerCase().includes(keyword)
        || room.occupants.some((person) => person.name.toLowerCase().includes(keyword) || person.nrp.toLowerCase().includes(keyword));
      const matchesStatus = filterStatus === 'ALL'
        || (filterStatus === 'SEDANG' ? Boolean(room.activeCleaning) : room.cleanliness === filterStatus && !room.activeCleaning);
      return matchesQuery && (filterBuilding === 'ALL' || room.building === filterBuilding) && matchesStatus;
    });
  }, [rows, query, filterBuilding, filterStatus]);

  const groupedRows = useMemo(() => {
    const known = BUILDINGS.map((building) => ({ building, rooms: filteredRows.filter((room) => room.building === building) })).filter((group) => group.rooms.length > 0);
    const others = [...new Set(filteredRows.map((room) => room.building).filter((building) => !BUILDINGS.includes(building)))];
    return [...known, ...others.map((building) => ({ building, rooms: filteredRows.filter((room) => room.building === building) }))];
  }, [filteredRows]);

  async function act(room: MessRoom) {
    try {
      if (room.activeCleaning) await messApi.finish(room.id);
      else await messApi.start(room.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memperbarui operasional kamar');
    }
  }

  const resetFilters = () => { setQuery(''); setFilterBuilding('ALL'); setFilterStatus('ALL'); };

  return <>
    <header className={styles.heading}>
      <div><span>HOUSE MAN</span><h1>Operasional Kebersihan Mess</h1><p>Mulai dan selesaikan pembersihan per kamar.</p></div>
    </header>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.filters}>
      <label className={styles.filterSearch}>Cari Kamar / Karyawan<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor kamar, nama, atau NRP..." /></label>
      <label>Gedung<select value={filterBuilding} onChange={(event) => setFilterBuilding(event.target.value)}><option value="ALL">Semua Gedung</option>{BUILDINGS.map((item) => <option key={item} value={item}>{buildingLabel(item)}</option>)}</select></label>
      <label>Status Operasional<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="ALL">Semua Status</option><option value="BELUM">Belum</option><option value="SEDANG">Sedang Dibersihkan</option><option value="SUDAH">Sudah</option></select></label>
      <button className={styles.filterReset} onClick={resetFilters} disabled={!query && filterBuilding === 'ALL' && filterStatus === 'ALL'}>Reset</button>
    </section>
    <div className={styles.filterSummary}>Menampilkan {filteredRows.length} dari {rows.length} kamar</div>
    <section className={styles.buildingGroups}>
      {groupedRows.map((group) => <section className={styles.buildingGroup} key={group.building}>
        <header className={styles.buildingGroupHeader}><div><span>GEDUNG</span><h2>{buildingLabel(group.building)}</h2></div><strong>{group.rooms.length} kamar</strong></header>
        <div className={styles.opsGrid}>
          {group.rooms.map((room) => <article className={styles.roomCard} key={room.id}>
            <div><small>KAMAR</small><h2>{room.number}</h2></div>
            <span className={room.activeCleaning ? styles.inProgress : room.cleanliness === 'SUDAH' ? styles.done : styles.pending}>{room.activeCleaning ? 'Sedang' : room.cleanliness === 'SUDAH' ? 'Sudah' : 'Belum'}</span>
            <p>{room.occupants.length} penghuni</p>
            {room.activeCleaning && <div className={styles.timer}><small>Sedang dibersihkan oleh {room.activeCleaning.houseMan.name}</small><strong>{duration(room.activeCleaning.startedAt, now)}</strong></div>}
            {!room.activeCleaning && room.cleanliness === 'SUDAH' && room.lastCleaning?.finishedAt && <div className={styles.completedCleaning}><small>Terakhir dibersihkan oleh {room.lastCleaning.houseMan.name}</small><strong>{completedDuration(room.lastCleaning.durationSec)}</strong><small>Durasi pembersihan</small></div>}
            <button className={room.activeCleaning ? styles.finishButton : ''} onClick={() => act(room)}>{room.activeCleaning ? 'Selesai Bersihkan' : 'Mulai Bersihkan'}</button>
          </article>)}
        </div>
      </section>)}
    </section>
    {!rows.length && <div className={styles.empty}>Belum ada kamar untuk dibersihkan.</div>}
    {!!rows.length && !filteredRows.length && <div className={styles.empty}>Tidak ada kamar yang sesuai dengan filter.</div>}
  </>;
}
