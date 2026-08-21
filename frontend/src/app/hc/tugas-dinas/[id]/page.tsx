'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/[id]/page.tsx
// FUNGSI: Detail Surat Tugas Dinas - unduh PDF, setujui/tolak (PJO)
// ==================================================

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  MapPin,
  RefreshCw,
  UserRound,
  XCircle,
} from 'lucide-react';
import {
  BadgeStatusSurat,
  Dialog,
  Field,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/tugas-dinas/tugas-dinas-ui';
import { getStoredUser } from '@/lib/access-control';
import {
  formatTanggal,
  formatTanggalWaktu,
  suratTugasApi,
  type SuratTugasDinas,
} from '@/lib/surat-tugas-dinas-api';
import styles from '../tugas-dinas.module.css';

export default function DetailTugasDinasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = getStoredUser();

  const [surat, setSurat] = useState<SuratTugasDinas | null>(null);
  const [pdfVersi, setPdfVersi] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [dialogTolak, setDialogTolak] = useState(false);
  const [alasanTolak, setAlasanTolak] = useState('');

  function terapkanSurat(data: SuratTugasDinas) {
    setSurat(data);
    setPdfVersi((nilai) => nilai + 1);
  }

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const data = await suratTugasApi.ambil<SuratTugasDinas>(
        `/${params.id}`,
      );
      terapkanSurat(data);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [params.id]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const isAdmin =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const bolehMemproses =
    surat &&
    currentUser &&
    (isAdmin ||
      (surat.status === 'MENUNGGU_SH' && currentUser.role === 'SECTION_HEAD') ||
      (surat.status === 'MENUNGGU_PJO' && currentUser.role === 'PJO')) &&
    (surat.status === 'MENUNGGU_SH' || surat.status === 'MENUNGGU_PJO');

  const labelSetujui = surat?.status === 'MENUNGGU_SH'
    ? 'Setujui sebagai SH'
    : 'Setujui sebagai PJO';

  async function setujui() {
    if (!surat) return;
    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.ubah<SuratTugasDinas>(
        `/${surat.id}/setujui`,
      );
      terapkanSurat(hasil);
      setSukses('Surat tugas dinas disetujui.');
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function cetakUlang() {
    if (!surat) return;
    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.ubah<SuratTugasDinas>(
        `/${surat.id}/cetak-ulang`,
      );
      terapkanSurat(hasil);
      setSukses('PDF berhasil dicetak ulang dengan layout terbaru.');
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function tolak() {
    if (!surat) return;
    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.ubah<SuratTugasDinas>(
        `/${surat.id}/tolak`,
        { alasan: alasanTolak.trim() },
      );
      terapkanSurat(hasil);
      setSukses('Surat tugas dinas ditolak.');
      setDialogTolak(false);
      setAlasanTolak('');
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  if (memuat) {
    return <Memuat />;
  }

  if (!surat) {
    return (
      <>
        <Link href="/hc/tugas-dinas" className={styles.backButton}>
          <ArrowLeft size={16} />
          Kembali
        </Link>

        {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
        <Kosong
          judul="Surat tidak ditemukan"
          keterangan="Surat mungkin sudah dihapus atau Anda tidak memiliki akses."
        />
      </>
    );
  }

  return (
    <>
      <Link href="/hc/tugas-dinas" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileText size={26} />
          </span>

          <div>
            <h1>{surat.nomor}</h1>
            <p>{surat.tujuanLokasi}</p>
          </div>
        </div>

        <div className={styles.headActions}>
          <button
            type="button"
            className={`${styles.tombol} ${styles.tombolNetral}`}
            onClick={() => router.push('/hc/tugas-dinas')}
          >
            <ArrowLeft size={15} />
            Daftar Surat
          </button>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <div className={styles.detailGrid}>
        <Panel judul="Informasi Surat">
          <div className={styles.detailMeta}>
            <span>
              <UserRound size={13} /> Dibuat oleh {surat.dibuatOleh.name}
            </span>
            <span>
              <MapPin size={13} /> {surat.tujuanLokasi}
            </span>
            <span>
              <Calendar size={13} /> {formatTanggal(surat.tanggalMulai)} -{' '}
              {formatTanggal(surat.tanggalSelesai)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span>Keterangan Tugas</span>
            <strong>{surat.keteranganTugas}</strong>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <BadgeStatusSurat nilai={surat.status} />
          </div>

          {surat.status === 'DITOLAK' && surat.alasanTolak ? (
            <div style={{ marginTop: 12 }}>
              <Pesan jenis="error">Alasan ditolak: {surat.alasanTolak}</Pesan>
            </div>
          ) : null}

          {surat.filePdf ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                className={styles.pdfTombol}
                href={`${suratTugasApi.urlPdf(surat.filePdf)}?v=${pdfVersi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={14} />
                Lihat / Unduh PDF
              </a>

              <button
                type="button"
                className={styles.pdfTombol}
                onClick={() => void cetakUlang()}
                disabled={proses}
              >
                <RefreshCw size={14} />
                Cetak Ulang PDF
              </button>
            </div>
          ) : null}

          {bolehMemproses ? (
            <div style={{ marginTop: 18, display: 'flex', gap: 9 }}>
              <button
                type="button"
                className={styles.tombol}
                onClick={() => void setujui()}
                disabled={proses}
              >
                <CheckCircle2 size={15} />
                {proses ? 'Memproses...' : labelSetujui}
              </button>

              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolBahaya}`}
                onClick={() => setDialogTolak(true)}
                disabled={proses}
              >
                <XCircle size={15} />
                Tolak
              </button>
            </div>
          ) : null}
        </Panel>

        <Panel judul="Persetujuan">
          <div className={styles.detailRow}>
            <span>Dibuat Oleh</span>
            <strong>{surat.dibuatOleh.name}</strong>
          </div>
          <div className={styles.detailRow}>
            <span>Dibuat Oleh - SH (Singgieh Prananda)</span>
            <strong>
              {surat.disetujuiShOleh
                ? `Disetujui oleh ${surat.disetujuiShOleh.name} - ${formatTanggalWaktu(surat.disetujuiShPada)}`
                : 'Menunggu persetujuan'}
            </strong>
          </div>
          <div className={styles.detailRow}>
            <span>Mengetahui - PJO (Wahyu Binuko)</span>
            <strong>
              {surat.disetujuiPjoOleh
                ? `Disetujui oleh ${surat.disetujuiPjoOleh.name} - ${formatTanggalWaktu(surat.disetujuiPjoPada)}`
                : 'Menunggu persetujuan'}
            </strong>
          </div>
        </Panel>
      </div>

      <Panel judul="Diberikan Kepada" keterangan={`${surat.karyawan.length} karyawan`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>NRP</th>
                <th>Nama</th>
                <th>Departemen</th>
                <th>Jabatan</th>
              </tr>
            </thead>

            <tbody>
              {surat.karyawan.map((item) => (
                <tr key={item.id}>
                  <td>{item.urutan}</td>
                  <td>{item.nrp}</td>
                  <td>{item.nama}</td>
                  <td>{item.departemen}</td>
                  <td>{item.jabatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {dialogTolak ? (
        <Dialog
          judul="Tolak Surat Tugas Dinas"
          keterangan="Berikan alasan penolakan."
          onTutup={() => setDialogTolak(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogTolak(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolBahaya}`}
                onClick={() => void tolak()}
                disabled={proses || alasanTolak.trim().length < 3}
              >
                {proses ? 'Menyimpan...' : 'Tolak Surat'}
              </button>
            </>
          }
        >
          <Field label="Alasan Penolakan" lebar>
            <textarea
              className={styles.textarea}
              value={alasanTolak}
              onChange={(event) => setAlasanTolak(event.target.value)}
            />
          </Field>
        </Dialog>
      ) : null}
    </>
  );
}