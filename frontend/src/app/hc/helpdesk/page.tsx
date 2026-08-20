'use client';

// ==================================================
// FILE: frontend/src/app/hc/helpdesk/page.tsx
// FUNGSI: Daftar tiket Helpdesk Center + form Laporan Baru
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  MessageSquarePlus,
  Paperclip,
} from 'lucide-react';
import {
  BadgeLevelTiket,
  BadgeStatusTiket,
  Dialog,
  Field,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/helpdesk/helpdesk-ui';
import {
  formatTanggalWaktu,
  helpdeskApi,
  type PohonKategoriHelpdesk,
  type RingkasanHelpdesk,
  type StatusTiketHelpdesk,
  type TiketHelpdesk,
} from '@/lib/helpdesk-api';
import { useHelpdesk } from './layout';
import styles from './helpdesk.module.css';

const TAB_STATUS: Array<{ key: StatusTiketHelpdesk; label: string }> = [
  { key: 'TERBUKA', label: 'Open' },
  { key: 'DIPROSES', label: 'On Progress' },
  { key: 'SELESAI', label: 'Closed' },
];

export default function HelpdeskPage() {
  const { isPic } = useHelpdesk();

  const [tab, setTab] = useState<StatusTiketHelpdesk>('TERBUKA');
  const [tiket, setTiket] = useState<TiketHelpdesk[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanHelpdesk | null>(null);
  const [pohonKategori, setPohonKategori] = useState<PohonKategoriHelpdesk>({});

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [dialogBuat, setDialogBuat] = useState(false);
  const [formKategori, setFormKategori] = useState('');
  const [formSubKategori, setFormSubKategori] = useState('');
  const [formMasalah, setFormMasalah] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formLampiran, setFormLampiran] = useState<File | null>(null);

  const daftarSubKategori = formKategori
    ? Object.keys(pohonKategori[formKategori] ?? {})
    : [];
  const daftarMasalah =
    formKategori && formSubKategori
      ? (pohonKategori[formKategori]?.[formSubKategori] ?? [])
      : [];
  const masalahDiperlukan = daftarMasalah.length > 0;

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarTiket, ringkasanData, kategoriData] = await Promise.all([
        helpdeskApi.ambil<TiketHelpdesk[]>(`?status=${tab}`),
        helpdeskApi.ambil<RingkasanHelpdesk>('/ringkasan'),
        helpdeskApi.ambil<PohonKategoriHelpdesk>('/kategori'),
      ]);

      setTiket(daftarTiket);
      setRingkasan(ringkasanData);
      setPohonKategori(kategoriData);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [tab]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function bukaBuat() {
    setFormKategori('');
    setFormSubKategori('');
    setFormMasalah('');
    setFormDeskripsi('');
    setFormLampiran(null);
    setDialogBuat(true);
  }

  async function simpanTiket() {
    setProses(true);
    setGalat(null);

    try {
      await helpdeskApi.buatTiket({
        kategori: formKategori,
        subKategori: formSubKategori,
        masalah: formMasalah || undefined,
        deskripsi: formDeskripsi,
        lampiran: formLampiran,
      });

      setSukses('Laporan berhasil dibuat. Tim terkait akan segera memproses.');
      setDialogBuat(false);
      setTab('TERBUKA');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function prosesTiket(item: TiketHelpdesk) {
    setProses(true);
    setGalat(null);

    try {
      await helpdeskApi.ubah(`/${item.id}/proses`);
      setSukses(`Tiket ${item.nomorTiket} sedang diproses.`);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  return (
    <>
      <Link href="/hc" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali ke HC
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <ClipboardList size={26} />
          </span>

          <div>
            <h1>Tiket Pelaporan Anda</h1>
            <p>Lihat semua laporan berdasarkan status.</p>
          </div>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <div className={styles.introGrid}>
        <button
          type="button"
          className={styles.introCard}
          onClick={bukaBuat}
        >
          <span className={styles.introIcon}>
            <MessageSquarePlus size={24} />
          </span>
          <div>
            <h3>Anda memiliki kendala?</h3>
            <p>Silahkan klik pada card ini untuk membuat laporan temuan masalah.</p>
          </div>
        </button>

        <div className={styles.introCard} style={{ cursor: 'default' }}>
          <span className={styles.introIcon}>
            <ClipboardList size={24} />
          </span>
          <div>
            <h3>
              Laporan Dalam Antrian -{' '}
              <span className={styles.introAntrian}>
                {ringkasan?.antrian ?? 0}
              </span>{' '}
              Tiket
            </h3>
            <p>Total laporan dalam antrian penyelesaian sampai saat ini.</p>
          </div>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TAB_STATUS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tab} ${tab === item.key ? styles.tabAktif : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel
        judul={`Daftar Laporan - ${TAB_STATUS.find((item) => item.key === tab)?.label} (${tiket.length})`}
      >
        {memuat ? (
          <Memuat />
        ) : tiket.length === 0 ? (
          <Kosong
            judul="Belum ada tiket"
            keterangan="Tiket pada status ini akan tampil di sini."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Aksi</th>
                  {tab === 'SELESAI' ? <th>Rate</th> : null}
                  <th>No Tiket</th>
                  <th>Tanggal &amp; Jam</th>
                  <th>Problem</th>
                  {isPic ? <th>Nama</th> : null}
                  {isPic ? <th>Posisi</th> : null}
                  {isPic ? <th>Dept</th> : null}
                  <th>Status</th>
                  {isPic && tab === 'TERBUKA' ? <th /> : null}
                </tr>
              </thead>

              <tbody>
                {tiket.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/hc/helpdesk/${item.id}`}
                        className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                      >
                        <Eye size={12} />
                        Lihat
                      </Link>
                    </td>

                    {tab === 'SELESAI' ? (
                      <td>
                        <BadgeLevelTiket nilai={item.level} />
                      </td>
                    ) : null}

                    <td>{item.nomorTiket}</td>
                    <td>{formatTanggalWaktu(item.dibuatPada)}</td>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.masalah ?? item.subKategori}</strong>
                        <span>
                          {item.kategori} - {item.subKategori}
                        </span>
                      </div>
                    </td>

                    {isPic ? (
                      <td>
                        <div className={styles.tableNama}>
                          <strong>{item.pembuat.name}</strong>
                          {item.lampiran ? (
                            <span>
                              <Paperclip size={10} style={{ marginRight: 3 }} />
                              Ada lampiran
                            </span>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                    {isPic ? <td>{item.pembuat.jabatan ?? '-'}</td> : null}
                    {isPic ? <td>{item.pembuat.departemen ?? '-'}</td> : null}

                    <td>
                      <BadgeStatusTiket nilai={item.status} />
                    </td>

                    {isPic && tab === 'TERBUKA' ? (
                      <td>
                        <button
                          type="button"
                          className={`${styles.tombol} ${styles.tombolKecil}`}
                          onClick={() => void prosesTiket(item)}
                          disabled={proses}
                        >
                          Proses
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {dialogBuat ? (
        <Dialog
          judul="Laporan Baru"
          keterangan="Silahkan lengkapi form untuk membuat laporan."
          onTutup={() => setDialogBuat(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogBuat(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={() => void simpanTiket()}
                disabled={
                  proses ||
                  !formKategori ||
                  !formSubKategori ||
                  (masalahDiperlukan && !formMasalah) ||
                  formDeskripsi.trim().length < 5
                }
              >
                {proses ? 'Menyimpan...' : 'Buat Laporan'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Kategori Masalah" lebar>
              <select
                className={styles.select}
                value={formKategori}
                onChange={(event) => {
                  setFormKategori(event.target.value);
                  setFormSubKategori('');
                  setFormMasalah('');
                }}
              >
                <option value="">-- Pilih Kategori --</option>
                {Object.keys(pohonKategori).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            {formKategori ? (
              <Field label="Sub Kategori" lebar>
                <select
                  className={styles.select}
                  value={formSubKategori}
                  onChange={(event) => {
                    setFormSubKategori(event.target.value);
                    setFormMasalah('');
                  }}
                >
                  <option value="">-- Pilih Sub Kategori --</option>
                  {daftarSubKategori.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {formSubKategori && masalahDiperlukan ? (
              <Field label="Masalah" lebar>
                <select
                  className={styles.select}
                  value={formMasalah}
                  onChange={(event) => setFormMasalah(event.target.value)}
                >
                  <option value="">-- Pilih Masalah --</option>
                  {daftarMasalah.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Deskripsi Masalah" lebar>
              <textarea
                className={styles.textarea}
                value={formDeskripsi}
                onChange={(event) => setFormDeskripsi(event.target.value)}
                placeholder="Tambahkan informasi lain terkait masalah seperti detail lokasi, waktu kejadian, bantuan yang dibutuhkan, atau lainnya"
              />
            </Field>

            <Field label="Lampiran (opsional)" lebar>
              <input
                className={styles.input}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) =>
                  setFormLampiran(event.target.files?.[0] ?? null)
                }
              />
            </Field>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
