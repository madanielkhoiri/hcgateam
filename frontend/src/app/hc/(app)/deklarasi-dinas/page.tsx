"use client";
import Link from 'next/link';
import {
 ArrowLeft,
 ArrowRight,
 CheckCircle2,
 History,
 LogOut,
 ReceiptText,
 RefreshCw,
 ShieldCheck,
 UploadCloud,
 UserRound,
 Wallet,
 X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
/* <--- dashboard karyawan upload nota + revisi nota + bukti pengembalian saldo ---> */
type DataPenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 email: string | null;
 nomor_telepon: string | null;
 role: "SUPER_ADMIN" | "ADMIN" | "SECTION_HEAD" | "FA" | "KARYAWAN";
 aktif?: boolean;
 kode_tiket?: string | null;
};
type DataDeklarasi = {
 id: number;
 kode_deklarasi: string;
 id_pengguna: number;
 id_saldo: number | null;
 nrp: string;
 nama_pengguna: string;
 jenis_deklarasi: "PERJALANAN_DINAS" | "UANG_OPERASIONAL";
 tanggal_kegiatan: string;
 lokasi: string;
 keterangan: string;
 total_nominal: string | number;
 status: "DRAFT" | "DIAJUKAN" | "DIVERIFIKASI" | "DISETUJUI" | "DITOLAK";
 dibuat_pada: string;
 diperbarui_pada: string;
};
type StatusSaldo =
 | "AKTIF"
 | "PAS"
 | "ADA_SISA"
 | "MELEBIHI_NOMINAL"
 | "MENUNGGU_PENGEMBALIAN"
 | "SELESAI";
type StatusBuktiPengembalian =
 | "BELUM_UPLOAD"
 | "DIAJUKAN"
 | "DISETUJUI"
 | "DITOLAK";
type KategoriNota =
 | "MAKAN"
 | "AKOMODASI"
 | "TRANSPORTASI"
 | "LAUNDRY"
 | "DANA_OPERASIONAL_W1"
 | "DANA_OPERASIONAL_W2"
 | "DANA_OPERASIONAL_BOD"
 | "DANA_OPERASIONAL_BYD"
 | "DANA_OPERASIONAL_KHUSUS";
type DataSaldo = {
 id: number;
 id_pengguna: number;
 nrp: string;
 nama_pengguna: string;
 lokasi: string | null;
 jenis_saldo: "PERJALANAN_DINAS" | "UANG_OPERASIONAL";
 nominal_transfer: string | number;
 total_penggunaan: string | number;
 sisa_saldo: string | number;
 nominal_pengembalian?: string | number | null;
 tanggal_transfer: string;
 keterangan: string | null;
 status_saldo: StatusSaldo;
 nama_file_bukti_pengembalian?: string | null;
 path_file_bukti_pengembalian?: string | null;
 status_bukti_pengembalian?: StatusBuktiPengembalian;
 alasan_bukti_pengembalian_ditolak?: string | null;
 tanggal_upload_bukti_pengembalian?: string | null;
 tanggal_verifikasi_pengembalian?: string | null;
 id_deklarasi_aktif?: number;
 kode_deklarasi_aktif?: string;
 status_deklarasi_aktif?:
 | "DRAFT"
 | "DIAJUKAN"
 | "DIVERIFIKASI"
 | "DISETUJUI"
 | "DITOLAK";
};
type DataNota = {
 id: number;
 id_deklarasi: number;
 kategori_nota: KategoriNota | null;
 nama_file: string;
 path_file: string;
 hasil_ocr_text: string | null;
 nominal_ocr: string | number;
 nominal_final: string | number;
 apakah_dikoreksi: boolean;
 alasan_koreksi: string | null;
 barang_jasa?: string | null;
 pic_settlement?: string | null;
 keterangan_settlement?: string | null;
 status_verifikasi: "BELUM_OCR" | "OCR_SELESAI" | "DIVERIFIKASI" | "DITOLAK";
 dibuat_pada: string;
 diperbarui_pada: string;
};
type MenuCepat = {
 judul: string;
 deskripsi: string;
 icon: ReactNode;
 warna: string;
 aksi: () => void;
};
type PilihanKategoriNota = {
 value: KategoriNota;
 label: string;
 deskripsi: string;
};
const daftarKategoriPerjalananDinas: PilihanKategoriNota[] = [
 {
 value: "MAKAN",
 label: "Makan",
 deskripsi: "Kategori biaya makan perjalanan dinas.",
 },
 {
 value: "AKOMODASI",
 label: "Akomodasi",
 deskripsi: "Hotel, penginapan, mess, dan biaya tempat tinggal.",
 },
 {
 value: "TRANSPORTASI",
 label: "Transportasi",
 deskripsi: "Tiket, BBM, taksi, ojek, parkir, dan perjalanan.",
 },
 {
 value: "LAUNDRY",
 label: "Laundry",
 deskripsi: "Cuci pakaian selama perjalanan dinas.",
 },
];
const daftarKategoriDanaOperasional: PilihanKategoriNota[] = [
 {
 value: "DANA_OPERASIONAL_W1",
 label: "Dana Operasional W1",
 deskripsi: "Kategori dana operasional W1.",
 },
 {
 value: "DANA_OPERASIONAL_W2",
 label: "Dana Operasional W2",
 deskripsi: "Kategori dana operasional W2.",
 },
 {
 value: "DANA_OPERASIONAL_BOD",
 label: "Dana Operasional BOD",
 deskripsi: "Kategori dana operasional BOD.",
 },
 {
 value: "DANA_OPERASIONAL_BYD",
 label: "Dana Operasional BYD",
 deskripsi: "Kategori dana operasional BYD.",
 },
 {
 value: "DANA_OPERASIONAL_KHUSUS",
 label: "Dana Operasional Khusus",
 deskripsi: "Kategori dana operasional khusus.",
 },
];


function statusNotaNormal(nota: any) {
 return String(
 nota?.status_verifikasi ||
 nota?.status_ocr ||
 nota?.status ||
 ""
 ).toUpperCase();
}

function notaBenarBenarDitolak(nota: any) {
 return statusNotaNormal(nota) === "DITOLAK";
}

function notaBelumOcr(nota: any) {
 const status = statusNotaNormal(nota);

 return (
 status === "BELUM_OCR" ||
 status === "GAGAL_OCR" ||
 status === "OCR_GAGAL" ||
 Number(nota?.nominal_final || nota?.nominal_ocr || nota?.nominal || 0) <= 0
 );
}

function daftarNotaPerluRevisiAtauOcr(saldo: any, daftarNotaPerDeklarasi: Record<number, any[]>) {
 const daftar =
 saldo?.nota ||
 daftarNotaPerDeklarasi?.[Number(saldo?.id_deklarasi_aktif)] ||
 [];

 return daftar.filter((nota: any) => notaBenarBenarDitolak(nota) || notaBelumOcr(nota));
}

function jumlahNotaDitolakAsli(daftarSaldo: any[], daftarNotaPerDeklarasi: Record<number, any[]>) {
 return daftarSaldo.reduce((total, saldo) => {
 const daftar =
 saldo?.nota ||
 daftarNotaPerDeklarasi?.[Number(saldo?.id_deklarasi_aktif)] ||
 [];

 return total + daftar.filter((nota: any) => notaBenarBenarDitolak(nota)).length;
 }, 0);
}

function jumlahNotaBelumOcrAsli(daftarSaldo: any[], daftarNotaPerDeklarasi: Record<number, any[]>) {
 return daftarSaldo.reduce((total, saldo) => {
 const daftar =
 saldo?.nota ||
 daftarNotaPerDeklarasi?.[Number(saldo?.id_deklarasi_aktif)] ||
 [];

 return total + daftar.filter((nota: any) => notaBelumOcr(nota)).length;
 }, 0);
}


















