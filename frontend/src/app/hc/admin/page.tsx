"use client";

import {
 ArrowRight,
 BarChart3,
 Database,
 CalendarDays,
 FileText,
 RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

/* <--- dashboard admin + akses koreksi deklarasi karyawan ---> */

type DataPenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 email: string;
 nomor_telepon: string;
 role: "SUPER_ADMIN" | "ADMIN" | "SECTION_HEAD" | "FA" | "KARYAWAN";
 kode_tiket?: string;
};

type StatusDeklarasi =
 | "DRAFT"
 | "DIAJUKAN"
 | "DIVERIFIKASI"
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
 status: StatusDeklarasi;
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

type StatusPengajuan =
 | "DIAJUKAN"
 | "DISETUJUI"
 | "DITOLAK"
 | "MENUNGGU_TRANSFER"
 | "SELESAI";

type DataPengajuan = {
 id: number;
 id_pengguna: number;
 nrp: string;
 nama_pengguna: string;
 jenis_pengajuan: "PERJALANAN_DINAS" | "UANG_OPERASIONAL";
 lokasi: string | null;
 keterangan: string | null;
 nama_file_std: string;
 path_file_std: string;
 nama_file_rab: string;
 path_file_rab: string;
 nominal_transfer: string | number;
 nama_file_bukti_transfer: string | null;
 path_file_bukti_transfer: string | null;
 tanggal_transfer: string | null;
 id_saldo: number | null;
 status_pengajuan: StatusPengajuan;
 catatan_admin: string | null;
 tanggal_pengajuan: string;
 dibuat_pada: string;
 diperbarui_pada: string;
};

type MenuAdmin = {
 judul: string;
 deskripsi: string;
 icon: ReactNode;
 warna: string;
 aksi: () => void;
};

const daftarBulan = [
 { value: "SEMUA", label: "Semua Bulan" },
 { value: "0", label: "Januari" },
 { value: "1", label: "Februari" },
 { value: "2", label: "Maret" },
 { value: "3", label: "April" },
 { value: "4", label: "Mei" },
 { value: "5", label: "Juni" },
 { value: "6", label: "Juli" },
 { value: "7", label: "Agustus" },
 { value: "8", label: "September" },
 { value: "9", label: "Oktober" },
 { value: "10", label: "November" },
 { value: "11", label: "Desember" },
];

