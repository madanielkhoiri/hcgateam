'use client';

import { Check, Edit3, History, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ACCESS_KEYS, clearSession, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import {
  civilMonitoringProjectApi,
  TAHAPAN_PROJECT_TAMBANG,
  type MonitoringProjectTambang,
  type FieldProjectTambang,
  type RiwayatMonitoringProject,
  type TahapanProjectTambang,
} from '@/lib/civil-monitoring-project-api';
import styles from './monitoring-project.module.css';

const LABEL: Record<TahapanProjectTambang, string> = {
  pengajuanProjectCharter: 'Pengajuan Project Charter',
  reviewApprovalAi: 'Review Approval AI',
  pengecekanArea: 'Pengecekan Izin Area',
  dokumenProject: 'Dokumen Project',
  kickOffMeeting: 'Kick Off Meeting',
  pelaksanaan: 'Pelaksanaan',
  komisioning: 'Komisioning',
  selesai: 'Selesai',
};

function formatWaktu(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(value));
}

export default function MonitoringProjectInfrastrukturTambangPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<MonitoringProjectTambang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cari, setCari] = useState('');
  const [modal, setModal] = useState<'tambah' | 'edit' | null>(null);
  const [dipilih, setDipilih] = useState<MonitoringProjectTambang | null>(null);
  const [nama, setNama] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengubah, setMengubah] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatMonitoringProject[] | null>(null);

  const muat = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await civilMonitoringProjectApi.daftar()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (!getAccessToken() || !user) { clearSession(); router.replace('/login'); return; }
    if (!hasAccess(user, ACCESS_KEYS.CIVIL_MONITORING_PROJECT_TAMBANG)) { router.replace('/civil'); return; }
    setSiap(true); void muat();
  }, [muat, router]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLocaleLowerCase('id-ID');
    return q ? data.filter((item) => item.namaPekerjaan.toLocaleLowerCase('id-ID').includes(q)) : data;
  }, [cari, data]);

  function bukaTambah() { setDipilih(null); setNama(''); setModal('tambah'); }
  function bukaEdit(item: MonitoringProjectTambang) { setDipilih(item); setNama(item.namaPekerjaan); setModal('edit'); }

  async function simpan(event: FormEvent) {
    event.preventDefault();
    if (!nama.trim()) return;
    setMenyimpan(true); setError('');
    try {
      if (modal === 'edit' && dipilih) await civilMonitoringProjectApi.ubahNama(dipilih.id, nama.trim());
      else await civilMonitoringProjectApi.buat(nama.trim());
      setModal(null); await muat();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan'); }
    finally { setMenyimpan(false); }
  }

  async function toggle(item: MonitoringProjectTambang, field: FieldProjectTambang) {
    const key = `${item.id}-${field}`;
    setMengubah(key); setError('');
    setData((current) => current.map((row) => row.id === item.id ? {
      ...row, [field]: !row[field],
      ...(field === 'dokumenProject' && !row[field] ? { dokumenProjectTidakBerlaku: false } : {}),
      ...(field === 'dokumenProjectTidakBerlaku' && !row[field] ? { dokumenProject: false } : {}),
    } : row));
    try {
      const hasil = await civilMonitoringProjectApi.ubahTahapan(item.id, field, !item[field]);
      setData((current) => current.map((row) => row.id === item.id ? hasil : row));
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal mengubah tahapan'); await muat(); }
    finally { setMengubah(null); }
  }

  async function hapus(item: MonitoringProjectTambang) {
    if (!confirm(`Hapus pekerjaan “${item.namaPekerjaan}” beserta seluruh riwayatnya?`)) return;
    try { await civilMonitoringProjectApi.hapus(item.id); await muat(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal menghapus'); }
  }

  async function bukaRiwayat(item: MonitoringProjectTambang) {
    setDipilih(item); setRiwayat([]); setError('');
    try { setRiwayat(await civilMonitoringProjectApi.riwayat(item.id)); }
    catch (err) { setRiwayat(null); setError(err instanceof Error ? err.message : 'Gagal memuat riwayat'); }
  }

  if (!siap) return <main className={styles.state}>Memuat modul...</main>;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Monitoring Project Infrastruktur Tambang</h1>
          <p>Pantau setiap tahapan pekerjaan dari Project Charter sampai selesai.</p>
        </div>
        <button className={styles.primary} onClick={bukaTambah}><Plus size={17} /> Tambah Pekerjaan</button>
      </div>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <input value={cari} onChange={(event) => setCari(event.target.value)} placeholder="Cari nama pekerjaan..." />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {loading ? <p className={styles.state}>Memuat data...</p> : (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>No</th><th className={styles.namaCol}>Nama Pekerjaan</th>{TAHAPAN_PROJECT_TAMBANG.map((field) => <th key={field}>{LABEL[field]}</th>)}<th>Progress</th><th>Terakhir Diubah</th><th>Aksi</th></tr></thead>
              <tbody>
                {tampil.map((item, index) => {
                  const totalDinilai = TAHAPAN_PROJECT_TAMBANG.length - (item.dokumenProjectTidakBerlaku ? 1 : 0);
                  const selesai = TAHAPAN_PROJECT_TAMBANG.filter((field) => item[field]).length;
                  const persen = Math.round((selesai / totalDinilai) * 100);
                  return <tr key={item.id}>
                    <td>{index + 1}</td><td className={styles.nama}><strong>{item.namaPekerjaan}</strong></td>
                    {TAHAPAN_PROJECT_TAMBANG.map((field) => <td key={field} className={styles.checkCell}>{field === 'dokumenProject' ? <div className={styles.documentChoice}><button className={item.dokumenProject ? styles.choiceActive : ''} disabled={mengubah?.startsWith(`${item.id}-`)} onClick={() => toggle(item, 'dokumenProject')} title="Checklist"><Check size={15}/></button><button className={item.dokumenProjectTidakBerlaku ? styles.choiceRejected : ''} disabled={mengubah?.startsWith(`${item.id}-`)} onClick={() => toggle(item, 'dokumenProjectTidakBerlaku')} title="Tidak berlaku"><X size={15}/></button></div> : <input type="checkbox" checked={item[field]} disabled={mengubah === `${item.id}-${field}`} onChange={() => toggle(item, field)} aria-label={`${LABEL[field]} ${item.namaPekerjaan}`} />}</td>)}
                    <td><div className={styles.progress}><span style={{ width: `${persen}%` }} /></div><small>{selesai}/{totalDinilai} ({persen}%)</small></td>
                    <td><span>{item.updatedByName}</span><small>{formatWaktu(item.updatedAt)} WITA</small></td>
                    <td><div className={styles.actions}><button onClick={() => bukaEdit(item)} title="Edit nama"><Edit3 size={15} /></button><button onClick={() => bukaRiwayat(item)} title="Riwayat"><History size={15} /></button><button className={styles.danger} onClick={() => hapus(item)} title="Hapus"><Trash2 size={15} /></button></div></td>
                  </tr>;
                })}
                {tampil.length === 0 && <tr><td colSpan={13} className={styles.empty}>Belum ada pekerjaan.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && <div className={styles.overlay}><form className={styles.modal} onSubmit={simpan}><div className={styles.modalHead}><h2>{modal === 'edit' ? 'Edit Nama Pekerjaan' : 'Tambah Pekerjaan'}</h2><button type="button" onClick={() => setModal(null)}><X size={19} /></button></div><label>Nama Pekerjaan<input autoFocus maxLength={250} value={nama} onChange={(event) => setNama(event.target.value)} required /></label><div className={styles.modalActions}><button type="button" onClick={() => setModal(null)}>Batal</button><button className={styles.primary} disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</button></div></form></div>}

      {riwayat && dipilih && <div className={styles.overlay}><div className={`${styles.modal} ${styles.historyModal}`}><div className={styles.modalHead}><div><h2>Riwayat Perubahan</h2><p>{dipilih.namaPekerjaan}</p></div><button type="button" onClick={() => setRiwayat(null)}><X size={19} /></button></div><div className={styles.historyList}>{riwayat.map((row) => <div key={row.id}><strong>{LABEL[row.field as TahapanProjectTambang] ?? 'Nama Pekerjaan'}</strong><span>{row.nilaiSebelum ?? '-'} → {row.nilaiSesudah ?? '-'}</span><small>{row.actorName} • {formatWaktu(row.createdAt)} WITA</small></div>)}{riwayat.length === 0 && <p>Belum ada riwayat.</p>}</div></div></div>}
    </main>
  );
}