function teksAmanSettlement(nilai: unknown) {
  return String(nilai ?? "")
    .replace(/"/g, "")
    .replace(/'/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function statusNotaRevisiFinal(nota: DataNota | any) {
 return String(nota?.status_verifikasi || "").toUpperCase();
}

function notaDitolakFinal(nota: DataNota | any) {
 return statusNotaRevisiFinal(nota) === "DITOLAK";
}


export default function HalamanDashboard() {
 const router = useRouter();
 







const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";




 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);
 const [daftarDeklarasi, setDaftarDeklarasi] = useState<DataDeklarasi[]>([]);
 const [daftarSaldoAktif, setDaftarSaldoAktif] = useState<DataSaldo[]>([]);
 const [daftarNotaPerDeklarasi, setDaftarNotaPerDeklarasi] = useState<
 Record<number, DataNota[]>
 >({});
 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [sedangRefresh, setSedangRefresh] = useState(false);
 const [sedangUpload, setSedangUpload] = useState(false);
 const [sedangUploadBukti, setSedangUploadBukti] = useState(false);
 const [sedangSelesai, setSedangSelesai] = useState<number | null>(null);
 const [halamanRiwayat, setHalamanRiwayat] = useState(1);
 const jumlahDataRiwayatPerHalaman = 5;
 const [nominalOcrManualDashboard, setNominalOcrManualDashboard] = useState<
 Record<number, string>
 >({});
 const [
 sedangSimpanOcrManualDashboard,
 setSedangSimpanOcrManualDashboard,
 ] = useState<number | null>(null);
 const [pesanError, setPesanError] = useState("");
 const [pesanSukses, setPesanSukses] = useState("");
 const [saldoDipilih, setSaldoDipilih] = useState<DataSaldo | null>(null);
 const [kategoriDipilih, setKategoriDipilih] = useState<KategoriNota | "">("");
const [fileNota, setFileNota] = useState<File | null>(null);
 const [barangJasaNota, setBarangJasaNota] = useState("");
 const [jumlahItemSettlementNota, setJumlahItemSettlementNota] = useState("1");
 const [picSettlementNota, setPicSettlementNota] = useState("");
 const [keteranganSettlementNota, setKeteranganSettlementNota] = useState("");
 const [notaRevisiDipilih, setNotaRevisiDipilih] = useState("");
 const [fileRevisiBatch, setFileRevisiBatch] = useState<
 Record<number, File | null>
 >({});
 
 const [barangJasaRevisiBatch, setBarangJasaRevisiBatch] = useState<Record<string, string>>({});
 const [jumlahItemSettlementRevisiBatch, setJumlahItemSettlementRevisiBatch] = useState<Record<string, string>>({});
 const [picSettlementRevisiBatch, setPicSettlementRevisiBatch] = useState<Record<string, string>>({});
 const [keteranganSettlementRevisiBatch, setKeteranganSettlementRevisiBatch] = useState<Record<string, string>>({});
const [kategoriRevisiBatch, setKategoriRevisiBatch] = useState<
 Record<number, KategoriNota | "">
 >({});
 const [fileNotaRevisiPerNota, setFileNotaRevisiPerNota] = useState<
 Record<number, File | null>
 >({});
 const [saldoBuktiDipilih, setSaldoBuktiDipilih] =
 useState<DataSaldo | null>(null);
 const [fileBuktiPengembalian, setFileBuktiPengembalian] =
 useState<File | null>(null);
 const [nominalPengembalianManual, setNominalPengembalianManual] =
 useState("");
 const apakahAdmin = (role: string) => {
 return (
 role === "SUPER_ADMIN" ||
 role === "ADMIN" ||
 role === "SECTION_HEAD" ||
 role === "FA"
 );
 };
 const statusDeklarasiBolehUpload = (status?: string) => {
 return !status || status === "DRAFT" || status === "DITOLAK";
 };
 const normalisasiAngka = (nilai: unknown) => {
 if (typeof nilai === "number") {
 return Number.isFinite(nilai) ? nilai : 0;
 }
 if (typeof nilai === "string") {
 const teks = nilai.trim();
 if (!teks) return 0;
 const bersih = teks.replace(/[^0-9.,-]/g, "");
 if (bersih.includes(".") && bersih.includes(",")) {
 const angka = Number(bersih.replace(/\./g, "").replace(",", "."));
 return Number.isFinite(angka) ? angka : 0;
 }
 if (bersih.includes(".") && !bersih.includes(",")) {
 const bagian = bersih.split(".");
 const akhir = bagian[bagian.length - 1];
 if (akhir.length === 2) {
 const angkaDecimal = Number(bersih);
 return Number.isFinite(angkaDecimal) ? angkaDecimal : 0;
 }
 const angkaRibuan = Number(bersih.replace(/\./g, ""));
 return Number.isFinite(angkaRibuan) ? angkaRibuan : 0;
 }
 if (bersih.includes(",") && !bersih.includes(".")) {
 const angkaKoma = Number(bersih.replace(",", "."));
 return Number.isFinite(angkaKoma) ? angkaKoma : 0;
 }
 const angka = Number(bersih);
 return Number.isFinite(angka) ? angka : 0;
 }
 return 0;
 };
 const formatRupiah = (nilai: string | number | unknown) => {
 const angka = normalisasiAngka(nilai);
 return new Intl.NumberFormat("id-ID", {
 style: "currency",
 currency: "IDR",
 minimumFractionDigits: 0,
 }).format(angka);
 };
 const formatTanggal = (tanggal: string | null | undefined) => {
 if (!tanggal) return "-";
 const hasil = new Date(tanggal);
 if (Number.isNaN(hasil.getTime())) {
 return tanggal;
 }
 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 }).format(hasil);
 };
 const formatJam = (tanggal: string | null | undefined) => {
 if (!tanggal) return "-";
 const hasil = new Date(tanggal);
 if (Number.isNaN(hasil.getTime())) {
 return "-";
 }
 return new Intl.DateTimeFormat("id-ID", {
 hour: "2-digit",
 minute: "2-digit",
 hour12: false,
 }).format(hasil);
 };
 const formatJenis = (jenis: string) => {
 if (jenis === "PERJALANAN_DINAS") return "Perjalanan Dinas";
 if (jenis === "UANG_OPERASIONAL") return "Uang Operasional";
 return jenis;
 };
 const formatKategori = (kategori: KategoriNota | string | null) => {
 if (kategori === "MAKAN") return "Makan";
 if (kategori === "AKOMODASI") return "Akomodasi";
 if (kategori === "TRANSPORTASI") return "Transportasi";
 if (kategori === "LAUNDRY") return "Laundry";
 if (kategori === "DANA_OPERASIONAL_W1") return "Dana Operasional W1";
 if (kategori === "DANA_OPERASIONAL_W2") return "Dana Operasional W2";
 if (kategori === "DANA_OPERASIONAL_BOD") return "Dana Operasional BOD";
 if (kategori === "DANA_OPERASIONAL_BYD") return "Dana Operasional BYD";
 if (kategori === "DANA_OPERASIONAL_KHUSUS")
 return "Dana Operasional Khusus";
 return "Tanpa Kategori";
 };
 const formatStatusBuktiPengembalian = (
 status: StatusBuktiPengembalian | undefined
 ) => {
 if (status === "BELUM_UPLOAD") return "Belum Upload";
 if (status === "DIAJUKAN") return "Menunggu Koreksi";
 if (status === "DISETUJUI") return "Disetujui";
 if (status === "DITOLAK") return "Ditolak";
 return "Belum Upload";
 };
 const warnaStatusDeklarasi = (status: string) => {
 if (status === "DRAFT") return "bg-slate-100 text-slate-700";
 if (status === "DIAJUKAN") return "bg-blue-50 text-blue-700";
 if (status === "DIVERIFIKASI") return "bg-amber-50 text-amber-700";
 if (status === "DISETUJUI") return "bg-emerald-50 text-emerald-700";
 if (status === "DITOLAK") return "bg-red-50 text-red-700";
 return "bg-slate-100 text-slate-700";
 };
 const warnaStatusSaldo = (status: string) => {
 if (status === "AKTIF") return "bg-emerald-50 text-emerald-700";
 if (status === "ADA_SISA") return "bg-blue-50 text-blue-700";
 if (status === "PAS") return "bg-amber-50 text-amber-700";
 if (status === "MELEBIHI_NOMINAL") return "bg-red-50 text-red-700";
 if (status === "MENUNGGU_PENGEMBALIAN")
 return "bg-purple-50 text-purple-700";
 if (status === "SELESAI") return "bg-slate-100 text-slate-700";
 return "bg-slate-100 text-slate-700";
 };
 const warnaStatusNota = (status: string) => {
 if (status === "OCR_SELESAI") return "bg-emerald-50 text-emerald-700";
 if (status === "BELUM_OCR") return "bg-amber-50 text-amber-700";
 if (status === "DIVERIFIKASI") return "bg-blue-50 text-blue-700";
 if (status === "DITOLAK") return "bg-red-50 text-red-700";
 return "bg-slate-100 text-slate-700";
 };
 const warnaStatusBuktiPengembalian = (
 status: StatusBuktiPengembalian | undefined
 ) => {
 if (status === "DIAJUKAN") return "bg-blue-50 text-blue-700";
 if (status === "DISETUJUI") return "bg-emerald-50 text-emerald-700";
 if (status === "DITOLAK") return "bg-red-50 text-red-700";
 return "bg-slate-100 text-slate-700";
 };
 const ambilNamaFile = (pathFile: string | null | undefined) => {
 if (!pathFile) return "-";
 const pecah = pathFile.split("/");
 return pecah[pecah.length - 1] || pathFile;
 };
 const bukaFile = (pathFile: string | null | undefined) => {
 if (!pathFile) return;
 const urlFile = pathFile.startsWith("http")
 ? pathFile
 : `${apiUrl}${pathFile}`;
 window.open(urlFile, "_blank", "noopener,noreferrer");
 };
 const ambilDataDashboard = async (
 idPengguna: number,
 bersihkanPesan = true
 ) => {
 if (bersihkanPesan) {
 setPesanError("");
 setPesanSukses("");
 }
 setSedangRefresh(true);
 try {
 const [responseDeklarasi, responseSaldo] = await Promise.all([
 fetch(`${apiUrl}/deklarasi/pengguna/${idPengguna}`),
 fetch(`${apiUrl}/saldo/pengguna/${idPengguna}/aktif`),
 ]);
 if (!responseDeklarasi.ok) {
 throw new Error("Gagal mengambil data deklarasi.");
 }
 if (!responseSaldo.ok) {
 throw new Error("Gagal mengambil data saldo aktif.");
 }
 const dataDeklarasi: DataDeklarasi[] = await responseDeklarasi.json();
 const dataSaldo: DataSaldo[] = await responseSaldo.json();
 setDaftarDeklarasi(Array.isArray(dataDeklarasi) ? dataDeklarasi : []);
 setDaftarSaldoAktif(Array.isArray(dataSaldo) ? dataSaldo : []);
 const mapNota: Record<number, DataNota[]> = {};
 await Promise.all(
 (Array.isArray(dataSaldo) ? dataSaldo : [])
 .filter((saldo) => saldo.id_deklarasi_aktif)
 .map(async (saldo) => {
 const idDeklarasi = Number(saldo.id_deklarasi_aktif);
 try {
 const responseNota = await fetch(
 `${apiUrl}/nota/deklarasi/${idDeklarasi}`
 );
 if (responseNota.ok) {
 const dataNota: DataNota[] = await responseNota.json();
 mapNota[idDeklarasi] = Array.isArray(dataNota)
 ? [...dataNota].sort((a, b) => {
 return (
 new Date(a.dibuat_pada).getTime() -
 new Date(b.dibuat_pada).getTime()
 );
 })
 : [];
 } else {
 mapNota[idDeklarasi] = [];
 }
 } catch {
 mapNota[idDeklarasi] = [];
 }
 })
 );
 setDaftarNotaPerDeklarasi(mapNota);
 setNominalOcrManualDashboard((nilaiLama) => {
 const nilaiBaru: Record<number, string> = {};
 Object.values(mapNota).forEach((daftarNota) => {
 daftarNota.forEach((nota) => {
 if (nilaiLama[nota.id] !== undefined) {
 nilaiBaru[nota.id] = nilaiLama[nota.id];
 return;
 }
 const nominalAwal = Math.round(
 normalisasiAngka(nota.nominal_final || nota.nominal_ocr)
 );
 nilaiBaru[nota.id] = nominalAwal > 0 ? String(nominalAwal) : "";
 });
 });
 return nilaiBaru;
 });
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengambil data dashboard."
 );
 } finally {
 setSedangMemuat(false);
 setSedangRefresh(false);
 }
 };
 useEffect(() => {
 const token = (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token"));
 const dataPengguna = (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user"));
 if (!token || !dataPengguna) {
 router.replace("/");
 return;
 }
 let penggunaTersimpan: DataPenggunaTersimpan;
 try {
 penggunaTersimpan = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataPengguna));
 } catch {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");
 router.replace("/");
 return;
 }
 if (apakahAdmin(penggunaTersimpan.role)) {
 router.replace("/hc/admin");
 return;
 }
 setPengguna(penggunaTersimpan);
 ambilDataDashboard(penggunaTersimpan.id);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [apiUrl, router]);
 const totalSisaSaldoAktif = useMemo(() => {
 return daftarSaldoAktif.reduce((total, saldo) => {
 const sisa = normalisasiAngka(saldo.sisa_saldo);
 const statusDihitung =
 saldo.status_saldo === "AKTIF" || saldo.status_saldo === "ADA_SISA";
 const belumDisetujui =
 !saldo.status_deklarasi_aktif ||
 saldo.status_deklarasi_aktif === "DRAFT" ||
 saldo.status_deklarasi_aktif === "DIAJUKAN" ||
 saldo.status_deklarasi_aktif === "DIVERIFIKASI" ||
 saldo.status_deklarasi_aktif === "DITOLAK";
 if (!statusDihitung || !belumDisetujui) {
 return total;
 }
 if (sisa <= 0) {
 return total;
 }
 return total + sisa;
 }, 0);
 }, [daftarSaldoAktif]);
 const totalMinusSaldo = useMemo(() => {
 return daftarSaldoAktif.reduce((total, saldo) => {
 const sisa = normalisasiAngka(saldo.sisa_saldo);
 if (saldo.status_saldo !== "MELEBIHI_NOMINAL") {
 return total;
 }
 if (sisa >= 0) {
 return total;
 }
 return total + Math.abs(sisa);
 }, 0);
 }, [daftarSaldoAktif]);
 const totalMenungguPengembalian = useMemo(() => {
 return daftarSaldoAktif.reduce((total, saldo) => {
 const sisa = normalisasiAngka(saldo.sisa_saldo);
 const sudahDisetujuiDanAdaSisa =
 saldo.status_deklarasi_aktif === "DISETUJUI" && sisa > 0;
 const menungguPengembalian =
 saldo.status_saldo === "MENUNGGU_PENGEMBALIAN" && sisa > 0;
 if (!sudahDisetujuiDanAdaSisa && !menungguPengembalian) {
 return total;
 }
 return total + sisa;
 }, 0);
 }, [daftarSaldoAktif]);
 const totalNotaAktif = useMemo(() => {
 return Object.values(daftarNotaPerDeklarasi).reduce((total, daftarNota) => {
 return total + daftarNota.length;
 }, 0);
 }, [daftarNotaPerDeklarasi]);
 const totalNotaDitolak = useMemo(() => {
 return Object.values(daftarNotaPerDeklarasi).reduce((total, daftarNota) => {
 return total + daftarNota.filter((nota) => nota.status_verifikasi === "DITOLAK").length;
 }, 0);
 }, [daftarNotaPerDeklarasi]);
 const totalBuktiDitolak = useMemo(() => {
 return daftarSaldoAktif.filter((saldo) => {
 return (
 saldo.status_saldo === "MENUNGGU_PENGEMBALIAN" &&
 saldo.status_bukti_pengembalian === "DITOLAK"
 );
 }).length;
 }, [daftarSaldoAktif]);
 const riwayatDeklarasiUrut = useMemo(() => {
 return [...daftarDeklarasi].sort(
 (a, b) =>
 new Date(b.diperbarui_pada).getTime() -
 new Date(a.diperbarui_pada).getTime()
 );
 }, [daftarDeklarasi]);
 const totalHalamanRiwayat = useMemo(() => {
 return Math.max(
 1,
 Math.ceil(riwayatDeklarasiUrut.length / jumlahDataRiwayatPerHalaman)
 );
 }, [riwayatDeklarasiUrut.length]);
 const deklarasiTerbaru = useMemo(() => {
 const halamanAman = Math.min(halamanRiwayat, totalHalamanRiwayat);
 const indexAwal = (halamanAman - 1) * jumlahDataRiwayatPerHalaman;
 const indexAkhir = indexAwal + jumlahDataRiwayatPerHalaman;
 return riwayatDeklarasiUrut.slice(indexAwal, indexAkhir);
 }, [halamanRiwayat, riwayatDeklarasiUrut, totalHalamanRiwayat]);
 useEffect(() => {
 if (halamanRiwayat > totalHalamanRiwayat) {
 setHalamanRiwayat(totalHalamanRiwayat);
 }
 }, [halamanRiwayat, totalHalamanRiwayat]);
 const totalPerluRevisi = useMemo(() => {
 return daftarDeklarasi.filter(
 (deklarasi) => deklarasi.status === "DITOLAK"
 ).length;
 }, [daftarDeklarasi]);
 const saldoUploadAktif = useMemo(() => {
 return daftarSaldoAktif.find((saldo) => {
 return (
 saldo.status_saldo !== "SELESAI" &&
 saldo.status_saldo !== "MENUNGGU_PENGEMBALIAN" &&
 Number(saldo.id_deklarasi_aktif || 0) > 0 &&
 statusDeklarasiBolehUpload(saldo.status_deklarasi_aktif)
 );
 });
 }, [daftarSaldoAktif]);
 const inisialNama =
 pengguna?.nama
 ?.split(" ")
 .map((item) => item[0])
 .join("")
 .slice(0, 2)
 .toUpperCase() || "U";
 const handleRefresh = () => {
 if (!pengguna) return;
 ambilDataDashboard(pengguna.id);
 };
 const handleKeluar = () => {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");
 router.replace("/");
 };
 const handleInputOcrManualDashboard = (idNota: number, value: string) => {
 const angkaSaja = value.replace(/[^\d]/g, "");
 setNominalOcrManualDashboard((nilaiLama) => ({
 ...nilaiLama,
 [idNota]: angkaSaja,
 }));
 };
 const handleSimpanOcrManualDashboard = async (
 nota: DataNota,
 nomorNota: number
 ) => {
 const nominal = Number(nominalOcrManualDashboard[nota.id] || 0);
 if (!Number.isFinite(nominal) || nominal <= 0) {
 setPesanError(`Nominal OCR manual Nota ${nomorNota} wajib lebih dari 0.`);
 return;
 }
 const yakin = window.confirm(
 `Simpan koreksi OCR manual Nota ${nomorNota} menjadi ${formatRupiah(
 nominal
 )}?`
 );
 if (!yakin) return;
 try {
 setPesanError("");
 setPesanSukses("");
 setSedangSimpanOcrManualDashboard(nota.id);
 const response = await fetch(`${apiUrl}/nota/ocr-sementara/${nota.id}`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 nominal,
 }),
 });
 const teksResponse = await response.text();
 let hasil: any = null;
 try {
 hasil = teksResponse ? JSON.parse(teksResponse) : null;
 } catch {
 hasil = null;
 }
 if (!response.ok) {
 throw new Error(
 hasil?.message || teksResponse || "Gagal menyimpan koreksi OCR manual."
 );
 }
 if (pengguna) {
 await ambilDataDashboard(pengguna.id, false);
 }
 setPesanSukses(`Koreksi OCR manual Nota ${nomorNota} berhasil disimpan.`);
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menyimpan koreksi OCR manual."
 );
 } finally {
 setSedangSimpanOcrManualDashboard(null);
 }
 };
 const daftarKategoriBerdasarkanSaldo = (saldo: DataSaldo | null) => {
 if (!saldo) return daftarKategoriPerjalananDinas;
 if (saldo.jenis_saldo === "UANG_OPERASIONAL") {
 return daftarKategoriDanaOperasional;
 }
 return daftarKategoriPerjalananDinas;
 };
 const bukaModalUploadNota = (saldo: DataSaldo) => {
 setPesanError("");
 setPesanSukses("");
 if (saldo.status_saldo === "SELESAI") {
 setPesanError("Saldo sudah selesai. Nota tidak dapat ditambahkan.");
 return;
 }
 if (saldo.status_saldo === "MENUNGGU_PENGEMBALIAN") {
 setPesanError(
 "Saldo sedang menunggu pengembalian. Upload bukti pengembalian terlebih dahulu."
 );
 return;
 }
 if (saldo.status_deklarasi_aktif === "DISETUJUI") {
 setPesanError(
 "Deklarasi sudah disetujui. Jika masih ada sisa saldo, upload bukti pengembalian."
 );
 return;
 }
 if (!saldo.id_deklarasi_aktif) {
 setPesanError("Deklarasi aktif untuk saldo ini belum tersedia.");
 return;
 }
 if (!statusDeklarasiBolehUpload(saldo.status_deklarasi_aktif)) {
 setPesanError(
 "Deklarasi sudah diajukan. Nota tidak dapat ditambahkan lagi kecuali status ditolak."
 );
 return;
 }
 setSaldoDipilih(saldo);
 setKategoriDipilih("");
 setBarangJasaNota("");
 setPicSettlementNota("");
 setKeteranganSettlementNota("");
 setFileNota(null);
 setTimeout(() => {
 const inputNota = document.getElementById(
 "file_nota_dashboard"
 ) as HTMLInputElement | null;
 if (inputNota) inputNota.value = "";
 }, 0);
 };
 const tutupModalUploadNota = () => {
 if (sedangUpload) return;
 setSaldoDipilih(null);
 setKategoriDipilih("");
 setFileNota(null);
 };
 const ubahFileNota = (event: ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0] || null;
 setFileNota(file);
 };

 const ubahFileNotaRevisiPerNota = (
 idNota: number,
 event: ChangeEvent<HTMLInputElement>
 ) => {
 const file = event.target.files?.[0] || null;

 setFileNotaRevisiPerNota((nilaiLama) => ({
 ...nilaiLama,
 [idNota]: file,
 }));
 };

 const uploadNotaRevisiPerNota = async (
 nota: DataNota,
 nomorNota: number
 ) => {
 if (!saldoDipilih) {
 setPesanError("Saldo aktif tidak ditemukan.");
 return;
 }

 if (!saldoDipilih.id_deklarasi_aktif) {
 setPesanError("Deklarasi aktif tidak ditemukan.");
 return;
 }

 if (nota.status_verifikasi !== "DITOLAK") {
 setPesanError("Hanya nota yang ditolak yang dapat direvisi.");
 return;
 }

 if (!nota.kategori_nota) {
 setPesanError("Kategori nota revisi tidak ditemukan.");
 return;
 }

 const fileRevisi = fileNotaRevisiPerNota[nota.id];

 if (!fileRevisi) {
 setPesanError(`File revisi Nota ${nomorNota} wajib dipilih.`);
 return;
 }

 const yakin = window.confirm(
 `Upload revisi untuk Nota ${nomorNota}? File ini akan mengganti nota yang ditolak, bukan menambah nota baru.`
 );

 if (!yakin) return;

 try {
 setPesanError("");
 setPesanSukses("");
 setSedangUpload(true);

 const formData = new FormData();
 formData.append("kategori_nota", nota.kategori_nota);
 formData.append("id_nota_revisi", String(nota.id));
 formData.append("file_nota", fileRevisi);

 const response = await fetch(
 `${apiUrl}/nota/upload/${saldoDipilih.id_deklarasi_aktif}`,
 {
 method: "POST",
 body: formData,
 }
 );

 const teksResponse = await response.text();

 let hasil: any = null;

 try {
 hasil = teksResponse ? JSON.parse(teksResponse) : null;
 } catch {
 hasil = null;
 }

 if (!response.ok) {
 const pesanBackend =
 hasil?.message ||
 teksResponse ||
 `Upload revisi Nota ${nomorNota} gagal.`;

 throw new Error(
 Array.isArray(pesanBackend) ? pesanBackend.join(", ") : pesanBackend
 );
 }

 const inputRevisi = document.getElementById(
 `file_nota_revisi_${nota.id}`
 ) as HTMLInputElement | null;

 if (inputRevisi) {
 inputRevisi.value = "";
 }

 setFileNotaRevisiPerNota((nilaiLama) => ({
 ...nilaiLama,
 [nota.id]: null,
 }));

 if (pengguna) {
 await ambilDataDashboard(pengguna.id, false);
 }

 setPesanSukses(
 `Revisi Nota ${nomorNota} berhasil diupload. Nota lama yang ditolak sudah diganti.`
 );
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : `Terjadi kesalahan saat upload revisi Nota ${nomorNota}.`
 );
 } finally {
 setSedangUpload(false);
 }
 };


 const ubahFileRevisiBatch = (
 idNota: number,
 event: ChangeEvent<HTMLInputElement>
 ) => {
 const file = event.target.files?.[0] || null;

 setFileRevisiBatch((nilaiLama) => ({
 ...nilaiLama,
 [idNota]: file,
 }));
 };

 const ubahKategoriRevisiBatch = (idNota: number, kategori: KategoriNota) => {
 setKategoriRevisiBatch((nilaiLama) => ({
 ...nilaiLama,
 [idNota]: kategori,
 }));
 };

 const tungguSebentarUntukOcr = (durasiMs: number) => {
 return new Promise((resolve) => {
 setTimeout(resolve, durasiMs);
 });
 };

 const uploadSemuaNotaRevisiBatch = async () => {
 if (!saldoDipilih) {
 setPesanError("Saldo aktif tidak ditemukan.");
 return;
 }

 if (!saldoDipilih.id_deklarasi_aktif) {
 setPesanError("Deklarasi aktif tidak ditemukan.");
 return;
 }

 const daftarDitolak =
 daftarNotaPerDeklarasi[Number(saldoDipilih.id_deklarasi_aktif)]?.filter(
 (nota) => nota.status_verifikasi === "DITOLAK"
 ) || [];

 if (daftarDitolak.length === 0) {
 setPesanError("Tidak ada nota ditolak yang perlu direvisi.");
 return;
 }

 const belumAdaFile = daftarDitolak.filter((nota) => {
 return !fileRevisiBatch[nota.id];
 });

 if (belumAdaFile.length > 0) {
 setPesanError(
 `Masih ada ${belumAdaFile.length} nota ditolak yang belum dipilih file revisinya.`
 );
 return;
 }

 const yakin = window.confirm(
 `Upload semua revisi untuk ${daftarDitolak.length} nota ditolak? Semua file akan diproses OCR satu per satu.`
 );

 if (!yakin) return;

 try {
 setPesanError("");
 setPesanSukses("");
 setSedangUpload(true);

 for (const nota of daftarDitolak) {
 const fileRevisi = fileRevisiBatch[nota.id];

 if (!fileRevisi) {
 throw new Error(`File revisi untuk Nota #${nota.id} belum dipilih.`);
 }

 if (saldoDipilih.jenis_saldo === "UANG_OPERASIONAL") {
 if (!(barangJasaRevisiBatch[String(nota.id)] || "").trim()) {
 throw new Error(`Nama Barang / Jasa revisi Nota #${nota.id} wajib diisi.`);
 }

 if (!(picSettlementRevisiBatch[String(nota.id)] || "").trim()) {
 throw new Error(`PIC revisi Nota #${nota.id} wajib diisi.`);
 }

 if (!(keteranganSettlementRevisiBatch[String(nota.id)] || "").trim()) {
 throw new Error(`Keterangan revisi Nota #${nota.id} wajib diisi.`);
 }
 }

 const formData = new FormData();
 formData.append(
 "kategori_nota",
 kategoriRevisiBatch[nota.id] || nota.kategori_nota
 );
 formData.append("id_nota_revisi", String(nota.id));

 if (saldoDipilih.jenis_saldo === "UANG_OPERASIONAL") {
 formData.append("barang_jasa", (barangJasaRevisiBatch[String(nota.id)] || "").trim());
 formData.append("jumlah_item_settlement", String(Math.max(1, Math.floor(Number(jumlahItemSettlementRevisiBatch[String(nota.id)] || 1)))));
 formData.append("pic_settlement", (picSettlementRevisiBatch[String(nota.id)] || "").trim());
 formData.append("keterangan_settlement", (keteranganSettlementRevisiBatch[String(nota.id)] || "").trim());
 }

 formData.append("file_nota", fileRevisi);

 const response = await fetch(
 `${apiUrl}/nota/upload/${saldoDipilih.id_deklarasi_aktif}`,
 {
 method: "POST",
 body: formData,
 }
 );

 const teksResponse = await response.text();

 let hasil: any = null;

 try {
 hasil = teksResponse ? JSON.parse(teksResponse) : null;
 } catch {
 hasil = null;
 }

 if (!response.ok) {
 const pesanBackend =
 hasil?.message ||
 teksResponse ||
 `Upload revisi nota #${nota.id} gagal.`;

 throw new Error(
 Array.isArray(pesanBackend) ? pesanBackend.join(", ") : pesanBackend
 );
 }

 await tungguSebentarUntukOcr(1800);
 }

 setFileRevisiBatch({});
 setKategoriRevisiBatch({});
 setNotaRevisiDipilih("");
 setFileNota(null);

 if (pengguna) {
 await ambilDataDashboard(pengguna.id, false);
 }

 setSaldoDipilih(null);
 setPesanSukses(
 `Semua revisi nota berhasil diupload dan akan diproses OCR.`
 );
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat upload semua revisi nota."
 );
 } finally {
 setSedangUpload(false);
 }
 };

 const uploadNota = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 if (!saldoDipilih) {
 setPesanError("Saldo aktif tidak ditemukan.");
 return;
 }
 if (!saldoDipilih.id_deklarasi_aktif) {
 setPesanError("Deklarasi aktif untuk saldo ini belum tersedia.");
 return;
 }
 if (
 saldoDipilih.status_deklarasi_aktif === "DITOLAK" &&
 !notaRevisiDipilih
 ) {
 setPesanError("Pilih nota ditolak yang akan direvisi terlebih dahulu.");
 return;
 }

 if (!kategoriDipilih) {
 setPesanError("Kategori nota wajib dipilih.");
 return;
 }
 if (!fileNota) {
 setPesanError("File nota wajib dipilih.");
 return;
 }

 if (saldoDipilih?.jenis_saldo === "UANG_OPERASIONAL") {
 if (!barangJasaNota.trim()) {
 setPesanError("Nama Barang / Jasa wajib diisi untuk Uang Operasional.");
 return;
 }

 if (!picSettlementNota.trim()) {
 setPesanError("PIC wajib diisi untuk Uang Operasional.");
 return;
 }

 if (!keteranganSettlementNota.trim()) {
 setPesanError("Keterangan wajib diisi untuk Uang Operasional.");
 return;
 }
 }
 try {
 setPesanError("");
 setPesanSukses("");
 setSedangUpload(true);
 const formData = new FormData();
 formData.append("kategori_nota", kategoriDipilih);

 if (saldoDipilih?.jenis_saldo === "UANG_OPERASIONAL") {
 formData.append("barang_jasa", barangJasaNota.trim());
 formData.append("jumlah_item_settlement", jumlahItemSettlementNota || "1");
 formData.append("pic_settlement", picSettlementNota.trim());
 formData.append("keterangan_settlement", keteranganSettlementNota.trim());
 }

 formData.append("file_nota", fileNota);
 const response = await fetch(
 `${apiUrl}/nota/upload/${saldoDipilih.id_deklarasi_aktif}`,
 {
 method: "POST",
 body: formData,
 }
 );
 const teksResponse = await response.text();
 let hasil: any = null;
 try {
 hasil = teksResponse ? JSON.parse(teksResponse) : null;
 } catch {
 hasil = null;
 }
 if (!response.ok) {
 const pesanBackend =
 hasil?.message ||
 teksResponse ||
 "Upload nota gagal. Periksa kategori, file, dan OCR.";
 throw new Error(
 Array.isArray(pesanBackend) ? pesanBackend.join(", ") : pesanBackend
 );
 }
 const idPengguna = pengguna?.id;
 const pesanBerhasil =
 saldoDipilih.status_deklarasi_aktif === "DITOLAK"
 ? "Nota revisi berhasil diupload. Setelah semua selesai, klik Ajukan Ulang Deklarasi."
 : "Nota berhasil diupload dan OCR otomatis diproses.";
 setSaldoDipilih(null);
 setKategoriDipilih("");
 setFileNota(null);
 const inputNota = document.getElementById(
 "file_nota_dashboard"
 ) as HTMLInputElement | null;
 if (inputNota) {
 inputNota.value = "";
 }
 if (idPengguna) {
 await ambilDataDashboard(idPengguna, false);
 }
 setPesanSukses(pesanBerhasil);
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat upload nota."
 );
 } finally {
 setSedangUpload(false);
 }
 };
 const bukaModalBuktiPengembalian = (saldo: DataSaldo) => {
 setPesanError("");
 setPesanSukses("");
 const sisaSaldo = normalisasiAngka(saldo.sisa_saldo);
 if (
 saldo.status_saldo !== "MENUNGGU_PENGEMBALIAN" &&
 saldo.status_deklarasi_aktif !== "DISETUJUI"
 ) {
 setPesanError(
 "Bukti pengembalian hanya dapat diupload setelah deklarasi disetujui dan masih ada sisa saldo."
 );
 return;
 }
 if (sisaSaldo <= 0) {
 setPesanError("Saldo ini tidak memiliki sisa yang perlu dikembalikan.");
 return;
 }
 setSaldoBuktiDipilih(saldo);
 setNominalPengembalianManual(String(Math.round(sisaSaldo)));
 setFileBuktiPengembalian(null);
 setTimeout(() => {
 const inputBukti = document.getElementById(
 "file_bukti_pengembalian"
 ) as HTMLInputElement | null;
 if (inputBukti) inputBukti.value = "";
 }, 0);
 };
 const tutupModalBuktiPengembalian = () => {
 if (sedangUploadBukti) return;
 setSaldoBuktiDipilih(null);
 setNominalPengembalianManual("");
 setFileBuktiPengembalian(null);
 };
 const ubahFileBuktiPengembalian = (
 event: ChangeEvent<HTMLInputElement>
 ) => {
 const file = event.target.files?.[0] || null;
 setFileBuktiPengembalian(file);
 };
 const uploadBuktiPengembalian = async (
 event: FormEvent<HTMLFormElement>
 ) => {
 event.preventDefault();
 if (!saldoBuktiDipilih) {
 setPesanError("Saldo pengembalian tidak ditemukan.");
 return;
 }
 if (!fileBuktiPengembalian) {
 setPesanError("File bukti pengembalian wajib dipilih.");
 return;
 }
 try {
 setPesanError("");
 setPesanSukses("");
 setSedangUploadBukti(true);
 const formData = new FormData();
 const teksNominalPengembalian =
 nominalPengembalianManual ||
 String(Math.round(normalisasiAngka(saldoBuktiDipilih.sisa_saldo)));
 const nominalPengembalian = Number(
 teksNominalPengembalian.replace(/[^\d]/g, "")
 );
 if (!Number.isFinite(nominalPengembalian) || nominalPengembalian <= 0) {
 setPesanError("Nominal pengembalian wajib diisi lebih dari 0.");
 return;
 }
 formData.append("nominal_pengembalian", String(nominalPengembalian));
 formData.append("file_bukti_pengembalian", fileBuktiPengembalian);
 const response = await fetch(
 `${apiUrl}/saldo/${saldoBuktiDipilih.id}/upload-bukti-pengembalian`,
 {
 method: "POST",
 body: formData,
 }
 );
 const teksResponse = await response.text();
 let hasil: any = null;
 try {
 hasil = teksResponse ? JSON.parse(teksResponse) : null;
 } catch {
 hasil = null;
 }
 if (!response.ok) {
 const pesanBackend =
 hasil?.message ||
 teksResponse ||
 "Upload bukti pengembalian gagal.";
 throw new Error(
 Array.isArray(pesanBackend) ? pesanBackend.join(", ") : pesanBackend
 );
 }
 const idPengguna = pengguna?.id;
 setSaldoBuktiDipilih(null);
 setNominalPengembalianManual("");
 setFileBuktiPengembalian(null);
 const inputBukti = document.getElementById(
 "file_bukti_pengembalian"
 ) as HTMLInputElement | null;
 if (inputBukti) {
 inputBukti.value = "";
 }
 if (idPengguna) {
 await ambilDataDashboard(idPengguna, false);
 }
 setPesanSukses(
 "Bukti pengembalian berhasil diupload. Menunggu koreksi Admin / FA."
 );
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat upload bukti pengembalian."
 );
 } finally {
 setSedangUploadBukti(false);
 }
 };
 const ajukanDeklarasi = async (saldo: DataSaldo) => {
 const daftarNotaAktif =
 daftarNotaPerDeklarasi[Number(saldo.id_deklarasi_aktif)] || [];

 const adaBelumOcr = daftarNotaAktif.some((nota) => {
 return (
 nota.status_verifikasi === "BELUM_OCR" ||
 nota.status_verifikasi === "OCR_GAGAL" ||
 Number(nota.nominal_final || 0) <= 0
 );
 });

 if (adaBelumOcr) {
 setPesanError(
 "Masih ada nota yang belum selesai OCR. Koreksi OCR manual atau upload ulang nota tersebut sebelum ajukan deklarasi."
 );
 return;
 }

 if (!saldo.id_deklarasi_aktif) {
 setPesanError("Deklarasi aktif tidak ditemukan.");
 return;
 }
 const daftarNota =
 daftarNotaPerDeklarasi[Number(saldo.id_deklarasi_aktif)] || [];
 if (daftarNota.length === 0) {
 setPesanError("Minimal upload satu nota sebelum Ajukan Deklarasi.");
 return;
 }
 const teksAksi =
 saldo.status_deklarasi_aktif === "DITOLAK"
 ? "mengajukan ulang deklarasi"
 : "mengajukan deklarasi";
 const yakin = window.confirm(
 `Yakin ingin ${teksAksi} ini? Setelah diajukan, nota tidak bisa ditambahkan lagi dan akan masuk ke admin untuk koreksi.`
 );
 if (!yakin) return;
 try {
 setPesanError("");
 setPesanSukses("");
 setSedangSelesai(saldo.id);
 const response = await fetch(
 `${apiUrl}/deklarasi/${saldo.id_deklarasi_aktif}/ajukan`,
 {
 method: "PATCH",
 }
 );
 const teksResponse = await response.text();
 let hasil: any = null;
 try {
 hasil = teksResponse ? JSON.parse(teksResponse) : null;
 } catch {
 hasil = null;
 }
 if (!response.ok) {
 throw new Error(
 hasil?.message || teksResponse || "Gagal mengajukan deklarasi."
 );
 }
 const pesanBerhasil =
 saldo.status_deklarasi_aktif === "DITOLAK"
 ? "Deklarasi berhasil diajukan ulang. Admin dapat melakukan koreksi ulang."
 : "Deklarasi berhasil diajukan. Admin dapat melakukan koreksi berdasarkan nomor nota.";
 if (pengguna) {
 await ambilDataDashboard(pengguna.id, false);
 }
 setPesanSukses(pesanBerhasil);
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat mengajukan deklarasi."
 );
 } finally {
 setSedangSelesai(null);
 }
 };
 const menuCepat: MenuCepat[] = [
 
 
 {
 judul: "Riwayat",
 deskripsi: "Semua data",
 icon: <History className="h-6 w-6" />,
 warna: "bg-blue-50 text-blue-600",
 aksi: () => router.push("/hc/riwayat"),
 },
 {
 judul: "Saldo Aktif",
 deskripsi: `${daftarSaldoAktif.length} saldo`,
 icon: <Wallet className="h-6 w-6" />,
 warna: "bg-emerald-50 text-emerald-600",
 aksi: () => {
 const elemen = document.getElementById("saldo-aktif-dashboard");
 elemen?.scrollIntoView({ behavior: "smooth", block: "start" });
 },
 },
 {
 judul: "Status",
 deskripsi: "Tracking",
 icon: <ShieldCheck className="h-6 w-6" />,
 warna: "bg-amber-50 text-amber-600",
 aksi: () => router.push("/hc/riwayat"),
 },
 {
 judul: "Perlu Revisi",
 deskripsi: `${totalPerluRevisi + totalBuktiDitolak} data`,
 icon: <ReceiptText className="h-6 w-6" />,
 warna: "bg-rose-50 text-rose-600",
 aksi: () => router.push("/hc/riwayat?status=DITOLAK"),
 },
 {
 judul: "Akun",
 deskripsi: "Info login",
 icon: <UserRound className="h-6 w-6" />,
 warna: "bg-slate-100 text-slate-700",
 aksi: () => router.push("/hc/akun"),
 },
 ];
 if (sedangMemuat) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-2xl border border-red-100 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-lg">
 Memuat dashboard karyawan...
 </div>
 </main>
 );
 }
 return (
 <main className="min-h-screen overflow-x-hidden bg-slate-50 pb-28 md:pb-10">
 <section className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6">
 <div className="mb-4">
    <Link href="/hc" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-red-600">
      <ArrowLeft size={18} />
      Kembali ke Menu HC
    </Link>
  </div>
 <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-red-700 via-red-600 to-rose-500 px-5 py-7 text-white shadow-[0_18px_60px_rgba(220,38,38,0.22)] md:px-8 md:py-8">
 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
 <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />
 <div className="relative flex items-start justify-between gap-3">
 <div className="flex min-w-0 items-center gap-3 md:gap-4">
 <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-white text-lg font-black text-red-600 shadow-xl md:h-16 md:w-16 md:text-xl">
 {inisialNama}
 </div>
 <div className="min-w-0">
 <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75 md:text-xs">
 Selamat datang
 </div>
 <h1 className="mt-1 truncate text-2xl font-black md:text-4xl">
 {pengguna?.nama || "Karyawan"}
 </h1>
 <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85 md:text-sm">
 <span>NRP {pengguna?.nrp || "-"}</span>
 <span className="text-white/50">•</span>
 <span>{pengguna?.role || "-"}</span>
 </div>
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <button
 type="button"
 onClick={handleRefresh}
 disabled={sedangRefresh}
 className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed md:h-11 md:w-11"
 title="Refresh"
 >
 <RefreshCw
 className={`h-5 w-5 ${sedangRefresh ? "animate-spin" : ""}`}
 />
 </button>
 <button
 type="button"
 onClick={handleKeluar}
 className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25 md:h-11 md:w-11"
 title="Keluar"
 >
 <LogOut className="h-5 w-5" />
 </button>
 </div>
 </div>
 </div>
 <div className="mt-5">
 {pesanError && (
 <div className="mb-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 shadow-lg">
 {pesanError}
 </div>
 )}
 {pesanSukses && (
 <div className="mb-5 rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-lg">
 {pesanSukses}
 </div>
 )}
 {totalNotaDitolak > 0 && (
 <div className="mb-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 shadow-lg">
 <div className="flex items-start gap-3">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
 <ReceiptText className="h-5 w-5" />
 </div>
 <div>
 <div className="text-base font-black text-red-700">
 Ada {totalNotaDitolak} nota ditolak
 </div>
 <div className="mt-1 text-sm font-semibold leading-6 text-red-700">
 Periksa alasan pada daftar nota. Upload nota baru sebagai
 revisi, lalu klik Ajukan Ulang Deklarasi.
 </div>
 </div>
 </div>
 </div>
 )}
 {totalBuktiDitolak > 0 && (
 <div className="mb-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 shadow-lg">
 <div className="flex items-start gap-3">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
 <UploadCloud className="h-5 w-5" />
 </div>
 <div>
 <div className="text-base font-black text-red-700">
 Ada {totalBuktiDitolak} bukti pengembalian ditolak
 </div>
 <div className="mt-1 text-sm font-semibold leading-6 text-red-700">
 Upload ulang bukti pengembalian saldo sisa yang benar.
 </div>
 </div>
 </div>
 </div>
 )}
 <div
 id="saldo-aktif-dashboard"
 className="rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6"
 >
 <div className="mb-5">
 <div className="text-2xl font-black text-slate-900">
 Saldo Aktif
 </div>
 <div className="mt-1 text-sm font-semibold text-slate-500">
 Saldo aktif hanya menghitung status AKTIF dan ADA_SISA yang
 belum disetujui admin.
 </div>
 </div>
 <div className="grid gap-4">
 <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
 <div className="flex items-start gap-4">
 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <Wallet className="h-6 w-6" />
 </div>
 <div className="min-w-0">
 <div className="text-sm font-semibold text-slate-500">
 Total Sisa Saldo Aktif
 </div>
 <div className="mt-1 break-words text-3xl font-black leading-tight text-slate-900 md:text-4xl">
 {formatRupiah(totalSisaSaldoAktif)}
 </div>
 <div className="mt-2 text-xs font-bold leading-5 text-slate-500">
 Tidak menghitung saldo yang status deklarasinya sudah
 DISETUJUI. Jika masih ada sisa, masuk ke Wajib
 Dikembalikan.
 </div>
 </div>
 </div>
 </div>
 <div className="grid gap-4 md:grid-cols-2">
 <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
 <div className="flex items-start gap-4">
 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
 <ReceiptText className="h-6 w-6" />
 </div>
 <div className="min-w-0">
 <div className="text-sm font-semibold text-red-700">
 Total Minus
 </div>
 <div className="mt-1 break-words text-3xl font-black leading-tight text-red-700 md:text-4xl">
 {formatRupiah(totalMinusSaldo)}
 </div>
 <div className="mt-2 text-xs font-bold leading-5 text-red-600">
 Kelebihan penggunaan dari saldo status
 MELEBIHI_NOMINAL.
 </div>
 </div>
 </div>
 </div>
 <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
 <div className="flex items-start gap-4">
 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-purple-700">
 <UploadCloud className="h-6 w-6" />
 </div>
 <div className="min-w-0">
 <div className="text-sm font-semibold text-purple-700">
 Wajib Dikembalikan
 </div>
 <div className="mt-1 break-words text-3xl font-black leading-tight text-purple-700 md:text-4xl">
 {formatRupiah(totalMenungguPengembalian)}
 </div>
 <div className="mt-2 text-xs font-bold leading-5 text-purple-600">
 Sisa saldo yang sudah disetujui admin dan wajib
 dikembalikan ke FA.
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 <p className="mt-4 text-xs font-bold text-slate-500">
 Total nota aktif: {totalNotaAktif}
 </p>
 <div className="mt-4 flex justify-end">
 <button
 type="button"
 onClick={tutupModalUploadNota}
 disabled={sedangUpload}
 className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed"
 >
 Batal
 </button>
 </div>
 </div>
 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
 <div className="mb-5">
 <div className="text-2xl font-black text-slate-900">
 Menu Utama
 </div>
 <div className="mt-1 text-sm font-semibold text-slate-500">
 Upload nota dilakukan satu per satu secara realtime.
 </div>
 </div>
 <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:gap-4 md:grid-cols-6">
 {menuCepat.map((menu) => (
 <button
 key={menu.judul}
 type="button"
 onClick={menu.aksi}
 className="group flex min-w-0 flex-col items-center rounded-3xl p-2 text-center transition hover:bg-red-50 sm:p-3"
 >
 <div
 className={`flex h-14 w-14 items-center justify-center rounded-full ${menu.warna} transition group-hover:scale-105 sm:h-16 sm:w-16`}
 >
 {menu.icon}
 </div>
 <div className="mt-3 text-xs font-black leading-4 text-slate-900 sm:text-sm sm:leading-5">
 {menu.judul}
 </div>
 <div className="mt-1 text-[11px] font-semibold leading-4 text-slate-500 sm:text-xs">
 {menu.deskripsi}
 </div>
 </button>
 ))}
 </div>
 </div>
 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
 <div className="mb-5">
 <div className="text-2xl font-black text-slate-900">
 Upload Nota dari Saldo Aktif
 </div>
 <div className="mt-1 text-sm font-semibold text-slate-500">
 Upload nota bisa untuk Perjalanan Dinas dan Uang Operasional.
 Jika status saldo MENUNGGU_PENGEMBALIAN, upload bukti
 pengembalian saldo sisa.
 </div>
 </div>
 {daftarSaldoAktif.length === 0 ? (
 <div className="rounded-3xl bg-slate-50 px-5 py-8 text-center">
 <Wallet className="mx-auto mb-3 h-10 w-10 text-slate-300" />
 <p className="text-sm font-black text-slate-700">
 Belum ada saldo aktif.
 </p>
 <p className="mt-1 text-xs font-semibold text-slate-500">
 Saldo akan muncul setelah FA upload bukti transfer.
 </p>
 </div>
 ) : (
 <div className="grid gap-4">
 {daftarSaldoAktif.map((saldo) => {
 const idDeklarasi = Number(saldo.id_deklarasi_aktif || 0);
 const daftarNota = daftarNotaPerDeklarasi[idDeklarasi] || [];
 const jumlahDitolak = daftarNota.filter(
 (nota) => nota.status_verifikasi === "DITOLAK"
 ).length;
 const sisaSaldo = normalisasiAngka(saldo.sisa_saldo);
 const dianggapMenungguPengembalian =
 saldo.status_saldo === "MENUNGGU_PENGEMBALIAN" ||
 (saldo.status_deklarasi_aktif === "DISETUJUI" &&
 sisaSaldo > 0);
 const bisaUploadNota =
 saldo.status_saldo !== "SELESAI" &&
 !dianggapMenungguPengembalian &&
 saldo.status_deklarasi_aktif !== "DISETUJUI" &&
 idDeklarasi > 0 &&
 statusDeklarasiBolehUpload(saldo.status_deklarasi_aktif);
 const bisaAjukanDeklarasi =
 saldo.status_saldo !== "SELESAI" &&
 !dianggapMenungguPengembalian &&
 saldo.status_deklarasi_aktif !== "DISETUJUI" &&
 !!saldo.id_deklarasi_aktif &&
 daftarNota.length > 0 &&
 (!!saldo.status_deklarasi_aktif
 ? ["DRAFT", "DITOLAK"].includes(
 saldo.status_deklarasi_aktif
 )
 : true);
 const bisaUploadBuktiPengembalian =
 dianggapMenungguPengembalian &&
 sisaSaldo > 0 &&
 saldo.status_bukti_pengembalian !== "DIAJUKAN";
 const teksTombolAjukan =
 saldo.status_deklarasi_aktif === "DITOLAK"
 ? "Ajukan Ulang Deklarasi"
 : "Ajukan Deklarasi";
 return (
 <div
 key={saldo.id}
 className="rounded-[28px] border border-slate-100 bg-slate-50 p-4"
 >
 <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div className="min-w-0 flex-1 overflow-x-auto">
 <div className="flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
 Saldo #{saldo.id}
 </span>
 <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black text-slate-600">
 {teksAmanSettlement(formatJenis(saldo.jenis_saldo))}
 </span>
 <span
 className={`rounded-full px-3 py-1 text-xs font-black ${warnaStatusSaldo(
 dianggapMenungguPengembalian
 ? "MENUNGGU_PENGEMBALIAN"
 : saldo.status_saldo
 )}`}
 >
 {dianggapMenungguPengembalian
 ? "MENUNGGU_PENGEMBALIAN"
 : saldo.status_saldo}
 </span>
 {saldo.status_deklarasi_aktif && (
 <span
 className={`rounded-full px-3 py-1 text-xs font-black ${warnaStatusDeklarasi(
 saldo.status_deklarasi_aktif
 )}`}
 >
 {saldo.status_deklarasi_aktif}
 </span>
 )}
 {dianggapMenungguPengembalian && (
 <span
 className={`rounded-full px-3 py-1 text-xs font-black ${warnaStatusBuktiPengembalian(
 saldo.status_bukti_pengembalian
 )}`}
 >
 Bukti{" "}
 {formatStatusBuktiPengembalian(
 saldo.status_bukti_pengembalian
 )}
 </span>
 )}
 {jumlahDitolak > 0 && (
 <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
 {jumlahDitolak} Nota Ditolak
 </span>
 )}
 </div>
 <h3 className="mt-3 text-lg font-black text-slate-950">
 {saldo.kode_deklarasi_aktif || "Deklarasi Aktif"}
 </h3>
 <p className="mt-1 text-sm font-bold text-slate-500">
 {teksAmanSettlement(saldo.lokasi || "-")}{" • "}
 {formatTanggal(saldo.tanggal_transfer)}
 </p>
 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <div className="rounded-2xl bg-white p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Transfer
 </p>
 <p className="mt-1 text-sm font-black text-slate-900">
 {formatRupiah(saldo.nominal_transfer)}
 </p>
 </div>
 <div className="rounded-2xl bg-white p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Terpakai
 </p>
 <p className="mt-1 text-sm font-black text-slate-900">
 {formatRupiah(saldo.total_penggunaan)}
 </p>
 </div>
 <div className="rounded-2xl bg-white p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 {sisaSaldo < 0 ? "Minus" : "Sisa"}
 </p>
 <p
 className={`mt-1 text-sm font-black ${
 sisaSaldo < 0
 ? "text-red-700"
 : "text-red-600"
 }`}
 >
 {formatRupiah(sisaSaldo)}
 </p>
 </div>
 </div>
 {dianggapMenungguPengembalian && (
 <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-4">
 <p className="text-sm font-black text-purple-800">
 Wajib mengembalikan sisa saldo{" "}
 {formatRupiah(saldo.sisa_saldo)}
 </p>
 <p className="mt-1 text-xs font-semibold leading-5 text-purple-700">
 Upload bukti pengembalian berupa foto. Setelah
 disetujui Admin / FA, saldo menjadi SELESAI dan
 tidak tampil lagi di Saldo Aktif.
 </p>
 {saldo.path_file_bukti_pengembalian && (
 <button
 type="button"
 onClick={() =>
 bukaFile(
 saldo.path_file_bukti_pengembalian
 )
 }
 className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-black text-purple-700"
 >
 Lihat bukti:{" "}
 {ambilNamaFile(
 saldo.path_file_bukti_pengembalian
 )}
 </button>
 )}
 {saldo.status_bukti_pengembalian ===
 "DITOLAK" && (
 <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-red-700">
 Alasan bukti ditolak:{" "}
 {saldo.alasan_bukti_pengembalian_ditolak ||
 "-"}
 </div>
 )}
 {saldo.status_bukti_pengembalian ===
 "DIAJUKAN" && (
 <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-blue-700">
 Bukti pengembalian sudah diupload dan sedang
 menunggu koreksi Admin / FA.
 </div>
 )}
 </div>
 )}
 {saldo.status_saldo === "MELEBIHI_NOMINAL" && (
 <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
 <p className="text-sm font-black text-red-700">
 Penggunaan melebihi saldo sebesar{" "}
 {formatRupiah(Math.abs(sisaSaldo))}
 </p>
 <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
 Tidak perlu upload bukti pengembalian karena
 saldo minus. Data minus tercatat sebagai
 kelebihan penggunaan.
 </p>
 </div>
 )}
 <div className="mt-4">
 <div className="mb-2 text-sm font-black text-slate-900">
 Daftar Nota
 </div>
 {daftarNota.length === 0 ? (
 <div className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-500">
 Belum ada nota yang diupload.
 </div>
 ) : (
 <div className="grid gap-2">
 {daftarNota.map((nota, index) => {
 const nomorNota = index + 1;
 return (
 <div
 key={nota.id}
 role="button"
 tabIndex={0}
 onClick={() => bukaFile(nota.path_file)}
 className={`cursor-pointer flex flex-col gap-2 rounded-2xl px-4 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${
 nota.status_verifikasi === "DITOLAK"
 ? "border border-red-100 bg-red-50 hover:bg-red-100"
 : "bg-white hover:bg-red-50"
 }`}
 >
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <span className="whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
 Nota {nomorNota}
 </span>
 <p className="whitespace-nowrap text-sm font-black text-slate-900">
 {formatKategori(
 nota.kategori_nota
 )}
 </p>
 <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
 Upload Jam {formatJam(nota.dibuat_pada)}
 </span>
 </div>
 <p className="mt-1 truncate text-xs font-semibold text-slate-500">
 {ambilNamaFile(nota.path_file)}
 </p>
 {nota.status_verifikasi ===
 "DITOLAK" && (
 <div className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-red-700">
 Alasan ditolak:{" "}
 {nota.alasan_koreksi || "-"}
 </div>
 )}
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <span className="whitespace-nowrap rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
 {formatRupiah(nota.nominal_final)}
 </span>
 {statusDeklarasiBolehUpload(
 saldo.status_deklarasi_aktif
 ) &&
 saldo.status_saldo !== "SELESAI" &&
 !dianggapMenungguPengembalian &&
 saldo.status_deklarasi_aktif !==
 "DISETUJUI" && (
 <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-1">
 <input
 type="text"
 inputMode="numeric"
 onClick={(event) =>
 event.stopPropagation()
 }
 onMouseDown={(event) =>
 event.stopPropagation()
 }
 value={
 nominalOcrManualDashboard[
 nota.id
 ] || ""
 }
 onChange={(event) =>
 handleInputOcrManualDashboard(
 nota.id,
 event.target.value
 )
 }
 placeholder="OCR manual"
 className="h-9 w-32 shrink-0 rounded-lg border border-amber-100 bg-white px-2 text-xs font-black text-slate-900 outline-none focus:border-amber-400"
 />
 <button
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 handleSimpanOcrManualDashboard(
 nota,
 nomorNota
 );
 }}
 disabled={
 sedangSimpanOcrManualDashboard ===
 nota.id
 }
 className="h-9 shrink-0 rounded-lg bg-amber-500 px-3 text-xs font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangSimpanOcrManualDashboard ===
 nota.id
 ? "..."
 : "Simpan"}
 </button>
 </div>
 )}
 <span
 className={`rounded-xl px-3 py-2 text-xs font-black ${warnaStatusNota(
 nota.status_verifikasi
 )}`}
 >
 {nota.status_verifikasi}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 <div className="grid gap-2 sm:grid-cols-2 lg:w-[250px] lg:grid-cols-1">
 {dianggapMenungguPengembalian ? (
 <button
 type="button"
 disabled={!bisaUploadBuktiPengembalian}
 onClick={() =>
 bukaModalBuktiPengembalian(saldo)
 }
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <UploadCloud className="h-4 w-4" />
 {saldo.status_bukti_pengembalian === "DITOLAK"
 ? "Upload Ulang Bukti"
 : saldo.status_bukti_pengembalian ===
 "DIAJUKAN"
 ? "Menunggu Koreksi"
 : "Upload Bukti Pengembalian"}
 </button>
 ) : (
 <button
 type="button"
 disabled={!bisaUploadNota}
 onClick={() => bukaModalUploadNota(saldo)}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white !text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <UploadCloud className="h-4 w-4" />
 {saldo.status_deklarasi_aktif === "DITOLAK"
 ? "Upload Nota Revisi"
 : saldoDipilih?.status_deklarasi_aktif === "DITOLAK"
 ? "Upload Nota Revisi"
 : saldoDipilih?.status_deklarasi_aktif === "DITOLAK"
 ? "Upload Nota Revisi"
 : "Upload Nota"}
 </button>
 )}
 <button
    type="button"
    disabled={
      sedangSelesai === saldo.id ||
      !bisaAjukanDeklarasi
    }
    onClick={() => ajukanDeklarasi(saldo)}
    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {sedangSelesai === saldo.id ? (
      <RefreshCw className="h-4 w-4 animate-spin text-white !text-white" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-white !text-white" />
    )}
    {teksTombolAjukan}
  </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
 <div className="mb-5 flex items-center justify-between gap-4">
 <div>
 <div className="text-2xl font-black text-slate-900">
 Riwayat Deklarasi
 </div>
 <div className="mt-1 text-sm font-semibold text-slate-500">
 Menampilkan 5 data per halaman. Total riwayat:{" "}
 {riwayatDeklarasiUrut.length} data.
 </div>
 </div>
 <button
 type="button"
 onClick={() => router.push("/hc/riwayat")}
 className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
 >
 Lihat Semua
 <ArrowRight className="h-4 w-4" />
 </button>
 </div>
 <div className="space-y-3">
 {deklarasiTerbaru.length === 0 ? (
 <div className="rounded-3xl bg-slate-50 px-5 py-6 text-center text-sm font-bold text-slate-500">
 Belum ada riwayat deklarasi.
 </div>
 ) : (
 deklarasiTerbaru.map((deklarasi) => (
 <button
 key={deklarasi.id}
 type="button"
 onClick={() =>
 router.push(`/hc/deklarasi/detail/${deklarasi.id}`)
 }
 className="w-full rounded-3xl bg-slate-50 p-4 text-left transition hover:bg-red-50"
 >
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="min-w-0">
 <div className="truncate text-base font-black text-slate-900">
 {deklarasi.kode_deklarasi}
 </div>
 <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
 <span>{formatJenis(deklarasi.jenis_deklarasi)}</span>
 <span>•</span>
 <span>
 {formatTanggal(deklarasi.tanggal_kegiatan)}
 </span>
 <span>•</span>
 <span>{teksAmanSettlement(deklarasi.lokasi)}</span>
 </div>
 <div className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">
 {teksAmanSettlement(deklarasi.keterangan)}
 </div>
 </div>
 <div className="flex shrink-0 flex-wrap items-center gap-3">
 <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900">
 {formatRupiah(deklarasi.total_nominal)}
 </div>
 <div
 className={`rounded-2xl px-4 py-3 text-sm font-black ${warnaStatusDeklarasi(
 deklarasi.status
 )}`}
 >
 {deklarasi.status}
 </div>
 </div>
 </div>
 </button>
 ))
 )}
 </div>
 </div>
 </div>
 </section>
 {typeof riwayatDeklarasiUrut !== "undefined" &&
 riwayatDeklarasiUrut.length > jumlahDataRiwayatPerHalaman && (
 <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
 <button
 type="button"
 disabled={halamanRiwayat <= 1}
 onClick={() =>
 setHalamanRiwayat((halaman) => Math.max(1, halaman - 1))
 }
 className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
 >
 Sebelumnya
 </button>
 <div className="text-center text-sm font-black text-slate-600">
 Halaman {halamanRiwayat} dari {totalHalamanRiwayat}
 </div>
 <button
 type="button"
 disabled={halamanRiwayat >= totalHalamanRiwayat}
 onClick={() =>
 setHalamanRiwayat((halaman) =>
 Math.min(totalHalamanRiwayat, halaman + 1)
 )
 }
 className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
 >
 Selanjutnya
 </button>
 </div>
 )}
 {saldoDipilih && (
 <div className="fixed inset-0 z-[80] flex items-start md:items-start sm:items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm overflow-y-auto overscroll-contain px-3 py-4">
 <div className="w-full max-w-3xl rounded-[32px] bg-white p-5 shadow-2xl sm:p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-600">
 <UploadCloud className="h-3.5 w-3.5" />
 {saldoDipilih.status_deklarasi_aktif === "DITOLAK"
 ? "Upload Nota Revisi"
 : saldoDipilih?.status_deklarasi_aktif === "DITOLAK"
 ? "Upload Nota Revisi"
 : saldoDipilih?.status_deklarasi_aktif === "DITOLAK"
 ? "Upload Nota Revisi"
 : "Upload Nota"}
 </div>
 <h2 className="text-xl font-black text-slate-950">
 Pilih Kategori Nota
 </h2>
 <p className="mt-1 text-sm font-semibold text-slate-500">
 {teksAmanSettlement(saldoDipilih.kode_deklarasi_aktif || "Deklarasi Aktif")}{" • "}
 {teksAmanSettlement(formatJenis(saldoDipilih.jenis_saldo))}{" • Sisa saldo "}
 {formatRupiah(saldoDipilih.sisa_saldo)}
 </p>
 </div>
 <button
 type="button"
 onClick={tutupModalUploadNota}
 disabled={sedangUpload}
 className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <X className="h-5 w-5" />
 </button>
 </div>
 {(() => {
 

 



 




 const semuaNotaUntukModalRevisi =
 daftarNotaPerDeklarasi[
 Number(saldoDipilih?.id_deklarasi_aktif)
 ] || [];

 const daftarNotaUntukRevisi = semuaNotaUntukModalRevisi.filter(
 (nota: DataNota) => nota.status_verifikasi === "DITOLAK"
 );

 const daftarNotaDitolak = daftarNotaUntukRevisi;

const indexNotaRevisiDipilih =
 daftarNotaUntukRevisi.findIndex(
 (nota) => String(nota.id) === notaRevisiDipilih
 );

 const nomorNotaRevisiDipilih =
 indexNotaRevisiDipilih >= 0
 ? indexNotaRevisiDipilih + 1
 : 0;

 return (

 <form onSubmit={uploadNota} className="mt-5 grid gap-4">
 {pesanError && (
 <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
 {pesanError}
 </div>
 )}
 {pesanSukses && (
 <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
 {pesanSukses}
 </div>
 )}
 {saldoDipilih?.status_deklarasi_aktif === "DITOLAK" && (
 <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
 <div className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-red-600">
 Upload Semua Revisi Nota
 </div>

 <div className="mb-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700">
 Total nota ditolak:{" "}
 {daftarNotaUntukRevisi.length}{" "}
 nota
 </div>

 <div className="grid max-h-[300px] gap-3 overflow-y-auto pr-1">
 {daftarNotaUntukRevisi.map((nota, index) => {
 const nomorNota = index + 1;
 const kategoriAktif =
 kategoriRevisiBatch[nota.id] || nota.kategori_nota;

 return (
 <div
 key={nota.id}
 className="rounded-2xl border border-red-100 bg-white p-3"
 >
 <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-black sm:text-sm">
 <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
 Nota {nomorNota}
 </span>

 <span>{formatKategori(nota.kategori_nota)}</span>
 <span className="text-slate-400">•</span>
 <span>{formatRupiah(nota.nominal_final)}</span>
 </div>

 <div className="mb-3 truncate text-[11px] font-semibold text-slate-500">
 File lama: {ambilNamaFile(nota.path_file)}
 </div>

 <div className="mb-3 grid gap-2 sm:grid-cols-3">
 {daftarKategoriBerdasarkanSaldo(saldoDipilih).map(
 (kategori) => (
 <button
 key={kategori.value}
 type="button"
 onClick={() =>
 ubahKategoriRevisiBatch(
 nota.id,
 kategori.value
 )
 }
 className={`rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${
 kategoriAktif === kategori.value
 ? "border-red-300 bg-red-50 text-red-700"
 : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-red-50"
 }`}
 >
 {kategori.label}
 </button>
 )
 )}
 </div>

 
 {saldoDipilih?.jenis_saldo === "UANG_OPERASIONAL" && (
 <div className="mt-3 grid gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 sm:grid-cols-2">
 <div className="sm:col-span-2">
 <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
 Data Settlement Revisi Nota
 </div>
 </div>

 <div>
 <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
 Nama Barang / Jasa
 </label>
 <input
 type="text"
 value={barangJasaRevisiBatch[String(nota.id)] || ""}
 onChange={(event) =>
 setBarangJasaRevisiBatch((prev) => ({
 ...prev,
 [String(nota.id)]: event.target.value,
 }))
 }
 placeholder="Contoh: Konsumsi meeting"
 className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300"
 />
 </div>

 <div>
 <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
 Item
 </label>
 <input
 type="number"
 min="1"
 value={jumlahItemSettlementRevisiBatch[String(nota.id)] || "1"}
 onChange={(event) =>
 setJumlahItemSettlementRevisiBatch((prev) => ({
 ...prev,
 [String(nota.id)]: event.target.value,
 }))
 }
 placeholder="Contoh: 5"
 className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300"
 />
 </div>

 <div>
 <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
 PIC
 </label>
 <input
 type="text"
 value={picSettlementRevisiBatch[String(nota.id)] || ""}
 onChange={(event) =>
 setPicSettlementRevisiBatch((prev) => ({
 ...prev,
 [String(nota.id)]: event.target.value,
 }))
 }
 placeholder="Contoh: Daniel"
 className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300"
 />
 </div>

 <div>
 <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
 Keterangan
 </label>
 <input
 type="text"
 value={keteranganSettlementRevisiBatch[String(nota.id)] || ""}
 onChange={(event) =>
 setKeteranganSettlementRevisiBatch((prev) => ({
 ...prev,
 [String(nota.id)]: event.target.value,
 }))
 }
 placeholder="Keterangan per nota"
 className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300"
 />
 </div>
 </div>
 )}

<input
 id={`file_revisi_batch_${nota.id}`}
 type="file"
 accept=".jpg,.jpeg,.png,.webp"
 onChange={(event) =>
 ubahFileRevisiBatch(nota.id, event)
 }
 className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 outline-none file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-3 file:text-xs file:font-black file:text-white hover:file:bg-red-700 sm:text-sm sm:file:px-4 sm:file:text-sm"
 />

 <p className="mt-2 text-xs font-semibold text-slate-500">
 {fileRevisiBatch[nota.id]
 ? fileRevisiBatch[nota.id]?.name
 : `Belum ada file revisi Nota ${nomorNota}.`}
 </p>
 </div>
 );
 })}
 </div>

 <button
 type="button"
 onClick={uploadSemuaNotaRevisiBatch}
 disabled={sedangUpload}
 className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangUpload ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <UploadCloud className="h-4 w-4" />
 )}
 Upload Semua Revisi Nota
 </button>

 <p className="mt-3 text-xs font-bold leading-5 text-red-600">
 Pilih file revisi untuk nota yang ditolak, lalu klik Upload Semua Revisi Nota. OCR diproses satu per satu.
 </p>
 </div>
 )}

 <div
 className={
 saldoDipilih.status_deklarasi_aktif === "DITOLAK"
 ? "hidden"
 : saldoDipilih.jenis_saldo === "UANG_OPERASIONAL"
 ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
 : "grid gap-3 sm:grid-cols-3"
 }
 >
 {daftarKategoriBerdasarkanSaldo(saldoDipilih).map(
 (kategori) => (
 <button
 key={kategori.value}
 type="button"
 onClick={() => setKategoriDipilih(kategori.value)}
 className={`rounded-3xl border p-4 text-left transition ${
 kategoriDipilih === kategori.value
 ? "border-red-300 bg-red-50 text-red-700"
 : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-red-50"
 }`}
 >
 <p className="text-sm font-black">{kategori.label}</p>
 <p className="mt-1 text-xs font-semibold leading-5">
 {kategori.deskripsi}
 </p>
 </button>
 )
 )}
 </div>
 <div className={saldoDipilih.status_deklarasi_aktif === "DITOLAK" ? "hidden" : ""}> {saldoDipilih?.jenis_saldo === "UANG_OPERASIONAL" && (
 <div className="grid gap-3 rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4 sm:grid-cols-2">
 <div className="sm:col-span-2">
 <div className="mb-2 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
 Data Database Settlement
 </div>
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-cyan-700">
 Nama Barang / Jasa
 </label>
 <input
 type="text"
 value={barangJasaNota}
 onChange={(event) => setBarangJasaNota(event.target.value)}
 placeholder="Contoh: Konsumsi meeting"
 className="w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-cyan-700">
 Item
 </label>
 <input
 type="number"
 min="1"
 value={jumlahItemSettlementNota}
 onChange={(event) => setJumlahItemSettlementNota(event.target.value)}
 placeholder="Contoh: 5"
 className="w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-cyan-700">
 PIC
 </label>
 <input
 type="text"
 value={picSettlementNota}
 onChange={(event) => setPicSettlementNota(event.target.value)}
 placeholder="Contoh: Daniel"
 className="w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-cyan-700">
 Keterangan
 </label>
 <input
 type="text"
 value={keteranganSettlementNota}
 onChange={(event) => setKeteranganSettlementNota(event.target.value)}
 placeholder="Keterangan per nota"
 className="w-full rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
 />
 </div>
 </div>
 )}


 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 File Nota
 </label>
 <input
 id="file_nota_dashboard"
 type="file"
 accept=".jpg,.jpeg,.png,.webp"
 onChange={ubahFileNota}
 className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 outline-none file:mr-4 file:border-0 file:bg-red-600 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-red-700"
 />
 <p className="mt-2 text-xs font-semibold text-slate-500">
 {fileNota ? fileNota.name : "Belum ada file nota."}
 </p>

 {saldoDipilih?.status_deklarasi_aktif === "DITOLAK" && (
 <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
 {notaRevisiDipilih
 ? nomorNotaRevisiDipilih
 ? `File ini akan mengganti Nota ${nomorNotaRevisiDipilih} yang dipilih.`
 : "File ini akan mengganti nota yang sedang dipilih."
 : "Pilih Nota 1 / Nota 2 / Nota 3 terlebih dahulu sebelum upload."}
 </p>
 )}
 </div>
 <div className={`flex flex-col gap-3 sm:flex-row ${saldoDipilih.status_deklarasi_aktif === "DITOLAK" ? "hidden" : ""}`}>
 <button
 type="submit"
 disabled={
 sedangUpload ||
 (saldoDipilih?.status_deklarasi_aktif === "DITOLAK" &&
 (!notaRevisiDipilih || !fileNota))
 }
 className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white !text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangUpload ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <UploadCloud className="h-4 w-4" />
 )}
 {saldoDipilih?.status_deklarasi_aktif === "DITOLAK"
 ? nomorNotaRevisiDipilih
 ? `Upload Revisi Nota ${nomorNotaRevisiDipilih}`
 : "Pilih Nota Revisi"
 : "Upload Nota"}
 </button>
 <button
 type="button"
 onClick={tutupModalUploadNota}
 disabled={sedangUpload}
 className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
 >
 Batal
 </button>
 </div>
 </form>
 );
 })()}
 {/* END_HELPER_NOTA_REVISI */}
 </div>
 </div>
 )}
 {saldoBuktiDipilih && (
 <div className="fixed inset-0 z-[90] flex items-start md:items-start sm:items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm overflow-y-auto overscroll-contain px-3 py-4">
 <div className="w-full w-[calc(100vw-24px)] max-w-xl rounded-[32px] bg-white p-5 shadow-2xl sm:p-4 sm:p-5 max-h-[86vh] overflow-y-auto overscroll-contain">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-purple-700">
 <UploadCloud className="h-3.5 w-3.5" />
 Bukti Pengembalian
 </div>
 <h2 className="text-xl font-black text-slate-950">
 Upload Bukti Pengembalian
 </h2>
 <p className="mt-1 text-sm font-semibold text-slate-500">
 {saldoBuktiDipilih.kode_deklarasi_aktif ||
 "Deklarasi Aktif"}{" "}
 • Wajib kembali{" "}
 {formatRupiah(saldoBuktiDipilih.sisa_saldo)}
 </p>
 </div>
 <button
 type="button"
 onClick={tutupModalBuktiPengembalian}
 disabled={sedangUploadBukti}
 className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <X className="h-5 w-5" />
 </button>
 </div>
 <form
 onSubmit={uploadBuktiPengembalian}
 className="mt-5 grid gap-4"
 >
 {pesanError && (
 <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
 {pesanError}
 </div>
 )}
 {pesanSukses && (
 <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
 {pesanSukses}
 </div>
 )}
 {saldoBuktiDipilih.status_bukti_pengembalian === "DITOLAK" && (
 <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
 Bukti sebelumnya ditolak:{" "}
 {saldoBuktiDipilih.alasan_bukti_pengembalian_ditolak || "-"}
 </div>
 )}
 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Nominal Pengembalian
 </label>
 <input
 id="nominal_pengembalian_manual_dashboard"
 type="text"
 inputMode="numeric"
 value={nominalPengembalianManual}
 onChange={(event) => {
 const angkaSaja = event.target.value.replace(/[^\d]/g, "");
 setNominalPengembalianManual(angkaSaja);
 }}
 placeholder="Contoh: 490500"
 className="block w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm font-black text-slate-800 outline-none transition focus:border-purple-400 focus:bg-white"
 />
 <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
 Wajib kembali dari sistem:{" "}
 <span className="font-black text-purple-700">
 {formatRupiah(saldoBuktiDipilih.sisa_saldo)}
 </span>
 </p>
 </div>
 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Foto Bukti Pengembalian
 </label>
 <input
 id="file_bukti_pengembalian"
 type="file"
 accept=".jpg,.jpeg,.png,.webp"
 onChange={ubahFileBuktiPengembalian}
 className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 outline-none file:mr-4 file:border-0 file:bg-purple-700 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-purple-800"
 />
 <p className="mt-2 text-xs font-semibold text-slate-500">
 {fileBuktiPengembalian
 ? fileBuktiPengembalian.name
 : "Belum ada file bukti pengembalian."}
 </p>
 <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
 Foto akan dikompres otomatis di backend dengan kualitas 75%.
 </p>
 </div>
 <div className="flex flex-col gap-3 sm:flex-row">
 <button
 type="submit"
 disabled={sedangUploadBukti}
 className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangUploadBukti ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <UploadCloud className="h-4 w-4" />
 )}
 Upload Bukti
 </button>
 <button
 type="button"
 onClick={tutupModalBuktiPengembalian}
 disabled={sedangUploadBukti}
 className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
 >
 Batal
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </main>
 );
}
/* <--- end ---> */