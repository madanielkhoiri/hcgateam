'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/access-control';
import { messApi, type MessRoom, type ShiftMess } from '@/lib/mess-monitoring-api';
import styles from '../mess.module.css';

type PersonForm = { id?: number; nrp: string; name: string; shift: ShiftMess };
const emptyPerson = (): PersonForm => ({ nrp: '', name: '', shift: 'PAGI' });

export default function Monitoring() {
  const [rows, setRows] = useState<MessRoom[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MessRoom | null>(null);
  const [number, setNumber] = useState('');
  const [people, setPeople] = useState<PersonForm[]>([emptyPerson()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const admin = ['ADMIN', 'SUPER_ADMIN'].includes(getStoredUser()?.role ?? '');
  const load = () => messApi.rooms().then(setRows).catch((e) => setError(e.message));

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null); setNumber(''); setPeople([emptyPerson()]); setError(''); setOpen(true);
  }

  function openEdit(room: MessRoom) {
    setEditing(room); setNumber(room.number);
    setPeople(room.occupants.length ? room.occupants.map((person) => ({ ...person })) : [emptyPerson()]);
    setError(''); setOpen(true);
  }

  async function save() {
    const validPeople = people.filter((person) => person.nrp.trim() && person.name.trim());
    setSaving(true); setError('');
    try {
      if (!editing) {
        await messApi.createRoom({ number, occupants: validPeople });
      } else {
        await messApi.updateRoom(editing.id, number);
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
    <header className={styles.heading}>
      <div><span>MONITORING HARIAN</span><h1>Monitoring Kamar Mess</h1><p>Data penghuni dan status kebersihan setiap kamar.</p></div>
      {admin && <button onClick={openCreate}>+ Tambah Kamar</button>}
    </header>
    {error && !open && <div className={styles.error}>{error}</div>}
    <section className={styles.tableWrap}>
      <table>
        <thead><tr><th>No</th><th>Kamar</th><th>Karyawan</th><th>Status Kamar</th>{admin && <th>Aksi</th>}</tr></thead>
        <tbody>{rows.map((room, index) => <tr key={room.id}>
          <td>{index + 1}</td><td><b>Kamar {room.number}</b></td>
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
    </section>

    {open && <div className={styles.modalBackdrop}><div className={styles.modal}>
      <div className={styles.modalHead}><div><h2>{editing ? 'Edit Kamar' : 'Tambah Kamar'}</h2><p>Atur kamar dan seluruh karyawan di dalamnya.</p></div><button onClick={() => setOpen(false)}>×</button></div>
      {error && <div className={styles.error}>{error}</div>}
      <label>Nomor Kamar<input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Contoh: A-01" /></label>
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
