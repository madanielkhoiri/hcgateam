"use client";

import {
 ArrowRight,
 CheckCircle2,
 ClipboardList,
 FileText,
 Pencil,
 RefreshCw,
 Save,
 Search,
 ShieldCheck,
 TriangleAlert,
 Trash2,
 X,
 XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

/* <--- halaman admin/FA untuk melihat deklarasi karyawan dan koreksi nota real time ---> */

type DataPenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 email: string;
 nomor_telepon: string;
 role: "SUPER_ADMIN" | "ADMIN" | "FA" | "HC" | "KARYAWAN";
 kode_tiket?: string;
};

type StatusDeklarasi =
 | "SEMUA"
 | "DRAFT"
 | "DIAJUKAN"
 | "DIVERIFIKASI"
 | "MENUNGGU_FA"
 | "DISETUJUI"
 | "DITOLAK";

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
 status: Exclude<StatusDeklarasi, "SEMUA">;
 dibuat_pada: string;
 diperbarui_pada: string;
};

type DataRingkasanAdmin = {
 total_deklarasi: number;
 total_draft: number;
 total_diajukan: number;
 total_diverifikasi: number;
 total_disetujui: number;
 total_ditolak: number;
 total_penggunaan: number;
 daftar_deklarasi: DataDeklarasi[];
};

