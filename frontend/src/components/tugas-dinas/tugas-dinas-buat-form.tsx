"use client";

// ==================================================
// FILE: frontend/src/components/tugas-dinas/tugas-dinas-buat-form.tsx
// FUNGSI: Form pembuatan Surat Tugas Dinas - dipakai bersama oleh menu
// "Buat Tugas Dinas" (STD biasa) dan "STD Akomodasi" (STD + field
// penginapan/transportasi/laundry). Karyawan diambil dari Database
// Karyawan (NRP & nama), lalu PDF dibuat otomatis.
// ==================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, Pesan } from "@/components/tugas-dinas/tugas-dinas-ui";
import { karyawanApi, type Karyawan } from "@/lib/karyawan-api";
import {
  durasiHariTugas,
  formatRupiah,
  suratTugasApi,
  type PilihanKaryawanAkomodasi,
  type SuratTugasDinas,
} from "@/lib/surat-tugas-dinas-api";
import styles from "@/app/hc/tugas-dinas/tugas-dinas.module.css";

type BarisKaryawan = {
  nrp: string;
  nama: string;
  departemen: string;
  jabatan: string;
  uangPerjalananNominal: string;
  akomodasiNominal: string;
  ruteTransportasiLokal: string;
  laundryNominal: string;
};

type PilihanKaryawanForm = {
  nrp: string;
  nama: string;
  departemen: string;
  jabatan: string;
  suratTugasId?: number;
  nomorSurat?: string;
  tujuanLokasi?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  keteranganTugas?: string;
};

