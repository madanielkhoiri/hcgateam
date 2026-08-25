"use client";
import Link from "next/link";

import {
 ArrowLeft,
 ArrowRight,
 BarChart3,
 Database,
 CalendarDays,
 CheckCircle2,
 ClipboardList,
 FileText,
 LogOut,
 RefreshCw,
 ShieldCheck,
 TrendingDown,
 TrendingUp,
 TriangleAlert,
 Users,
 XCircle,
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

type CardStatistik = {
 judul: string;
 nilai: string | number;
 deskripsi: string;
 icon: ReactNode;
 warnaIcon: string;
 warnaNilai?: string;
 aksi?: () => void;
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
 const [sedangRefresh, setSedangRefresh] = useState(false);
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

 const bukaDeklarasiDenganStatus = (status?: StatusDeklarasi | "SEMUA") => {
 if (!status || status === "SEMUA") {
 router.push("/hc/admin/deklarasi");
 return;
 }

 router.push(`/hc/admin/deklarasi?status=${status}`);
 };

 const bukaPengajuanDenganStatus = (status?: StatusPengajuan | "SEMUA") => {
 if (!status || status === "SEMUA") {
 router.push("/hc/admin/pengajuan");
 return;
 }

 router.push(`/hc/admin/pengajuan?status=${status}`);
 };

 const scrollKeSaldo = () => {
 const elemen = document.getElementById("saldo-admin-card");
 elemen?.scrollIntoView({
 behavior: "smooth",
 block: "start",
 });
 };

 const ambilRingkasanAdmin = async () => {
 setPesanError("");
 setSedangRefresh(true);

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
 setSedangRefresh(false);
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

 const totalPengajuan = daftarPengajuan.length;

 const totalPengajuanDiajukan = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "DIAJUKAN"
 ).length;

 const totalMenungguTransfer = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "MENUNGGU_TRANSFER"
 ).length;

 const totalPengajuanSelesai = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "SELESAI"
 ).length;

 const totalDeklarasiDraft = ringkasan?.total_draft || 0;
 const totalDeklarasiDiajukan = ringkasan?.total_diajukan || 0;
 const totalDeklarasiDiverifikasi = ringkasan?.total_diverifikasi || 0;
 const totalDeklarasiDisetujui = ringkasan?.total_disetujui || 0;
 const totalDeklarasiDitolak = ringkasan?.total_ditolak || 0;

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

 const analitik = useMemo(() => {
 const sekarang = new Date();
 const tahunSekarang = sekarang.getFullYear();
 const bulanSekarang = sekarang.getMonth();
 const bulanSebelumnya = bulanSekarang === 0 ? 11 : bulanSekarang - 1;
 const tahunBulanSebelumnya =
 bulanSekarang === 0 ? tahunSekarang - 1 : tahunSekarang;

 const perBulan = Array.from({ length: 12 }, (_, index) => ({
 bulan: index,
 label: formatBulanPendek(index),
 nominal: 0,
 }));

 const mapTopKaryawanBulanIni = new Map<
 string,
 { nama: string; nrp: string; nominal: number }
 >();

 let totalBulanIni = 0;
 let totalBulanLalu = 0;

 daftarDeklarasi.forEach((deklarasi) => {
 const nominal = normalisasiAngka(deklarasi.total_nominal);
 const tanggal = new Date(deklarasi.tanggal_kegiatan);

 if (Number.isNaN(tanggal.getTime())) return;

 const tahun = tanggal.getFullYear();
 const bulan = tanggal.getMonth();

 if (tahun === tahunSekarang) {
 perBulan[bulan].nominal += nominal;
 }

 if (tahun === tahunSekarang && bulan === bulanSekarang) {
 totalBulanIni += nominal;

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

 if (tahun === tahunBulanSebelumnya && bulan === bulanSebelumnya) {
 totalBulanLalu += nominal;
 }
 });

 const topKaryawanBulanIni = Array.from(mapTopKaryawanBulanIni.values())
 .sort((a, b) => b.nominal - a.nominal)
 .slice(0, 5);

 const selisihNominal = totalBulanIni - totalBulanLalu;
 const lebihBanyak = selisihNominal > 0;
 const lebihSedikit = selisihNominal < 0;

 const persenPerubahan =
 totalBulanLalu > 0
 ? (Math.abs(selisihNominal) / totalBulanLalu) * 100
 : totalBulanIni > 0
 ? 100
 : 0;

 const nilaiMaksBulanan = Math.max(
 ...perBulan.map((item) => item.nominal),
 1
 );

 return {
 totalBulanIni,
 totalBulanLalu,
 selisihNominal,
 lebihBanyak,
 lebihSedikit,
 persenPerubahan,
 perBulan,
 nilaiMaksBulanan,
 topKaryawanBulanIni,
 };
 }, [daftarDeklarasi]);

 const handleKeluar = () => {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");
 router.replace("/");
 };

 const menuAdmin: MenuAdmin[] = [
 {
 judul: "Database Settlement",
 deskripsi: "Uang operasional",
 icon: <Database className="h-6 w-6" />,
 warna: "bg-cyan-50 text-cyan-700",
 aksi: () => router.push("/hc/admin/database-settlement"),
 },
 {
 judul: "Kelola Akun",
 deskripsi: "Manajemen Akun (HC)",
 icon: <Users className="h-6 w-6" />,
 warna: "bg-blue-50 text-blue-600",
 aksi: () => router.push("/admin/manajemen-akun"),
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

 const daftarCardStatistik: CardStatistik[] = [
 {
 judul: "Deklarasi Diajukan",
 nilai: totalDeklarasiDiajukan,
 deskripsi: "Nota karyawan perlu koreksi",
 icon: <TriangleAlert className="h-6 w-6" />,
 warnaIcon: "bg-amber-50 text-amber-600",
 warnaNilai: "text-amber-700",
 aksi: () => bukaDeklarasiDenganStatus("DIAJUKAN"),
 },
 {
 judul: "Draft Deklarasi",
 nilai: totalDeklarasiDraft,
 deskripsi: "Belum diajukan karyawan",
 icon: <ClipboardList className="h-6 w-6" />,
 warnaIcon: "bg-slate-100 text-slate-600",
 aksi: () => bukaDeklarasiDenganStatus("DRAFT"),
 },
 {
 judul: "Diverifikasi",
 nilai: totalDeklarasiDiverifikasi,
 deskripsi: "Sudah dicek admin",
 icon: <ShieldCheck className="h-6 w-6" />,
 warnaIcon: "bg-blue-50 text-blue-600",
 warnaNilai: "text-blue-700",
 aksi: () => bukaDeklarasiDenganStatus("DIVERIFIKASI"),
 },
 {
 judul: "Disetujui",
 nilai: totalDeklarasiDisetujui,
 deskripsi: "Deklarasi final",
 icon: <CheckCircle2 className="h-6 w-6" />,
 warnaIcon: "bg-emerald-50 text-emerald-600",
 warnaNilai: "text-emerald-700",
 aksi: () => bukaDeklarasiDenganStatus("DISETUJUI"),
 },
 {
 judul: "Ditolak",
 nilai: totalDeklarasiDitolak,
 deskripsi: "Perlu revisi karyawan",
 icon: <XCircle className="h-6 w-6" />,
 warnaIcon: "bg-red-50 text-red-600",
 warnaNilai: "text-red-700",
 aksi: () => bukaDeklarasiDenganStatus("DITOLAK"),
 },
 {
 judul: "Pengajuan STD/RAB",
 nilai: totalPengajuan,
 deskripsi: `${totalPengajuanDiajukan} diajukan • ${totalMenungguTransfer} transfer`,
 icon: <FileText className="h-6 w-6" />,
 warnaIcon: "bg-purple-50 text-purple-600",
 aksi: () => bukaPengajuanDenganStatus("SEMUA"),
 },
 ];

 if (sedangMemuat) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-[28px] border border-red-100 bg-white p-6 text-center shadow-sm">
 <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-red-600" />
 <p className="text-sm font-black text-slate-700">
 Memuat dashboard admin...
 </p>
 </div>
 </main>
 );
 }

 return (
 <main className="min-h-screen bg-[#f8fafc] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
 <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
 <div className="mb-0">
    <Link href="/hc" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-red-600">
      <ArrowLeft size={18} />
      Kembali ke Menu HC
    </Link>
  </div>
 <section className="overflow-hidden rounded-[34px] bg-gradient-to-br from-red-700 via-red-600 to-rose-500 p-5 text-white shadow-xl shadow-red-100 sm:p-7">
 <div className="relative">
 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
 <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />

 <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
 <ShieldCheck className="h-3.5 w-3.5" />
 Dashboard {formatRole(pengguna?.role)}
 </div>

 <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
 Halo, {pengguna?.nama || "Admin"}
 </h1>

 <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
 Pantau pengajuan STD/RAB, deklarasi karyawan, koreksi nota,
 dan laporan penggunaan dana.
 </p>
 </div>

 <div className="relative flex flex-wrap gap-3 lg:justify-end">
 <button
 type="button"
 onClick={ambilRingkasanAdmin}
 disabled={sedangRefresh}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 px-4 py-3 text-sm font-black !text-white shadow-lg transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <RefreshCw
 className={`h-4 w-4 ${
 sedangRefresh ? "animate-spin" : ""
 }`}
 />
 Refresh
 </button>

 <button
 type="button"
 onClick={handleKeluar}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-900/10 transition hover:bg-slate-800"
 >
 <LogOut className="h-4 w-4" />
 Keluar
 </button>
 </div>
 </div>
 </div>
 </section>

 <section
 id="saldo-admin-card"
 className="rounded-[34px] border border-red-100 bg-white p-5 shadow-sm sm:p-6"
 >
 <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-600">
 <CalendarDays className="h-3.5 w-3.5" />
 Saldo / Penggunaan Dana
 </div>

 <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
 Total Penggunaan {teksPeriodeSaldo}
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Dihitung dari {totalDataFilterSaldo} deklarasi pada periode
 terpilih.
 </p>
 </div>

 <div className="grid gap-2 sm:grid-cols-[170px_130px_auto]">
 <select
 value={filterBulanSaldo}
 onChange={(event) => setFilterBulanSaldo(event.target.value)}
 className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
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
 className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
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
 className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"
 >
 Reset
 </button>
 </div>
 </div>

 <div className="mt-5 rounded-[30px] bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg shadow-slate-200">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
 Total Penggunaan Dana
 </p>

 <p className="mt-2 text-3xl font-black sm:text-4xl">
 {formatRupiah(totalPenggunaanFilterSaldo)}
 </p>

 <p className="mt-2 text-sm font-semibold text-slate-300">
 Periode: {teksPeriodeSaldo}
 </p>
 </div>

 <div className="rounded-2xl bg-white/10 px-4 py-3">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
 Data
 </p>
 <p className="mt-1 text-2xl font-black text-white">
 {totalDataFilterSaldo}
 </p>
 </div>
 </div>
 </div>
 </section>

 {pesanError && (
 <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
 {pesanError}
 </div>
 )}

 <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {menuAdmin.map((menu) => (
 <button
 key={menu.judul}
 type="button"
 onClick={menu.aksi}
 className="group rounded-[30px] border border-red-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg hover:shadow-red-100"
 >
 <div
 className={`mb-4 flex h-14 w-14 items-center justify-center rounded-3xl ${menu.warna}`}
 >
 {menu.icon}
 </div>

 <div className="flex items-center justify-between gap-3">
 <div>
 <h2 className="text-base font-black text-slate-950">
 {menu.judul}
 </h2>
 <p className="mt-1 text-xs font-bold text-slate-500">
 {menu.deskripsi}
 </p>
 </div>

 <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-red-600" />
 </div>
 </button>
 ))}
 </section>

 <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {daftarCardStatistik.map((card) => (
 <button
 key={card.judul}
 type="button"
 onClick={card.aksi}
 className="group rounded-[30px] border border-red-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg hover:shadow-red-100"
 >
 <div className="flex items-start justify-between gap-4">
 <div
 className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${card.warnaIcon}`}
 >
 {card.icon}
 </div>

 <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-red-600" />
 </div>

 <p className="mt-5 text-sm font-bold text-slate-500">
 {card.judul}
 </p>

 <p
 className={`mt-2 text-4xl font-black ${
 card.warnaNilai || "text-slate-950"
 }`}
 >
 {card.nilai}
 </p>

 <p className="mt-2 text-xs font-bold text-slate-500">
 {card.deskripsi}
 </p>
 </button>
 ))}
 </section>

 <section className="rounded-[32px] border border-red-100 bg-white p-5 shadow-sm sm:p-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 className="text-lg font-black text-slate-950">
 Deklarasi Terbaru
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Data deklarasi karyawan. Klik untuk koreksi nota per gambar.
 </p>
 </div>

 <button
 type="button"
 onClick={() => router.push("/hc/admin/deklarasi")}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black !text-white shadow-lg shadow-red-100 transition hover:bg-red-700"
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
 className="rounded-[26px] border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-red-100 hover:bg-white hover:shadow-sm"
 >
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div className="min-w-0">
 <div className="mb-2 flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
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

 <p className="truncate text-sm font-black text-slate-950">
 {deklarasi.kode_deklarasi}
 </p>

 <p className="mt-1 text-xs font-bold text-slate-500">
 {deklarasi.nama_pengguna} • NRP{" "}
 {deklarasi.nrp || "-"} •{" "}
 {formatJenisDeklarasi(deklarasi.jenis_deklarasi)} •{" "}
 {formatTanggal(deklarasi.tanggal_kegiatan)}
 </p>
 </div>

 <div className="flex shrink-0 items-center gap-2 text-sm font-black text-red-600">
 Koreksi Nota
 <ArrowRight className="h-4 w-4" />
 </div>
 </div>
 </button>
 ))
 ) : (
 <div className="rounded-[26px] bg-slate-50 p-6 text-center">
 <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
 <p className="text-sm font-black text-slate-700">
 Belum ada deklarasi.
 </p>
 </div>
 )}
 </div>
 </section>

 <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
 <div className="rounded-[32px] border border-red-100 bg-white p-5 shadow-sm sm:p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <h2 className="text-lg font-black text-slate-950">
 Statistik Penggunaan Bulanan
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Grafik sederhana penggunaan dana tahun berjalan.
 </p>
 </div>

 {analitik.lebihBanyak ? (
 <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
 <TrendingUp className="h-3.5 w-3.5" />
 Naik {analitik.persenPerubahan.toFixed(0)}%
 </span>
 ) : analitik.lebihSedikit ? (
 <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
 <TrendingDown className="h-3.5 w-3.5" />
 Turun {analitik.persenPerubahan.toFixed(0)}%
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
 Stabil
 </span>
 )}
 </div>

 <div className="mt-6 flex h-56 items-end gap-2 rounded-[28px] bg-slate-50 p-4">
 {analitik.perBulan.map((item) => {
 const tinggi =
 analitik.nilaiMaksBulanan > 0
 ? Math.max(
 8,
 (item.nominal / analitik.nilaiMaksBulanan) * 100
 )
 : 8;

 return (
 <div
 key={item.bulan}
 className="flex h-full flex-1 flex-col items-center justify-end gap-2"
 >
 <div className="flex h-full w-full items-end justify-center">
 <div
 className="w-full max-w-[30px] rounded-t-2xl bg-red-600 transition-all"
 style={{ height: `${tinggi}%` }}
 title={`${item.label}: ${formatRupiah(item.nominal)}`}
 />
 </div>

 <span className="text-[10px] font-black text-slate-400">
 {item.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 <div className="rounded-[32px] border border-red-100 bg-white p-5 shadow-sm sm:p-6">
 <h2 className="text-lg font-black text-slate-950">
 Top Karyawan Bulan Ini
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Berdasarkan total penggunaan nota bulan berjalan.
 </p>

 <div className="mt-5 grid gap-3">
 {analitik.topKaryawanBulanIni.length > 0 ? (
 analitik.topKaryawanBulanIni.map((item, index) => (
 <div
 key={`${item.nrp}-${item.nama}`}
 className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4"
 >
 <div className="flex min-w-0 items-center gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-sm font-black text-red-600">
 {index + 1}
 </div>

 <div className="min-w-0">
 <p className="truncate text-sm font-black text-slate-950">
 {item.nama}
 </p>
 <p className="text-xs font-semibold text-slate-500">
 NRP {item.nrp || "-"}
 </p>
 </div>
 </div>

 <p className="shrink-0 text-sm font-black text-slate-950">
 {formatRupiahSingkat(item.nominal)}
 </p>
 </div>
 ))
 ) : (
 <div className="rounded-3xl bg-slate-50 p-5 text-center">
 <p className="text-sm font-bold text-slate-500">
 Belum ada penggunaan bulan ini.
 </p>
 </div>
 )}
 </div>
 </div>
 </section>
 </div>
 </main>
 );
}

/* <--- end ---> */
