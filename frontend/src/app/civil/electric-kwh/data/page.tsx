'use client';

// ==================================================
// FILE: frontend/src/app/civil/electric-kwh/data/page.tsx
// FUNGSI: Data Perhitungan KWH - tabel pencatatan stand meter + pemakaian
// (stand bulan ini dikurangi bulan lalu) dan tombol Tambah Data.
// Pola tampilan sama dengan halaman Daftar KIP (hero, tabel, modal).
// ==================================================

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Gauge, Pencil, Plus, Trash2, X } from 'lucide-react';
import { kwhApi, KwhApiError, type KwhMeter, type KwhPencatatan } from '@/lib/kwh-api';
import styles from '@/components/transport/transport.module.css';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const BARU = '__baru__';

const format = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

/** Nilai untuk <input type="datetime-local"> dari objek Date (waktu lokal perangkat). */
function keInputLokal(tanggal: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${tanggal.getFullYear()}-${pad(tanggal.getMonth() + 1)}-${pad(tanggal.getDate())}T${pad(tanggal.getHours())}:${pad(tanggal.getMinutes())}`;
}

const formKosong = () => ({
  meter: '' as string,
  namaMeterBaru: '',
  lokasiMeterBaru: '',
  standBulanLalu: '',
  standMeter: '',
  tanggalCatat: keInputLokal(new Date()),
  catatan: '',
});

export default function DataKwhPage() {
  const sekarang = new Date();
  const [tahun, setTahun] = useState(sekarang.getFullYear());
  const [meterFilter, setMeterFilter] = useState('');
  const [data, setData] = useState<KwhPencatatan[]>([]);
  const [daftarMeter, setDaftarMeter] = useState<KwhMeter[]>([]);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(formKosong);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const muat = useCallback(async () => {
    try {
      setError('');
      const [pencatatan, meter] = await Promise.all([
        kwhApi.daftarPencatatan({ tahun, meterId: meterFilter ? Number(meterFilter) : undefined }),
        kwhApi.daftarMeter(),
      ]);
      setData(pencatatan);
      setDaftarMeter(meter);
    } catch (err) {
      setError(err instanceof KwhApiError ? err.message : 'Data KWH gagal dimuat');
    }
  }, [tahun, meterFilter]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function bukaModal() {
    setEditId(null);
    setForm({ ...formKosong(), meter: daftarMeter.length ? String(daftarMeter[0].id) : BARU });
    setFormError('');
    setModal(true);
  }

  function bukaModalEdit(item: KwhPencatatan) {
    setEditId(item.id);
    setForm({
      meter: String(item.meterId),
      namaMeterBaru: '',
      lokasiMeterBaru: '',
      standBulanLalu: item.standBulanLalu === null ? '' : String(item.standBulanLalu),
      standMeter: String(item.standMeter),
      tanggalCatat: keInputLokal(new Date(item.tanggalCatat)),
      catatan: item.catatan ?? '',
    });
    setFormError('');
    setModal(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const stand = Number(form.standMeter);
    if (form.standMeter.trim() === '' || Number.isNaN(stand) || stand < 0) {
      setFormError('Isi angka stand meter dengan benar');
      return;
    }
    if (editId == null && form.meter === BARU && !form.namaMeterBaru.trim()) {
      setFormError('Isi nama meter baru');
      return;
    }

    // Bila bulan lalu belum tercatat, stand bulan lalu wajib diisi (jadi dasar hitungan pemakaian).
    const laluBelumTercatat = standLaluForm === null;
    const lalu = Number(form.standBulanLalu);
    const laluTerisi = form.standBulanLalu.trim() !== '' && !Number.isNaN(lalu) && lalu >= 0;
    if (laluBelumTercatat && editId == null && !laluTerisi) {
      setFormError('Isi KWH bulan lalu - bulan lalu belum pernah dicatat untuk meter ini');
      return;
    }
    if (laluBelumTercatat && laluTerisi && lalu > stand) {
      setFormError('KWH bulan lalu tidak boleh lebih besar dari KWH bulan ini');
      return;
    }
    const standBulanLalu = laluBelumTercatat && laluTerisi ? lalu : undefined;

    const tanggalCatat = form.tanggalCatat ? new Date(form.tanggalCatat).toISOString() : undefined;

    setSubmitting(true);
    try {
      if (editId != null) {
        await kwhApi.ubah(editId, { standMeter: stand, standBulanLalu, tanggalCatat, catatan: form.catatan || undefined });
      } else {
        await kwhApi.buat({
          ...(form.meter === BARU
            ? { namaMeterBaru: form.namaMeterBaru.trim(), lokasiMeterBaru: form.lokasiMeterBaru.trim() || undefined }
            : { meterId: Number(form.meter) }),
          standMeter: stand,
          standBulanLalu,
          tanggalCatat,
          catatan: form.catatan || undefined,
        });
      }
      setModal(false);
      await muat();
    } catch (err) {
      setFormError(err instanceof KwhApiError ? err.message : 'Data KWH gagal disimpan');
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(item: KwhPencatatan) {
    if (!window.confirm(`Hapus pencatatan ${item.meter.nama} bulan ${NAMA_BULAN[item.bulan - 1]} ${item.tahun}?`)) return;
    try {
      await kwhApi.hapus(item.id);
      await muat();
    } catch (err) {
      setError(err instanceof KwhApiError ? err.message : 'Data KWH gagal dihapus');
    }
  }

  // Riwayat meter terpilih (semua tahun) untuk menghitung pemakaian langsung di form.
  const [riwayat, setRiwayat] = useState<KwhPencatatan[]>([]);
  useEffect(() => {
    if (!modal || !form.meter || form.meter === BARU) {
      setRiwayat([]);
      return;
    }
    let aktif = true;
    kwhApi
      .daftarPencatatan({ meterId: Number(form.meter) })
      .then((rows) => {
        if (aktif) setRiwayat(rows);
      })
      .catch(() => {
        if (aktif) setRiwayat([]);
      });
    return () => {
      aktif = false;
    };
  }, [modal, form.meter]);

  const tanggalForm = form.tanggalCatat ? new Date(form.tanggalCatat) : new Date();
  const skorForm = tanggalForm.getFullYear() * 12 + tanggalForm.getMonth();
  const tanggalLalu = new Date(tanggalForm.getFullYear(), tanggalForm.getMonth() - 1, 1);
  const labelBulanLalu = `${NAMA_BULAN[tanggalLalu.getMonth()]} ${tanggalLalu.getFullYear()}`;
  const labelBulanIni = `${NAMA_BULAN[tanggalForm.getMonth()]} ${tanggalForm.getFullYear()}`;
  const standLaluForm =
    riwayat.find((r) => r.id !== editId && r.tahun * 12 + (r.bulan - 1) === skorForm - 1)?.standMeter ?? null;
  const standIniForm = form.standMeter.trim() === '' ? null : Number(form.standMeter);
  const laluKetik = form.standBulanLalu.trim() === '' ? null : Number(form.standBulanLalu);
  // Bulan lalu yang sudah tercatat dipakai apa adanya; bila belum, pakai angka yang diketik.
  const laluDipakai = standLaluForm !== null ? standLaluForm : laluKetik !== null && !Number.isNaN(laluKetik) ? laluKetik : null;
  const pemakaianForm =
    laluDipakai !== null && standIniForm !== null && !Number.isNaN(standIniForm)
      ? Math.round((standIniForm - laluDipakai) * 100) / 100
      : null;

  // Bulan lalu yang sudah tercatat: isi otomatis dan kunci.
  useEffect(() => {
    if (standLaluForm !== null) {
      setForm((cur) => (cur.standBulanLalu === String(standLaluForm) ? cur : { ...cur, standBulanLalu: String(standLaluForm) }));
    }
  }, [standLaluForm]);

  const tahunPilihan = Array.from({ length: 6 }, (_, i) => sekarang.getFullYear() - i);

  return (
    <section>
      <div className={styles.hero}>
        <div>
          <span className={styles.heroIcon}>
            <Gauge />
          </span>
          <div>
            <h1>Perhitungan KWH</h1>
            <p>
              Catat stand meter setiap tanggal 1 di atas pukul 10.00 WITA. Pemakaian = stand bulan ini dikurangi
              stand bulan lalu.
            </p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primary} onClick={bukaModal}>
            <Plus />
            Tambah Data
          </button>
        </div>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filterPanel} style={{ gridTemplateColumns: 'minmax(140px, 200px) minmax(180px, 320px) auto' }}>
        <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} aria-label="Filter tahun">
          {tahunPilihan.map((t) => (
            <option key={t} value={t}>
              Tahun {t}
            </option>
          ))}
        </select>
        <select value={meterFilter} onChange={(e) => setMeterFilter(e.target.value)} aria-label="Filter meter">
          <option value="">Semua meter</option>
          {daftarMeter.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setTahun(sekarang.getFullYear());
            setMeterFilter('');
          }}
        >
          Reset
        </button>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableTitle}>
          <h3>Data Pencatatan KWH</h3>
          <span>Total {data.length} data</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Meter</th>
                <th>Periode</th>
                <th>Stand Bulan Lalu</th>
                <th>Stand Bulan Ini</th>
                <th>Pemakaian (kWh)</th>
                <th>Tanggal Catat</th>
                <th>Jadwal</th>
                <th>Dicatat Oleh</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <b>{item.meter.nama}</b>
                    {item.meter.lokasi ? <div style={{ fontSize: 11, color: '#71839d' }}>{item.meter.lokasi}</div> : null}
                  </td>
                  <td>
                    {NAMA_BULAN[item.bulan - 1]} {item.tahun}
                  </td>
                  <td>{item.standBulanLalu === null ? <span style={{ color: '#71839d' }}>-</span> : format(item.standBulanLalu)}</td>
                  <td>{format(item.standMeter)}</td>
                  <td>
                    {item.pemakaian === null ? (
                      <span style={{ color: '#71839d' }} title="Bulan lalu belum dicatat">
                        -
                      </span>
                    ) : (
                      <b>{format(item.pemakaian)}</b>
                    )}
                  </td>
                  <td>
                    {new Date(item.tanggalCatat).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Makassar',
                    })}{' '}
                    WITA
                  </td>
                  <td>
                    <span className={item.tepatWaktu ? styles.ready : styles.breakdown}>
                      {item.tepatWaktu ? 'SESUAI JADWAL' : 'DI LUAR JADWAL'}
                    </span>
                  </td>
                  <td>{item.pencatat.name}</td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => bukaModalEdit(item)} title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => void hapus(item)} title="Hapus">
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.length && (
                <tr>
                  <td colSpan={10} className={styles.empty}>
                    Belum ada data pencatatan KWH.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className={styles.modalBack}>
          <form className={styles.modal} onSubmit={submit}>
            <header>
              <div>
                <h2>{editId != null ? 'Edit Data KWH' : 'Tambah Data KWH'}</h2>
                <p>Catat stand meter. Pemakaian dihitung otomatis dari selisih dengan bulan lalu.</p>
              </div>
              <button type="button" onClick={() => setModal(false)}>
                <X />
              </button>
            </header>
            <div className={styles.formGrid}>
              <label style={{ gridColumn: '1/-1' }}>
                Meter
                <select
                  required
                  disabled={editId != null}
                  value={form.meter}
                  onChange={(e) => setForm((cur) => ({ ...cur, meter: e.target.value }))}
                >
                  {daftarMeter.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama}
                      {m.lokasi ? ` - ${m.lokasi}` : ''}
                    </option>
                  ))}
                  {editId == null && <option value={BARU}>+ Meter baru...</option>}
                </select>
              </label>

              {editId == null && form.meter === BARU && (
                <>
                  <label>
                    Nama Meter
                    <input
                      required
                      placeholder="Contoh: Meter Gudang"
                      value={form.namaMeterBaru}
                      onChange={(e) => setForm((cur) => ({ ...cur, namaMeterBaru: e.target.value }))}
                    />
                  </label>
                  <label>
                    Lokasi (opsional)
                    <input
                      placeholder="Contoh: Area Workshop"
                      value={form.lokasiMeterBaru}
                      onChange={(e) => setForm((cur) => ({ ...cur, lokasiMeterBaru: e.target.value }))}
                    />
                  </label>
                </>
              )}

              <label>
                KWH Bulan Lalu - {labelBulanLalu}
                <input
                  required={standLaluForm === null && editId == null}
                  readOnly={standLaluForm !== null}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder={standLaluForm === null ? 'Contoh: 10000' : undefined}
                  value={form.standBulanLalu}
                  onChange={(e) => setForm((cur) => ({ ...cur, standBulanLalu: e.target.value }))}
                  style={standLaluForm !== null ? { background: '#eef3f9', color: '#4a5d77' } : undefined}
                />
                <span style={{ fontSize: 11, color: '#71839d' }}>
                  {standLaluForm !== null
                    ? 'Diambil otomatis dari pencatatan bulan lalu.'
                    : 'Bulan lalu belum pernah dicatat - isi angka KWH bulan lalu.'}
                </span>
              </label>
              <label>
                KWH Bulan Ini - {labelBulanIni}
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Contoh: 20000"
                  value={form.standMeter}
                  onChange={(e) => setForm((cur) => ({ ...cur, standMeter: e.target.value }))}
                />
              </label>
              <label>
                Tanggal &amp; Jam Pencatatan
                <input
                  required
                  type="datetime-local"
                  value={form.tanggalCatat}
                  onChange={(e) => setForm((cur) => ({ ...cur, tanggalCatat: e.target.value }))}
                />
                <span style={{ fontSize: 11, color: '#71839d' }}>
                  Sesuai jadwal bila tanggal 1 di atas pukul 10.00 WITA.
                </span>
              </label>
              <div
                style={{
                  gridColumn: '1/-1',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 10,
                  padding: 12,
                  background: '#f8fbff',
                  border: '1px solid #d5e1ef',
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#71839d', fontWeight: 700 }}>Perhitungan</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#12355f', marginTop: 4 }}>
                    {standIniForm === null || Number.isNaN(standIniForm) ? '...' : format(standIniForm)} -{' '}
                    {laluDipakai === null ? '...' : format(laluDipakai)}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#71839d' }}>KWH bulan ini dikurangi KWH bulan lalu</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#71839d', fontWeight: 700 }}>Pemakaian</div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: pemakaianForm !== null && pemakaianForm < 0 ? '#b02031' : '#067b46',
                    }}
                  >
                    {pemakaianForm === null ? '-' : `${format(pemakaianForm)} kWh`}
                  </div>
                  {pemakaianForm !== null && pemakaianForm < 0 ? (
                    <div style={{ fontSize: 10.5, color: '#b02031' }}>Stand lebih kecil dari bulan lalu</div>
                  ) : null}
                </div>
              </div>
              <label style={{ gridColumn: '1/-1' }}>
                Catatan (opsional)
                <input
                  maxLength={500}
                  value={form.catatan}
                  onChange={(e) => setForm((cur) => ({ ...cur, catatan: e.target.value }))}
                />
              </label>
            </div>
            {formError && <p className={styles.error}>{formError}</p>}
            <footer>
              <button type="button" onClick={() => setModal(false)}>
                Batal
              </button>
              <button className={styles.primary} disabled={submitting}>
                {submitting ? 'Menyimpan...' : editId != null ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
