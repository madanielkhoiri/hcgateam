"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AnimatedLineChart from "@/components/dashboard-charts/animated-line-chart";
import SimplePieChart from "@/components/dashboard-charts/simple-pie-chart";
import { StatCardRow, type StatCard } from "@/components/module-shell/stat-card-row";

/* <--- dashboard grafik admin deklarasi dinas (terpisah dari Beranda) ---> */

type DataPenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 role: "SUPER_ADMIN" | "ADMIN" | "SECTION_HEAD" | "FA" | "KARYAWAN";
};

type DataDeklarasi = {
 id: number;
 nrp: string;
 nama_pengguna: string;
 tanggal_kegiatan: string;
 total_nominal: string | number;
};

type DataRingkasanAdmin = {
 total_draft: number;
 total_diajukan: number;
 total_diverifikasi: number;
 total_disetujui: number;
 total_ditolak: number;
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
 status_pengajuan: StatusPengajuan;
};

const apakahAdmin = (role: string) => {
 return (
 role === "SUPER_ADMIN" ||
 role === "ADMIN" ||
 role === "SECTION_HEAD" ||
 role === "FA"
 );
};

const ambilHeaderAuth = () => {
 if (typeof window === "undefined") return {};

 const token =
 localStorage.getItem("hcga_access_token") ||
 sessionStorage.getItem("hcga_access_token") ||
 localStorage.getItem("token") ||
 localStorage.getItem("access_token") ||
 "";

 if (!token) return {};

 return { Authorization: `Bearer ${token}` };
};

const normalisasiAngka = (nilai: unknown) => {
 if (typeof nilai === "number") {
 return Number.isFinite(nilai) ? nilai : 0;
 }

 if (typeof nilai === "string") {
 const angka = Number(nilai.replace(/[^0-9.-]/g, ""));
 return Number.isFinite(angka) ? angka : 0;
 }

 return 0;
};

const formatBulanPendek = (bulan: number) => {
 const tanggal = new Date(new Date().getFullYear(), bulan, 1);
 return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(tanggal);
};

