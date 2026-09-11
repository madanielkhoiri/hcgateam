'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/dashboard/page.tsx
// FUNGSI: Dashboard Form Tugas Dinas - halaman pertama begitu masuk
// sidebar Tugas Dinas. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart), daftar surat tugas
// (dipindah dari tugas-dinas/page.tsx lama) di bawahnya.
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Plane, Plus } from 'lucide-react';
import {
  BadgeStatusSurat,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/tugas-dinas/tugas-dinas-ui';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  formatTanggal,
  suratTugasApi,
  type RingkasanSuratTugas,
  type StatusSuratTugas,
  type SuratTugasDinas,
  type TrenDashboardSuratTugas,
} from '@/lib/surat-tugas-dinas-api';
import styles from '../tugas-dinas.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_STATUS: Record<string, string> = {
  MENUNGGU_SH: '#f17c16',
  MENUNGGU_PJO: '#6748df',
  DISETUJUI: '#079669',
  DITOLAK: '#d53535',
};

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU_SH: 'Menunggu SH',
  MENUNGGU_PJO: 'Menunggu PJO',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

const TAB_STATUS: Array<{ key: string; label: string }> = [
  { key: '', label: 'Semua' },
  { key: 'MENUNGGU_SH', label: 'Menunggu SH' },
  { key: 'MENUNGGU_PJO', label: 'Menunggu PJO' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DITOLAK', label: 'Ditolak' },
];

export default function DashboardTugasDinasPage() {
  const [tab, setTab] = useState('');
  const [daftar, setDaftar] = useState<SuratTugasDinas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const [ringkasan, setRingkasan] = useState<RingkasanSuratTugas | null>(null);
  const [tren, setTren] = useState<TrenDashboardSuratTugas | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.ambil<SuratTugasDinas[]>(
        tab ? `?status=${tab}` : '',
      );
      setDaftar(hasil);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [tab]);

  useEffect(() => {
    void muat();
  }, [muat]);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      suratTugasApi.ambil<RingkasanSuratTugas>('/dashboard/ringkasan'),
      suratTugasApi.ambil<TrenDashboardSuratTugas>('/dashboard/tren'),
    ])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch(() => {
        // Kartu & grafik dashboard cukup kosong bila gagal dimuat.
      });

    return () => {
      aktif = false;
    };
  }, []);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  const daftarTampil = useMemo(() => {
    return daftar.filter((item) => {
      const tanggal = new Date(item.tanggalMulai);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [daftar, filterBulan, filterTahun]);

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: 'Total Surat Tugas',
          value: ringkasan.totalSurat,
          initial: 'TS',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Menunggu SH',
          value: ringkasan.menungguSh,
          initial: 'SH',
          iconBg: '#fff2df',
          iconColor: '#f17c16',
        },
        {
          label: 'Menunggu PJO',
          value: ringkasan.menungguPjo,
          initial: 'PJ',
          iconBg: '#f0ebff',
          iconColor: '#6748df',
        },
        {
          label: 'Disetujui',
          value: ringkasan.disetujui,
          initial: 'OK',
          iconBg: '#e4f7ec',
          iconColor: '#079669',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataStatus =
    tren?.breakdownStatus.map((item) => ({
      label: LABEL_STATUS[item.status] ?? item.status,
      value: item.total,
      color: WARNA_STATUS[item.status] ?? '#d97706',
    })) ?? [];

  return (
    <>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Plane size={26} />
          </span>

          <div>
            <h1>Form Tugas Dinas</h1>
            <p>
              Buat Surat Tugas Dinas dengan karyawan dari Database Karyawan,
              otomatis jadi PDF, lengkap alur persetujuan SH &amp; PJO.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link href="/hc/tugas-dinas/buat" className={styles.tombol}>
            <Plus size={15} />
            Buat Surat Tugas
          </Link>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <StatCardRow cards={statCards} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
          gap: 16,
          margin: '4px 0 20px',
          alignItems: 'start',
        }}
      >
        <AnimatedLineChart
          title="Tren Surat Tugas Dinas per Bulan"
          subtitle={`Jumlah surat dibuat, tahun ${tren?.tahun ?? ''}`}
          data={dataTrenChart}
          accent="orange"
        />
        <SimplePieChart
          title="Breakdown Status Surat"
          subtitle="Seluruh surat tercatat"
          data={dataStatus}
          satuan="surat"
        />
      </div>

      <div className={styles.filterBar}>
        {TAB_STATUS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tombol} ${styles.tombolKecil} ${
              tab === item.key ? '' : styles.tombolNetral
            }`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel
        judul="Daftar Surat Tugas Dinas"
        keterangan={`${daftarTampil.length} dari ${daftar.length} surat ditampilkan.`}
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 160 }}
            value={filterBulan}
            onChange={(event) => setFilterBulan(event.target.value)}
          >
            <option value="">Semua Bulan</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Intl.DateTimeFormat('id-ID', {
                  month: 'long',
                }).format(new Date(2026, index, 1))}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            style={{ maxWidth: 130 }}
            value={filterTahun}
            onChange={(event) => setFilterTahun(event.target.value)}
          >
            <option value="">Semua Tahun</option>
            {tahunTersedia.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {memuat ? (
          <Memuat />
        ) : daftarTampil.length === 0 ? (
          <Kosong
            judul="Belum ada surat tugas"
            keterangan="Buat surat tugas dinas baru untuk mulai."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Aksi</th>
                  <th>Nomor</th>
                  <th>Tujuan/Lokasi</th>
                  <th>Tanggal Tugas</th>
                  <th>Jumlah Karyawan</th>
                  <th>Dibuat Oleh</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {daftarTampil.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/hc/tugas-dinas/${item.id}`}
                        className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                      >
                        <Eye size={12} />
                        Lihat
                      </Link>
                    </td>
                    <td>{item.nomor}</td>
                    <td>{item.tujuanLokasi}</td>
                    <td>
                      {formatTanggal(item.tanggalMulai)} -{' '}
                      {formatTanggal(item.tanggalSelesai)}
                    </td>
                    <td>{item.karyawan.length} orang</td>
                    <td>{item.dibuatOleh.name}</td>
                    <td>
                      <BadgeStatusSurat nilai={item.status as StatusSuratTugas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
