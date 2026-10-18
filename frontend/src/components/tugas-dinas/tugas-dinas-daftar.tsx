"use client";

// ==================================================
// FILE: frontend/src/components/tugas-dinas/tugas-dinas-daftar.tsx
// FUNGSI: Tabel daftar surat untuk menu "STD" dan "STD Akomodasi"
// (dipisah lewat filter denganAkomodasi). Tombol "+ Tambah" membuka
// form pembuatan surat dalam popup.
// ==================================================

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import {
  BadgeStatusSurat,
  Dialog,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from "@/components/tugas-dinas/tugas-dinas-ui";
import { TugasDinasBuatForm } from "@/components/tugas-dinas/tugas-dinas-buat-form";
import {
  formatTanggal,
  suratTugasApi,
  type HasilHalaman,
  type StatusSuratTugas,
  type SuratTugasDinas,
} from "@/lib/surat-tugas-dinas-api";
import {
  PaginationBar,
  hitungTotalHalaman,
} from "@/components/pagination/pagination-bar";
import styles from "@/app/hc/tugas-dinas/tugas-dinas.module.css";

const UKURAN_HALAMAN = 20;

const TAB_STATUS: Array<{ key: string; label: string }> = [
  { key: "", label: "Semua" },
  { key: "MENUNGGU_SH", label: "Menunggu SH" },
  { key: "MENUNGGU_PJO", label: "Menunggu PJO" },
  { key: "DISETUJUI", label: "Disetujui" },
  { key: "DITOLAK", label: "Ditolak" },
];

export function TugasDinasDaftar({
  withAkomodasi,
}: {
  withAkomodasi: boolean;
}) {
  const [tab, setTab] = useState("");
  const [daftar, setDaftar] = useState<SuratTugasDinas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [cari, setCari] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [totalSurat, setTotalSurat] = useState(0);
  const [dialogBuat, setDialogBuat] = useState(false);
  const [suratDiedit, setSuratDiedit] = useState<SuratTugasDinas | null>(null);

  const judul = withAkomodasi ? "STD Akomodasi" : "Surat Tugas Dinas (STD)";

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const parameter = new URLSearchParams({
        halaman: String(halaman),
        ukuranHalaman: String(UKURAN_HALAMAN),
        denganAkomodasi: String(withAkomodasi),
      });

      if (tab) parameter.set("status", tab);
      if (cari.trim()) parameter.set("cari", cari.trim());
      if (filterBulan) parameter.set("bulan", filterBulan);
      if (filterTahun) parameter.set("tahun", filterTahun);

      const hasil = await suratTugasApi.ambil<HasilHalaman<SuratTugasDinas>>(
        `?${parameter.toString()}`,
      );
      setDaftar(hasil.data);
      setTotalSurat(hasil.total);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [tab, cari, filterBulan, filterTahun, halaman, withAkomodasi]);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Balik ke halaman 1 tiap kali tab status atau filter cari/bulan/tahun berubah.
  useEffect(() => {
    setHalaman(1);
  }, [tab, cari, filterBulan, filterTahun]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  async function hapus(item: SuratTugasDinas) {
    if (!window.confirm(`Hapus surat ${item.nomor}? Data yang dihapus tidak dapat dikembalikan.`)) return;
    setGalat(null);
    try {
      await suratTugasApi.hapus<{ message: string }>(`/${item.id}`);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Plane size={26} />
          </span>

          <div>
            <h1>{judul}</h1>
            <p>
              {withAkomodasi
                ? "Daftar STD Akomodasi: uang makan, transportasi, dan laundry dari STD yang sudah disetujui."
                : "Daftar Surat Tugas Dinas dengan karyawan dari Database Karyawan, lengkap alur persetujuan SH & PJO."}
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.tombol}
            onClick={() => { setSuratDiedit(null); setDialogBuat(true); }}
          >
            <Plus size={15} />
            Tambah
          </button>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <div className={styles.filterBar}>
        {TAB_STATUS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tombol} ${styles.tombolKecil} ${
              tab === item.key ? "" : styles.tombolNetral
            }`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel
        judul={`Daftar ${judul}`}
        keterangan={`${totalSurat} surat, ditampilkan ${daftar.length} per halaman.`}
      >
        <div className={styles.filterBar}>
          <input
            className={styles.input}
            style={{ maxWidth: 240 }}
            placeholder="Cari nama karyawan, NRP, atau tujuan..."
            value={cari}
            onChange={(event) => setCari(event.target.value)}
          />

          <select
            className={styles.select}
            style={{ maxWidth: 160 }}
            value={filterBulan}
            onChange={(event) => setFilterBulan(event.target.value)}
          >
            <option value="">Semua Bulan</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Intl.DateTimeFormat("id-ID", {
                  month: "long",
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
        ) : daftar.length === 0 ? (
          <Kosong
            judul="Belum ada surat tugas"
            keterangan='Klik "+ Tambah" untuk membuat surat baru.'
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
                {daftar.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/hc/tugas-dinas/${item.id}`}
                        className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                      >
                        <Eye size={12} />
                        Lihat
                      </Link>
                      <button type="button" className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`} onClick={() => { setSuratDiedit(item); setDialogBuat(true); }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button type="button" className={`${styles.tombol} ${styles.tombolBahaya} ${styles.tombolKecil}`} onClick={() => void hapus(item)}>
                        <Trash2 size={12} /> Hapus
                      </button>
                    </td>
                    <td>{item.nomor}</td>
                    <td>{item.tujuanLokasi}</td>
                    <td>
                      {formatTanggal(item.tanggalMulai)} -{" "}
                      {formatTanggal(item.tanggalSelesai)}
                    </td>
                    <td>{item.karyawan.length} orang</td>
                    <td>{item.dibuatOleh.name}</td>
                    <td>
                      <BadgeStatusSurat
                        nilai={item.status as StatusSuratTugas}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationBar
          halaman={halaman}
          totalHalaman={hitungTotalHalaman(totalSurat, UKURAN_HALAMAN)}
          onGanti={setHalaman}
        />
      </Panel>

      {dialogBuat ? (
        <Dialog
          lebar
          judul={suratDiedit ? `Edit ${withAkomodasi ? "STD Akomodasi" : "Surat Tugas Dinas"}` : withAkomodasi ? "Tambah STD Akomodasi" : "Tambah Surat Tugas Dinas"}
          keterangan={suratDiedit ? "Perubahan akan mengembalikan surat ke tahap persetujuan SH." : "Setelah dibuat, surat menunggu persetujuan SH lalu PJO."}
          onTutup={() => { setDialogBuat(false); setSuratDiedit(null); }}
        >
          <TugasDinasBuatForm
            withAkomodasi={withAkomodasi}
            initialData={suratDiedit}
            onBatal={() => { setDialogBuat(false); setSuratDiedit(null); }}
            onTersimpan={() => { setDialogBuat(false); setSuratDiedit(null); void muat(); }}
          />
        </Dialog>
      ) : null}
    </>
  );
}