export default function HalamanAdmin() {
 const router = useRouter();
 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const tanggalSekarang = new Date();

 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);
 const [ringkasan, setRingkasan] = useState<DataRingkasanAdmin | null>(null);
 const [daftarPengajuan, setDaftarPengajuan] = useState<DataPengajuan[]>([]);
 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [pesanError, setPesanError] = useState("");

 const [filterBulanSaldo, setFilterBulanSaldo] = useState("SEMUA");
 const [filterTahunSaldo, setFilterTahunSaldo] = useState(
 String(tanggalSekarang.getFullYear())
 );

 const apakahAdmin = (role: string) => {
 return (
 role === "SUPER_ADMIN" ||
 role === "ADMIN" ||
 role === "SECTION_HEAD" ||
 role === "FA"
 );
 };

 const formatRole = (role: string | undefined) => {
 if (role === "SUPER_ADMIN") return "Admin HC";
 if (role === "ADMIN") return "Admin";
 if (role === "SECTION_HEAD") return "Section Head";
 if (role === "FA") return "Admin FA";
 if (role === "KARYAWAN") return "Karyawan";
 return role || "-";
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

 const tanpaSimbol = teks.replace(/[^0-9.,-]/g, "");

 if (tanpaSimbol.includes(".") && tanpaSimbol.includes(",")) {
 const angkaIndonesia = Number(
 tanpaSimbol.replace(/\./g, "").replace(",", ".")
 );

 return Number.isFinite(angkaIndonesia) ? angkaIndonesia : 0;
 }

 if (tanpaSimbol.includes(".") && !tanpaSimbol.includes(",")) {
 const bagian = tanpaSimbol.split(".");
 const bagianTerakhir = bagian[bagian.length - 1];

 if (bagianTerakhir.length === 2) {
 const angkaDecimalDatabase = Number(tanpaSimbol);

 return Number.isFinite(angkaDecimalDatabase)
 ? angkaDecimalDatabase
 : 0;
 }

 const angkaRibuan = Number(tanpaSimbol.replace(/\./g, ""));
 return Number.isFinite(angkaRibuan) ? angkaRibuan : 0;
 }

 if (tanpaSimbol.includes(",") && !tanpaSimbol.includes(".")) {
 const angkaKoma = Number(tanpaSimbol.replace(",", "."));
 return Number.isFinite(angkaKoma) ? angkaKoma : 0;
 }

 const angkaBiasa = Number(tanpaSimbol);
 return Number.isFinite(angkaBiasa) ? angkaBiasa : 0;
 }

 return 0;
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

 const formatRupiah = (nilai: string | number | unknown) => {
 const angka = normalisasiAngka(nilai);

 return new Intl.NumberFormat("id-ID", {
 style: "currency",
 currency: "IDR",
 minimumFractionDigits: 0,
 }).format(angka);
 };

 const formatRupiahSingkat = (nilai: number) => {
 const hasil = new Intl.NumberFormat("id-ID", {
 notation: "compact",
 maximumFractionDigits: 1,
 }).format(nilai);

 return `Rp ${hasil}`;
 };

 const formatBulanPendek = (bulan: number) => {
 const tanggal = new Date(new Date().getFullYear(), bulan, 1);

 return new Intl.DateTimeFormat("id-ID", {
 month: "short",
 }).format(tanggal);
 };

 const formatJenisDeklarasi = (jenis: string) => {
 if (jenis === "PERJALANAN_DINAS") return "Perjalanan Dinas";
 if (jenis === "UANG_OPERASIONAL") return "Uang Operasional";
 return jenis;
 };

 const formatStatusPengajuan = (status: StatusPengajuan) => {
 if (status === "DIAJUKAN") return "Diajukan";
 if (status === "DISETUJUI") return "Disetujui";
 if (status === "DITOLAK") return "Ditolak";
 if (status === "MENUNGGU_TRANSFER") return "Menunggu Transfer";
 if (status === "SELESAI") return "Selesai";
 return status;
 };

 const warnaStatusPengajuan = (status: StatusPengajuan) => {
 if (status === "DIAJUKAN") {
 return "bg-amber-50 text-amber-700 border-amber-100";
 }

 if (status === "MENUNGGU_TRANSFER") {
 return "bg-purple-50 text-purple-700 border-purple-100";
 }

 if (status === "SELESAI") {
 return "bg-emerald-50 text-emerald-700 border-emerald-100";
 }

 if (status === "DITOLAK") {
 return "bg-red-50 text-red-700 border-red-100";
 }

 return "bg-blue-50 text-blue-700 border-blue-100";
 };

 const warnaStatusDeklarasi = (status: StatusDeklarasi) => {
 if (status === "DRAFT") return "bg-slate-50 text-slate-700 border-slate-100";
 if (status === "DIAJUKAN") return "bg-amber-50 text-amber-700 border-amber-100";
 if (status === "DIVERIFIKASI") return "bg-blue-50 text-blue-700 border-blue-100";
 if (status === "DISETUJUI") return "bg-emerald-50 text-emerald-700 border-emerald-100";
 if (status === "DITOLAK") return "bg-red-50 text-red-700 border-red-100";
 return "bg-slate-50 text-slate-700 border-slate-100";
 };

 const ambilRingkasanAdmin = async () => {
 setPesanError("");

 try {
 const [responseRingkasan, responsePengajuan] = await Promise.all([
 fetch(`${apiUrl}/deklarasi/admin/ringkasan`, {
 headers: ambilHeaderAuth() as HeadersInit,
 }),
 fetch(`${apiUrl}/pengajuan`, {
 headers: ambilHeaderAuth() as HeadersInit,
 }),
 ]);

 if (!responseRingkasan.ok) {
 throw new Error("Gagal mengambil ringkasan admin.");
 }

 const dataRingkasan: DataRingkasanAdmin = await responseRingkasan.json();
 setRingkasan(dataRingkasan);

 if (responsePengajuan.ok) {
 const dataPengajuan = await responsePengajuan.json();
 setDaftarPengajuan(Array.isArray(dataPengajuan) ? dataPengajuan : []);
 } else {
 setDaftarPengajuan([]);
 }
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengambil data admin."
 );
 } finally {
 setSedangMemuat(false);
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
 ambilRingkasanAdmin();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [apiUrl, router]);

 const daftarDeklarasi = ringkasan?.daftar_deklarasi || [];

 const daftarTahunSaldo = useMemo(() => {
 const daftarTahun = new Set<number>();

 daftarDeklarasi.forEach((deklarasi) => {
 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (!Number.isNaN(tanggal.getTime())) {
 daftarTahun.add(tanggal.getFullYear());
 }
 });

 daftarTahun.add(new Date().getFullYear());

 return Array.from(daftarTahun).sort((a, b) => b - a);
 }, [daftarDeklarasi]);

 const totalPenggunaanFilterSaldo = useMemo(() => {
 const tahunDipilih = Number(filterTahunSaldo);

 return daftarDeklarasi.reduce((total, deklarasi) => {
 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (Number.isNaN(tanggal.getTime())) {
 return total;
 }

 const cocokTahun = tanggal.getFullYear() === tahunDipilih;

 const cocokBulan =
 filterBulanSaldo === "SEMUA" ||
 tanggal.getMonth() === Number(filterBulanSaldo);

 if (!cocokTahun || !cocokBulan) {
 return total;
 }

 return total + normalisasiAngka(deklarasi.total_nominal);
 }, 0);
 }, [daftarDeklarasi, filterBulanSaldo, filterTahunSaldo]);

 const totalDataFilterSaldo = useMemo(() => {
 const tahunDipilih = Number(filterTahunSaldo);

 return daftarDeklarasi.filter((deklarasi) => {
 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (Number.isNaN(tanggal.getTime())) {
 return false;
 }

 const cocokTahun = tanggal.getFullYear() === tahunDipilih;

 const cocokBulan =
 filterBulanSaldo === "SEMUA" ||
 tanggal.getMonth() === Number(filterBulanSaldo);

 return cocokTahun && cocokBulan;
 }).length;
 }, [daftarDeklarasi, filterBulanSaldo, filterTahunSaldo]);

 const teksPeriodeSaldo =
 filterBulanSaldo === "SEMUA"
 ? `Tahun ${filterTahunSaldo}`
 : `${
 daftarBulan.find((bulan) => bulan.value === filterBulanSaldo)
 ?.label || "-"
 } ${filterTahunSaldo}`;

 const deklarasiTerbaru = useMemo(() => {
 return [...daftarDeklarasi]
 .sort((a, b) => {
 return (
 new Date(b.diperbarui_pada).getTime() -
 new Date(a.diperbarui_pada).getTime()
 );
 })
 .slice(0, 5);
 }, [daftarDeklarasi]);

 const topKaryawanBulanIni = useMemo(() => {
 const sekarang = new Date();
 const tahunSekarang = sekarang.getFullYear();
 const bulanSekarang = sekarang.getMonth();

 const mapTopKaryawanBulanIni = new Map<
 string,
 { nama: string; nrp: string; nominal: number }
 >();

 daftarDeklarasi.forEach((deklarasi) => {
 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (Number.isNaN(tanggal.getTime())) return;

 if (tanggal.getFullYear() === tahunSekarang && tanggal.getMonth() === bulanSekarang) {
 const nominal = normalisasiAngka(deklarasi.total_nominal);
 const kunci = `${deklarasi.nrp}-${deklarasi.nama_pengguna}`;
 const dataSebelumnya = mapTopKaryawanBulanIni.get(kunci);

 if (dataSebelumnya) {
 dataSebelumnya.nominal += nominal;
 } else {
 mapTopKaryawanBulanIni.set(kunci, {
 nama: deklarasi.nama_pengguna,
 nrp: deklarasi.nrp,
 nominal,
 });
 }
 }
 });

 return Array.from(mapTopKaryawanBulanIni.values())
 .sort((a, b) => b.nominal - a.nominal)
 .slice(0, 5);
 }, [daftarDeklarasi]);

 const menuAdmin: MenuAdmin[] = [
 {
 judul: "Database Settlement",
 deskripsi: "Uang operasional",
 icon: <Database className="h-6 w-6" />,
 warna: "bg-cyan-50 text-cyan-700",
 aksi: () => router.push("/hc/admin/database-settlement"),
 },
 {
 judul: pengguna?.role === "FA" ? "Transfer" : "Pengajuan",
 deskripsi: pengguna?.role === "FA" ? "Bukti Transfer" : "STD dan RAB",
 icon: <FileText className="h-6 w-6" />,
 warna: "bg-emerald-50 text-emerald-600",
 aksi: () => router.push("/hc/admin/pengajuan"),
 },
 {
 judul: "Laporan",
 deskripsi: "Rekap data",
 icon: <BarChart3 className="h-6 w-6" />,
 warna: "bg-purple-50 text-purple-600",
 aksi: () => router.push("/hc/admin/laporan"),
 },
 ];

 if (sedangMemuat) {
 return (
 <main className="flex min-h-[60vh] items-center justify-center px-4">
 <div className="rounded-2xl border border-[#d8e4f2] bg-white p-6 text-center shadow-sm">
 <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0868f6]" />
 <p className="text-sm font-black text-slate-700">
 Memuat dashboard admin...
 </p>
 </div>
 </main>
 );
 }

 return (
 <main style={{ padding: "22px 24px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
 <div>
 <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#10244a" }}>
 Beranda Admin
 </h1>
 <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "#6f819d" }}>
 Halo, {pengguna?.nama || "Admin"} • {formatRole(pengguna?.role)}
 </p>
 </div>

 {pesanError && (
 <div className="rounded-2xl border border-[#f3c2c2] bg-[#fff0f0] px-5 py-4 text-sm font-bold text-[#b02031]">
 {pesanError}
 </div>
 )}

 <section
 id="saldo-admin-card"
 className="rounded-2xl border border-[#d8e4f2] bg-white p-5 shadow-sm sm:p-6"
 >
 <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#0868f6]">
 <CalendarDays className="h-3.5 w-3.5" />
 Saldo / Penggunaan Dana
 </div>

 <h2 className="text-xl font-black text-[#0d315c] sm:text-2xl">
 Total Penggunaan {teksPeriodeSaldo}
 </h2>

 <p className="mt-1 text-sm font-semibold text-[#6f819d]">
 Dihitung dari {totalDataFilterSaldo} deklarasi pada periode
 terpilih.
 </p>
 </div>

 <div className="grid gap-2 sm:grid-cols-[170px_130px_auto]">
 <select
 value={filterBulanSaldo}
 onChange={(event) => setFilterBulanSaldo(event.target.value)}
 className="rounded-xl border border-[#d8e4f2] bg-[#f7faff] px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-[#0868f6] focus:bg-white focus:ring-4 focus:ring-[#eaf2ff]"
 >
 {daftarBulan.map((bulan) => (
 <option key={bulan.value} value={bulan.value}>
 {bulan.label}
 </option>
 ))}
 </select>

 <select
 value={filterTahunSaldo}
 onChange={(event) => setFilterTahunSaldo(event.target.value)}
 className="rounded-xl border border-[#d8e4f2] bg-[#f7faff] px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-[#0868f6] focus:bg-white focus:ring-4 focus:ring-[#eaf2ff]"
 >
 {daftarTahunSaldo.map((tahun) => (
 <option key={tahun} value={tahun}>
 {tahun}
 </option>
 ))}
 </select>

 <button
 type="button"
 onClick={() => {
 setFilterBulanSaldo("SEMUA");
 setFilterTahunSaldo(String(new Date().getFullYear()));
 }}
 className="rounded-xl border border-[#d8e4f2] bg-[#eaf2ff] px-4 py-3 text-sm font-black text-[#0868f6] transition hover:bg-[#d9e9ff]"
 >
 Reset
 </button>
 </div>
 </div>

 <div className="mt-5 rounded-2xl bg-[#0d315c] p-5 text-white shadow-sm">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">
 Total Penggunaan Dana
 </p>

 <p className="mt-2 text-3xl font-black sm:text-4xl">
 {formatRupiah(totalPenggunaanFilterSaldo)}
 </p>

 <p className="mt-2 text-sm font-semibold text-white/60">
 Periode: {teksPeriodeSaldo}
 </p>
 </div>

 <div className="rounded-xl bg-white/10 px-4 py-3">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">
 Data
 </p>
 <p className="mt-1 text-2xl font-black text-white">
 {totalDataFilterSaldo}
 </p>
 </div>
 </div>
 </div>
 </section>

 <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {menuAdmin.map((menu) => (
 <button
 key={menu.judul}
 type="button"
 onClick={menu.aksi}
 className="group rounded-2xl border border-[#d8e4f2] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#a9c6ee] hover:shadow-md"
 >
 <div
 className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${menu.warna}`}
 >
 {menu.icon}
 </div>

 <div className="flex items-center justify-between gap-3">
 <div>
 <h2 className="text-base font-black text-[#0d315c]">
 {menu.judul}
 </h2>
 <p className="mt-1 text-xs font-bold text-[#6f819d]">
 {menu.deskripsi}
 </p>
 </div>

 <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0868f6]" />
 </div>
 </button>
 ))}
 </section>

 <section className="rounded-2xl border border-[#d8e4f2] bg-white p-5 shadow-sm sm:p-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 className="text-lg font-black text-[#0d315c]">
 Deklarasi Terbaru
 </h2>

 <p className="mt-1 text-sm font-semibold text-[#6f819d]">
 Data deklarasi karyawan. Klik untuk koreksi nota per gambar.
 </p>
 </div>

 <button
 type="button"
 onClick={() => router.push("/hc/admin/deklarasi")}
 className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0868f6] px-5 py-2.5 text-sm font-black !text-white shadow-sm transition hover:bg-[#0757d1]"
 >
 Kelola Deklarasi
 <ArrowRight className="h-4 w-4" />
 </button>
 </div>

 <div className="mt-5 grid gap-3">
 {deklarasiTerbaru.length > 0 ? (
 deklarasiTerbaru.map((deklarasi) => (
 <button
 key={deklarasi.id}
 type="button"
 onClick={() =>
 router.push(`/hc/deklarasi/detail/${deklarasi.id}`)
 }
 className="rounded-xl border border-[#e3ebf5] bg-[#f7faff] p-4 text-left transition hover:border-[#a9c6ee] hover:bg-white hover:shadow-sm"
 >
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div className="min-w-0">
 <div className="mb-2 flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6f819d]">
 #{deklarasi.id}
 </span>

 <span
 className={`rounded-full border px-3 py-1 text-xs font-black ${warnaStatusDeklarasi(
 deklarasi.status
 )}`}
 >
 {deklarasi.status}
 </span>
 </div>

 <p className="truncate text-sm font-black text-[#0d315c]">
 {deklarasi.kode_deklarasi}
 </p>

 <p className="mt-1 text-xs font-bold text-[#6f819d]">
 {deklarasi.nama_pengguna} • NRP{" "}
 {deklarasi.nrp || "-"} •{" "}
 {formatJenisDeklarasi(deklarasi.jenis_deklarasi)} •{" "}
 {formatTanggal(deklarasi.tanggal_kegiatan)}
 </p>
 </div>

 <div className="flex shrink-0 items-center gap-2 text-sm font-black text-[#0868f6]">
 Koreksi Nota
 <ArrowRight className="h-4 w-4" />
 </div>
 </div>
 </button>
 ))
 ) : (
 <div className="rounded-xl bg-[#f7faff] p-6 text-center">
 <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
 <p className="text-sm font-black text-slate-700">
 Belum ada deklarasi.
 </p>
 </div>
 )}
 </div>
 </section>

 <section className="rounded-2xl border border-[#d8e4f2] bg-white p-5 shadow-sm sm:p-6">
 <h2 className="text-lg font-black text-[#0d315c]">
 Top Karyawan Bulan Ini
 </h2>

 <p className="mt-1 text-sm font-semibold text-[#6f819d]">
 Berdasarkan total penggunaan nota bulan berjalan.
 </p>

 <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
 {topKaryawanBulanIni.length > 0 ? (
 topKaryawanBulanIni.map((item, index) => (
 <div
 key={`${item.nrp}-${item.nama}`}
 className="flex items-center gap-3 rounded-xl border border-[#e3ebf5] bg-[#f7faff] p-4"
 >
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ff] text-sm font-black text-[#0868f6]">
 {index + 1}
 </div>

 <div className="min-w-0">
 <p className="truncate text-sm font-black text-[#0d315c]">
 {item.nama}
 </p>
 <p className="text-xs font-semibold text-[#6f819d]">
 NRP {item.nrp || "-"}
 </p>
 <p className="text-xs font-black text-[#0d315c]">
 {formatRupiahSingkat(item.nominal)}
 </p>
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full rounded-xl bg-[#f7faff] p-5 text-center">
 <p className="text-sm font-bold text-[#6f819d]">
 Belum ada penggunaan bulan ini.
 </p>
 </div>
 )}
 </div>
 </section>
 </main>
 );
}

/* <--- end ---> */
