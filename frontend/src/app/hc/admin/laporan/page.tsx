"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
 ArrowLeft,
 CalendarDays,
 ClipboardList,
 FileBarChart,
 FilterX,
 Printer,
 RefreshCw,
 Search,
 TriangleAlert,
 Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* <--- tipe data laporan admin dan FA ---> */

type RolePengguna = "SUPER_ADMIN" | "FA" | "KARYAWAN";

type StatusDeklarasi =
 | "DRAFT"
 | "DIAJUKAN"
 | "DIVERIFIKASI"
 | "DISETUJUI"
 | "DITOLAK";

type JenisDeklarasi = "PERJALANAN_DINAS" | "UANG_OPERASIONAL";

type PenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 role: RolePengguna;
};

type Pengguna = {
 id: number;
 nrp: string;
 nama: string;
 email: string | null;
 nomor_telepon: string | null;
 role: RolePengguna;
 aktif: boolean;
};

type Deklarasi = {
 id: number;
 kode_deklarasi: string;
 id_pengguna: number;
 id_saldo: number | null;
 nrp: string;
 nama_pengguna: string;
 jenis_deklarasi: JenisDeklarasi;
 tanggal_kegiatan: string;
 lokasi: string;
 keterangan: string;
 total_nominal: string | number;
 status: StatusDeklarasi;
 dibuat_pada?: string;
 diperbarui_pada?: string;
};

type RingkasanAdmin = {
 daftar_deklarasi: Deklarasi[];
};

type Saldo = {
 id: number;
 id_pengguna: number;
 nrp?: string;
 nama_pengguna?: string;
 nama?: string;
 jenis_saldo: JenisDeklarasi;
 nominal_transfer: string | number;
 total_penggunaan?: string | number | null;
 sisa_saldo?: string | number | null;
 lokasi?: string | null;
 tanggal_transfer: string;
 keterangan?: string | null;
};

type FilterLaporan = {
 kata_kunci: string;
 id_pengguna: string;
 status: "SEMUA" | StatusDeklarasi;
 jenis: "SEMUA" | JenisDeklarasi;
 tanggal: string;
 bulan: string;
 tahun: string;
};

type RincianSaldo = {
 saldo: Saldo;
 nama: string;
 nrp: string;
 tanggalTransfer: string;
 totalTransfer: number;
 totalPenggunaan: number;
 danaBelumDigunakan: number;
 uangPribadi: number;
 daftarDeklarasi: Deklarasi[];
};

type PdfDenganAutoTable = {
 lastAutoTable?: {
 finalY: number;
 };
};

/* <--- end ---> */

/* <--- konfigurasi filter ---> */

const filterAwal: FilterLaporan = {
 kata_kunci: "",
 id_pengguna: "SEMUA",
 status: "SEMUA",
 jenis: "SEMUA",
 tanggal: "",
 bulan: "SEMUA",
 tahun: "SEMUA",
};

const daftarBulan = [
 { nilai: "1", label: "Januari" },
 { nilai: "2", label: "Februari" },
 { nilai: "3", label: "Maret" },
 { nilai: "4", label: "April" },
 { nilai: "5", label: "Mei" },
 { nilai: "6", label: "Juni" },
 { nilai: "7", label: "Juli" },
 { nilai: "8", label: "Agustus" },
 { nilai: "9", label: "September" },
 { nilai: "10", label: "Oktober" },
 { nilai: "11", label: "November" },
 { nilai: "12", label: "Desember" },
];

/* <--- end ---> */

/* <--- bantuan format data ---> */

function normalisasiAngka(nilai: unknown) {
 if (typeof nilai === "number") {
 return Number.isFinite(nilai) ? nilai : 0;
 }

 if (typeof nilai !== "string") {
 return 0;
 }

 const teks = nilai.trim();

 if (!teks) {
 return 0;
 }

 const tanpaSimbol = teks.replace(/[^0-9.,-]/g, "");

 if (tanpaSimbol.includes(".") && tanpaSimbol.includes(",")) {
 const hasil = Number(tanpaSimbol.replace(/\./g, "").replace(",", "."));

 return Number.isFinite(hasil) ? hasil : 0;
 }

 if (tanpaSimbol.includes(".") && !tanpaSimbol.includes(",")) {
 const bagian = tanpaSimbol.split(".");
 const bagianTerakhir = bagian[bagian.length - 1];

 if (bagianTerakhir.length === 2) {
 const hasil = Number(tanpaSimbol);

 return Number.isFinite(hasil) ? hasil : 0;
 }

 const hasil = Number(tanpaSimbol.replace(/\./g, ""));

 return Number.isFinite(hasil) ? hasil : 0;
 }

 if (tanpaSimbol.includes(",") && !tanpaSimbol.includes(".")) {
 const hasil = Number(tanpaSimbol.replace(",", "."));

 return Number.isFinite(hasil) ? hasil : 0;
 }

 const hasil = Number(tanpaSimbol);

 return Number.isFinite(hasil) ? hasil : 0;
}

function formatRupiah(nilai: unknown) {
  const formatAngka = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(normalisasiAngka(nilai));
  return `Rp${formatAngka}`;
}

function formatRupiahPdf(nilai: unknown) {
 return `Rp ${new Intl.NumberFormat("id-ID", {
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(normalisasiAngka(nilai))}`;
}

function formatTanggal(tanggal: string) {
 if (!tanggal) {
 return "-";
 }

 const nilaiTanggal = new Date(tanggal);

 if (Number.isNaN(nilaiTanggal.getTime())) {
 return "-";
 }

 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "long",
 year: "numeric",
 }).format(nilaiTanggal);
}

function formatJenis(jenis: JenisDeklarasi) {
 return jenis === "PERJALANAN_DINAS"
 ? "Perjalanan Dinas"
 : "Uang Operasional";
}

function apakahAdmin(role: string) {
 return role === "SUPER_ADMIN" || role === "FA";
}

function classStatus(status: StatusDeklarasi) {
 if (status === "DRAFT") {
 return "bg-slate-100 text-slate-700";
 }

 if (status === "DIAJUKAN") {
 return "bg-blue-50 text-blue-700";
 }

 if (status === "DIVERIFIKASI") {
 return "bg-amber-50 text-amber-700";
 }

 if (status === "DISETUJUI") {
 return "bg-emerald-50 text-emerald-700";
 }

 return "bg-red-50 text-red-700";
}

/* <--- end ---> */

/* <--- bantuan logo PDF ---> */

async function ubahGambarMenjadiDataUrl(alamat: string) {
 const respons = await fetch(alamat);

 if (!respons.ok) {
 throw new Error(`Logo tidak ditemukan pada ${alamat}.`);
 }

 const blob = await respons.blob();

 return await new Promise<string>((resolve, reject) => {
 const pembaca = new FileReader();

 pembaca.onload = () => {
 if (typeof pembaca.result === "string") {
 resolve(pembaca.result);
 return;
 }

 reject(new Error("Logo gagal diubah menjadi data PDF."));
 };

 pembaca.onerror = () => {
 reject(new Error("Logo gagal dibaca."));
 };

 pembaca.readAsDataURL(blob);
 });
}

/* <--- end ---> */