export default function DashboardAdminPage() {
 const router = useRouter();
 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const [ringkasan, setRingkasan] = useState<DataRingkasanAdmin | null>(null);
 const [daftarPengajuan, setDaftarPengajuan] = useState<DataPengajuan[]>([]);
 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [pesanError, setPesanError] = useState("");

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
 error instanceof Error ? error.message : "Terjadi kesalahan mengambil data admin."
 );
 } finally {
 setSedangMemuat(false);
 }
 };

 useEffect(() => {
 const token =
 localStorage.getItem("hcga_access_token") ||
 sessionStorage.getItem("hcga_access_token") ||
 localStorage.getItem("token") ||
 localStorage.getItem("access_token");

 const dataPengguna =
 localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user");

 if (!token || !dataPengguna) {
 router.replace("/");
 return;
 }

 let penggunaTersimpan: DataPenggunaTersimpan;

 try {
 penggunaTersimpan = JSON.parse(dataPengguna);
 } catch {
 router.replace("/");
 return;
 }

 if (!apakahAdmin(penggunaTersimpan.role)) {
 router.replace("/hc/deklarasi-dinas");
 return;
 }

 ambilRingkasanAdmin();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [apiUrl, router]);

 const daftarDeklarasi = ringkasan?.daftar_deklarasi || [];

 const totalDeklarasiDraft = ringkasan?.total_draft || 0;
 const totalDeklarasiDiajukan = ringkasan?.total_diajukan || 0;
 const totalDeklarasiDiverifikasi = ringkasan?.total_diverifikasi || 0;
 const totalDeklarasiDisetujui = ringkasan?.total_disetujui || 0;
 const totalDeklarasiDitolak = ringkasan?.total_ditolak || 0;

 const totalPengajuan = daftarPengajuan.length;
 const totalPengajuanDiajukan = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "DIAJUKAN"
 ).length;
 const totalMenungguTransfer = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "MENUNGGU_TRANSFER"
 ).length;

 const analitik = useMemo(() => {
 const tahunSekarang = new Date().getFullYear();
 const bulanSekarang = new Date().getMonth();
 const bulanSebelumnya = bulanSekarang === 0 ? 11 : bulanSekarang - 1;
 const tahunBulanSebelumnya = bulanSekarang === 0 ? tahunSekarang - 1 : tahunSekarang;

 const perBulan = Array.from({ length: 12 }, (_, index) => ({
 label: formatBulanPendek(index),
 nominal: 0,
 }));

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
 }

 if (tahun === tahunBulanSebelumnya && bulan === bulanSebelumnya) {
 totalBulanLalu += nominal;
 }
 });

 const selisihNominal = totalBulanIni - totalBulanLalu;
 const persenPerubahan =
 totalBulanLalu > 0
 ? (Math.abs(selisihNominal) / totalBulanLalu) * 100
 : totalBulanIni > 0
 ? 100
 : 0;

 return {
 perBulan,
 lebihBanyak: selisihNominal > 0,
 lebihSedikit: selisihNominal < 0,
 persenPerubahan,
 };
 }, [daftarDeklarasi]);

 const dataTrenBulanan = analitik.perBulan.map((item) => ({
 label: item.label,
 value: Math.round((item.nominal / 1_000_000) * 10) / 10,
 }));

 const teksTrenBulanan = analitik.lebihBanyak
 ? `Naik ${analitik.persenPerubahan.toFixed(0)}% dari bulan lalu`
 : analitik.lebihSedikit
 ? `Turun ${analitik.persenPerubahan.toFixed(0)}% dari bulan lalu`
 : "Stabil dibanding bulan lalu";

 const statCards: StatCard[] = [
 {
 label: "Deklarasi Diajukan",
 value: totalDeklarasiDiajukan,
 trend: "Nota karyawan perlu koreksi",
 initial: "DE",
 iconBg: "#fff4d2",
 iconColor: "#946200",
 },
 {
 label: "Draft Deklarasi",
 value: totalDeklarasiDraft,
 trend: "Belum diajukan karyawan",
 initial: "DR",
 iconBg: "#eef2f7",
 iconColor: "#556575",
 },
 {
 label: "Diverifikasi",
 value: totalDeklarasiDiverifikasi,
 trend: "Sudah dicek admin",
 initial: "DI",
 iconBg: "#eaf2ff",
 iconColor: "#0868f6",
 },
 {
 label: "Disetujui",
 value: totalDeklarasiDisetujui,
 trend: "Deklarasi final",
 initial: "DS",
 iconBg: "#e8f8ef",
 iconColor: "#0a9f59",
 },
 {
 label: "Ditolak",
 value: totalDeklarasiDitolak,
 trend: "Perlu revisi karyawan",
 initial: "DT",
 iconBg: "#fff0f0",
 iconColor: "#b02031",
 },
 {
 label: "Pengajuan STD/RAB",
 value: totalPengajuan,
 trend: `${totalPengajuanDiajukan} diajukan • ${totalMenungguTransfer} transfer`,
 initial: "PE",
 iconBg: "#f4f0ff",
 iconColor: "#6748df",
 },
 ];

 const dataStatusDeklarasi = [
 { label: "Draft", value: totalDeklarasiDraft, color: "#8393ac" },
 { label: "Diajukan", value: totalDeklarasiDiajukan, color: "#f17c16" },
 { label: "Diverifikasi", value: totalDeklarasiDiverifikasi, color: "#1677d2" },
 { label: "Disetujui", value: totalDeklarasiDisetujui, color: "#079669" },
 { label: "Ditolak", value: totalDeklarasiDitolak, color: "#b02031" },
 ];

 if (sedangMemuat) {
 return (
 <main className="flex min-h-[60vh] items-center justify-center px-4">
 <div className="rounded-2xl border border-[#d8e4f2] bg-white p-6 text-center shadow-sm">
 <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0868f6]" />
 <p className="text-sm font-black text-slate-700">Memuat dashboard...</p>
 </div>
 </main>
 );
 }

 return (
 <main style={{ padding: "22px 24px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
 <div>
 <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#10244a" }}>
 Dashboard Admin
 </h1>
 <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "#6f819d" }}>
 Statistik &amp; grafik deklarasi dinas serta pengajuan STD/RAB
 </p>
 </div>

 {pesanError && (
 <div className="rounded-2xl border border-[#f3c2c2] bg-[#fff0f0] px-5 py-4 text-sm font-bold text-[#b02031]">
 {pesanError}
 </div>
 )}

 <StatCardRow cards={statCards} />

 <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
 <AnimatedLineChart
 title="Statistik Penggunaan Bulanan"
 subtitle={`Dalam juta rupiah • ${teksTrenBulanan}`}
 data={dataTrenBulanan}
 accent="blue"
 />
 <SimplePieChart
 title="Breakdown Status Deklarasi"
 subtitle="Seluruh deklarasi"
 data={dataStatusDeklarasi}
 satuan="deklarasi"
 />
 </div>
 </main>
 );
}

/* <--- end ---> */
