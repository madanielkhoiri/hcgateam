'use client';

// ==================================================
// FILE: frontend/src/app/hc/helpdesk/[id]/page.tsx
// FUNGSI: Detail tiket Helpdesk Center - proses & penyelesaian PIC
// ==================================================

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Paperclip,
  Phone,
  Send,
  UserRound,
} from 'lucide-react';
import {
  BadgeLevelTiket,
  BadgeStatusTiket,
  Field,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/helpdesk/helpdesk-ui';
import {
  formatTanggalWaktu,
  helpdeskApi,
  type LevelTiketHelpdesk,
  type TiketHelpdesk,
} from '@/lib/helpdesk-api';
import { useHelpdesk } from '../layout';
import styles from '../helpdesk.module.css';

export default function DetailTiketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isPic } = useHelpdesk();

  const [tiket, setTiket] = useState<TiketHelpdesk | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [catatan, setCatatan] = useState('');
  const [level, setLevel] = useState<LevelTiketHelpdesk | ''>('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const data = await helpdeskApi.ambil<TiketHelpdesk>(`/${params.id}`);
      setTiket(data);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [params.id]);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function prosesTiket() {
    if (!tiket) return;
    setProses(true);
    setGalat(null);

    try {
      const hasil = await helpdeskApi.ubah<TiketHelpdesk>(`/${tiket.id}/proses`);
      setTiket(hasil);
      setSukses('Tiket sedang diproses.');
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function selesaikanTiket() {
    if (!tiket) return;
    setProses(true);
    setGalat(null);

    try {
      const hasil = await helpdeskApi.ubah<TiketHelpdesk>(
        `/${tiket.id}/selesaikan`,
        { catatanPenyelesaian: catatan, level: level || undefined },
      );
      setTiket(hasil);
      setSukses('Tiket berhasil diselesaikan.');
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  if (memuat) {
    return <Memuat />;
  }

  if (!tiket) {
    return (
      <>
        <div className={styles.breadcrumb}>
          <Link href="/hc/helpdesk">Helpdesk Center</Link>
          <span>/</span>
          <strong>Detail Tiket</strong>
        </div>

        {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
        <Kosong judul="Tiket tidak ditemukan" keterangan="Tiket mungkin sudah dihapus atau Anda tidak memiliki akses." />
      </>
    );
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/helpdesk">Helpdesk Center</Link>
        <span>/</span>
        <strong>{tiket.nomorTiket}</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileText size={26} />
          </span>

          <div>
            <h1>{tiket.masalah ?? tiket.subKategori}</h1>
            <p>
              {tiket.nomorTiket} - {tiket.kategori} / {tiket.subKategori}
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <button
            type="button"
            className={`${styles.tombol} ${styles.tombolNetral}`}
            onClick={() => router.push('/hc/helpdesk')}
          >
            <ArrowLeft size={15} />
            Kembali
          </button>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <div className={styles.detailGrid}>
        <Panel judul="Informasi Tiket" keterangan="Menampilkan detail laporan yang disampaikan">
          <div className={styles.detailMeta}>
            <span>
              <UserRound size={13} /> {tiket.pembuat.name}
            </span>
            <span>
              <Building2 size={13} /> {tiket.pembuat.departemen ?? '-'} - {tiket.pembuat.jabatan ?? '-'}
            </span>
            {tiket.pembuat.phoneNumber ? (
              <span>
                <Phone size={13} /> {tiket.pembuat.phoneNumber}
              </span>
            ) : null}
            <span>
              <CalendarClock size={13} /> {formatTanggalWaktu(tiket.dibuatPada)}
            </span>
          </div>

          <div className={styles.detailDeskripsi}>{tiket.deskripsi}</div>

          {tiket.lampiran ? (
            <a
              className={styles.lampiranTombol}
              href={helpdeskApi.urlLampiran(tiket.lampiran)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Paperclip size={14} />
              {tiket.namaFileAsli ?? 'Lihat lampiran'}
            </a>
          ) : null}

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <BadgeStatusTiket nilai={tiket.status} />
            <BadgeLevelTiket nilai={tiket.level} />
          </div>

          {isPic && tiket.status === 'TERBUKA' ? (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className={styles.tombol}
                onClick={() => void prosesTiket()}
                disabled={proses}
              >
                <ClipboardCheck size={15} />
                {proses ? 'Memproses...' : 'Proses Tiket'}
              </button>
            </div>
          ) : null}

          {isPic && tiket.status === 'DIPROSES' ? (
            <div style={{ marginTop: 18 }}>
              <div className={styles.formGrid}>
                <Field label="Catatan Penyelesaian" lebar>
                  <textarea
                    className={styles.textarea}
                    value={catatan}
                    onChange={(event) => setCatatan(event.target.value)}
                    placeholder="Jelaskan solusi/penyelesaian untuk laporan ini"
                  />
                </Field>

                <Field label="Level Kesulitan">
                  <select
                    className={styles.select}
                    value={level}
                    onChange={(event) =>
                      setLevel(event.target.value as LevelTiketHelpdesk | '')
                    }
                  >
                    <option value="">-- Pilih Level --</option>
                    <option value="RENDAH">Low</option>
                    <option value="SEDANG">Medium</option>
                    <option value="TINGGI">High</option>
                  </select>
                </Field>
              </div>

              <button
                type="button"
                className={styles.tombol}
                style={{ marginTop: 13 }}
                onClick={() => void selesaikanTiket()}
                disabled={proses || catatan.trim().length < 3}
              >
                <Send size={15} />
                {proses ? 'Menyimpan...' : 'Selesaikan Tiket'}
              </button>
            </div>
          ) : null}
        </Panel>

        <Panel judul="Feedback dan History">
          {tiket.status === 'SELESAI' ? (
            <div className={styles.notice} style={{ background: '#e6f0ff', color: '#0a5fb4', border: '1px solid #cfe0fb' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Diselesaikan oleh: {tiket.pic?.name ?? '-'}</strong>
                <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                  {tiket.catatanPenyelesaian}
                </p>
              </div>
            </div>
          ) : null}

          <div className={styles.timeline} style={{ marginTop: 18 }}>
            <div className={styles.timelineItem}>
              <span className={styles.timelineDot}>
                <FileText size={15} />
              </span>
              <div>
                <strong>Tiket dibuat</strong>
                <span>{formatTanggalWaktu(tiket.dibuatPada)}</span>
              </div>
            </div>

            {tiket.diprosesPada ? (
              <div className={styles.timelineItem}>
                <span className={styles.timelineDot}>
                  <ClipboardCheck size={15} />
                </span>
                <div>
                  <strong>Diproses PIC{tiket.pic ? ` - ${tiket.pic.name}` : ''}</strong>
                  <span>{formatTanggalWaktu(tiket.diprosesPada)}</span>
                </div>
              </div>
            ) : null}

            {tiket.selesaiPada ? (
              <div className={styles.timelineItem}>
                <span className={styles.timelineDot}>
                  <CheckCircle2 size={15} />
                </span>
                <div>
                  <strong>Tiket selesai</strong>
                  <span>{formatTanggalWaktu(tiket.selesaiPada)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
