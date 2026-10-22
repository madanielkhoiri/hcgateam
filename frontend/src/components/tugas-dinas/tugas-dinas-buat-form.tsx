"use client";

// ==================================================
// FILE: frontend/src/components/tugas-dinas/tugas-dinas-buat-form.tsx
// FUNGSI: Form pembuatan Surat Tugas Dinas (ditampilkan dalam popup) -
// dipakai bersama oleh menu "STD" (STD biasa) dan "STD Akomodasi" (STD + field
// penginapan/transportasi/laundry). Karyawan diambil dari Database
// Karyawan (NRP & nama), lalu PDF dibuat otomatis.
// ==================================================

import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, Pesan } from "@/components/tugas-dinas/tugas-dinas-ui";
import { karyawanApi, type Karyawan } from "@/lib/karyawan-api";
import {
  durasiHariTugas,
  formatRupiah,
  suratTugasApi,
  type PilihanKaryawanAkomodasi,
  type JenisPelaksanaanTugas,
  type SuratTugasDinas,
} from "@/lib/surat-tugas-dinas-api";
import styles from "@/app/hc/tugas-dinas/tugas-dinas.module.css";

type BarisKaryawan = {
  nrp: string;
  nama: string;
  departemen: string;
  jabatan: string;
  uangPerMakan: string;
  frekuensiMakan: string;
  akomodasiNominal: string;
  ruteTransportasiLokal: string;
  laundryNominal: string;
};

function totalMakanBaris(row: BarisKaryawan) {
  return (Number(row.uangPerMakan) || 0) * (Number(row.frekuensiMakan) || 0);
}

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
  onBatal,
  initialData,
  onTersimpan,
}: {
  withAkomodasi: boolean;
  onBatal: () => void;
  initialData?: SuratTugasDinas | null;
  onTersimpan?: () => void;
}) {
  const router = useRouter();

  const [nomor, setNomor] = useState(initialData?.nomor ?? "");
  const [jenisPelaksanaan, setJenisPelaksanaan] = useState<JenisPelaksanaanTugas>(initialData?.jenisPelaksanaan ?? "OFFLINE");
  const [tujuanLokasi, setTujuanLokasi] = useState(initialData?.tujuanLokasi ?? "");
  const [tanggalMulai, setTanggalMulai] = useState(initialData?.tanggalMulai?.slice(0, 10) ?? "");
  const [tanggalSelesai, setTanggalSelesai] = useState(initialData?.tanggalSelesai?.slice(0, 10) ?? "");
  const [keteranganTugas, setKeteranganTugas] = useState(initialData?.keteranganTugas ?? "");

  const [penginapanHotel, setPenginapanHotel] = useState(initialData?.penginapanHotel ?? "");
  const [bantuanTransportasi, setBantuanTransportasi] = useState(initialData?.bantuanTransportasi ?? "");
  const [rutePerjalanan, setRutePerjalanan] = useState(initialData?.rutePerjalanan ?? "");
  const [baris, setBaris] = useState<BarisKaryawan[]>(() => initialData?.karyawan.map((item) => ({
    nrp: item.nrp, nama: item.nama, departemen: item.departemen, jabatan: item.jabatan,
    frekuensiMakan: item.frekuensiMakan ? String(item.frekuensiMakan) : "",
    uangPerMakan: item.frekuensiMakan && item.uangPerjalananNominal ? String(Math.round(item.uangPerjalananNominal / item.frekuensiMakan)) : "",
    akomodasiNominal: item.akomodasiNominal ? String(item.akomodasiNominal) : "",
    ruteTransportasiLokal: item.ruteTransportasiLokal ?? "",
    laundryNominal: item.laundryNominal ? String(item.laundryNominal) : "",
  })) ?? []);
  const [suratTugasAsalId, setSuratTugasAsalId] = useState<number | null>(initialData?.suratTugasAsalId ?? null);
  const durasiHari = durasiHariTugas(tanggalMulai, tanggalSelesai);
  const laundryTersedia = durasiHari >= 3;

  const totalMakan = baris.reduce(
    (total, row) => total + totalMakanBaris(row),
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
      setNomor(item.nomorSurat ?? "");
      setJenisPelaksanaan("OFFLINE");
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
        uangPerMakan: "",
        frekuensiMakan: "",
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
      | "uangPerMakan"
      | "frekuensiMakan"
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
      setNomor("");
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
      const payload = {
        nomor: nomor.trim(),
        denganAkomodasi: withAkomodasi,
        jenisPelaksanaan: withAkomodasi ? "OFFLINE" : jenisPelaksanaan,
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
          ...(totalMakanBaris(row) > 0
            ? {
                uangPerjalananNominal: totalMakanBaris(row),
                frekuensiMakan: Number(row.frekuensiMakan),
              }
            : {}),
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
      };
      const hasil = initialData
        ? await suratTugasApi.ubah<SuratTugasDinas>(`/${initialData.id}`, payload)
        : await suratTugasApi.kirim<SuratTugasDinas>("", payload);
      if (onTersimpan) onTersimpan();
      else router.push(`/hc/tugas-dinas/${hasil.id}`);
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
      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <div className={styles.formSections}>
      <section className={styles.panel} style={{ order: withAkomodasi ? 2 : 1 }}>
        <div className={styles.panelHead}>
          <div>
            <h2>Detail Surat</h2>
          </div>
        </div>

        <div className={styles.formGrid}>
          {!withAkomodasi ? (
            <Field label="Jenis Pelaksanaan">
              <select className={styles.input} value={jenisPelaksanaan} onChange={(event) => setJenisPelaksanaan(event.target.value as JenisPelaksanaanTugas)}>
                <option value="OFFLINE">Offline — mendapatkan akomodasi</option>
                <option value="ONLINE">Online — tanpa akomodasi</option>
              </select>
            </Field>
          ) : null}
          <Field label="Nomor Surat">
            <input
              className={styles.input}
              value={nomor}
              onChange={(event) => setNomor(event.target.value)}
              readOnly={withAkomodasi}
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

      <section className={styles.panel} style={{ order: withAkomodasi ? 1 : 2 }}>
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
        <section className={styles.panel} style={{ order: 3 }}>
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
                    <Field label="Uang per 1x Makan (Rp)">
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        value={row.uangPerMakan}
                        onChange={(event) =>
                          ubahAlokasi(index, "uangPerMakan", event.target.value)
                        }
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Perkalian Makan (x)">
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={row.frekuensiMakan}
                        onChange={(event) =>
                          ubahAlokasi(
                            index,
                            "frekuensiMakan",
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                        placeholder="Contoh: 9"
                      />
                    </Field>
                    <Field label="Makan (Rp)">
                      <input
                        className={styles.input}
                        readOnly
                        value={totalMakanBaris(row)}
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

      <div className={styles.headActions} style={{ order: 4 }}>
        <button
          type="button"
          className={`${styles.tombol} ${styles.tombolNetral}`}
          onClick={onBatal}
          disabled={proses}
        >
          Batal
        </button>

        <button
          type="button"
          className={styles.tombol}
          onClick={() => void submit()}
          disabled={proses || !bisaSimpan}
        >
          <Plus size={15} />
          {proses ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Surat Tugas"}
        </button>
      </div>
      </div>
    </>
  );
}
