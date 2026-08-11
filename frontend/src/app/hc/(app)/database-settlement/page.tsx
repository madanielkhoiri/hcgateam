"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Printer, RefreshCw } from "lucide-react";

type DataDatabaseSettlement = {
 id: number;
 id_deklarasi: number;
 id_pengguna: number;
 kode_jangan_diubah: string;
 nomor_settlement: string;
 item: number;
 item_sett: string;
 department: string;
 tanggal_pembuatan: string;
 tanggal_per_item: string;
 nama_barang_jasa: string;
 qty: number | string;
 harga_per_qty: number | string;
 total: number | string;
 keterangan: string | null;
 cost_center: string;
 nomor_rab_pb: string | null;
 pic: string | null;
};

type DataPenggunaTersimpan = {
 id?: number;
 nama?: string;
 username?: string;
 nrp?: string;
 role?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

function normalisasiAngka(nilai: number | string | null | undefined) {
 const angka = Number(nilai || 0);
 return Number.isFinite(angka) ? angka : 0;
}

function formatRupiah(nilai: number | string | null | undefined) {
  const formatAngka = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(normalisasiAngka(nilai));
  return `Rp${formatAngka}`;
}

function formatTanggal(nilai: string | null | undefined) {
 if (!nilai) return "-";

 const tanggal = new Date(nilai);

 if (Number.isNaN(tanggal.getTime())) {
 return nilai;
 }

 return tanggal.toLocaleDateString("id-ID", {
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 });
}

export default function DatabaseSettlementPage() {
 const router = useRouter();

 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);
 const [daftarData, setDaftarData] = useState<DataDatabaseSettlement[]>([]);
 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [pesanError, setPesanError] = useState("");

 const totalNominal = useMemo(() => {
 return daftarData.reduce((total, item) => total + normalisasiAngka(item.total), 0);
 }, [daftarData]);

 async function ambilData(idPengguna: number) {
 setSedangMemuat(true);
 setPesanError("");

 try {
 const response = await fetch(`${apiUrl}/database-settlement/pengguna/${idPengguna}`);

 if (!response.ok) {
 throw new Error("Gagal mengambil database settlement.");
 }

 const data = await response.json();
 setDaftarData(Array.isArray(data) ? data : []);
 } catch (error) {
 setPesanError(error instanceof Error ? error.message : "Gagal mengambil data.");
 setDaftarData([]);
 } finally {
 setSedangMemuat(false);
 }
 }

 useEffect(() => {
 const dataUser =
 (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user")) ||
 localStorage.getItem("pengguna");

 if (!dataUser) {
 router.replace("/");
 return;
 }

 const user = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataUser)) as DataPenggunaTersimpan;
 setPengguna(user);

 const idPengguna = Number(user.id);

 if (!idPengguna) {
 setPesanError("ID pengguna tidak ditemukan.");
 setSedangMemuat(false);
 return;
 }

 ambilData(idPengguna);
 }, [router]);

 return (
 <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8 print:bg-white print:p-0">
 <div className="mx-auto max-w-7xl space-y-4 print:max-w-none print:space-y-2">
 <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm print:hidden md:flex-row md:items-center md:justify-between">
 <div className="flex items-start gap-3">
 <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
 <Database className="h-7 w-7" />
 </div>

 <div>
 <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-700">
 Database Settlement
 </p>
 <h1 className="text-2xl font-black text-slate-950">
 Uang Operasional Disetujui
 </h1>
 <p className="text-sm font-semibold text-slate-500">
 Data otomatis dari uang operasional yang sudah disetujui.
 </p>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => router.push("/hc/deklarasi-dinas")}
 className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
 >
 <ArrowLeft className="h-4 w-4" />
 Kembali
 </button>

 <button
 type="button"
 onClick={() => pengguna?.id && ambilData(Number(pengguna.id))}
 className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
 >
 <RefreshCw className="h-4 w-4" />
 Refresh
 </button>

 <button
 type="button"
 onClick={() => window.print()}
 className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-black text-white hover:bg-cyan-800"
 >
 <Printer className="h-4 w-4" />
 Cetak PDF
 </button>
 </div>
 </section>

 <section className="grid gap-3 md:grid-cols-3 print:hidden">
 <div className="rounded-3xl bg-white p-5 shadow-sm">
 <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
 Total Item
 </p>
 <p className="mt-2 text-3xl font-black text-slate-950">
 {daftarData.length}
 </p>
 </div>

 <div className="rounded-3xl bg-white p-5 shadow-sm">
 <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
 Total Nominal
 </p>
 <p className="mt-2 text-3xl font-black text-cyan-700">
 {formatRupiah(totalNominal)}
 </p>
 </div>

 <div className="rounded-3xl bg-white p-5 shadow-sm">
 <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
 PIC
 </p>
 <p className="mt-2 text-2xl font-black text-slate-950">
 {pengguna?.nama || pengguna?.username || "-"}
 </p>
 </div>
 </section>

 {pesanError && (
 <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 print:hidden">
 {pesanError}
 </div>
 )}

 <section className="overflow-hidden rounded-3xl bg-white shadow-sm print:rounded-none print:shadow-none">
 <div className="border-b border-slate-200 p-5 text-center print:border-none print:p-2">
 <h2 className="text-xl font-black uppercase tracking-wide text-slate-950">
 Database Settlement
 </h2>
 <p className="text-sm font-bold text-slate-500 print:text-xs">
 Format mengikuti sheet Excel Database Settlement
 </p>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-[1600px] border-collapse text-xs print:min-w-full print:text-[9px]">
 <thead>
 <tr className="bg-[#1f4e79] text-white">
 <th className="border border-slate-500 bg-yellow-300 px-2 py-3 text-slate-950">Jangan diubah</th>
 <th className="border border-slate-500 px-2 py-3">NOMOR SETTLEMENT</th>
 <th className="border border-slate-500 px-2 py-3">ITEM</th>
 <th className="border border-slate-500 px-2 py-3">ITEM SETT</th>
 <th className="border border-slate-500 px-2 py-3">DEPARTMENT</th>
 <th className="border border-slate-500 px-2 py-3">TGL PEMBUATAN</th>
 <th className="border border-slate-500 px-2 py-3">TGL PER ITEM</th>
 <th className="border border-slate-500 px-2 py-3">NAMA BARANG / JASA</th>
 <th className="border border-slate-500 px-2 py-3">QTY</th>
 <th className="border border-slate-500 px-2 py-3">HARGA / QTY</th>
 <th className="border border-slate-500 px-2 py-3">TOTAL</th>
 <th className="border border-slate-500 px-2 py-3">KETERANGAN</th>
 <th className="border border-slate-500 px-2 py-3">COST CENTER</th>
 <th className="border border-slate-500 px-2 py-3">NOMOR RAB/PB</th>
 <th className="border border-slate-500 px-2 py-3">PIC</th>
 </tr>
 </thead>

 <tbody>
 {sedangMemuat ? (
 <tr>
 <td colSpan={15} className="border border-slate-300 px-3 py-8 text-center font-black text-slate-500">
 Memuat database settlement...
 </td>
 </tr>
 ) : daftarData.length === 0 ? (
 <tr>
 <td colSpan={15} className="border border-slate-300 px-3 py-8 text-center font-black text-slate-500">
 Belum ada data settlement.
 </td>
 </tr>
 ) : (
 daftarData.map((item, index) => (
 <tr key={item.id} className={index % 2 === 0 ? "bg-[#d9eaf7]" : "bg-white"}>
 <td className="border border-slate-400 bg-yellow-100 px-2 py-2 text-center font-bold">{item.kode_jangan_diubah}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.nomor_settlement}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.item}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.item_sett}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.department}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{formatTanggal(item.tanggal_pembuatan)}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{formatTanggal(item.tanggal_per_item)}</td>
 <td className="border border-slate-400 px-2 py-2">{item.nama_barang_jasa}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{normalisasiAngka(item.qty)}</td>
 <td className="border border-slate-400 px-2 py-2 text-right">{formatRupiah(item.harga_per_qty)}</td>
 <td className="border border-slate-400 px-2 py-2 text-right font-bold">{formatRupiah(item.total)}</td>
 <td className="border border-slate-400 px-2 py-2">{item.keterangan || "-"}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.cost_center}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.nomor_rab_pb || "-"}</td>
 <td className="border border-slate-400 px-2 py-2 text-center">{item.pic || "-"}</td>
 </tr>
 ))
 )}
 </tbody>

 {daftarData.length > 0 && (
 <tfoot>
 <tr className="bg-slate-200 font-black">
 <td colSpan={10} className="border border-slate-500 px-2 py-3 text-right">
 TOTAL
 </td>
 <td className="border border-slate-500 px-2 py-3 text-right">
 {formatRupiah(totalNominal)}
 </td>
 <td colSpan={4} className="border border-slate-500 px-2 py-3"></td>
 </tr>
 </tfoot>
 )}
 </table>
 </div>
 </section>
 </div>
 </main>
 );
}