export function TugasDinasBuatForm({
  withAkomodasi,
}: {
  withAkomodasi: boolean;
}) {
  const router = useRouter();

  const [nomor, setNomor] = useState("");
  const [tujuanLokasi, setTujuanLokasi] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [keteranganTugas, setKeteranganTugas] = useState("");

  const [penginapanHotel, setPenginapanHotel] = useState("");
  const [bantuanTransportasi, setBantuanTransportasi] = useState("");
  const [rutePerjalanan, setRutePerjalanan] = useState("");
  const [baris, setBaris] = useState<BarisKaryawan[]>([]);
  const [suratTugasAsalId, setSuratTugasAsalId] = useState<number | null>(null);
  const durasiHari = durasiHariTugas(tanggalMulai, tanggalSelesai);
  const laundryTersedia = durasiHari >= 3;
  const frekuensiMakanOtomatis = durasiHari > 0 ? durasiHari * 3 : 0;

  const totalMakan = baris.reduce(
    (total, row) => total + (Number(row.uangPerjalananNominal) || 0),
    0,
  );
  const totalTransportasi = baris.reduce(
    (total, row) => total + (Number(row.akomodasiNominal) || 0),
    0,
  );
  const totalLaundry = laundryTersedia
    ? baris.reduce((total, row) => total + (Number(row.laundryNominal) || 0), 0)
    : 0;
  const jumlahAkomodasi = totalMakan + totalTransportasi + totalLaundry;

  const [cari, setCari] = useState("");
  const [hasilCari, setHasilCari] = useState<PilihanKaryawanForm[]>([]);
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false);
  const [mencari, setMencari] = useState(false);

  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!withAkomodasi && (!cari.trim() || cari.trim().length < 2)) {
      setHasilCari([]);
      return;
    }

    let aktif = true;
    setMencari(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          let hasil: PilihanKaryawanForm[];

          if (withAkomodasi) {
            const query = cari.trim()
              ? `?cari=${encodeURIComponent(cari.trim())}`
              : "";
            const pilihan = await suratTugasApi.ambil<
              PilihanKaryawanAkomodasi[]
            >(`/pilihan-akomodasi${query}`);
            hasil = suratTugasAsalId
              ? pilihan.filter((item) => item.suratTugasId === suratTugasAsalId)
              : pilihan;
          } else {
            const karyawan = await karyawanApi.ambil<Karyawan[]>(
              `?cari=${encodeURIComponent(cari.trim())}`,
            );
            hasil = karyawan.map((item) => ({
              nrp: item.nik,
              nama: item.nama,
              departemen: item.departemen.namaDepartemen,
              jabatan: item.jabatan ?? "",
            }));
          }

          if (aktif) {
            setHasilCari(hasil.slice(0, 8));
          }
        } catch {
          if (aktif) {
            setHasilCari([]);
          }
        } finally {
          if (aktif) {
            setMencari(false);
          }
        }
      })();
    }, 300);

    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [cari, suratTugasAsalId, withAkomodasi]);

  function tambahBaris(item: PilihanKaryawanForm) {
    if (baris.some((row) => row.nrp === item.nrp)) {
      setCari("");
      setHasilCari([]);
      setDropdownTerbuka(false);
      return;
    }

    if (withAkomodasi) {
      if (
        !item.suratTugasId ||
        !item.tujuanLokasi ||
        !item.tanggalMulai ||
        !item.tanggalSelesai ||
        !item.keteranganTugas
      ) {
        setGalat("Data Surat Tugas Dinas asal tidak lengkap.");
        return;
      }

      if (suratTugasAsalId && suratTugasAsalId !== item.suratTugasId) {
        setGalat(
          "Karyawan harus berasal dari Surat Tugas Dinas yang sama. Hapus pilihan sebelumnya untuk mengganti surat.",
        );
        return;
      }

      setSuratTugasAsalId(item.suratTugasId);
      setTujuanLokasi(item.tujuanLokasi);
      setTanggalMulai(item.tanggalMulai.slice(0, 10));
      setTanggalSelesai(item.tanggalSelesai.slice(0, 10));
      setKeteranganTugas(item.keteranganTugas);
      setGalat(null);
    }

    setBaris((current) => [
      ...current,
      {
        nrp: item.nrp,
        nama: item.nama,
        departemen: item.departemen,
        jabatan: item.jabatan,
        uangPerjalananNominal: "",
        akomodasiNominal: "",
        ruteTransportasiLokal: "",
        laundryNominal: "",
      },
    ]);
    setCari("");
    setHasilCari([]);
    setDropdownTerbuka(false);
  }

  function ubahJabatan(index: number, jabatan: string) {
    setBaris((current) =>
      current.map((row, idx) => (idx === index ? { ...row, jabatan } : row)),
    );
  }

  function ubahAlokasi(
    index: number,
    kolom: keyof Pick<
      BarisKaryawan,
      | "uangPerjalananNominal"
      | "akomodasiNominal"
      | "ruteTransportasiLokal"
      | "laundryNominal"
    >,
    nilai: string,
  ) {
    setBaris((current) =>
      current.map((row, idx) =>
        idx === index ? { ...row, [kolom]: nilai } : row,
      ),
    );
  }

  function hapusBaris(index: number) {
    const tersisa = baris.filter((_, idx) => idx !== index);
    setBaris(tersisa);

    if (withAkomodasi && tersisa.length === 0) {
      setSuratTugasAsalId(null);
      setTujuanLokasi("");
      setTanggalMulai("");
      setTanggalSelesai("");
      setKeteranganTugas("");
    }
  }

  async function submit() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.kirim<SuratTugasDinas>("", {
        nomor: nomor.trim(),
        denganAkomodasi: withAkomodasi,
        tujuanLokasi: tujuanLokasi.trim(),
        tanggalMulai,
        tanggalSelesai,
        keteranganTugas: keteranganTugas.trim(),
        ...(withAkomodasi
          ? {
              suratTugasAsalId,
              penginapanHotel: penginapanHotel.trim() || undefined,
              bantuanTransportasi: bantuanTransportasi.trim() || undefined,
              rutePerjalanan: rutePerjalanan.trim() || undefined,
            }
          : {}),
        karyawan: baris.map((row) => ({
          nrp: row.nrp,
          nama: row.nama,
          departemen: row.departemen,
          jabatan: row.jabatan,
          uangPerjalananNominal: row.uangPerjalananNominal
            ? Number(row.uangPerjalananNominal)
            : undefined,
          akomodasiNominal: row.akomodasiNominal
            ? Number(row.akomodasiNominal)
            : undefined,
          ruteTransportasiLokal: row.ruteTransportasiLokal.trim() || undefined,
          ...(laundryTersedia
            ? {
                laundryNominal: row.laundryNominal
                  ? Number(row.laundryNominal)
                  : undefined,
              }
            : {}),
        })),
      });

      router.push(`/hc/tugas-dinas/${hasil.id}`);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  const bisaSimpan =
    nomor.trim().length > 0 &&
    tujuanLokasi.trim().length > 0 &&
    tanggalMulai &&
    tanggalSelesai &&
    keteranganTugas.trim().length > 0 &&
    baris.length > 0 &&
    (!withAkomodasi || suratTugasAsalId != null);

  return (
    <>
      <Link href="/hc/tugas-dinas" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Plane size={26} />
          </span>

          <div>
            <h1>
              {withAkomodasi ? "Buat STD Akomodasi" : "Buat Surat Tugas Dinas"}
            </h1>
            <p>
              {withAkomodasi
                ? "Pilih karyawan dari Surat Tugas Dinas yang sudah disetujui SH dan PJO. Lokasi, tanggal, keterangan tugas, serta identitas karyawan akan terisi otomatis."
                : "Pilih karyawan dari Database Karyawan (NRP & nama), lengkapi detail tugas, PDF akan dibuat otomatis."}{" "}
              Setelah dibuat, surat menunggu persetujuan SH lalu PJO.
            </p>
          </div>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Detail Surat</h2>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Field label="Nomor Surat">
            <input
              className={styles.input}
              value={nomor}
              onChange={(event) => setNomor(event.target.value)}
              placeholder="12/S-Out/HCGA/PPA-Adw/VIII/2026"
            />
          </Field>

          <Field label="Tujuan/Lokasi" lebar>
            <input
              className={styles.input}
              value={tujuanLokasi}
              onChange={(event) => setTujuanLokasi(event.target.value)}
              readOnly={withAkomodasi}
              placeholder="PPA SITE ADARO INDONESIA"
            />
          </Field>

          <Field label="Tanggal Mulai">
            <input
              className={styles.input}
              type="date"
              value={tanggalMulai}
              onChange={(event) => setTanggalMulai(event.target.value)}
              readOnly={withAkomodasi}
            />
          </Field>

          <Field label="Tanggal Selesai">
            <input
              className={styles.input}
              type="date"
              value={tanggalSelesai}
              onChange={(event) => setTanggalSelesai(event.target.value)}
              readOnly={withAkomodasi}
            />
          </Field>

          <Field label="Keterangan Tugas" lebar>
            <input
              className={styles.input}
              value={keteranganTugas}
              onChange={(event) => setKeteranganTugas(event.target.value)}
              readOnly={withAkomodasi}
              placeholder="DIKLAT & SERTIFIKASI BNSP"
            />
          </Field>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Diberikan Kepada</h2>
            <p>{baris.length} karyawan ditambahkan.</p>
          </div>
        </div>

        <div className={styles.pickerWrap}>
          <Field
            label={
              withAkomodasi
                ? "Pilih dari STD disetujui (NRP / nama / keterangan tugas)"
                : "Cari karyawan (nama/NIK) dari Database Karyawan"
            }
          >
            <input
              className={styles.input}
              value={cari}
              onChange={(event) => {
                setCari(event.target.value);
                setDropdownTerbuka(true);
              }}
              onFocus={() => setDropdownTerbuka(true)}
              onBlur={() => setTimeout(() => setDropdownTerbuka(false), 150)}
              placeholder={
                withAkomodasi
                  ? "Ketik NRP, nama, atau keterangan tugas..."
                  : "Ketik nama atau NIK..."
              }
            />
          </Field>

          {dropdownTerbuka && (withAkomodasi || cari.trim().length >= 2) ? (
            <div className={styles.pickerDropdown}>
              {mencari ? (
                <div className={styles.pickerItem}>
                  <span>Mencari...</span>
                </div>
              ) : hasilCari.length === 0 ? (
                <div className={styles.pickerItem}>
                  <span>Tidak ditemukan</span>
                </div>
              ) : (
                hasilCari.map((item) => (
                  <button
                    key={`${item.suratTugasId ?? "master"}-${item.nrp}`}
                    type="button"
                    className={styles.pickerItem}
                    onClick={() => tambahBaris(item)}
                  >
                    <strong>
                      {withAkomodasi
                        ? `${item.nrp} - ${item.nama} - ${item.keteranganTugas}`
                        : item.nama}
                    </strong>
                    <span>
                      {withAkomodasi
                        ? `STD ${item.nomorSurat} - ${item.departemen}`
                        : `${item.nrp} - ${item.departemen}${item.jabatan ? ` - ${item.jabatan}` : ""}`}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {baris.length > 0 ? (
          <div className={styles.tableWrap} style={{ marginTop: 14 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>NRP</th>
                  <th>Nama</th>
                  <th>Departemen</th>
                  <th>Jabatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {baris.map((row, index) => (
                  <tr key={row.nrp}>
                    <td>{index + 1}</td>
                    <td>{row.nrp}</td>
                    <td>{row.nama}</td>
                    <td>{row.departemen}</td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ minWidth: 160 }}
                        value={row.jabatan}
                        readOnly={withAkomodasi}
                        onChange={(event) =>
                          ubahJabatan(index, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolBahaya} ${styles.tombolKecil}`}
                        onClick={() => hapusBaris(index)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {withAkomodasi ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Akomodasi</h2>
              <p>
                Uang Akomodasi adalah total Makan + Transportasi + Laundry
                seluruh karyawan. Laundry tersedia untuk perjalanan minimal 3
                hari.
              </p>
              {tanggalMulai && tanggalSelesai ? (
                <p style={{ marginTop: 4 }}>
                  Durasi perjalanan: {durasiHari} hari. Laundry{" "}
                  {laundryTersedia
                    ? "diberikan karena durasi minimal 3 hari."
                    : "tidak diberikan karena durasi kurang dari 3 hari."}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.formGrid}>
            <Field label="Penginapan / Hotel" lebar>
              <input
                className={styles.input}
                value={penginapanHotel}
                onChange={(event) => setPenginapanHotel(event.target.value)}
                placeholder="Contoh: Hotel Fave Kelapa Gading"
              />
            </Field>

            <Field label="Bantuan Transportasi" lebar>
              <input
                className={styles.input}
                value={bantuanTransportasi}
                onChange={(event) => setBantuanTransportasi(event.target.value)}
                placeholder="Contoh: Travel & Tiket Pesawat"
              />
            </Field>

            <Field label="Rute Perjalanan" lebar>
              <input
                className={styles.input}
                value={rutePerjalanan}
                onChange={(event) => setRutePerjalanan(event.target.value)}
                placeholder="Contoh: Bandara BDJ - CGK (PP)"
              />
            </Field>
          </div>

          {baris.length > 0 ? (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ fontSize: 14, marginBottom: 10 }}>
                Rincian per karyawan
              </h3>
              {baris.map((row, index) => (
                <div
                  key={row.nrp}
                  style={{
                    padding: 12,
                    border: "1px solid #e4e7ec",
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  <strong>
                    {row.nama}{" "}
                    <span style={{ color: "#667085", fontWeight: 500 }}>
                      ({row.nrp})
                    </span>
                  </strong>
                  <div className={styles.formGrid} style={{ marginTop: 10 }}>
                    <Field label="Makan (Rp)">
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        value={row.uangPerjalananNominal}
                        onChange={(event) =>
                          ubahAlokasi(
                            index,
                            "uangPerjalananNominal",
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Uang per 1x Makan (Rp)">
                      <input
                        className={styles.input}
                        readOnly
                        value={
                          frekuensiMakanOtomatis > 0
                            ? Math.round(
                                (Number(row.uangPerjalananNominal) || 0) /
                                  frekuensiMakanOtomatis,
                              )
                            : ""
                        }
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Transportasi (Rp)">
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        value={row.akomodasiNominal}
                        onChange={(event) =>
                          ubahAlokasi(
                            index,
                            "akomodasiNominal",
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Rute Uang Perjalanan / Transportasi Lokal">
                      <input
                        className={styles.input}
                        value={row.ruteTransportasiLokal}
                        onChange={(event) =>
                          ubahAlokasi(
                            index,
                            "ruteTransportasiLokal",
                            event.target.value,
                          )
                        }
                        placeholder="Contoh: Bandara - Hotel (PP)"
                      />
                    </Field>
                    {laundryTersedia ? (
                      <Field label="Laundry (Rp)">
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          value={row.laundryNominal}
                          onChange={(event) =>
                            ubahAlokasi(
                              index,
                              "laundryNominal",
                              event.target.value,
                            )
                          }
                          placeholder="0"
                        />
                      </Field>
                    ) : null}
                  </div>
                  {!laundryTersedia && tanggalMulai && tanggalSelesai ? (
                    <p
                      style={{
                        marginTop: 8,
                        color: "#667085",
                        fontSize: 12,
                      }}
                    >
                      Laundry tidak berlaku karena durasi perjalanan{" "}
                      {durasiHari} hari (minimal 3 hari).
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 12, color: "#667085", fontSize: 13 }}>
              Tambahkan karyawan terlebih dahulu untuk mengisi pembagian
              nominal.
            </p>
          )}

          <div
            style={{
              marginTop: 14,
              marginLeft: "auto",
              maxWidth: 360,
              display: "grid",
              gap: 7,
            }}
          >
            {(
              [
                ["Total Makan", totalMakan],
                ["Total Transportasi", totalTransportasi],
                ...(laundryTersedia ? [["Total Laundry", totalLaundry]] : []),
              ] as Array<[string, number]>
            ).map(([label, nilai]) => (
              <div
                key={label}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span
                  style={{ fontSize: 12, color: "#667085", fontWeight: 600 }}
                >
                  {label}
                </span>
                <strong style={{ fontSize: 13 }}>{formatRupiah(nilai)}</strong>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #d0d5dd",
                paddingTop: 9,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                Total Uang Akomodasi
              </span>
              <strong style={{ fontSize: 15 }}>
                {formatRupiah(jumlahAkomodasi)}
              </strong>
            </div>
          </div>
        </section>
      ) : null}

      <div className={styles.headActions} style={{ marginTop: 18 }}>
        <Link
          href="/hc/tugas-dinas"
          className={`${styles.tombol} ${styles.tombolNetral}`}
        >
          Batal
        </Link>

        <button
          type="button"
          className={styles.tombol}
          onClick={() => void submit()}
          disabled={proses || !bisaSimpan}
        >
          <Plus size={15} />
          {proses ? "Menyimpan..." : "Buat Surat Tugas"}
        </button>
      </div>
    </>
  );
}
