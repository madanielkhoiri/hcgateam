'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredUser } from '@/lib/access-control';
import { messApi, type MessRoom, type ShiftMess } from '@/lib/mess-monitoring-api';
import styles from '@/app/ga/mess/mess.module.css';

type PersonForm = { id?: number; nrp: string; name: string; shift: ShiftMess };
const emptyPerson = (): PersonForm => ({ nrp: '', name: '', shift: 'PAGI' });
const BUILDINGS = ['1', '2', '3', 'A', 'B', 'C', 'D', 'E', 'F'];

export function MonitoringKamar({ hideHeader = false }: { hideHeader?: boolean }) {
  const [rows, setRows] = useState<MessRoom[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MessRoom | null>(null);
  const [number, setNumber] = useState('');
  const [building, setBuilding] = useState('1');
  const [people, setPeople] = useState<PersonForm[]>([emptyPerson()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');
  const admin = ['ADMIN', 'SUPER_ADMIN'].includes(getStoredUser()?.role ?? '');
  const load = () => messApi.rooms().then(setRows).catch((e) => setError(e.message));

  useEffect(() => { void load(); }, []);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((room) => {
      const matchesQuery = !keyword || room.number.toLowerCase().includes(keyword)
        || `gedung ${room.building}`.toLowerCase().includes(keyword)
        || room.occupants.some((person) => person.name.toLowerCase().includes(keyword) || person.nrp.toLowerCase().includes(keyword));
      return matchesQuery
        && (filterBuilding === 'ALL' || room.building === filterBuilding)
        && (filterStatus === 'ALL' || room.cleanliness === filterStatus)
        && (filterShift === 'ALL' || room.occupants.some((person) => person.shift === filterShift));
    });
  }, [rows, query, filterBuilding, filterStatus, filterShift]);

  const resetFilters = () => { setQuery(''); setFilterBuilding('ALL'); setFilterStatus('ALL'); setFilterShift('ALL'); };

  function openCreate() {
    setEditing(null); setBuilding('1'); setNumber(''); setPeople([emptyPerson()]); setError(''); setOpen(true);
  }

  function openEdit(room: MessRoom) {
    setEditing(room); setBuilding(room.building); setNumber(room.number);
    setPeople(room.occupants.length ? room.occupants.map((person) => ({ ...person })) : [emptyPerson()]);
    setError(''); setOpen(true);
  }

  async function save() {
    const validPeople = people.filter((person) => person.nrp.trim() && person.name.trim());
    setSaving(true); setError('');
    try {
      if (!editing) {
        await messApi.createRoom({ building, number, occupants: validPeople });
      } else {
        await messApi.updateRoom(editing.id, building, number);
        const retainedIds = new Set(validPeople.flatMap((person) => person.id ? [person.id] : []));
        await Promise.all([
          ...editing.occupants.filter((person) => !retainedIds.has(person.id)).map((person) => messApi.deleteOccupant(person.id)),
          ...validPeople.map((person) => person.id
            ? messApi.updateOccupant(person.id, { nrp: person.nrp, name: person.name, shift: person.shift })
            : messApi.addOccupant(editing.id, { nrp: person.nrp, name: person.name, shift: person.shift })),
        ]);
      }
      setOpen(false); await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan kamar');
    } finally { setSaving(false); }
  }

  return <>
    {!hideHeader && <header className={styles.heading}>
      <div><span>MONITORING HARIAN</span><h1>Monitoring Kamar Mess</h1><p>Data penghuni dan status kebersihan setiap kamar.</p></div>
      {admin && <button onClick={openCreate}>+ Tambah Kamar</button>}
    </header>}
    {hideHeader && admin && <div className={styles.monitoringToolbar}><div><h2>Data Monitoring Kamar</h2><p>Kelola kamar, penghuni, shift, dan status kebersihan.</p></div><button onClick={openCreate}>+ Tambah Kamar</button></div>}
    {error && !open && <div className={styles.error}>{error}</div>}
    <section className={styles.filters}>
      <label className={styles.filterSearch}>Cari Kamar / Karyawan<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor kamar, nama, atau NRP..." /></label>
      <label>Gedung<select value={filterBuilding} onChange={(event) => setFilterBuilding(event.target.value)}><option value="ALL">Semua Gedung</option>{BUILDINGS.map((item) => <option key={item} value={item}>Gedung {item}</option>)}</select></label>
      <label>Status Kamar<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="ALL">Semua Status</option><option value="BELUM">Belum</option><option value="SUDAH">Sudah</option></select></label>
      <label>Shift<select value={filterShift} onChange={(event) => setFilterShift(event.target.value)}><option value="ALL">Semua Shift</option><option value="PAGI">Shift Pagi</option><option value="MALAM">Shift Malam</option><option value="CUTI">Cuti</option></select></label>
      <button className={styles.filterReset} onClick={resetFilters} disabled={!query && filterBuilding === 'ALL' && filterStatus === 'ALL' && filterShift === 'ALL'}>Reset</button>
    </section>
    <div className={styles.filterSummary}>Menampilkan {filteredRows.length} dari {rows.length} kamar</div>
    <section className={styles.tableWrap}>
      <table>
        <thead><tr><th>No</th><th>Gedung</th><th>Kamar</th><th>Karyawan</th><th>Status Kamar</th>{admin && <th>Aksi</th>}</tr></thead>
        <tbody>{filteredRows.map((room, index) => <tr key={room.id}>
          <td>{index + 1}</td><td><b>Gedung {room.building}</b></td><td><b>Kamar {room.number}</b></td>
          <td><div className={styles.peopleCompact}>
            {room.occupants.map((person) => <div key={person.id} className={styles.personCompact}>
              <span className={`${styles.dot} ${styles[person.shift.toLowerCase()]}`} />
              <span><b>{person.name}</b><small>NRP {person.nrp}</small></span>
              <em>{person.shift === 'PAGI' ? 'Pagi' : person.shift === 'MALAM' ? 'Malam' : 'Cuti'}</em>
            </div>)}
            {!room.occupants.length && <span className={styles.noOccupant}>Belum ada penghuni</span>}
          </div></td>
          <td><span className={room.cleanliness === 'SUDAH' ? styles.done : styles.pending}>{room.cleanliness === 'SUDAH' ? 'Sudah' : 'Belum'}</span></td>
          {admin && <td><div className={styles.actions}><button onClick={() => openEdit(room)}>Edit</button><button className={styles.danger} onClick={async () => { if (confirm(`Hapus Kamar ${room.number}?`)) { await messApi.deleteRoom(room.id); await load(); } }}>Hapus</button></div></td>}
        </tr>)}</tbody>
      </table>
      {!rows.length && <div className={styles.empty}>Belum ada kamar. Tambahkan kamar pertama.</div>}
      {!!rows.length && !filteredRows.length && <div className={styles.empty}>Tidak ada kamar yang sesuai dengan filter.</div>}
    </section>

    {open && <div className={styles.modalBackdrop}><div className={styles.modal}>
      <div className={styles.modalHead}><div><h2>{editing ? 'Edit Kamar' : 'Tambah Kamar'}</h2><p>Atur kamar dan seluruh karyawan di dalamnya.</p></div><button onClick={() => setOpen(false)}>×</button></div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.roomFields}>
        <label>Gedung<select value={building} onChange={(e) => setBuilding(e.target.value)}>{BUILDINGS.map((item) => <option key={item} value={item}>Gedung {item}</option>)}</select></label>
        <label>Nomor Kamar<input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Contoh: 212" /></label>
      </div>
      <div className={styles.modalTitle}><b>Daftar Karyawan</b><button onClick={() => setPeople((current) => [...current, emptyPerson()])}>+ Tambah Karyawan</button></div>
      <div className={styles.personFormHeader}><span>NRP</span><span>Nama Karyawan</span><span>Shift / Cuti</span><span /></div>
      {people.map((person, index) => <div className={styles.personForm} key={person.id ?? `new-${index}`}>
        <input placeholder="NRP" value={person.nrp} onChange={(e) => setPeople((current) => current.map((item, i) => i === index ? { ...item, nrp: e.target.value } : item))} />
        <input placeholder="Nama karyawan" value={person.name} onChange={(e) => setPeople((current) => current.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
        <select value={person.shift} onChange={(e) => setPeople((current) => current.map((item, i) => i === index ? { ...item, shift: e.target.value as ShiftMess } : item))}><option value="PAGI">Shift Pagi</option><option value="MALAM">Shift Malam</option><option value="CUTI">Cuti</option></select>
        <button title="Hapus dari kamar" onClick={() => setPeople((current) => current.filter((_, i) => i !== index))}>×</button>
      </div>)}
      <div className={styles.modalActions}><button className={styles.secondary} onClick={() => setOpen(false)}>Batal</button><button onClick={save} disabled={!number.trim() || saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Kamar'}</button></div>
    </div></div>}
  </>;
}

