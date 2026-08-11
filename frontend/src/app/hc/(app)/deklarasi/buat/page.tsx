"use client";

import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
 ArrowLeft,
 CheckCircle2,
 FileText,
 Loader2,
 Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DataPenggunaTersimpan = {
 id: number;
 kode_tiket: string;
 nrp: string;
 nama: string;
 email: string;
 nomor_telepon: string;
 role: string;
 aktif: boolean;
};

type ResponDeklarasi = {
 id: number;
 kode_deklarasi: string;
 id_pengguna: number;
 id_saldo: number | null;
 nrp: string;
 nama_pengguna: string;
 jenis_deklarasi: string;
 tanggal_kegiatan: string;
 lokasi: string;
 keterangan: string;
 total_nominal: string;
 status: string;
};

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
 tanggal_transfer: string;
 keterangan: string | null;
 status_saldo: "AKTIF" | "PAS" | "ADA_SISA" | "MELEBIHI_NOMINAL" | "SELESAI";
};

/* <--- fitur halaman buat deklarasi ---> */
export default function HalamanBuatDeklarasi() {
 const router = useRouter();
 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);
 const [jenisDeklarasi, setJenisDeklarasi] = useState<
 "PERJALANAN_DINAS" | "UANG_OPERASIONAL"
 >("PERJALANAN_DINAS");
 const [tanggalKegiatan, setTanggalKegiatan] = useState("");
 const [daftarSaldoAktif, setDaftarSaldoAktif] = useState<DataSaldo[]>([]);
 const [idSaldo, setIdSaldo] = useState("");
 const [lokasi, setLokasi] = useState("");
 const [keterangan, setKeterangan] = useState("");

 const [sedangSimpan, setSedangSimpan] = useState(false);
 const [sedangMemuatSaldo, setSedangMemuatSaldo] = useState(true);
 const [pesanError, setPesanError] = useState("");
 const [modalBerhasilTerbuka, setModalBerhasilTerbuka] = useState(false);
 const [hasilDeklarasi, setHasilDeklarasi] = useState<ResponDeklarasi | null>(
 null
 );

 const formatRupiah = (nilai: string | number) => {
 const angka = Number(nilai || 0);

 return new Intl.NumberFormat("id-ID", {
 style: "currency",
 currency: "IDR",
 minimumFractionDigits: 0,
 }).format(angka);
 };

 const formatJenisSaldo = (jenis: string) => {
 if (jenis === "PERJALANAN_DINAS") return "Perjalanan Dinas";
 if (jenis === "UANG_OPERASIONAL") return "Uang Operasional";
 return jenis;
 };

 const pilihSaldoAktif = (saldo: DataSaldo | undefined) => {
 if (!saldo) {
 setIdSaldo("");
 setLokasi("");
 setKeterangan("");
 return;
 }

 setIdSaldo(String(saldo.id));
 setJenisDeklarasi(saldo.jenis_saldo);
 setLokasi(saldo.lokasi || "");
 setKeterangan(saldo.keterangan || "");
 };

 const ambilSaldoAktif = async (idPengguna: number) => {
 setSedangMemuatSaldo(true);

 try {
 const response = await fetch(
 `${apiUrl}/saldo/pengguna/${idPengguna}/aktif`
 );

 if (!response.ok) {
 throw new Error("Gagal mengambil saldo aktif");
 }

 const dataSaldo: DataSaldo[] = await response.json();
 setDaftarSaldoAktif(dataSaldo);

 if (dataSaldo.length > 0) {
 pilihSaldoAktif(dataSaldo[0]);
 } else {
 pilihSaldoAktif(undefined);
 }
 } catch (error) {
 console.error(error);
 setDaftarSaldoAktif([]);
 pilihSaldoAktif(undefined);
 } finally {
 setSedangMemuatSaldo(false);
 }
 };

 useEffect(() => {
 const token = (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token"));
 const dataPengguna = (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user"));

 if (!token || !dataPengguna) {
 router.replace("/");
 return;
 }

 const dataPenggunaParsed = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataPengguna));
 setPengguna(dataPenggunaParsed);
 ambilSaldoAktif(dataPenggunaParsed.id);
 }, [router]);

 const handleSimpanDeklarasi = async (
 event: React.FormEvent<HTMLFormElement>
 ) => {
 event.preventDefault();

 if (!pengguna) {
 setPesanError("Data pengguna tidak ditemukan. Silakan login ulang.");
 return;
 }

 if (!idSaldo) {
 setPesanError("Pilih saldo aktif terlebih dahulu.");
 return;
 }

 if (!tanggalKegiatan) {
 setPesanError("Tanggal kegiatan wajib diisi.");
 return;
 }

 if (!lokasi.trim()) {
 setPesanError("Lokasi wajib diisi.");
 return;
 }

 if (!keterangan.trim()) {
 setPesanError("Keterangan wajib diisi.");
 return;
 }

 setSedangSimpan(true);
 setPesanError("");

 try {
 const response = await fetch(`${apiUrl}/deklarasi`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 id_pengguna: pengguna.id,
 id_saldo: Number(idSaldo),
 nrp: pengguna.nrp,
 nama_pengguna: pengguna.nama,
 jenis_deklarasi: jenisDeklarasi,
 tanggal_kegiatan: tanggalKegiatan,
 lokasi: lokasi.trim(),
 keterangan: keterangan.trim(),
 total_nominal: 0,
 }),
 });

 const hasil = await response.json();

 if (!response.ok) {
 throw new Error(hasil.message || "Gagal menyimpan deklarasi");
 }

 setHasilDeklarasi(hasil);
 setModalBerhasilTerbuka(true);

 setTanggalKegiatan("");
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menyimpan deklarasi"
 );
 } finally {
 setSedangSimpan(false);
 }
 };

 return (
 <main className="min-h-screen px-4 py-6">
 <section className="mx-auto max-w-5xl">
 <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <button
 type="button"
 onClick={() => router.push("/hc/deklarasi-dinas")}
 className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
 >
 <ArrowLeft className="h-4 w-4" />
 Kembali ke Dashboard
 </button>

 <h1 className="text-3xl font-bold text-slate-900">
 Buat Deklarasi
 </h1>
 <p className="mt-2 text-sm leading-6 text-slate-500">
 Isi data deklarasi perjalanan dinas atau uang operasional dengan
 rapi dan lengkap.
 </p>
 </div>

 <div className="rounded-3xl bg-gradient-to-br from-red-600 to-rose-500 px-5 py-4 text-white shadow-lg shadow-red-100">
 <div className="text-xs text-white/80">Login sebagai</div>
 <div className="mt-1 font-bold">{pengguna?.nama || "-"}</div>
 <div className="text-sm text-white/90">
 NRP {pengguna?.nrp || "-"}
 </div>
 </div>
 </div>

 <div className="rounded-[32px] border border-red-100 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:p-8">
 <div className="mb-7 flex items-center gap-4">
 <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
 <FileText className="h-7 w-7" />
 </div>
 <div>
 <div className="text-xl font-bold text-slate-900">
 Form Deklarasi
 </div>
 <div className="text-sm text-slate-500">
 Status awal otomatis menjadi DRAFT.
 </div>
 </div>
 </div>

 <form onSubmit={handleSimpanDeklarasi} className="space-y-5">
 <div>
 <label
 htmlFor="saldo-aktif"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 Saldo Aktif
 </label>

 <select
 id="saldo-aktif"
 value={idSaldo}
 onChange={(event) => {
 const saldoTerpilih = daftarSaldoAktif.find(
 (saldo) => String(saldo.id) === event.target.value
 );

 pilihSaldoAktif(saldoTerpilih);
 }}
 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
 disabled={sedangMemuatSaldo}
 >
 <option value="">
 {sedangMemuatSaldo
 ? "Memuat saldo aktif..."
 : "Pilih saldo aktif"}
 </option>

 {daftarSaldoAktif.map((saldo) => (
 <option key={saldo.id} value={saldo.id}>
 {formatJenisSaldo(saldo.jenis_saldo)} -{" "}
 {saldo.lokasi || "Tanpa lokasi"} -{" "}
 {formatRupiah(saldo.sisa_saldo)}
 </option>
 ))}
 </select>

 {daftarSaldoAktif.length === 0 && !sedangMemuatSaldo ? (
 <p className="mt-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
 Belum ada saldo aktif. Hubungi admin/FA untuk input saldo.
 </p>
 ) : null}
 </div>

 <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
 <div>
 <label
 htmlFor="jenis-deklarasi"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 Jenis Deklarasi
 </label>
 <select
 id="jenis-deklarasi"
 value={jenisDeklarasi}
 onChange={(event) =>
 setJenisDeklarasi(
 event.target.value as
 | "PERJALANAN_DINAS"
 | "UANG_OPERASIONAL"
 )
 }
 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
 >
 <option value="PERJALANAN_DINAS">Perjalanan Dinas</option>
 <option value="UANG_OPERASIONAL">Uang Operasional</option>
 </select>
 </div>

 <div>
 <label
 htmlFor="tanggal-kegiatan"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 Tanggal Kegiatan
 </label>
 <input
 id="tanggal-kegiatan"
 type="date"
 value={tanggalKegiatan}
 onChange={(event) => setTanggalKegiatan(event.target.value)}
 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
 required
 />
 </div>
 </div>

 <div>
 <label
 htmlFor="lokasi"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 Lokasi
 </label>
 <input
 id="lokasi"
 type="text"
 value={lokasi}
 onChange={(event) => setLokasi(event.target.value)}
 placeholder="Contoh: Palangkaraya"
 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
 required
 />
 </div>

 <div>
 <label
 htmlFor="keterangan"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 Keterangan
 </label>
 <textarea
 id="keterangan"
 value={keterangan}
 onChange={(event) => setKeterangan(event.target.value)}
 placeholder="Tulis keterangan kegiatan deklarasi"
 rows={4}
 className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
 required
 />
 </div>

 {pesanError ? (
 <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
 {pesanError}
 </div>
 ) : null}

 <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
 <button
 type="button"
 onClick={() => router.push("/hc/deklarasi-dinas")}
 className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
 >
 Batal
 </button>

 <button
 type="submit"
 disabled={sedangSimpan || sedangMemuatSaldo}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
 >
 {sedangSimpan ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 Menyimpan...
 </>
 ) : (
 <>
 <Send className="h-4 w-4" />
 Simpan Deklarasi
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 </section>

 <AlertDialog
 open={modalBerhasilTerbuka}
 onOpenChange={setModalBerhasilTerbuka}
 >
 <AlertDialogContent className="rounded-[32px] border-emerald-100">
 <AlertDialogHeader>
 <div className="mx-auto mb-4 flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
 <CheckCircle2 className="h-11 w-11" />
 </div>

 <AlertDialogTitle className="text-center text-2xl font-bold text-slate-900">
 Deklarasi Berhasil Disimpan
 </AlertDialogTitle>

 <AlertDialogDescription className="text-center text-sm leading-6 text-slate-500">
 Data deklarasi berhasil dibuat dengan status DRAFT.
 {hasilDeklarasi?.kode_deklarasi ? (
 <>
 <br />
 Kode deklarasi:{" "}
 <span className="font-bold text-slate-900">
 {hasilDeklarasi.kode_deklarasi}
 </span>
 </>
 ) : null}
 </AlertDialogDescription>
 </AlertDialogHeader>

 <AlertDialogFooter className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
 <AlertDialogAction
 onClick={() => router.push("/hc/deklarasi-dinas")}
 className="rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200"
 >
 Ke Dashboard
 </AlertDialogAction>

 <AlertDialogAction
 onClick={() => setModalBerhasilTerbuka(false)}
 className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
 >
 Buat Lagi
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </main>
 );
}
/* <--- end ---> */