function HalamanAdminDeklarasiKonten() {
 const router = useRouter();
 const searchParams = useSearchParams();

 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const statusUrl = String(searchParams.get("status") || "SEMUA").toUpperCase();

 const statusAwal: StatusDeklarasi = [
 "SEMUA",
 "DRAFT",
 "DIAJUKAN",
 "DIVERIFIKASI",
 "MENUNGGU_FA",
 "DISETUJUI",
 "DITOLAK",
 ].includes(statusUrl)
 ? (statusUrl as StatusDeklarasi)
 : "SEMUA";

 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);
 const [ringkasan, setRingkasan] = useState<DataRingkasanAdmin | null>(null);
 const [statusFilter, setStatusFilter] = useState<StatusDeklarasi>(statusAwal);
 const [kataKunci, setKataKunci] = useState("");
 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [sedangRefresh, setSedangRefresh] = useState(false);
 const [pesanError, setPesanError] = useState("");
 const [pesanSukses, setPesanSukses] = useState("");
 const [deklarasiDiedit, setDeklarasiDiedit] = useState<DataDeklarasi | null>(null);
 const [formEdit, setFormEdit] = useState({ tanggal_kegiatan: "", lokasi: "", keterangan: "" });
 const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
 const [sedangMenghapus, setSedangMenghapus] = useState<number | null>(null);
 const [terakhirUpdate, setTerakhirUpdate] = useState<Date | null>(null);
 const [filterBulan, setFilterBulan] = useState("");
 const [filterTahun, setFilterTahun] = useState("");

 const apakahAdmin = (role: string) => {
 return (
 role === "SUPER_ADMIN" ||
 role === "ADMIN" ||
 role === "FA" ||
 role === "HC"
 );
 };

 const ambilHeaderAuth = () => {
 if (typeof window === "undefined") return {};

 const token =
 (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token")) ||
 localStorage.getItem("token") ||
 localStorage.getItem("access_token") ||
 "";

 if (!token) return {};

 return {
 Authorization: `Bearer ${token}`,
 };
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

 if (Number.isNaN(hasil.getTime())) return "-";

 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 }).format(hasil);
 };

 const formatJam = (tanggal: string | null | undefined) => {
 if (!tanggal) return "-";

 const hasil = new Date(tanggal);

 if (Number.isNaN(hasil.getTime())) return "-";

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

 const warnaStatus = (status: StatusDeklarasi) => {
 if (status === "DRAFT") return "border-slate-100 bg-slate-50 text-slate-700";
 if (status === "DIAJUKAN") return "border-amber-100 bg-amber-50 text-amber-700";
 if (status === "DIVERIFIKASI") return "border-blue-100 bg-blue-50 text-blue-700";
 if (status === "DISETUJUI") return "border-emerald-100 bg-emerald-50 text-emerald-700";
 if (status === "DITOLAK") return "border-red-100 bg-red-50 text-red-700";
 return "border-slate-100 bg-slate-50 text-slate-700";
 };

 const iconStatus = (status: StatusDeklarasi) => {
 if (status === "DIAJUKAN") return <TriangleAlert className="h-4 w-4" />;
 if (status === "DIVERIFIKASI") return <ShieldCheck className="h-4 w-4" />;
 if (status === "DISETUJUI") return <CheckCircle2 className="h-4 w-4" />;
 if (status === "DITOLAK") return <XCircle className="h-4 w-4" />;
 return <ClipboardList className="h-4 w-4" />;
 };

 const hitungStatus = (status: StatusDeklarasi) => {
 const daftar = ringkasan?.daftar_deklarasi || [];

 if (status === "SEMUA") return daftar.length;

 return daftar.filter((deklarasi) => deklarasi.status === status).length;
 };

 const ambilData = async (silent = false) => {
 if (!silent) {
 setPesanError("");
 setSedangRefresh(true);
 }

 try {
 const response = await fetch(`${apiUrl}/deklarasi/admin/ringkasan`, {
 headers: ambilHeaderAuth() as HeadersInit,
 });

 if (!response.ok) {
 throw new Error("Gagal mengambil data deklarasi admin.");
 }

 const data: DataRingkasanAdmin = await response.json();

 setRingkasan(data);
 setTerakhirUpdate(new Date());
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengambil deklarasi."
 );
 } finally {
 setSedangMemuat(false);
 setSedangRefresh(false);
 }
 };

 const bukaEdit = (deklarasi: DataDeklarasi) => {
  setDeklarasiDiedit(deklarasi);
  setFormEdit({
   tanggal_kegiatan: deklarasi.tanggal_kegiatan.slice(0, 10),
   lokasi: deklarasi.lokasi || "",
   keterangan: deklarasi.keterangan || "",
  });
  setPesanError("");
 };

 const simpanEdit = async () => {
  if (!deklarasiDiedit) return;
  setSedangMenyimpan(true);
  setPesanError("");
  setPesanSukses("");
  try {
   const response = await fetch(`${apiUrl}/deklarasi/${deklarasiDiedit.id}/edit`, {
    method: "PATCH",
    headers: { ...ambilHeaderAuth(), "Content-Type": "application/json" } as HeadersInit,
    body: JSON.stringify(formEdit),
   });
   const hasil = await response.json().catch(() => null);
   if (!response.ok) throw new Error(hasil?.message || "Deklarasi gagal diperbarui.");
   setDeklarasiDiedit(null);
   setPesanSukses("Deklarasi berhasil diperbarui.");
   await ambilData(true);
  } catch (error) {
   setPesanError(error instanceof Error ? error.message : "Deklarasi gagal diperbarui.");
  } finally {
   setSedangMenyimpan(false);
  }
 };

 const hapusDeklarasi = async (deklarasi: DataDeklarasi) => {
  const yakin = window.confirm(
   `Hapus deklarasi ${deklarasi.kode_deklarasi}? Semua nota ikut dihapus dan saldo karyawan akan direset.`,
  );
  if (!yakin) return;
  setSedangMenghapus(deklarasi.id);
  setPesanError("");
  setPesanSukses("");
  try {
   const response = await fetch(`${apiUrl}/deklarasi/${deklarasi.id}`, {
    method: "DELETE",
    headers: ambilHeaderAuth() as HeadersInit,
   });
   const hasil = await response.json().catch(() => null);
   if (!response.ok) throw new Error(hasil?.message || "Deklarasi gagal dihapus.");
   setPesanSukses("Deklarasi berhasil dihapus. Saldo penggunaan karyawan telah menjadi 0.");
   await ambilData(true);
  } catch (error) {
   setPesanError(error instanceof Error ? error.message : "Deklarasi gagal dihapus.");
  } finally {
   setSedangMenghapus(null);
  }
 };

 useEffect(() => {
 const token =
 (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token")) ||
 localStorage.getItem("token") ||
 localStorage.getItem("access_token");

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

 if (!apakahAdmin(penggunaTersimpan.role)) {
 router.replace("/hc/deklarasi-dinas");
 return;
 }

 setPengguna(penggunaTersimpan);
 ambilData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [apiUrl, router]);

 useEffect(() => {
 setStatusFilter(statusAwal);
 }, [statusAwal]);

 useEffect(() => {
 const interval = window.setInterval(() => {
 ambilData(true);
 }, 10000);

 return () => window.clearInterval(interval);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [apiUrl]);

 const tahunTersedia = useMemo(() => {
 const tahunSekarang = new Date().getFullYear();
 return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
 }, []);

 const daftarDeklarasiTampil = useMemo(() => {
 const daftar = ringkasan?.daftar_deklarasi || [];
 const kunci = kataKunci.trim().toLowerCase();

 return daftar
 .filter((deklarasi) => {
 if (statusFilter !== "SEMUA" && deklarasi.status !== statusFilter) {
 return false;
 }

 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
 return false;
 }

 if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
 return false;
 }

 if (!kunci) return true;

 const gabungan = [
 deklarasi.kode_deklarasi,
 deklarasi.nama_pengguna,
 deklarasi.nrp,
 deklarasi.lokasi,
 deklarasi.keterangan,
 deklarasi.status,
 deklarasi.jenis_deklarasi,
 ]
 .join(" ")
 .toLowerCase();

 return gabungan.includes(kunci);
 })
 .sort((a, b) => {
 return (
 new Date(b.diperbarui_pada).getTime() -
 new Date(a.diperbarui_pada).getTime()
 );
 });
 }, [kataKunci, ringkasan, statusFilter, filterBulan, filterTahun]);

 const daftarFilter: {
 value: StatusDeklarasi;
 label: string;
 }[] = [
 { value: "SEMUA", label: "Semua" },
 { value: "DIAJUKAN", label: "Diajukan" },
 { value: "DRAFT", label: "Draft" },
 { value: "DIVERIFIKASI", label: "Diverifikasi" },
 { value: "MENUNGGU_FA", label: "Menunggu FA" },
 { value: "DISETUJUI", label: "Disetujui" },
 { value: "DITOLAK", label: "Ditolak" },
 ];

 if (sedangMemuat) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-[28px] border border-[#d8e4f2] bg-white p-6 text-center shadow-sm">
 <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0868f6]" />
 <p className="text-sm font-black text-slate-700">
 Memuat deklarasi admin...
 </p>
 </div>
 </main>
 );
 }

 return (
 <main className="min-h-screen bg-[#f8fafc] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
 <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
 <section className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#0757d1] via-[#0868f6] to-[#4f9cf9] p-5 text-white shadow-xl shadow-[#cfe0fb] sm:p-7">
 <div className="relative">
 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
 <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />

 <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
 <FileText className="h-3.5 w-3.5" />
 Deklarasi Karyawan
 </div>

 <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
 Koreksi Nota Karyawan
 </h1>

 <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
 Admin dan Admin FA dapat melihat deklarasi yang diajukan
 karyawan secara realtime, lalu koreksi Nota 1, Nota 2, Nota 3
 di halaman detail.
 </p>

 <p className="mt-2 text-xs font-bold text-white/70">
 Login: {pengguna?.nama || "-"} • Auto refresh 10 detik
 {terakhirUpdate
 ? ` • Update ${formatJam(terakhirUpdate.toISOString())}`
 : ""}
 </p>
 </div>

 <button
 type="button"
 onClick={() => ambilData()}
 disabled={sedangRefresh}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 px-4 py-3 text-sm font-black !text-white shadow-lg transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <RefreshCw
 className={`h-4 w-4 ${sedangRefresh ? "animate-spin" : ""}`}
 />
 Refresh
 </button>
 </div>
 </div>
 </section>

 {pesanError && (
 <div className="rounded-3xl border border-[#f3c2c2] bg-[#fff0f0] px-5 py-4 text-sm font-bold text-[#b02031]">
 {pesanError}
 </div>
 )}
 {pesanSukses && (
 <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
 {pesanSukses}
 </div>
 )}

 <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
 {daftarFilter.map((item) => (
 <button
 key={item.value}
 type="button"
 onClick={() => {
 setStatusFilter(item.value);

 if (item.value === "SEMUA") {
 router.push("/hc/admin/deklarasi");
 } else {
 router.push(`/hc/admin/deklarasi?status=${item.value}`);
 }
 }}
 className={`rounded-[26px] border p-4 text-left transition ${
 statusFilter === item.value
 ? "border-[#a9c6ee] bg-[#eaf2ff] shadow-sm"
 : "border-[#d8e4f2] bg-white hover:bg-[#eaf2ff]"
 }`}
 >
 <div className="flex items-center justify-between gap-2">
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${warnaStatus(
 item.value
 )}`}
 >
 {iconStatus(item.value)}
 </div>

 <span className="text-2xl font-black text-slate-950">
 {hitungStatus(item.value)}
 </span>
 </div>

 <p className="mt-3 text-sm font-black text-slate-950">
 {item.label}
 </p>
 </button>
 ))}
 </section>

 <section className="rounded-[32px] border border-[#d8e4f2] bg-white p-5 shadow-sm sm:p-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 className="text-xl font-black text-slate-950">
 Daftar Deklarasi
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Menampilkan {daftarDeklarasiTampil.length} data. Klik detail
 untuk koreksi nota per gambar.
 </p>
 </div>

 <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
 <div className="relative w-full lg:w-[280px]">
 <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
 <input
 value={kataKunci}
 onChange={(event) => setKataKunci(event.target.value)}
 placeholder="Cari kode / nama / NRP / lokasi"
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-[#0868f6] focus:bg-white focus:ring-4 focus:ring-[#eaf2ff]"
 />
 </div>

 <select
 value={filterBulan}
 onChange={(event) => setFilterBulan(event.target.value)}
 className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0868f6] focus:bg-white focus:ring-4 focus:ring-[#eaf2ff]"
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

 <select
 value={filterTahun}
 onChange={(event) => setFilterTahun(event.target.value)}
 className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#0868f6] focus:bg-white focus:ring-4 focus:ring-[#eaf2ff]"
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

 <div className="mt-5 grid gap-3">
 {daftarDeklarasiTampil.length > 0 ? (
 daftarDeklarasiTampil.map((deklarasi) => (
 <div
 key={deklarasi.id}
 onClick={() =>
 router.push(`/hc/deklarasi/detail/${deklarasi.id}`)
 }
 role="button"
 tabIndex={0}
 className="cursor-pointer rounded-[28px] border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-[#a9c6ee] hover:bg-white hover:shadow-sm"
 >
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="mb-2 flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
 #{deklarasi.id}
 </span>

 <span
 className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${warnaStatus(
 deklarasi.status
 )}`}
 >
 {iconStatus(deklarasi.status)}
 {deklarasi.status}
 </span>
 </div>

 <p className="truncate text-base font-black text-slate-950">
 {deklarasi.kode_deklarasi}
 </p>

 <p className="mt-1 text-sm font-bold text-slate-600">
 {deklarasi.nama_pengguna} • NRP{" "}
 {deklarasi.nrp || "-"}
 </p>

 <p className="mt-1 text-xs font-bold text-slate-500">
 {formatJenis(deklarasi.jenis_deklarasi)} •{" "}
 {deklarasi.lokasi || "-"} •{" "}
 {formatTanggal(deklarasi.tanggal_kegiatan)} • Update{" "}
 {formatJam(deklarasi.diperbarui_pada)}
 </p>

 <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">
 {deklarasi.keterangan || "-"}
 </p>
 </div>

 <div className="flex shrink-0 flex-col gap-2 lg:items-end">
 <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
 {formatRupiah(deklarasi.total_nominal)}
 </div>

 <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0868f6] px-4 py-3 text-sm font-black text-white">
 Koreksi Nota
 <ArrowRight className="h-4 w-4" />
 </div>
 <div className="flex gap-2">
  <button
   type="button"
   onClick={(event) => { event.stopPropagation(); bukaEdit(deklarasi); }}
   className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50"
  >
   <Pencil className="h-4 w-4" /> Edit
  </button>
  <button
   type="button"
   disabled={sedangMenghapus === deklarasi.id}
   onClick={(event) => { event.stopPropagation(); void hapusDeklarasi(deklarasi); }}
   className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700 hover:bg-red-50 disabled:opacity-50"
  >
   {sedangMenghapus === deklarasi.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus
  </button>
 </div>
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="rounded-[28px] bg-slate-50 p-8 text-center">
 <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
 <p className="text-sm font-black text-slate-700">
 Tidak ada deklarasi pada filter ini.
 </p>
 </div>
 )}
 </div>
 </section>
 </div>
 {deklarasiDiedit && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
   <div className="w-full max-w-xl rounded-[30px] bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-4">
     <div>
      <h2 className="text-xl font-black text-slate-950">Edit Deklarasi</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">{deklarasiDiedit.kode_deklarasi} • {deklarasiDiedit.nama_pengguna}</p>
     </div>
     <button type="button" onClick={() => setDeklarasiDiedit(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500"><X className="h-5 w-5" /></button>
    </div>
    <div className="mt-5 grid gap-4">
     <label className="grid gap-2 text-sm font-black text-slate-700">Tanggal kegiatan
      <input type="date" value={formEdit.tanggal_kegiatan} onChange={(event) => setFormEdit((lama) => ({ ...lama, tanggal_kegiatan: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" />
     </label>
     <label className="grid gap-2 text-sm font-black text-slate-700">Lokasi
      <input value={formEdit.lokasi} onChange={(event) => setFormEdit((lama) => ({ ...lama, lokasi: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" />
     </label>
     <label className="grid gap-2 text-sm font-black text-slate-700">Keterangan
      <textarea rows={4} value={formEdit.keterangan} onChange={(event) => setFormEdit((lama) => ({ ...lama, keterangan: event.target.value }))} className="resize-none rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500" />
     </label>
    </div>
    <div className="mt-6 flex justify-end gap-3">
     <button type="button" onClick={() => setDeklarasiDiedit(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600">Batal</button>
     <button type="button" disabled={sedangMenyimpan} onClick={() => void simpanEdit()} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
      {sedangMenyimpan ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
     </button>
    </div>
   </div>
  </div>
 )}
 </main>
 );
}

export default function HalamanAdminDeklarasi() {
 return (
 <Suspense
 fallback={
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-[28px] border border-[#d8e4f2] bg-white p-6 text-center shadow-sm">
 <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0868f6]" />
 <p className="text-sm font-black text-slate-700">
 Memuat deklarasi...
 </p>
 </div>
 </main>
 }
 >
 <HalamanAdminDeklarasiKonten />
 </Suspense>
 );
}

/* <--- end ---> */
