"use client";

import {
 ArrowLeft,
 CalendarDays,
 FileText,
 Filter,
 ReceiptText,
 Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

/* <--- fitur halaman riwayat deklarasi karyawan ---> */

type DataPenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 email: string | null;
 nomor_telepon: string | null;
 role: "SUPER_ADMIN" | "ADMIN" | "SECTION_HEAD" | "FA" | "KARYAWAN";
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

function KontenRiwayatDeklarasi() {
 const router = useRouter();
 const searchParams = useSearchParams();

 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const statusDariUrl = searchParams.get("status") || "SEMUA";

 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);
 const [daftarDeklarasi, setDaftarDeklarasi] = useState<DataDeklarasi[]>([]);
 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [pesanError, setPesanError] = useState("");

 const [kataKunci, setKataKunci] = useState("");
 const [filterJenis, setFilterJenis] = useState("SEMUA");
 const [filterStatus, setFilterStatus] = useState(statusDariUrl);
 const [filterBulan, setFilterBulan] = useState("");
 const [filterTahun, setFilterTahun] = useState("");

 const formatJenisDeklarasi = (jenis: string) => {
 if (jenis === "PERJALANAN_DINAS") return "Perjalanan Dinas";
 if (jenis === "UANG_OPERASIONAL") return "Uang Operasional";
 return jenis;
 };

 const formatTanggal = (tanggal: string) => {
 if (!tanggal) return "-";

 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "long",
 year: "numeric",
 }).format(new Date(tanggal));
 };

 const formatRupiah = (nilai: string | number) => {
 const angka = Number(nilai || 0);

 return new Intl.NumberFormat("id-ID", {
 style: "currency",
 currency: "IDR",
 minimumFractionDigits: 0,
 }).format(angka);
 };

 const warnaStatus = (status: string) => {
 if (status === "DRAFT") return "bg-slate-100 text-slate-700";
 if (status === "DIAJUKAN") return "bg-blue-50 text-blue-700";
 if (status === "DIVERIFIKASI") return "bg-amber-50 text-amber-700";
 if (status === "DISETUJUI") return "bg-emerald-50 text-emerald-700";
 if (status === "DITOLAK") return "bg-red-50 text-red-700";
 return "bg-slate-100 text-slate-700";
 };

 const teksFilterAktif = () => {
 if (filterJenis === "SEMUA" && filterStatus === "SEMUA") {
 return "Semua Data";
 }

 if (filterJenis !== "SEMUA" && filterStatus !== "SEMUA") {
 return `${formatJenisDeklarasi(filterJenis)} / ${filterStatus}`;
 }

 if (filterJenis !== "SEMUA") {
 return formatJenisDeklarasi(filterJenis);
 }

 return filterStatus;
 };

 useEffect(() => {
 setFilterStatus(statusDariUrl);
 }, [statusDariUrl]);

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

 if (
 penggunaTersimpan.role === "SUPER_ADMIN" ||
 penggunaTersimpan.role === "ADMIN" ||
 penggunaTersimpan.role === "SECTION_HEAD" ||
 penggunaTersimpan.role === "FA"
 ) {
 router.replace("/hc/admin");
 return;
 }

 setPengguna(penggunaTersimpan);

 const ambilRiwayat = async () => {
 try {
 const response = await fetch(
 `${apiUrl}/deklarasi/pengguna/${penggunaTersimpan.id}`
 );

 if (!response.ok) {
 throw new Error("Gagal mengambil riwayat deklarasi");
 }

 const data: DataDeklarasi[] = await response.json();
 setDaftarDeklarasi(data);
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengambil data"
 );
 } finally {
 setSedangMemuat(false);
 }
 };

 ambilRiwayat();
 }, [apiUrl, router]);

 const tahunTersedia = useMemo(() => {
 const tahunSekarang = new Date().getFullYear();
 return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
 }, []);

 const daftarDeklarasiTersaring = useMemo(() => {
 const keyword = kataKunci.toLowerCase();

 return daftarDeklarasi.filter((deklarasi) => {
 const cocokKataKunci =
 deklarasi.kode_deklarasi.toLowerCase().includes(keyword) ||
 deklarasi.lokasi.toLowerCase().includes(keyword) ||
 deklarasi.keterangan.toLowerCase().includes(keyword);

 const cocokJenis =
 filterJenis === "SEMUA" || deklarasi.jenis_deklarasi === filterJenis;

 const cocokStatus =
 filterStatus === "SEMUA" || deklarasi.status === filterStatus;

 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 const cocokBulan =
 !filterBulan || tanggal.getMonth() + 1 === Number(filterBulan);

 const cocokTahun =
 !filterTahun || tanggal.getFullYear() === Number(filterTahun);

 return (
 cocokKataKunci &&
 cocokJenis &&
 cocokStatus &&
 cocokBulan &&
 cocokTahun
 );
 });
 }, [
 daftarDeklarasi,
 kataKunci,
 filterJenis,
 filterStatus,
 filterBulan,
 filterTahun,
 ]);

 if (sedangMemuat) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-2xl border border-red-100 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-lg">
 Memuat riwayat deklarasi...
 </div>
 </main>
 );
 }

 return (
 <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8">
 <section className="mx-auto w-full max-w-6xl">
 <button
 type="button"
 onClick={() => router.push("/hc/deklarasi-dinas")}
 className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
 >
 <ArrowLeft className="h-4 w-4" />
 Kembali ke Dashboard
 </button>

 <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-red-700 via-red-600 to-rose-500 px-5 py-6 text-white shadow-[0_18px_60px_rgba(220,38,38,0.22)] md:px-8 md:py-7">
 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
 <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />

 <div className="relative">
 <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
 <FileText className="h-4 w-4" />
 Riwayat Deklarasi
 </div>

 <h1 className="mt-4 text-3xl font-black md:text-4xl">
 Semua Riwayat {pengguna?.nama || "Karyawan"}
 </h1>

 <p className="mt-3 max-w-3xl text-sm leading-7 text-white/90">
 Menampilkan semua deklarasi perjalanan dinas dan uang operasional
 milik akun ini.
 </p>
 </div>
 </div>

 <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
 <div className="rounded-[28px] border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <ReceiptText className="h-6 w-6" />
 </div>

 <div className="text-sm font-semibold text-slate-500">
 Total Riwayat
 </div>

 <div className="mt-2 text-2xl font-black text-slate-900">
 {daftarDeklarasi.length} Data
 </div>
 </div>

 <div className="rounded-[28px] border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <CalendarDays className="h-6 w-6" />
 </div>

 <div className="text-sm font-semibold text-slate-500">
 Data Tampil
 </div>

 <div className="mt-2 text-2xl font-black text-slate-900">
 {daftarDeklarasiTersaring.length} Data
 </div>
 </div>

 <div className="rounded-[28px] border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <Filter className="h-6 w-6" />
 </div>

 <div className="text-sm font-semibold text-slate-500">
 Filter Aktif
 </div>

 <div className="mt-2 text-sm font-black text-slate-900">
 {teksFilterAktif()}
 </div>
 </div>
 </div>

 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:p-6">
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <Filter className="h-5 w-5" />
 </div>

 <div>
 <div className="text-xl font-black text-slate-900">
 Filter Riwayat
 </div>

 <div className="text-sm font-semibold text-slate-500">
 Cari berdasarkan kode, lokasi, atau keterangan.
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_160px_140px] md:items-end">
 <div>
 <label
 htmlFor="pencarianRiwayat"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Cari riwayat deklarasi
 </label>

 <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50">
 <Search className="h-4 w-4 shrink-0 text-slate-400" />

 <input
 id="pencarianRiwayat"
 name="pencarianRiwayat"
 type="text"
 value={kataKunci}
 onChange={(event) => setKataKunci(event.target.value)}
 placeholder="Cari kode / lokasi / keterangan"
 className="h-full w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
 />
 </div>
 </div>

 <div>
 <label
 htmlFor="filterJenisRiwayat"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Jenis
 </label>

 <select
 id="filterJenisRiwayat"
 name="filterJenisRiwayat"
 value={filterJenis}
 onChange={(event) => setFilterJenis(event.target.value)}
 className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
 >
 <option value="SEMUA">Semua Jenis</option>
 <option value="PERJALANAN_DINAS">Perjalanan Dinas</option>
 <option value="UANG_OPERASIONAL">Uang Operasional</option>
 </select>
 </div>

 <div>
 <label
 htmlFor="filterStatusRiwayat"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Status
 </label>

 <select
 id="filterStatusRiwayat"
 name="filterStatusRiwayat"
 value={filterStatus}
 onChange={(event) => setFilterStatus(event.target.value)}
 className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
 >
 <option value="SEMUA">Semua Status</option>
 <option value="DRAFT">DRAFT</option>
 <option value="DIAJUKAN">DIAJUKAN</option>
 <option value="DIVERIFIKASI">DIVERIFIKASI</option>
 <option value="DISETUJUI">DISETUJUI</option>
 <option value="DITOLAK">DITOLAK</option>
 </select>
 </div>

 <div>
 <label
 htmlFor="filterBulanRiwayat"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Bulan
 </label>

 <select
 id="filterBulanRiwayat"
 name="filterBulanRiwayat"
 value={filterBulan}
 onChange={(event) => setFilterBulan(event.target.value)}
 className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
 >
 <option value="">Semua Bulan</option>
 {Array.from({ length: 12 }, (_, index) => (
 <option key={index + 1} value={index + 1}>
 {new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
 new Date(2026, index, 1)
 )}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor="filterTahunRiwayat"
 className="mb-2 block text-xs font-bold text-slate-500"
 >
 Tahun
 </label>

 <select
 id="filterTahunRiwayat"
 name="filterTahunRiwayat"
 value={filterTahun}
 onChange={(event) => setFilterTahun(event.target.value)}
 className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
 >
 <option value="">Semua Tahun</option>
 {tahunTersedia.map((tahun) => (
 <option key={tahun} value={tahun}>
 {tahun}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:p-6">
 <div>
 <div className="text-xl font-black text-slate-900">
 Daftar Riwayat
 </div>

 <div className="mt-1 text-sm font-semibold text-slate-500">
 Total tampil: {daftarDeklarasiTersaring.length} data
 </div>
 </div>

 {pesanError && (
 <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
 {pesanError}
 </div>
 )}

 <div className="mt-5 space-y-4">
 {daftarDeklarasiTersaring.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/60 px-4 py-6 text-center text-sm font-semibold text-slate-500">
 Riwayat deklarasi belum tersedia.
 </div>
 ) : (
 daftarDeklarasiTersaring.map((deklarasi) => (
 <div
 key={deklarasi.id}
 className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
 >
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="min-w-0">
 <div className="truncate text-lg font-black text-slate-900">
 {deklarasi.kode_deklarasi}
 </div>

 <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
 <span>
 {formatJenisDeklarasi(deklarasi.jenis_deklarasi)}
 </span>
 <span>•</span>
 <span>{formatTanggal(deklarasi.tanggal_kegiatan)}</span>
 <span>•</span>
 <span>{deklarasi.lokasi}</span>
 </div>

 <div className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
 {deklarasi.keterangan}
 </div>
 </div>

 <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">
 <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900">
 {formatRupiah(deklarasi.total_nominal)}
 </div>

 <div
 className={`rounded-2xl px-4 py-3 text-sm font-black ${warnaStatus(
 deklarasi.status
 )}`}
 >
 {deklarasi.status}
 </div>

 <button
 type="button"
 onClick={() =>
 router.push(
 `/hc/deklarasi/detail/${deklarasi.id}`
 )
 }
 className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
 >
 Detail
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </section>
 </main>
 );
}

export default function HalamanRiwayatDeklarasi() {
 return (
 <Suspense
 fallback={
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-2xl border border-red-100 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-lg">
 Memuat riwayat deklarasi...
 </div>
 </main>
 }
 >
 <KontenRiwayatDeklarasi />
 </Suspense>
 );
}

/* <--- end ---> */