export default function HalamanLaporanAdmin() {
 const router = useRouter();

 const apiUrl =
 process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const [daftarDeklarasi, setDaftarDeklarasi] =
 useState<Deklarasi[]>([]);

 const [daftarSaldo, setDaftarSaldo] = useState<Saldo[]>([]);

 const [daftarPengguna, setDaftarPengguna] =
 useState<Pengguna[]>([]);

 const [filter, setFilter] =
 useState<FilterLaporan>(filterAwal);

 const [sedangMemuat, setSedangMemuat] = useState(true);

 const [sedangRefresh, setSedangRefresh] = useState(false);

 const [sedangMembuatPdf, setSedangMembuatPdf] =
 useState(false);

 const [pesanError, setPesanError] = useState("");

 /* <--- mengambil data laporan ---> */

 const ambilDataLaporan = useCallback(async () => {
 setPesanError("");
 setSedangRefresh(true);

 try {
 const [
 responsDeklarasi,
 responsSaldo,
 responsPengguna,
 ] = await Promise.all([
 fetch(`${apiUrl}/deklarasi/admin/ringkasan`),
 fetch(`${apiUrl}/saldo`),
 fetch(`${apiUrl}/pengguna`),
 ]);

 if (!responsDeklarasi.ok) {
 throw new Error("Gagal mengambil data deklarasi.");
 }

 if (!responsSaldo.ok) {
 throw new Error("Gagal mengambil data saldo.");
 }

 if (!responsPengguna.ok) {
 throw new Error("Gagal mengambil data pengguna.");
 }

 const dataDeklarasi: RingkasanAdmin =
 await responsDeklarasi.json();

 const dataSaldo: unknown = await responsSaldo.json();

 const dataPengguna: unknown =
 await responsPengguna.json();

 setDaftarDeklarasi(
 Array.isArray(dataDeklarasi.daftar_deklarasi)
 ? dataDeklarasi.daftar_deklarasi
 : [],
 );

 setDaftarSaldo(
 Array.isArray(dataSaldo)
 ? (dataSaldo as Saldo[])
 : [],
 );

 setDaftarPengguna(
 Array.isArray(dataPengguna)
 ? (dataPengguna as Pengguna[])
 : [],
 );
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengambil laporan.",
 );
 } finally {
 setSedangMemuat(false);
 setSedangRefresh(false);
 }
 }, [apiUrl]);

 /* <--- end ---> */

 /* <--- validasi sesi ---> */

 useEffect(() => {
 const token = (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token"));

 const dataPengguna =
 localStorage.getItem("hcga_user") ||
 sessionStorage.getItem("hcga_user");

 if (!token || !dataPengguna) {
 router.replace("/");
 return;
 }

 let penggunaTersimpan: PenggunaTersimpan;

 try {
 penggunaTersimpan = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataPengguna));
 } catch {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");

 router.replace("/");
 return;
 }

 if (!apakahAdmin(penggunaTersimpan.role)) {
 router.replace("/hc");
 return;
 }

 void ambilDataLaporan();
 }, [ambilDataLaporan, router]);

 /* <--- end ---> */

 /* <--- bantuan identitas saldo ---> */

 const cariPemilikSaldo = useCallback(
 (saldo: Saldo) => {
 return daftarPengguna.find(
 (pengguna) =>
 Number(pengguna.id) === Number(saldo.id_pengguna),
 );
 },
 [daftarPengguna],
 );

 const ambilNamaSaldo = useCallback(
 (saldo: Saldo) => {
 return (
 saldo.nama_pengguna ||
 saldo.nama ||
 cariPemilikSaldo(saldo)?.nama ||
 "Karyawan tidak ditemukan"
 );
 },
 [cariPemilikSaldo],
 );

 const ambilNrpSaldo = useCallback(
 (saldo: Saldo) => {
 return saldo.nrp || cariPemilikSaldo(saldo)?.nrp || "-";
 },
 [cariPemilikSaldo],
 );

 /* <--- end ---> */

 /* <--- pilihan filter ---> */

 const daftarKaryawan = useMemo(() => {
 return daftarPengguna
 .filter((pengguna) => pengguna.role === "KARYAWAN")
 .sort((a, b) => a.nama.localeCompare(b.nama));
 }, [daftarPengguna]);

 const daftarTahun = useMemo(() => {
 const hasil = new Set<number>();

 daftarDeklarasi.forEach((deklarasi) => {
 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (!Number.isNaN(tanggal.getTime())) {
 hasil.add(tanggal.getFullYear());
 }
 });

 daftarSaldo.forEach((saldo) => {
 const tanggal = new Date(saldo.tanggal_transfer);

 if (!Number.isNaN(tanggal.getTime())) {
 hasil.add(tanggal.getFullYear());
 }
 });

 hasil.add(new Date().getFullYear());

 return Array.from(hasil).sort((a, b) => b - a);
 }, [daftarDeklarasi, daftarSaldo]);

 /* <--- end ---> */

 /* <--- pemeriksaan periode ---> */

 const cocokPeriode = useCallback(
 (tanggalSumber: string) => {
 if (!tanggalSumber) {
 return false;
 }

 const tanggal = new Date(tanggalSumber);

 if (Number.isNaN(tanggal.getTime())) {
 return false;
 }

 const cocokTanggal =
 !filter.tanggal ||
 tanggalSumber.slice(0, 10) === filter.tanggal;

 const cocokBulan =
 filter.bulan === "SEMUA" ||
 tanggal.getMonth() + 1 === Number(filter.bulan);

 const cocokTahun =
 filter.tahun === "SEMUA" ||
 tanggal.getFullYear() === Number(filter.tahun);

 return cocokTanggal && cocokBulan && cocokTahun;
 },
 [filter.tanggal, filter.bulan, filter.tahun],
 );

 /* <--- end ---> */

 /* <--- deklarasi sesuai filter ---> */

 const deklarasiTersaring = useMemo(() => {
 const kataKunci = filter.kata_kunci
 .trim()
 .toLowerCase();

 return daftarDeklarasi
 .filter((deklarasi) => {
 const cocokKataKunci =
 !kataKunci ||
 (deklarasi.kode_deklarasi || "")
 .toLowerCase()
 .includes(kataKunci) ||
 (deklarasi.nama_pengguna || "")
 .toLowerCase()
 .includes(kataKunci) ||
 (deklarasi.nrp || "")
 .toLowerCase()
 .includes(kataKunci) ||
 (deklarasi.lokasi || "")
 .toLowerCase()
 .includes(kataKunci) ||
 (deklarasi.keterangan || "")
 .toLowerCase()
 .includes(kataKunci);

 const cocokPengguna =
 filter.id_pengguna === "SEMUA" ||
 Number(deklarasi.id_pengguna) ===
 Number(filter.id_pengguna);

 const cocokStatus =
 filter.status === "SEMUA" ||
 deklarasi.status === filter.status;

 const cocokJenis =
 filter.jenis === "SEMUA" ||
 deklarasi.jenis_deklarasi === filter.jenis;

 return (
 cocokKataKunci &&
 cocokPengguna &&
 cocokStatus &&
 cocokJenis &&
 cocokPeriode(deklarasi.tanggal_kegiatan)
 );
 })
 .sort(
 (a, b) =>
 new Date(b.tanggal_kegiatan).getTime() -
 new Date(a.tanggal_kegiatan).getTime(),
 );
 }, [daftarDeklarasi, filter, cocokPeriode]);

 /* <--- end ---> */

 /* <--- saldo sesuai filter ---> */

 const saldoTersaring = useMemo(() => {
 const kataKunci = filter.kata_kunci
 .trim()
 .toLowerCase();

 return daftarSaldo
 .filter((saldo) => {
 const cocokKataKunci =
 !kataKunci ||
 ambilNamaSaldo(saldo)
 .toLowerCase()
 .includes(kataKunci) ||
 ambilNrpSaldo(saldo)
 .toLowerCase()
 .includes(kataKunci) ||
 (saldo.lokasi || "")
 .toLowerCase()
 .includes(kataKunci) ||
 (saldo.keterangan || "")
 .toLowerCase()
 .includes(kataKunci);

 const cocokPengguna =
 filter.id_pengguna === "SEMUA" ||
 Number(saldo.id_pengguna) ===
 Number(filter.id_pengguna);

 const cocokJenis =
 filter.jenis === "SEMUA" ||
 saldo.jenis_saldo === filter.jenis;

 return (
 cocokKataKunci &&
 cocokPengguna &&
 cocokJenis &&
 cocokPeriode(saldo.tanggal_transfer)
 );
 })
 .sort(
 (a, b) =>
 new Date(b.tanggal_transfer).getTime() -
 new Date(a.tanggal_transfer).getTime(),
 );
 }, [
 daftarSaldo,
 filter,
 ambilNamaSaldo,
 ambilNrpSaldo,
 cocokPeriode,
 ]);

 /* <--- end ---> */

 /*
 * Setiap saldo.id menghasilkan tepat satu baris.
 * Tidak ada penggabungan berdasarkan:
 * nama, NRP, jenis, lokasi, atau tanggal.
 */

 const rincianSaldo = useMemo<RincianSaldo[]>(() => {
 return saldoTersaring.map((saldo) => {
 const deklarasiMilikSaldo = deklarasiTersaring
 .filter(
 (deklarasi) =>
 deklarasi.id_saldo !== null &&
 Number(deklarasi.id_saldo) === Number(saldo.id),
 )
 .sort(
 (a, b) =>
 new Date(a.tanggal_kegiatan).getTime() -
 new Date(b.tanggal_kegiatan).getTime(),
 );

 const penggunaanDariDeklarasi =
 deklarasiMilikSaldo.reduce(
 (total, deklarasi) =>
 total +
 normalisasiAngka(deklarasi.total_nominal),
 0,
 );

 const penggunaanBackend =
 saldo.total_penggunaan !== undefined &&
 saldo.total_penggunaan !== null
 ? normalisasiAngka(saldo.total_penggunaan)
 : 0;

 const totalPenggunaan =
 penggunaanBackend > 0
 ? penggunaanBackend
 : penggunaanDariDeklarasi;

 const totalTransfer = normalisasiAngka(
 saldo.nominal_transfer,
 );

 const selisih = totalTransfer - totalPenggunaan;

 return {
 saldo,
 nama: ambilNamaSaldo(saldo),
 nrp: ambilNrpSaldo(saldo),
 tanggalTransfer: saldo.tanggal_transfer,
 totalTransfer,
 totalPenggunaan,
 danaBelumDigunakan: Math.max(selisih, 0),
 uangPribadi: Math.max(-selisih, 0),
 daftarDeklarasi: deklarasiMilikSaldo,
 };
 });
 }, [
 saldoTersaring,
 deklarasiTersaring,
 ambilNamaSaldo,
 ambilNrpSaldo,
 ]);

 /* <--- end ---> */

 /* <--- ringkasan laporan ---> */

 const ringkasanLaporan = useMemo(() => {
 const totalTransfer = rincianSaldo.reduce(
 (total, item) => total + item.totalTransfer,
 0,
 );

 const totalPenggunaan = rincianSaldo.reduce(
 (total, item) => total + item.totalPenggunaan,
 0,
 );

 const totalDanaBelumDigunakan =
 rincianSaldo.reduce(
 (total, item) =>
 total + item.danaBelumDigunakan,
 0,
 );

 const totalUangPribadi = rincianSaldo.reduce(
 (total, item) => total + item.uangPribadi,
 0,
 );

 return {
 totalDeklarasi: deklarasiTersaring.length,
 totalTransfer,
 totalPenggunaan,
 totalDanaBelumDigunakan,
 totalUangPribadi,

 totalDraft: deklarasiTersaring.filter(
 (item) => item.status === "DRAFT",
 ).length,

 totalDiajukan: deklarasiTersaring.filter(
 (item) => item.status === "DIAJUKAN",
 ).length,

 totalDiverifikasi: deklarasiTersaring.filter(
 (item) => item.status === "DIVERIFIKASI",
 ).length,

 totalDisetujui: deklarasiTersaring.filter(
 (item) => item.status === "DISETUJUI",
 ).length,

 totalDitolak: deklarasiTersaring.filter(
 (item) => item.status === "DITOLAK",
 ).length,
 };
 }, [rincianSaldo, deklarasiTersaring]);

 const daftarDanaBelumDigunakan = useMemo(() => {
 return rincianSaldo
 .filter((item) => item.danaBelumDigunakan > 0)
 .sort(
 (a, b) =>
 new Date(b.tanggalTransfer).getTime() -
 new Date(a.tanggalTransfer).getTime(),
 );
 }, [rincianSaldo]);

 const daftarUangPribadi = useMemo(() => {
 return rincianSaldo
 .filter((item) => item.uangPribadi > 0)
 .sort(
 (a, b) =>
 new Date(b.tanggalTransfer).getTime() -
 new Date(a.tanggalTransfer).getTime(),
 );
 }, [rincianSaldo]);

 /* <--- end ---> */

 /* <--- teks periode ---> */

 const teksPeriode = useMemo(() => {
 if (filter.tanggal) {
 return formatTanggal(filter.tanggal);
 }

 if (
 filter.bulan !== "SEMUA" &&
 filter.tahun !== "SEMUA"
 ) {
 const bulan =
 daftarBulan.find(
 (item) => item.nilai === filter.bulan,
 )?.label || "";

 return `${bulan} ${filter.tahun}`;
 }

 if (filter.bulan !== "SEMUA") {
 return (
 daftarBulan.find(
 (item) => item.nilai === filter.bulan,
 )?.label || "Semua Periode"
 );
 }

 if (filter.tahun !== "SEMUA") {
 return `Tahun ${filter.tahun}`;
 }

 return "Semua Periode";
 }, [filter.tanggal, filter.bulan, filter.tahun]);

 /* <--- end ---> */

 /* <--- aksi filter ---> */

 const ubahFilter = (
 bagian: keyof FilterLaporan,
 nilai: string,
 ) => {
 setFilter((sebelumnya) => ({
 ...sebelumnya,
 [bagian]: nilai,
 }));
 };

 const resetFilter = () => {
 setFilter(filterAwal);
 };

 /* <--- end ---> */

 /* <--- membuat PDF ---> */

 const unduhPdf = async () => {
 setSedangMembuatPdf(true);
 setPesanError("");

 try {
 const [modulJsPdf, modulAutoTable] =
 await Promise.all([
 import("jspdf"),
 import("jspdf-autotable"),
 ]);

 const { jsPDF } = modulJsPdf;
 const autoTable = modulAutoTable.default;

 const pdf = new jsPDF({
 orientation: "landscape",
 unit: "mm",
 format: "a4",
 compress: true,
 });

 const lebarHalaman =
 pdf.internal.pageSize.getWidth();

 const tinggiHalaman =
 pdf.internal.pageSize.getHeight();

 const marginLuar = 10;
 const marginBawah = 11;
 const lebarTabel = 264;

 const marginTabel =
 (lebarHalaman - lebarTabel) / 2;

 const warnaMerah: [number, number, number] = [
 220, 38, 38,
 ];

 const warnaMerahGelap: [
 number,
 number,
 number,
 ] = [153, 27, 27];

 const warnaAbu: [number, number, number] = [
 71, 85, 105,
 ];

 const warnaGaris: [number, number, number] = [
 203, 213, 225,
 ];

 let posisiY = marginLuar;

 const ambilPosisiAkhirTabel = () => {
 return (
 (pdf as typeof pdf & PdfDenganAutoTable)
 .lastAutoTable?.finalY ?? posisiY
 );
 };

 const halamanBaru = () => {
 pdf.addPage("a4", "landscape");
 posisiY = marginLuar;
 };

 const pastikanRuang = (tinggiMinimal: number) => {
 if (
 posisiY + tinggiMinimal >
 tinggiHalaman - marginBawah
 ) {
 halamanBaru();
 }
 };

 const gambarJudulBagian = (
 judul: string,
 tinggiMinimalTabel = 18,
 ) => {
 pastikanRuang(9 + tinggiMinimalTabel);

 pdf.setFillColor(...warnaMerah);

 pdf.rect(
 marginLuar,
 posisiY,
 lebarHalaman - marginLuar * 2,
 1.2,
 "F",
 );

 posisiY += 5;

 pdf.setFont("helvetica", "bold");
 pdf.setFontSize(10.5);
 pdf.setTextColor(17, 24, 39);

 pdf.text(judul, marginLuar, posisiY);

 posisiY += 4;
 };

 const gayaDasarTabel = {
 theme: "grid" as const,
 showHead: "everyPage" as const,
 pageBreak: "auto" as const,
 rowPageBreak: "avoid" as const,

 margin: {
 top: marginLuar,
 right: marginTabel,
 bottom: marginBawah,
 left: marginTabel,
 },

 tableWidth: lebarTabel,

 styles: {
 font: "helvetica",
 fontSize: 7.4,
 cellPadding: 2.4,
 minCellHeight: 7,
 valign: "middle" as const,
 overflow: "linebreak" as const,
 lineColor: warnaGaris,
 lineWidth: 0.18,
 textColor: [31, 41, 55] as [
 number,
 number,
 number,
 ],
 },

 headStyles: {
 fillColor: warnaMerah,
 textColor: [255, 255, 255] as [
 number,
 number,
 number,
 ],
 fontStyle: "bold" as const,
 valign: "middle" as const,
 halign: "center" as const,
 minCellHeight: 9,
 },

 alternateRowStyles: {
 fillColor: [248, 250, 252] as [
 number,
 number,
 number,
 ],
 },
 };

 /* <--- header PDF ---> */

 let logoDataUrl = "";

 try {
 logoDataUrl =
 await ubahGambarMenjadiDataUrl(
 "/PPA_cut.png",
 );
 } catch (error) {
 console.error(
 "Logo PDF gagal dimuat:",
 error,
 );
 }

 pdf.setDrawColor(...warnaGaris);
 pdf.setLineWidth(0.3);

 pdf.roundedRect(
 marginLuar,
 posisiY,
 lebarHalaman - marginLuar * 2,
 30,
 1.5,
 1.5,
 "S",
 );

 if (logoDataUrl) {
 pdf.addImage(
 logoDataUrl,
 "PNG",
 marginLuar + 5,
 posisiY + 3,
 24,
 24,
 "logo-ppa",
 "FAST",
 );
 }

 pdf.line(
 marginLuar + 35,
 posisiY,
 marginLuar + 35,
 posisiY + 30,
 );

 pdf.line(
 lebarHalaman - marginLuar - 55,
 posisiY,
 lebarHalaman - marginLuar - 55,
 posisiY + 30,
 );

 const tengahHeader =
 marginLuar +
 35 +
 (lebarHalaman - marginLuar * 2 - 90) / 2;

 pdf.setFont("helvetica", "bold");
 pdf.setTextColor(...warnaMerah);
 pdf.setFontSize(12);

 pdf.text(
 "PUTRA PERKASA ABADI",
 tengahHeader,
 posisiY + 8,
 {
 align: "center",
 },
 );

 pdf.setTextColor(17, 24, 39);
 pdf.setFontSize(16);

 pdf.text(
 "LAPORAN DEKLARASI KEUANGAN",
 tengahHeader,
 posisiY + 17,
 {
 align: "center",
 },
 );

 pdf.setFont("helvetica", "normal");
 pdf.setFontSize(8);
 pdf.setTextColor(...warnaAbu);

 pdf.text(
 "Perjalanan Dinas dan Uang Operasional",
 tengahHeader,
 posisiY + 23,
 {
 align: "center",
 },
 );

 pdf.setFont("helvetica", "bold");
 pdf.setTextColor(...warnaMerahGelap);
 pdf.setFontSize(8);

 pdf.text(
 "FORM LAPORAN",
 lebarHalaman - marginLuar - 50,
 posisiY + 10,
 );

 pdf.setFont("helvetica", "normal");
 pdf.setTextColor(55, 65, 81);
 pdf.setFontSize(7);

 pdf.text(
 `Periode: ${teksPeriode}`,
 lebarHalaman - marginLuar - 50,
 posisiY + 16,
 {
 maxWidth: 45,
 },
 );

 posisiY += 34;

 pdf.setFillColor(...warnaMerah);

 pdf.rect(
 marginLuar,
 posisiY,
 lebarHalaman - marginLuar * 2,
 1.3,
 "F",
 );

 posisiY += 5;

 /* <--- kartu ringkasan PDF ---> */

 const kartuRingkasan = [
 {
 label: "Total Deklarasi",
 nilai: String(
 ringkasanLaporan.totalDeklarasi,
 ),
 },
 {
 label: "Total Transfer",
 nilai: formatRupiahPdf(
 ringkasanLaporan.totalTransfer,
 ),
 },
 {
 label: "Total Penggunaan",
 nilai: formatRupiahPdf(
 ringkasanLaporan.totalPenggunaan,
 ),
 },
 {
 label: "Dana Belum Digunakan",
 nilai: formatRupiahPdf(
 ringkasanLaporan
 .totalDanaBelumDigunakan,
 ),
 },
 {
 label: "Uang Pribadi",
 nilai: formatRupiahPdf(
 ringkasanLaporan.totalUangPribadi,
 ),
 },
 ];

 const jarakKartu = 3;

 const lebarKartu =
 (lebarHalaman -
 marginLuar * 2 -
 jarakKartu * 4) /
 5;

 kartuRingkasan.forEach((item, index) => {
 const posisiX =
 marginLuar +
 index * (lebarKartu + jarakKartu);

 pdf.setDrawColor(...warnaGaris);
 pdf.setFillColor(255, 255, 255);

 pdf.roundedRect(
 posisiX,
 posisiY,
 lebarKartu,
 19,
 1.8,
 1.8,
 "FD",
 );

 pdf.setFillColor(...warnaMerah);

 pdf.roundedRect(
 posisiX,
 posisiY,
 lebarKartu,
 1.2,
 0.5,
 0.5,
 "F",
 );

 pdf.setFont("helvetica", "normal");
 pdf.setFontSize(6.8);
 pdf.setTextColor(100, 116, 139);

 pdf.text(
 item.label,
 posisiX + 3.5,
 posisiY + 7,
 {
 maxWidth: lebarKartu - 7,
 },
 );

 pdf.setFont("helvetica", "bold");
 pdf.setFontSize(9.5);
 pdf.setTextColor(17, 24, 39);

 pdf.text(
 item.nilai,
 posisiX + 3.5,
 posisiY + 14.5,
 {
 maxWidth: lebarKartu - 7,
 },
 );
 });

 posisiY += 23;

 gambarJudulBagian("Ringkasan Status", 15);

 autoTable(pdf, {
 ...gayaDasarTabel,
 startY: posisiY,

 head: [
 [
 "Draft",
 "Diajukan",
 "Diverifikasi",
 "Disetujui",
 "Ditolak",
 ],
 ],

 body: [
 [
 String(ringkasanLaporan.totalDraft),
 String(ringkasanLaporan.totalDiajukan),
 String(
 ringkasanLaporan.totalDiverifikasi,
 ),
 String(
 ringkasanLaporan.totalDisetujui,
 ),
 String(ringkasanLaporan.totalDitolak),
 ],
 ],

 styles: {
 ...gayaDasarTabel.styles,
 halign: "center",
 valign: "middle",
 fontSize: 8,
 },
 });

 posisiY = ambilPosisiAkhirTabel() + 6;

 gambarJudulBagian(
 "Rincian Transfer dan Penggunaan",
 25,
 );

 autoTable(pdf, {
 ...gayaDasarTabel,
 startY: posisiY,

 head: [
 [
 "Karyawan",
 "Tanggal Transfer",
 "Jenis / Lokasi",
 "Deklarasi Terhubung",
 "Transfer",
 "Penggunaan",
 "Belum Digunakan",
 "Uang Pribadi",
 ],
 ],

 body:
 rincianSaldo.length > 0
 ? rincianSaldo.map((item) => [
 `${item.nama}\nNRP ${item.nrp}`,
 formatTanggal(item.tanggalTransfer),
 `${formatJenis(
 item.saldo.jenis_saldo,
 )}\n${item.saldo.lokasi || "-"}`,
 item.daftarDeklarasi.length > 0
 ? item.daftarDeklarasi
 .map(
 (deklarasi) =>
 deklarasi.kode_deklarasi,
 )
 .join("\n")
 : "Belum ada deklarasi",
 formatRupiahPdf(
 item.totalTransfer,
 ),
 formatRupiahPdf(
 item.totalPenggunaan,
 ),
 formatRupiahPdf(
 item.danaBelumDigunakan,
 ),
 formatRupiahPdf(item.uangPribadi),
 ])
 : [
 [
 "Data saldo tidak ditemukan.",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 ],
 ],

 columnStyles: {
 0: { cellWidth: 38 },
 1: {
 cellWidth: 28,
 halign: "center",
 },
 2: { cellWidth: 35 },
 3: { cellWidth: 43 },
 4: {
 cellWidth: 30,
 halign: "right",
 },
 5: {
 cellWidth: 30,
 halign: "right",
 },
 6: {
 cellWidth: 32,
 halign: "right",
 },
 7: {
 cellWidth: 28,
 halign: "right",
 },
 },
 });

 posisiY = ambilPosisiAkhirTabel() + 6;

 if (daftarDanaBelumDigunakan.length > 0) {
 gambarJudulBagian(
 "Dana Belum Digunakan",
 24,
 );

 autoTable(pdf, {
 ...gayaDasarTabel,
 startY: posisiY,

 head: [
 [
 "Karyawan",
 "Tanggal Transfer",
 "Jenis / Lokasi",
 "Deklarasi Terhubung",
 "Dana Belum Digunakan",
 ],
 ],

 body: daftarDanaBelumDigunakan.map(
 (item) => [
 `${item.nama}\nNRP ${item.nrp}`,
 formatTanggal(item.tanggalTransfer),
 `${formatJenis(
 item.saldo.jenis_saldo,
 )}\n${item.saldo.lokasi || "-"}`,
 item.daftarDeklarasi.length > 0
 ? item.daftarDeklarasi
 .map(
 (deklarasi) =>
 deklarasi.kode_deklarasi,
 )
 .join("\n")
 : "Belum ada deklarasi",
 formatRupiahPdf(
 item.danaBelumDigunakan,
 ),
 ],
 ),

 columnStyles: {
 0: { cellWidth: 50 },
 1: {
 cellWidth: 38,
 halign: "center",
 },
 2: { cellWidth: 54 },
 3: { cellWidth: 76 },
 4: {
 cellWidth: 46,
 halign: "right",
 },
 },

 alternateRowStyles: {
 fillColor: [255, 251, 235],
 },
 });

 posisiY = ambilPosisiAkhirTabel() + 6;
 }

 if (daftarUangPribadi.length > 0) {
 gambarJudulBagian(
 "Saldo Minus / Uang Pribadi",
 24,
 );

 autoTable(pdf, {
 ...gayaDasarTabel,
 startY: posisiY,

 head: [
 [
 "Karyawan",
 "Tanggal Transfer",
 "Transfer",
 "Penggunaan",
 "Uang Pribadi",
 ],
 ],

 body: daftarUangPribadi.map((item) => [
 `${item.nama}\nNRP ${item.nrp}`,
 formatTanggal(item.tanggalTransfer),
 formatRupiahPdf(item.totalTransfer),
 formatRupiahPdf(item.totalPenggunaan),
 formatRupiahPdf(item.uangPribadi),
 ]),

 columnStyles: {
 0: { cellWidth: 60 },
 1: {
 cellWidth: 48,
 halign: "center",
 },
 2: {
 cellWidth: 52,
 halign: "right",
 },
 3: {
 cellWidth: 52,
 halign: "right",
 },
 4: {
 cellWidth: 52,
 halign: "right",
 },
 },

 alternateRowStyles: {
 fillColor: [254, 242, 242],
 },
 });

 posisiY = ambilPosisiAkhirTabel() + 6;
 }

 gambarJudulBagian("Data Deklarasi", 25);

 autoTable(pdf, {
 ...gayaDasarTabel,
 startY: posisiY,

 head: [
 [
 "Kode",
 "Karyawan",
 "Jenis",
 "Tanggal Kegiatan",
 "Lokasi",
 "Status",
 "Nominal",
 ],
 ],

 body:
 deklarasiTersaring.length > 0
 ? deklarasiTersaring.map(
 (deklarasi) => [
 deklarasi.kode_deklarasi,
 `${deklarasi.nama_pengguna}\nNRP ${deklarasi.nrp}`,
 formatJenis(
 deklarasi.jenis_deklarasi,
 ),
 formatTanggal(
 deklarasi.tanggal_kegiatan,
 ),
 deklarasi.lokasi || "-",
 deklarasi.status,
 formatRupiahPdf(
 deklarasi.total_nominal,
 ),
 ],
 )
 : [
 [
 "Data deklarasi tidak ditemukan.",
 "",
 "",
 "",
 "",
 "",
 "",
 ],
 ],

 columnStyles: {
 0: { cellWidth: 43 },
 1: { cellWidth: 42 },
 2: { cellWidth: 38 },
 3: {
 cellWidth: 35,
 halign: "center",
 },
 4: { cellWidth: 33 },
 5: {
 cellWidth: 31,
 halign: "center",
 },
 6: {
 cellWidth: 42,
 halign: "right",
 },
 },

 didParseCell: (data) => {
 if (
 data.section !== "body" ||
 data.column.index !== 5
 ) {
 return;
 }

 const status = String(
 data.cell.raw || "",
 ) as StatusDeklarasi;

 data.cell.styles.fontStyle = "bold";
 data.cell.styles.halign = "center";

 if (status === "DRAFT") {
 data.cell.styles.fillColor = [
 241, 245, 249,
 ];
 data.cell.styles.textColor = [
 71, 85, 105,
 ];
 } else if (status === "DIAJUKAN") {
 data.cell.styles.fillColor = [
 239, 246, 255,
 ];
 data.cell.styles.textColor = [
 29, 78, 216,
 ];
 } else if (
 status === "DIVERIFIKASI"
 ) {
 data.cell.styles.fillColor = [
 255, 251, 235,
 ];
 data.cell.styles.textColor = [
 180, 83, 9,
 ];
 } else if (
 status === "DISETUJUI"
 ) {
 data.cell.styles.fillColor = [
 236, 253, 245,
 ];
 data.cell.styles.textColor = [
 5, 150, 105,
 ];
 } else if (status === "DITOLAK") {
 data.cell.styles.fillColor = [
 254, 242, 242,
 ];
 data.cell.styles.textColor = [
 220, 38, 38,
 ];
 }
 },
 });

 posisiY = ambilPosisiAkhirTabel() + 3;

 /* <--- tanda tangan ringkas ---> */

 const tinggiAreaTandaTangan = 22;
 const batasBawahTandaTangan =
 tinggiHalaman -
 marginBawah -
 tinggiAreaTandaTangan;

 if (posisiY > batasBawahTandaTangan) {
 const sisaRuang =
 tinggiHalaman -
 marginBawah -
 posisiY;

 if (sisaRuang >= 17) {
 posisiY += 1;
 } else {
 halamanBaru();
 }
 }

 pdf.setFillColor(...warnaMerah);

 pdf.rect(
 marginLuar,
 posisiY,
 lebarHalaman - marginLuar * 2,
 1,
 "F",
 );

 posisiY += 4;

 const lebarAreaTandaTangan =
 (lebarHalaman - marginLuar * 2) / 3;

 const daftarTandaTangan = [
 {
 label: "Dibuat oleh,",
 nama: "Admin / FA",
 },
 {
 label: "Diperiksa oleh,",
 nama: "Atasan Terkait",
 },
 {
 label: "Disetujui oleh,",
 nama: "Manajemen",
 },
 ];

 daftarTandaTangan.forEach(
 (item, index) => {
 const posisiTengah =
 marginLuar +
 lebarAreaTandaTangan * index +
 lebarAreaTandaTangan / 2;

 pdf.setFont("helvetica", "normal");
 pdf.setFontSize(7.5);
 pdf.setTextColor(31, 41, 55);

 pdf.text(
 item.label,
 posisiTengah,
 posisiY,
 {
 align: "center",
 },
 );

 pdf.setDrawColor(148, 163, 184);
 pdf.setLineWidth(0.2);

 pdf.line(
 posisiTengah - 21,
 posisiY + 12,
 posisiTengah + 21,
 posisiY + 12,
 );

 pdf.setFont("helvetica", "bold");
 pdf.setFontSize(7.5);

 pdf.text(
 item.nama,
 posisiTengah,
 posisiY + 16,
 {
 align: "center",
 },
 );
 },
 );

 /* <--- nomor halaman ---> */

 const jumlahHalaman =
 pdf.getNumberOfPages();

 for (
 let halaman = 1;
 halaman <= jumlahHalaman;
 halaman += 1
 ) {
 pdf.setPage(halaman);

 pdf.setFont("helvetica", "normal");
 pdf.setFontSize(7);
 pdf.setTextColor(100, 116, 139);

 pdf.text(
 `Halaman ${halaman} dari ${jumlahHalaman}`,
 lebarHalaman - marginLuar,
 tinggiHalaman - 5,
 {
 align: "right",
 },
 );
 }

 const tanggalFile = new Date()
 .toISOString()
 .slice(0, 10);

 pdf.save(
 `Laporan-Deklarasi-${tanggalFile}.pdf`,
 );
 } catch (error) {
 console.error("Gagal membuat PDF:", error);

 setPesanError(
 error instanceof Error
 ? error.message
 : "Gagal membuat file PDF.",
 );
 } finally {
 setSedangMembuatPdf(false);
 }
 };

 /* <--- end ---> */

 if (sedangMemuat) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-2xl border border-red-100 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-lg">
 Memuat laporan admin...
 </div>
 </main>
 );
 }

 return (
 <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 pb-28 pt-5 md:px-8 md:pb-10">
 <section className="mx-auto w-full max-w-7xl">
 {/* <--- header laporan ---> */}

 <button
 type="button"
 onClick={() => router.push("/hc/admin")}
 className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
 >
 <ArrowLeft className="h-4 w-4" />
 Kembali ke Dashboard Admin
 </button>

 <div className="relative overflow-hidden rounded-[34px] bg-linear-to-br from-red-700 via-red-600 to-rose-500 px-5 py-7 text-white shadow-[0_18px_60px_rgba(220,38,38,0.22)] md:px-8 md:py-8">
 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />

 <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />

 <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide">
 <FileBarChart className="h-4 w-4" />
 Laporan Admin / FA
 </div>

 <h1 className="mt-4 text-3xl font-black md:text-4xl">
 Laporan Deklarasi
 </h1>

 <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/85">
 Setiap transaksi transfer ditampilkan
 terpisah berdasarkan ID saldo dan tanggal
 transfer.
 </p>
 </div>

 <div className="flex flex-col gap-3 sm:flex-row">
 <button
 type="button"
 onClick={ambilDataLaporan}
 disabled={sedangRefresh}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 px-5 py-3 text-sm font-bold !text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <RefreshCw
 className={`h-4 w-4 ${
 sedangRefresh
 ? "animate-spin"
 : ""
 }`}
 />
 Refresh
 </button>

 <button
 type="button"
 onClick={unduhPdf}
 disabled={sedangMembuatPdf}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 px-5 py-3 text-sm font-bold !text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangMembuatPdf ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <Printer className="h-4 w-4" />
 )}

 {sedangMembuatPdf
 ? "Membuat PDF..."
 : "Unduh PDF"}
 </button>
 </div>
 </div>
 </div>

 {pesanError && (
 <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
 {pesanError}
 </div>
 )}

 {/* <--- filter ---> */}

 <BagianWeb judul="Filter Laporan">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <div className="sm:col-span-2">
 <label
 htmlFor="filter-kata-kunci"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Cari Data
 </label>

 <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-red-400">
 <Search className="h-4 w-4 shrink-0 text-slate-400" />

 <input
 id="filter-kata-kunci"
 type="text"
 title="Cari data laporan"
 aria-label="Cari data laporan"
 value={filter.kata_kunci}
 onChange={(event) =>
 ubahFilter(
 "kata_kunci",
 event.target.value,
 )
 }
 placeholder="Nama, NRP, kode, lokasi, keterangan"
 className="h-full w-full min-w-0 bg-transparent text-sm font-semibold text-slate-900 outline-none"
 />
 </div>
 </div>

 <PilihanFilter
 id="filter-karyawan"
 label="Karyawan"
 value={filter.id_pengguna}
 onChange={(nilai) =>
 ubahFilter("id_pengguna", nilai)
 }
 >
 <option value="SEMUA">
 Semua Karyawan
 </option>

 {daftarKaryawan.map((pengguna) => (
 <option
 key={pengguna.id}
 value={pengguna.id}
 >
 {pengguna.nrp} - {pengguna.nama}
 </option>
 ))}
 </PilihanFilter>

 <PilihanFilter
 id="filter-jenis"
 label="Jenis"
 value={filter.jenis}
 onChange={(nilai) =>
 ubahFilter("jenis", nilai)
 }
 >
 <option value="SEMUA">
 Semua Jenis
 </option>
 <option value="PERJALANAN_DINAS">
 Perjalanan Dinas
 </option>
 <option value="UANG_OPERASIONAL">
 Uang Operasional
 </option>
 </PilihanFilter>

 <PilihanFilter
 id="filter-status"
 label="Status"
 value={filter.status}
 onChange={(nilai) =>
 ubahFilter("status", nilai)
 }
 >
 <option value="SEMUA">
 Semua Status
 </option>
 <option value="DRAFT">DRAFT</option>
 <option value="DIAJUKAN">
 DIAJUKAN
 </option>
 <option value="DIVERIFIKASI">
 DIVERIFIKASI
 </option>
 <option value="DISETUJUI">
 DISETUJUI
 </option>
 <option value="DITOLAK">
 DITOLAK
 </option>
 </PilihanFilter>

 <div>
 <label
 htmlFor="filter-tanggal"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Tanggal
 </label>

 <input
 id="filter-tanggal"
 type="date"
 title="Filter tanggal"
 aria-label="Filter berdasarkan tanggal"
 value={filter.tanggal}
 onChange={(event) =>
 ubahFilter(
 "tanggal",
 event.target.value,
 )
 }
 className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none"
 />
 </div>

 <PilihanFilter
 id="filter-bulan"
 label="Bulan"
 value={filter.bulan}
 onChange={(nilai) =>
 ubahFilter("bulan", nilai)
 }
 >
 <option value="SEMUA">
 Semua Bulan
 </option>

 {daftarBulan.map((bulan) => (
 <option
 key={bulan.nilai}
 value={bulan.nilai}
 >
 {bulan.label}
 </option>
 ))}
 </PilihanFilter>

 <PilihanFilter
 id="filter-tahun"
 label="Tahun"
 value={filter.tahun}
 onChange={(nilai) =>
 ubahFilter("tahun", nilai)
 }
 >
 <option value="SEMUA">
 Semua Tahun
 </option>

 {daftarTahun.map((tahun) => (
 <option key={tahun} value={tahun}>
 {tahun}
 </option>
 ))}
 </PilihanFilter>
 </div>

 <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <p className="text-sm font-semibold text-slate-500">
 Ditemukan{" "}
 <strong className="text-slate-900">
 {deklarasiTersaring.length}
 </strong>{" "}
 deklarasi dan{" "}
 <strong className="text-slate-900">
 {saldoTersaring.length}
 </strong>{" "}
 transaksi saldo.
 </p>

 <button
 type="button"
 onClick={resetFilter}
 className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
 >
 <FilterX className="h-4 w-4" />
 Reset Filter
 </button>
 </div>
 </BagianWeb>

 {/* <--- ringkasan ---> */}

 <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
 <KartuRingkasan
 ikon={
 <ClipboardList className="h-5 w-5" />
 }
 label="Total Deklarasi"
 nilai={String(
 ringkasanLaporan.totalDeklarasi,
 )}
 />

 <KartuRingkasan
 ikon={<Wallet className="h-5 w-5" />}
 label="Total Transfer"
 nilai={formatRupiah(
 ringkasanLaporan.totalTransfer,
 )}
 />

 <KartuRingkasan
 ikon={
 <FileBarChart className="h-5 w-5" />
 }
 label="Total Penggunaan"
 nilai={formatRupiah(
 ringkasanLaporan.totalPenggunaan,
 )}
 />

 <KartuRingkasan
 ikon={
 <CalendarDays className="h-5 w-5" />
 }
 label="Dana Belum Digunakan"
 nilai={formatRupiah(
 ringkasanLaporan
 .totalDanaBelumDigunakan,
 )}
 />

 <KartuRingkasan
 ikon={
 <TriangleAlert className="h-5 w-5" />
 }
 label="Uang Pribadi"
 nilai={formatRupiah(
 ringkasanLaporan.totalUangPribadi,
 )}
 merah
 />
 </div>

 <BagianWeb judul="Ringkasan Status">
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
 <StatusRingkas
 label="Draft"
 nilai={ringkasanLaporan.totalDraft}
 />

 <StatusRingkas
 label="Diajukan"
 nilai={
 ringkasanLaporan.totalDiajukan
 }
 />

 <StatusRingkas
 label="Diverifikasi"
 nilai={
 ringkasanLaporan
 .totalDiverifikasi
 }
 />

 <StatusRingkas
 label="Disetujui"
 nilai={
 ringkasanLaporan.totalDisetujui
 }
 />

 <StatusRingkas
 label="Ditolak"
 nilai={ringkasanLaporan.totalDitolak}
 />
 </div>
 </BagianWeb>

 <BagianWeb judul="Rincian Transfer dan Penggunaan">
 {rincianSaldo.length === 0 ? (
 <DataKosong text="Data saldo tidak ditemukan." />
 ) : (
 <div className="space-y-4">
 {rincianSaldo.map((item) => (
 <div
 key={item.saldo.id}
 className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
 >
 <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
 <div className="min-w-0">
 <div className="font-black text-slate-900">
 {item.nama}
 </div>

 <div className="mt-1 text-xs font-semibold text-slate-500">
 NRP {item.nrp}
 </div>

 <div className="mt-2 text-sm font-semibold text-slate-600">
 Tanggal Transfer:{" "}
 {formatTanggal(
 item.tanggalTransfer,
 )}
 </div>

 <div className="mt-1 text-sm font-semibold text-slate-600">
 {formatJenis(
 item.saldo.jenis_saldo,
 )}{" "}
 • {item.saldo.lokasi || "-"}
 </div>

 <div className="mt-3 text-xs font-semibold leading-5 text-slate-500">
 {item.daftarDeklarasi.length === 0
 ? "Belum ada deklarasi yang terhubung."
 : `${item.daftarDeklarasi.length} deklarasi: ${item.daftarDeklarasi
 .map(
 (deklarasi) =>
 deklarasi.kode_deklarasi,
 )
 .join(", ")}`}
 </div>
 </div>

 <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
 <KotakNominal
 label="Transfer"
 nilai={item.totalTransfer}
 />

 <KotakNominal
 label="Penggunaan"
 nilai={item.totalPenggunaan}
 />

 <KotakNominal
 label="Belum Digunakan"
 nilai={
 item.danaBelumDigunakan
 }
 />

 <KotakNominal
 label="Uang Pribadi"
 nilai={item.uangPribadi}
 merah
 />
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </BagianWeb>

 <BagianWeb judul="Dana Belum Digunakan">
 {daftarDanaBelumDigunakan.length ===
 0 ? (
 <DataKosong text="Tidak ada dana belum digunakan." />
 ) : (
 <div className="space-y-4">
 {daftarDanaBelumDigunakan.map(
 (item) => (
 <div
 key={item.saldo.id}
 className="rounded-3xl border border-amber-100 bg-amber-50 p-5"
 >
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <div className="font-black text-slate-900">
 {item.nama}
 </div>

 <div className="mt-1 text-xs font-semibold text-slate-500">
 NRP {item.nrp}
 </div>

 <div className="mt-2 text-sm font-semibold text-slate-600">
 Transfer:{" "}
 {formatTanggal(
 item.tanggalTransfer,
 )}
 </div>

 <div className="mt-2 text-sm font-semibold text-slate-600">
 {item.daftarDeklarasi
 .length === 0
 ? "Belum ada deklarasi yang menggunakan saldo ini."
 : `${item.daftarDeklarasi.length} deklarasi: ${item.daftarDeklarasi
 .map(
 (deklarasi) =>
 deklarasi.kode_deklarasi,
 )
 .join(", ")}`}
 </div>
 </div>

 <KotakNominal
 label="Dana Belum Digunakan"
 nilai={
 item.danaBelumDigunakan
 }
 />
 </div>
 </div>
 ),
 )}
 </div>
 )}
 </BagianWeb>

 <BagianWeb judul="Data Deklarasi">
 {deklarasiTersaring.length === 0 ? (
 <DataKosong text="Data deklarasi tidak ditemukan." />
 ) : (
 <>
 <div className="mb-4 h-1.5 w-full rounded-full bg-red-600" />

 <div className="mx-auto hidden max-w-6xl overflow-x-auto lg:block">
 <table className="w-full min-w-[1000px] border-separate border-spacing-y-2">
 <thead>
 <tr className="text-left text-xs font-bold uppercase text-slate-500">
 <th className="px-4 py-3">
 Kode
 </th>
 <th className="px-4 py-3">
 Karyawan
 </th>
 <th className="px-4 py-3">
 Jenis
 </th>
 <th className="px-4 py-3">
 Tanggal
 </th>
 <th className="px-4 py-3">
 Lokasi
 </th>
 <th className="px-4 py-3">
 Status
 </th>
 <th className="px-4 py-3 text-right">
 Nominal
 </th>
 </tr>
 </thead>

 <tbody>
 {deklarasiTersaring.map(
 (deklarasi) => (
 <tr
 key={deklarasi.id}
 className="bg-slate-50 text-sm"
 >
 <td className="rounded-l-2xl px-4 py-4 font-black">
 {
 deklarasi.kode_deklarasi
 }
 </td>

 <td className="px-4 py-4">
 {
 deklarasi.nama_pengguna
 }

 <div className="text-xs text-slate-500">
 NRP {deklarasi.nrp}
 </div>
 </td>

 <td className="px-4 py-4">
 {formatJenis(
 deklarasi.jenis_deklarasi,
 )}
 </td>

 <td className="px-4 py-4">
 {formatTanggal(
 deklarasi.tanggal_kegiatan,
 )}
 </td>

 <td className="px-4 py-4">
 {deklarasi.lokasi || "-"}
 </td>

 <td className="px-4 py-4">
 <span
 className={`rounded-xl px-3 py-2 text-xs font-black ${classStatus(
 deklarasi.status,
 )}`}
 >
 {deklarasi.status}
 </span>
 </td>

 <td className="rounded-r-2xl px-4 py-4 text-right font-black">
 {formatRupiah(
 deklarasi.total_nominal,
 )}
 </td>
 </tr>
 ),
 )}
 </tbody>
 </table>
 </div>

 <div className="space-y-4 lg:hidden">
 {deklarasiTersaring.map(
 (deklarasi) => (
 <div
 key={deklarasi.id}
 className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
 >
 <div className="break-all font-black text-slate-900">
 {
 deklarasi.kode_deklarasi
 }
 </div>

 <div className="mt-3 font-bold text-slate-900">
 {
 deklarasi.nama_pengguna
 }
 </div>

 <div className="mt-1 text-xs text-slate-500">
 NRP {deklarasi.nrp}
 </div>

 <div className="mt-3 text-sm font-semibold text-slate-600">
 {formatJenis(
 deklarasi.jenis_deklarasi,
 )}{" "}
 •{" "}
 {formatTanggal(
 deklarasi.tanggal_kegiatan,
 )}{" "}
 • {deklarasi.lokasi || "-"}
 </div>

 <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
 <span
 className={`rounded-xl px-3 py-2 text-xs font-black ${classStatus(
 deklarasi.status,
 )}`}
 >
 {deklarasi.status}
 </span>

 <strong>
 {formatRupiah(
 deklarasi.total_nominal,
 )}
 </strong>
 </div>
 </div>
 ),
 )}
 </div>
 </>
 )}
 </BagianWeb>

 <BagianWeb judul="Saldo Minus / Uang Pribadi">
 {daftarUangPribadi.length === 0 ? (
 <DataKosong text="Tidak ada penggunaan uang pribadi." />
 ) : (
 <div className="space-y-4">
 {daftarUangPribadi.map((item) => (
 <div
 key={item.saldo.id}
 className="rounded-3xl border border-red-100 bg-red-50 p-5"
 >
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <div className="font-black text-slate-900">
 {item.nama}
 </div>

 <div className="mt-1 text-xs text-slate-500">
 NRP {item.nrp}
 </div>

 <div className="mt-2 text-sm font-semibold text-slate-600">
 Transfer:{" "}
 {formatTanggal(
 item.tanggalTransfer,
 )}
 </div>
 </div>

 <KotakNominal
 label="Uang Pribadi"
 nilai={item.uangPribadi}
 merah
 />
 </div>
 </div>
 ))}
 </div>
 )}
 </BagianWeb>
 </section>
 </main>
 );
}

/* <--- komponen filter ---> */

function PilihanFilter({
 id,
 label,
 value,
 onChange,
 children,
}: {
 id: string;
 label: string;
 value: string;
 onChange: (nilai: string) => void;
 children: ReactNode;
}) {
 return (
 <div>
 <label
 htmlFor={id}
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 {label}
 </label>

 <select
 id={id}
 title={`Pilih ${label}`}
 aria-label={`Filter berdasarkan ${label}`}
 value={value}
 onChange={(event) =>
 onChange(event.target.value)
 }
 className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none"
 >
 {children}
 </select>
 </div>
 );
}

/* <--- end ---> */

/* <--- komponen bagian web ---> */

function BagianWeb({
 judul,
 children,
}: {
 judul: string;
 children: ReactNode;
}) {
 return (
 <section className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
 <div className="mb-5 h-1.5 w-full rounded-full bg-red-600" />

 <h2 className="mb-5 text-2xl font-black text-slate-900">
 {judul}
 </h2>

 {children}
 </section>
 );
}

/* <--- end ---> */

/* <--- komponen kartu ringkasan ---> */

function KartuRingkasan({
 ikon,
 label,
 nilai,
 merah = false,
}: {
 ikon: ReactNode;
 label: string;
 nilai: string;
 merah?: boolean;
}) {
 return (
 <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 {ikon}
 </div>

 <div className="mt-4 text-sm font-semibold text-slate-500">
 {label}
 </div>

 <div
 className={`mt-1 break-words text-xl font-black ${
 merah
 ? "text-red-600"
 : "text-slate-900"
 }`}
 >
 {nilai}
 </div>
 </div>
 );
}

/* <--- end ---> */

/* <--- komponen status ---> */

function StatusRingkas({
 label,
 nilai,
}: {
 label: string;
 nilai: number;
}) {
 return (
 <div className="rounded-2xl bg-slate-50 p-4">
 <div className="text-xs font-bold text-slate-500">
 {label}
 </div>

 <div className="mt-1 text-2xl font-black text-slate-900">
 {nilai}
 </div>
 </div>
 );
}

/* <--- end ---> */

/* <--- komponen nominal ---> */

function KotakNominal({
 label,
 nilai,
 merah = false,
}: {
 label: string;
 nilai: number;
 merah?: boolean;
}) {
 return (
 <div className="min-w-0 rounded-2xl bg-white px-4 py-3">
 <div
 className={`text-xs font-bold ${
 merah
 ? "text-red-600"
 : "text-slate-500"
 }`}
 >
 {label}
 </div>

 <div
 className={`mt-1 break-words text-sm font-black ${
 merah
 ? "text-red-700"
 : "text-slate-900"
 }`}
 >
 {formatRupiah(nilai)}
 </div>
 </div>
 );
}

/* <--- end ---> */

/* <--- komponen data kosong ---> */

function DataKosong({ text }: { text: string }) {
 return (
 <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
 {text}
 </div>
 );
}

/* <--- end fitur laporan admin dan FA ---> */