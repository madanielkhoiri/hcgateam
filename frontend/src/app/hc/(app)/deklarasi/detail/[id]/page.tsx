"use client";

import {
 AlertCircle,
 ArrowLeft,
 CalendarDays,
 CheckCircle2,
 FileText,
 MapPin,
 Printer,
 ReceiptText,
 RefreshCw,
 ShieldCheck,
 Wallet,
 XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* <--- halaman detail deklarasi + koreksi OCR manual per baris nota ---> */

type DataPenggunaTersimpan = {
 id: number;
 nrp: string;
 nama: string;
 email: string | null;
 nomor_telepon: string | null;
 role: "SUPER_ADMIN" | "FA" | "KARYAWAN";
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
 nomor_std?: string | null;
 total_nominal: string | number;
 status: "DRAFT" | "DIAJUKAN" | "DIVERIFIKASI" | "DISETUJUI" | "DITOLAK";
 dibuat_pada: string;
 diperbarui_pada: string;
 alasan_ditolak?: string | null;
};

type DataNota = {
 id: number;
 id_deklarasi: number;
 kategori_nota: string | null;
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
 status_saldo:
 | "AKTIF"
 | "PAS"
 | "ADA_SISA"
 | "MELEBIHI_NOMINAL"
 | "MENUNGGU_PENGEMBALIAN"
 | "SELESAI";
 nama_file_bukti_pengembalian?: string | null;
 path_file_bukti_pengembalian?: string | null;
 status_bukti_pengembalian?: "BELUM_UPLOAD" | "DIAJUKAN" | "DISETUJUI" | "DITOLAK";
 alasan_bukti_pengembalian_ditolak?: string | null;
 tanggal_upload_bukti_pengembalian?: string | null;
 tanggal_verifikasi_pengembalian?: string | null;
};

export default function HalamanDetailDeklarasi() {
 const router = useRouter();
 const params = useParams();

 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";
 const idDeklarasi = String(params.id || "");

 const [penggunaLogin, setPenggunaLogin] =
 useState<DataPenggunaTersimpan | null>(null);

 const [deklarasi, setDeklarasi] = useState<DataDeklarasi | null>(null);
 const [daftarNota, setDaftarNota] = useState<DataNota[]>([]);
 const [saldoDeklarasi, setSaldoDeklarasi] = useState<DataSaldo | null>(null);

 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [sedangRefresh, setSedangRefresh] = useState(false);
 const [sedangUbahStatus, setSedangUbahStatus] = useState(false);
 const [sedangKoreksiNota, setSedangKoreksiNota] = useState<number | null>(
 null
 );
 const [sedangSimpanOcrManual, setSedangSimpanOcrManual] = useState<
 number | null
 >(null);

 const [pesanError, setPesanError] = useState("");
 const [pesanSukses, setPesanSukses] = useState("");
 const [gambarPreview, setGambarPreview] = useState("");
 const [modePdfUangOperasional, setModePdfUangOperasional] = useState<
 "FORM_SETTLEMENT" | "DATABASE_SETTLEMENT"
 >("FORM_SETTLEMENT");

 const [nominalOcrManual, setNominalOcrManual] = useState<
 Record<number, string>
 >({});

 const apakahAdminFa =
 penggunaLogin?.role === "SUPER_ADMIN" || penggunaLogin?.role === "FA";

 const halamanKembali = apakahAdminFa ? "/hc/admin" : "/hc";
 const teksKembali = apakahAdminFa
 ? "Kembali ke Dashboard Admin"
 : "Kembali ke Dashboard";

 const bolehVerifikasi = apakahAdminFa && deklarasi?.status === "DIAJUKAN";

 const bolehSetujui =
 apakahAdminFa &&
 deklarasi &&
 ["DIAJUKAN", "DIVERIFIKASI"].includes(deklarasi?.status);

 const bolehTolak =
 apakahAdminFa &&
 deklarasi &&
 ["DIAJUKAN", "DIVERIFIKASI"].includes(deklarasi?.status);

 const bolehKoreksiNota =
 apakahAdminFa &&
 deklarasi &&
 ["DIAJUKAN", "DIVERIFIKASI", "DITOLAK"].includes(deklarasi?.status);

 const daftarNotaUrut = useMemo(() => {
 return [...daftarNota].sort((a, b) => {

 const escapeHtmlPdf = (nilai: unknown) => {
 return String(nilai ?? "").replace(/[&<>"']/g, (karakter) => {
 const daftarKarakter: Record<string, string> = {
 "&": "&amp;",
 "<": "&lt;",
 ">": "&gt;",
 '"': "&quot;",
 "'": "&#039;",
 };

 return daftarKarakter[karakter] || karakter;
 });
 };

 const cetakDatabaseSettlementLangsung = () => {
 const dataBaris = barisPdfSettlement.filter((baris) => baris.namaBarang);

 const barisCetak =
 dataBaris.length > 0
 ? dataBaris
 : [
 {
 nomor: 1,
 tanggal: formatTanggalPdfDeklarasi(deklarasi?.tanggal_kegiatan),
 namaBarang: "-",
 qty: 1,
 harga: 0,
 jumlah: 0,
 keterangan: "-",
 },
 ];

 const isiTabel = barisCetak
 .map((baris, index) => {
 const nomorSettlementDb = nomorSettlementUrutPdf || "001";
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;
 const nomorRabPb =
 nomorSettlementDb + "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 new Date(deklarasi?.tanggal_kegiatan).getFullYear();

 return [
 "<tr>",
 "<td></td>",
 '<td class="center">' + nomorSettlementDb + "</td>",
 '<td class="center">' + nomorItemDb + "</td>",
 '<td class="center">' + escapeHtmlPdf(itemSettDb) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' +
 escapeHtmlPdf(formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)) +
 "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.tanggal) + "</td>",
 "<td>" + escapeHtmlPdf(baris.namaBarang) + "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.qty) + "</td>",
 '<td class="money">' + escapeHtmlPdf(formatAngkaPdf(baris.harga)) + "</td>",
 '<td class="money">' + escapeHtmlPdf(formatAngkaPdf(baris.jumlah)) + "</td>",
 "<td>" + escapeHtmlPdf(baris.keterangan) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' + escapeHtmlPdf(nomorRabPb) + "</td>",
 '<td class="center">' + escapeHtmlPdf((baris as any).pic || deklarasi?.nama_pengguna || "-") + "</td>",
 "</tr>",
 ].join("");
 })
 .join("");

 const html = [
 "<!doctype html>",
 '<html lang="id">',
 "<head>",
 '<meta charset="utf-8" />',
 "<title>Database Settlement</title>",
 "<style>",
 "@page { size: A4 landscape; margin: 6mm; }",
 "html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #000; }",
 "body { padding: 0; }",
 ".title { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 3mm; }",
 "table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6px; }",
 "th, td { border: 1px solid #9fbbe7; padding: 1px 2px; vertical-align: middle; line-height: 1.05; overflow-wrap: break-word; }",
 "th { background: #4f81bd; color: #fff; text-align: center; font-weight: 700; }",
 "tbody tr:nth-child(odd) td { background: #d9eaf7; }",
 "tbody tr:nth-child(even) td { background: #ffffff; }",
 ".yellow { background: #fff200 !important; color: #000 !important; }",
 ".center { text-align: center; white-space: nowrap; }",
 ".money { text-align: right; white-space: nowrap; }",
 "</style>",
 "</head>",
 "<body>",
 '<div class="title">DATABASE SETTLEMENT</div>',
 "<table>",
 "<colgroup>",
 '<col style="width:4%" />',
 '<col style="width:7%" />',
 '<col style="width:5%" />',
 '<col style="width:6%" />',
 '<col style="width:6%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:22%" />',
 '<col style="width:4%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:18%" />',
 '<col style="width:7%" />',
 '<col style="width:9%" />',
 '<col style="width:8%" />',
 "</colgroup>",
 "<thead>",
 "<tr>",
 '<th class="yellow">Jangan diubah</th>',
 "<th>NOMOR SETTLEMENT</th>",
 "<th>ITEM</th>",
 "<th>ITEM SETT</th>",
 "<th>DEPARTMENT</th>",
 "<th>TANGGAL PEMBUATAN</th>",
 "<th>TANGGAL PER ITEM</th>",
 "<th>NAMA BARANG / JASA</th>",
 "<th>Qty</th>",
 "<th>HARGA PER Qty</th>",
 "<th>Total</th>",
 "<th>Keterangan</th>",
 "<th>Cost Center</th>",
 "<th>Nomer RAB/PB</th>",
 "<th>PIC</th>",
 "</tr>",
 "</thead>",
 "<tbody>",
 isiTabel,
 "</tbody>",
 "</table>",
 "</body>",
 "</html>",
 ].join("");

 const jendelaCetak = window.open("", "_blank", "width=1200,height=800");

 if (!jendelaCetak) {
 alert("Popup diblokir browser. Izinkan popup untuk mencetak Database Settlement.");
 return;
 }

 jendelaCetak.document.open();
 jendelaCetak.document.write(html);
 jendelaCetak.document.close();

 setTimeout(() => {
 jendelaCetak.focus();
 jendelaCetak.print();
 }, 500);
 };



 const cetakDatabaseSettlementWindow = () => {
 const escapeHtmlPdf = (nilai: unknown) => {
 return String(nilai ?? "").replace(/[&<>"']/g, (karakter) => {
 const daftarKarakter: Record<string, string> = {
 "&": "&amp;",
 "<": "&lt;",
 ">": "&gt;",
 '"': "&quot;",
 "'": "&#039;",
 };

 return daftarKarakter[karakter] || karakter;
 });
 };

 const dataBaris = barisPdfSettlement.filter((baris) => baris.namaBarang);

 const barisCetak =
 dataBaris.length > 0
 ? dataBaris
 : [
 {
 nomor: 1,
 tanggal: formatTanggalPdfDeklarasi(deklarasi?.tanggal_kegiatan),
 namaBarang: "-",
 qty: 1,
 harga: 0,
 jumlah: 0,
 keterangan: "-",
 },
 ];

 const isiTabel = barisCetak
 .map((baris, index) => {
 const nomorSettlementDb = nomorSettlementDasarPdf || 1;
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;
 const tahun = new Date(deklarasi?.tanggal_kegiatan).getFullYear();

 const nomorRabPb =
 nomorSettlementDb + "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 tahun;

 return [
 "<tr>",
 "<td></td>",
 '<td class="center">' + nomorSettlementDb + "</td>",
 '<td class="center">' + nomorItemDb + "</td>",
 '<td class="center">' + escapeHtmlPdf(itemSettDb) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' +
 escapeHtmlPdf(formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)) +
 "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.tanggal) + "</td>",
 "<td>" + escapeHtmlPdf(baris.namaBarang) + "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.qty) + "</td>",
 '<td class="money">' + escapeHtmlPdf(formatAngkaPdf(baris.harga)) + "</td>",
 '<td class="money">' + escapeHtmlPdf(formatAngkaPdf(baris.jumlah)) + "</td>",
 "<td>" + escapeHtmlPdf(baris.keterangan) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' + escapeHtmlPdf(nomorRabPb) + "</td>",
 '<td class="center">' + escapeHtmlPdf((baris as any).pic || deklarasi?.nama_pengguna || "-") + "</td>",
 "</tr>",
 ].join("");
 })
 .join("");

 const html = [
 "<!doctype html>",
 '<html lang="id">',
 "<head>",
 '<meta charset="utf-8" />',
 "<title>Database Settlement</title>",
 "<style>",
 "@page { size: A4 landscape; margin: 6mm; }",
 "html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #000; }",
 ".title { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 3mm; }",
 "table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6px; }",
 "th, td { border: 1px solid #9fbbe7; padding: 1px 2px; vertical-align: middle; line-height: 1.05; overflow-wrap: break-word; }",
 "th { background: #4f81bd; color: #fff; text-align: center; font-weight: 700; }",
 "tbody tr:nth-child(odd) td { background: #d9eaf7; }",
 "tbody tr:nth-child(even) td { background: #ffffff; }",
 ".yellow { background: #fff200 !important; color: #000 !important; }",
 ".center { text-align: center; white-space: nowrap; }",
 ".money { text-align: right; white-space: nowrap; }",
 "</style>",
 "</head>",
 "<body>",
 '<div class="title">DATABASE SETTLEMENT</div>',
 "<table>",
 "<colgroup>",
 '<col style="width:4%" />',
 '<col style="width:7%" />',
 '<col style="width:5%" />',
 '<col style="width:6%" />',
 '<col style="width:6%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:22%" />',
 '<col style="width:4%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:18%" />',
 '<col style="width:7%" />',
 '<col style="width:9%" />',
 '<col style="width:8%" />',
 "</colgroup>",
 "<thead>",
 "<tr>",
 '<th class="yellow">Jangan diubah</th>',
 "<th>NOMOR SETTLEMENT</th>",
 "<th>ITEM</th>",
 "<th>ITEM SETT</th>",
 "<th>DEPARTMENT</th>",
 "<th>TANGGAL PEMBUATAN</th>",
 "<th>TANGGAL PER ITEM</th>",
 "<th>NAMA BARANG / JASA</th>",
 "<th>Qty</th>",
 "<th>HARGA PER Qty</th>",
 "<th>Total</th>",
 "<th>Keterangan</th>",
 "<th>Cost Center</th>",
 "<th>Nomer RAB/PB</th>",
 "<th>PIC</th>",
 "</tr>",
 "</thead>",
 "<tbody>",
 isiTabel,
 "</tbody>",
 "</table>",
 "</body>",
 "</html>",
 ].join("");

 const jendelaCetak = window.open("", "_blank", "width=1200,height=800");

 if (!jendelaCetak) {
 alert("Popup diblokir browser. Izinkan popup untuk localhost.");
 return;
 }

 jendelaCetak.document.open();
 jendelaCetak.document.write(html);
 jendelaCetak.document.close();

 setTimeout(() => {
 jendelaCetak.focus();
 jendelaCetak.print();
 }, 500);
 };

 return (
 new Date(a.dibuat_pada).getTime() - new Date(b.dibuat_pada).getTime()
 );
 });
 }, [daftarNota]);

 const jumlahNotaDitolak = useMemo(() => {
 return daftarNotaUrut.filter((nota) => nota.status_verifikasi === "DITOLAK")
 .length;
 }, [daftarNotaUrut]);

 const jumlahNotaDisetujui = useMemo(() => {
 return daftarNotaUrut.filter(
 (nota) => nota.status_verifikasi === "DIVERIFIKASI"
 ).length;
 }, [daftarNotaUrut]);

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

 const hasilTanggal = new Date(tanggal);

 if (Number.isNaN(hasilTanggal.getTime())) return "-";

 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "long",
 year: "numeric",
 }).format(hasilTanggal);
 };

 const formatTanggalSingkat = (tanggal: string | null | undefined) => {
 if (!tanggal) return "-";

 const hasilTanggal = new Date(tanggal);

 if (Number.isNaN(hasilTanggal.getTime())) return "-";

 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 }).format(hasilTanggal);
 };

 const formatJam = (tanggal: string | null | undefined) => {
 if (!tanggal) return "-";

 const hasilTanggal = new Date(tanggal);

 if (Number.isNaN(hasilTanggal.getTime())) return "-";

 return new Intl.DateTimeFormat("id-ID", {
 hour: "2-digit",
 minute: "2-digit",
 hour12: false,
 }).format(hasilTanggal);
 };

 const formatTanggalJam = (tanggal: string | null | undefined) => {
 if (!tanggal) return "-";

 const hasilTanggal = new Date(tanggal);

 if (Number.isNaN(hasilTanggal.getTime())) return "-";

 return new Intl.DateTimeFormat("id-ID", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 hour12: false,
 }).format(hasilTanggal);
 };

 const formatJenisDeklarasi = (jenis: string) => {
 if (jenis === "PERJALANAN_DINAS") return "Perjalanan Dinas";
 if (jenis === "UANG_OPERASIONAL") return "Uang Operasional";
 return jenis;
 };

 const formatKategoriNota = (kategori: string | null) => {
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

 const ambilNamaFile = (pathFile: string | null | undefined) => {
 if (!pathFile) return "-";

 const pecah = pathFile.split("/");
 return pecah[pecah.length - 1] || pathFile;
 };

 const urlFile = (pathFile: string | null | undefined) => {
 if (!pathFile) return "";

 if (pathFile.startsWith("http")) {
 return pathFile;
 }

 return `${apiUrl}${pathFile}`;
 };

 const warnaStatus = (status: string) => {
 if (status === "DRAFT") return "bg-slate-100 text-slate-700";
 if (status === "DIAJUKAN") return "bg-blue-50 text-blue-700";
 if (status === "DIVERIFIKASI") return "bg-amber-50 text-amber-700";
 if (status === "DISETUJUI") return "bg-emerald-50 text-emerald-700";
 if (status === "DITOLAK") return "bg-red-50 text-red-700";
 return "bg-slate-100 text-slate-700";
 };

 const warnaStatusNota = (status: string) => {
 if (status === "BELUM_OCR") return "bg-amber-50 text-amber-700";
 if (status === "OCR_SELESAI") return "bg-emerald-50 text-emerald-700";
 if (status === "DIVERIFIKASI") return "bg-blue-50 text-blue-700";
 if (status === "DITOLAK") return "bg-red-50 text-red-700";
 return "bg-slate-100 text-slate-700";
 };

 const warnaStatusSaldo = (status: string) => {
 if (status === "AKTIF") return "bg-blue-50 text-blue-700";
 if (status === "PAS") return "bg-emerald-50 text-emerald-700";
 if (status === "ADA_SISA") return "bg-emerald-50 text-emerald-700";
 if (status === "MELEBIHI_NOMINAL") return "bg-red-50 text-red-700";
 if (status === "MENUNGGU_PENGEMBALIAN")
 return "bg-purple-50 text-purple-700";
 if (status === "SELESAI") return "bg-slate-100 text-slate-700";
 return "bg-slate-100 text-slate-700";
 };

 const ambilSaldoDeklarasi = async (idSaldo: number) => {
 try {
 const response = await fetch(`${apiUrl}/saldo/${idSaldo}`);

 if (!response.ok) {
 throw new Error("Gagal mengambil data saldo deklarasi?.");
 }

 const dataSaldo = await response.json();

 setSaldoDeklarasi(dataSaldo);
 } catch (error) {
 console.error(error);
 setSaldoDeklarasi(null);
 }
 };

 const ambilUlangDataDetail = async () => {
 const responseDeklarasi = await fetch(`${apiUrl}/deklarasi/${idDeklarasi}`);

 if (!responseDeklarasi.ok) {
 throw new Error("Gagal mengambil ulang detail deklarasi?.");
 }

 const hasilDeklarasi: DataDeklarasi = await responseDeklarasi.json();

 const dataPengguna = (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user"));

 if (dataPengguna) {
 const penggunaTersimpan: DataPenggunaTersimpan = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataPengguna));

 const adminAtauFa =
 penggunaTersimpan.role === "SUPER_ADMIN" ||
 penggunaTersimpan.role === "FA";

 const pemilikDeklarasi =
 Number(hasilDeklarasi.id_pengguna) === Number(penggunaTersimpan.id);

 if (!adminAtauFa && !pemilikDeklarasi) {
 router.replace("/hc/deklarasi-dinas");
 throw new Error("Kamu tidak memiliki akses ke deklarasi ini.");
 }
 }

 const responseNota = await fetch(`${apiUrl}/nota/deklarasi/${idDeklarasi}`);

 const hasilNota = responseNota.ok ? await responseNota.json() : [];

 const notaUrut: DataNota[] = Array.isArray(hasilNota)
 ? [...hasilNota].sort((a, b) => {
 return (
 new Date(a.dibuat_pada).getTime() -
 new Date(b.dibuat_pada).getTime()
 );
 })
 : [];

 setDeklarasi(hasilDeklarasi);
 setDaftarNota(notaUrut);

 setNominalOcrManual((nilaiLama) => {
 const nilaiBaru: Record<number, string> = {};

 notaUrut.forEach((nota) => {
 if (nilaiLama[nota.id] !== undefined) {
 nilaiBaru[nota.id] = nilaiLama[nota.id];
 return;
 }

 const nominalAwal = Math.round(
 normalisasiAngka(nota.nominal_final || nota.nominal_ocr)
 );

 nilaiBaru[nota.id] = nominalAwal > 0 ? String(nominalAwal) : "";
 });

 return nilaiBaru;
 });

 if (hasilDeklarasi.id_saldo) {
 await ambilSaldoDeklarasi(hasilDeklarasi.id_saldo);
 } else {
 setSaldoDeklarasi(null);
 }
 };

 useEffect(() => {
 const token = (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token"));
 const dataPengguna = (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user"));

 if (!token || !dataPengguna) {
 router.replace("/");
 return;
 }

 try {
 const penggunaTersimpan: DataPenggunaTersimpan = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataPengguna));
 setPenggunaLogin(penggunaTersimpan);
 } catch {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");
 router.replace("/");
 return;
 }

 const ambilDetailDeklarasi = async () => {
 try {
 await ambilUlangDataDetail();
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengambil data."
 );
 } finally {
 setSedangMemuat(false);
 }
 };

 ambilDetailDeklarasi();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [idDeklarasi, router]);

 const handleRefresh = async () => {
 try {
 setSedangRefresh(true);
 setPesanError("");
 setPesanSukses("");
 await ambilUlangDataDetail();
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan refresh data."
 );
 } finally {
 setSedangRefresh(false);
 }
 };

 const handleUbahStatusDeklarasi = async (
 statusBaru: "DIVERIFIKASI" | "DISETUJUI" | "DITOLAK"
 ) => {
 if (!deklarasi) return;

 if (statusBaru === "DISETUJUI") {
 const adaNotaDitolak = daftarNotaUrut.some(
 (nota) => nota.status_verifikasi === "DITOLAK"
 );

 const adaNotaBelumDiverifikasi = daftarNotaUrut.some((nota) => {
 return nota.status_verifikasi !== "DIVERIFIKASI";
 });

 if (adaNotaDitolak) {
 setPesanError(
 "Masih ada nota yang ditolak. Deklarasi belum bisa disetujui."
 );
 return;
 }

 if (adaNotaBelumDiverifikasi) {
 setPesanError(
 "Semua nota harus disetujui terlebih dahulu sebelum deklarasi disetujui."
 );
 return;
 }
 }

 let alasan_ditolak = "";

 if (statusBaru === "DITOLAK") {
 const contohNomorNota =
 daftarNotaUrut.length > 0
 ? "Contoh: Nota 1 foto buram, Nota 2 nominal tidak sesuai."
 : "Masukkan alasan penolakan.";

 const alasan = window.prompt(
 `Masukkan alasan penolakan deklarasi?.\n${contohNomorNota}`
 );

 if (!alasan || !alasan.trim()) {
 setPesanError("Alasan penolakan wajib diisi.");
 return;
 }

 alasan_ditolak = alasan.trim();
 }

 const teksKonfirmasi =
 statusBaru === "DIVERIFIKASI"
 ? "Yakin verifikasi deklarasi ini?"
 : statusBaru === "DISETUJUI"
 ? "Yakin setujui deklarasi ini?"
 : "Yakin tolak deklarasi ini?";

 const yakin = window.confirm(teksKonfirmasi);

 if (!yakin) return;

 setSedangUbahStatus(true);
 setPesanError("");
 setPesanSukses("");

 try {
 const response = await fetch(`${apiUrl}/deklarasi/${deklarasi?.id}/status`, {
 method: "PATCH",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 status: statusBaru,
 alasan_ditolak:
 statusBaru === "DITOLAK" ? alasan_ditolak : undefined,
 }),
 });

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(hasil?.message || "Gagal mengubah status deklarasi?.");
 }

 await ambilUlangDataDetail();

 if (statusBaru === "DIVERIFIKASI") {
 setPesanSukses("Deklarasi berhasil diverifikasi.");
 } else if (statusBaru === "DISETUJUI") {
 setPesanSukses("Deklarasi berhasil disetujui.");
 } else {
 setPesanSukses("Deklarasi berhasil ditolak.");
 }
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan mengubah status deklarasi?."
 );
 } finally {
 setSedangUbahStatus(false);
 }
 };

 const handleUbahStatusNota = async (
 nota: DataNota,
 nomorNota: number,
 statusBaru: "DIVERIFIKASI" | "DITOLAK"
 ) => {
 if (!bolehKoreksiNota) {
 setPesanError("Nota hanya dapat dikoreksi oleh Admin / FA.");
 return;
 }

 let alasan_koreksi = "";

 if (statusBaru === "DITOLAK") {
 const alasan = window.prompt(
 `Masukkan alasan penolakan Nota ${nomorNota}.\nContoh: Foto buram / nominal tidak sesuai / kategori salah.`
 );

 if (!alasan || !alasan.trim()) {
 setPesanError("Alasan penolakan nota wajib diisi.");
 return;
 }

 alasan_koreksi = alasan.trim();
 }

 const teksKonfirmasi =
 statusBaru === "DIVERIFIKASI"
 ? `Yakin setujui Nota ${nomorNota}?`
 : `Yakin tolak Nota ${nomorNota}?`;

 const yakin = window.confirm(teksKonfirmasi);

 if (!yakin) return;

 try {
 setPesanError("");
 setPesanSukses("");
 setSedangKoreksiNota(nota.id);

 const response = await fetch(`${apiUrl}/nota/${nota.id}/status`, {
 method: "PATCH",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 status_verifikasi: statusBaru,
 alasan_koreksi:
 statusBaru === "DITOLAK" ? alasan_koreksi : undefined,
 }),
 });

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(hasil?.message || "Gagal mengubah status nota.");
 }

 await ambilUlangDataDetail();

 if (statusBaru === "DIVERIFIKASI") {
 setPesanSukses(`Nota ${nomorNota} berhasil disetujui.`);
 } else {
 setPesanSukses(`Nota ${nomorNota} berhasil ditolak.`);
 }
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat koreksi nota."
 );
 } finally {
 setSedangKoreksiNota(null);
 }
 };

 const handleInputOcrManual = (idNota: number, value: string) => {
 const angkaSaja = value.replace(/[^\d]/g, "");

 setNominalOcrManual((nilaiLama) => ({
 ...nilaiLama,
 [idNota]: angkaSaja,
 }));
 };

 const handleSimpanOcrManual = async (nota: DataNota, nomorNota: number) => {
 if (!bolehKoreksiNota) {
 setPesanError("Koreksi OCR manual hanya dapat dilakukan Admin / FA.");
 return;
 }

 const nominal = Number(nominalOcrManual[nota.id] || 0);

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
 setSedangSimpanOcrManual(nota.id);

 const response = await fetch(`${apiUrl}/nota/ocr-sementara/${nota.id}`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 nominal,
 }),
 });

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(
 hasil?.message || "Gagal menyimpan koreksi OCR manual."
 );
 }

 await ambilUlangDataDetail();

 setPesanSukses(`Koreksi OCR manual Nota ${nomorNota} berhasil disimpan.`);
 } catch (error) {
 setPesanError(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menyimpan koreksi OCR manual."
 );
 } finally {
 setSedangSimpanOcrManual(null);
 }
 };

 const cetakPdfFinal = (
 modeSettlement: "FORM_SETTLEMENT" | "DATABASE_SETTLEMENT" = "FORM_SETTLEMENT"
 ) => {
 setModePdfUangOperasional(modeSettlement);

 document.body.classList.remove(
 "pdf-form-settlement-print",
 "pdf-db-landscape-print"
 );

 if (
 deklarasi?.jenis_deklarasi === "UANG_OPERASIONAL" &&
 modeSettlement === "DATABASE_SETTLEMENT"
 ) {
 document.body.classList.add("pdf-db-landscape-print");
 } else {
 document.body.classList.add("pdf-form-settlement-print");
 }

 setTimeout(() => {
 window.print();

 setTimeout(() => {
 document.body.classList.remove(
 "pdf-form-settlement-print",
 "pdf-db-landscape-print"
 );
 }, 1000);
 }, 500);
 };


 const ubahStatusBuktiPengembalianDetail = async (
 statusBukti: "DISETUJUI" | "DITOLAK"
 ) => {
 if (!saldoDeklarasi?.id) {
 alert("Data saldo tidak ditemukan.");
 return;
 }

 let alasanDitolak = "";

 if (statusBukti === "DITOLAK") {
 const inputAlasan = window.prompt(
 "Masukkan alasan penolakan bukti pengembalian:"
 );

 if (!inputAlasan || !inputAlasan.trim()) {
 alert("Alasan penolakan wajib diisi.");
 return;
 }

 alasanDitolak = inputAlasan.trim();
 }

 const yakin = window.confirm(
 statusBukti === "DISETUJUI"
 ? "Setujui bukti pengembalian ini? Saldo akan otomatis menjadi SELESAI."
 : "Tolak bukti pengembalian ini?"
 );

 if (!yakin) return;

 try {
 const response = await fetch(
 apiUrl + "/saldo/" + saldoDeklarasi.id + "/bukti-pengembalian/status",
 {
 method: "PATCH",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 status_bukti_pengembalian: statusBukti,
 alasan_bukti_pengembalian_ditolak: alasanDitolak,
 }),
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
 hasil?.message ||
 teksResponse ||
 "Gagal mengubah status bukti pengembalian."
 );
 }

 alert(
 statusBukti === "DISETUJUI"
 ? "Bukti pengembalian disetujui. Saldo sudah SELESAI."
 : "Bukti pengembalian ditolak."
 );

 window.location.reload();
 } catch (error) {
 alert(
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat memproses bukti pengembalian."
 );
 }
 };

 if (sedangMemuat) {

 const cetakDatabaseSettlementFixFinal = () => {
 const escapeHtmlPdf = (nilai: unknown) => {
 return String(nilai ?? "").replace(/[&<>"']/g, (karakter) => {
 const daftarKarakter: Record<string, string> = {
 "&": "&amp;",
 "<": "&lt;",
 ">": "&gt;",
 '"': "&quot;",
 "'": "&#039;",
 };

 return daftarKarakter[karakter] || karakter;
 });
 };

 const dataBaris = barisPdfSettlement.filter((baris) => baris.namaBarang);

 const barisCetak =
 dataBaris.length > 0
 ? dataBaris
 : [
 {
 nomor: 1,
 tanggal: formatTanggalPdfDeklarasi(deklarasi?.tanggal_kegiatan),
 namaBarang: "-",
 qty: 1,
 harga: 0,
 jumlah: 0,
 keterangan: "-",
 },
 ];

 const isiTabel = barisCetak
 .map((baris, index) => {
 const nomorSettlementDb = nomorSettlementUrutPdf || "001";
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;

 const nomorRabPb =
 nomorSettlementDb + "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 new Date(deklarasi?.tanggal_kegiatan).getFullYear();

 return [
 "<tr>",
 "<td></td>",
 '<td class="center">' + nomorSettlementDb + "</td>",
 '<td class="center">' + nomorItemDb + "</td>",
 '<td class="center">' + escapeHtmlPdf(itemSettDb) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' +
 escapeHtmlPdf(formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)) +
 "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.tanggal) + "</td>",
 "<td>" + escapeHtmlPdf(baris.namaBarang) + "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.qty) + "</td>",
 '<td class="money">' +
 escapeHtmlPdf(formatAngkaPdf(baris.harga)) +
 "</td>",
 '<td class="money">' +
 escapeHtmlPdf(formatAngkaPdf(baris.jumlah)) +
 "</td>",
 "<td>" + escapeHtmlPdf(baris.keterangan) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' + escapeHtmlPdf(nomorRabPb) + "</td>",
 '<td class="center">' + escapeHtmlPdf((baris as any).pic || deklarasi?.nama_pengguna || "-") + "</td>",
 "</tr>",
 ].join("");
 })
 .join("");

 const html = [
 "<!doctype html>",
 '<html lang="id">',
 "<head>",
 '<meta charset="utf-8" />',
 "<title>Database Settlement</title>",
 "<style>",
 "@page { size: A4 landscape; margin: 6mm; }",
 "html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #000; }",
 ".title { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 3mm; }",
 "table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6px; }",
 "th, td { border: 1px solid #9fbbe7; padding: 1px 2px; vertical-align: middle; line-height: 1.05; overflow-wrap: break-word; }",
 "th { background: #4f81bd; color: #fff; text-align: center; font-weight: 700; }",
 "tbody tr:nth-child(odd) td { background: #d9eaf7; }",
 "tbody tr:nth-child(even) td { background: #ffffff; }",
 ".yellow { background: #fff200 !important; color: #000 !important; }",
 ".center { text-align: center; white-space: nowrap; }",
 ".money { text-align: right; white-space: nowrap; }",
 "</style>",
 "</head>",
 "<body>",
 '<div class="title">DATABASE SETTLEMENT</div>',
 "<table>",
 "<colgroup>",
 '<col style="width:4%" />',
 '<col style="width:7%" />',
 '<col style="width:5%" />',
 '<col style="width:6%" />',
 '<col style="width:6%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:22%" />',
 '<col style="width:4%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:18%" />',
 '<col style="width:7%" />',
 '<col style="width:9%" />',
 '<col style="width:8%" />',
 "</colgroup>",
 "<thead>",
 "<tr>",
 '<th class="yellow">Jangan diubah</th>',
 "<th>NOMOR SETTLEMENT</th>",
 "<th>ITEM</th>",
 "<th>ITEM SETT</th>",
 "<th>DEPARTMENT</th>",
 "<th>TANGGAL PEMBUATAN</th>",
 "<th>TANGGAL PER ITEM</th>",
 "<th>NAMA BARANG / JASA</th>",
 "<th>Qty</th>",
 "<th>HARGA PER Qty</th>",
 "<th>Total</th>",
 "<th>Keterangan</th>",
 "<th>Cost Center</th>",
 "<th>Nomer RAB/PB</th>",
 "<th>PIC</th>",
 "</tr>",
 "</thead>",
 "<tbody>",
 isiTabel,
 "</tbody>",
 "</table>",
 "</body>",
 "</html>",
 ].join("");

 const jendelaCetak = window.open("", "_blank", "width=1200,height=800");

 if (!jendelaCetak) {
 alert("Popup diblokir browser. Izinkan popup untuk localhost.");
 return;
 }

 jendelaCetak.document.open();
 jendelaCetak.document.write(html);
 jendelaCetak.document.close();

 setTimeout(() => {
 jendelaCetak.focus();
 jendelaCetak.print();
 }, 500);
 };


 
 const cetakDatabaseSettlementAman = () => {
 const escapeHtmlPdf = (nilai: unknown) => {
 return String(nilai ?? "").replace(/[&<>"']/g, (karakter) => {
 const daftarKarakter: Record<string, string> = {
 "&": "&amp;",
 "<": "&lt;",
 ">": "&gt;",
 '"': "&quot;",
 "'": "&#039;",
 };

 return daftarKarakter[karakter] || karakter;
 });
 };

 const dataBaris = barisPdfSettlement.filter((baris) => baris.namaBarang);

 const barisCetak =
 dataBaris.length > 0
 ? dataBaris
 : [
 {
 nomor: 1,
 tanggal: formatTanggalPdfDeklarasi(deklarasi?.tanggal_kegiatan),
 namaBarang: "-",
 qty: 1,
 harga: 0,
 jumlah: 0,
 keterangan: "-",
 },
 ];

 const isiTabel = barisCetak
 .map((baris, index) => {
 const nomorSettlementDb = nomorSettlementUrutPdf || "001";
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;

 const nomorRabPb =
 nomorSettlementDb + "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 new Date(deklarasi?.tanggal_kegiatan).getFullYear();

 return [
 "<tr>",
 "<td></td>",
 '<td class="center">' + nomorSettlementDb + "</td>",
 '<td class="center">' + nomorItemDb + "</td>",
 '<td class="center">' + escapeHtmlPdf(itemSettDb) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' +
 escapeHtmlPdf(formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)) +
 "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.tanggal) + "</td>",
 "<td>" + escapeHtmlPdf(baris.namaBarang) + "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.qty) + "</td>",
 '<td class="money">' +
 escapeHtmlPdf(formatAngkaPdf(baris.harga)) +
 "</td>",
 '<td class="money">' +
 escapeHtmlPdf(formatAngkaPdf(baris.jumlah)) +
 "</td>",
 "<td>" + escapeHtmlPdf(baris.keterangan) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' + escapeHtmlPdf(nomorRabPb) + "</td>",
 '<td class="center">' + escapeHtmlPdf((baris as any).pic || deklarasi?.nama_pengguna || "-") + "</td>",
 "</tr>",
 ].join("");
 })
 .join("");

 const html = [
 "<!doctype html>",
 '<html lang="id">',
 "<head>",
 '<meta charset="utf-8" />',
 "<title>Database Settlement</title>",
 "<style>",
 "@page { size: A4 landscape; margin: 6mm; }",
 "html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #000; }",
 ".title { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 3mm; }",
 "table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6px; }",
 "th, td { border: 1px solid #9fbbe7; padding: 1px 2px; vertical-align: middle; line-height: 1.05; overflow-wrap: break-word; }",
 "th { background: #4f81bd; color: #fff; text-align: center; font-weight: 700; }",
 "tbody tr:nth-child(odd) td { background: #d9eaf7; }",
 "tbody tr:nth-child(even) td { background: #ffffff; }",
 ".yellow { background: #fff200 !important; color: #000 !important; }",
 ".center { text-align: center; white-space: nowrap; }",
 ".money { text-align: right; white-space: nowrap; }",
 "</style>",
 "</head>",
 "<body>",
 '<div class="title">DATABASE SETTLEMENT</div>',
 "<table>",
 "<colgroup>",
 '<col style="width:4%" />',
 '<col style="width:7%" />',
 '<col style="width:5%" />',
 '<col style="width:6%" />',
 '<col style="width:6%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:22%" />',
 '<col style="width:4%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:18%" />',
 '<col style="width:7%" />',
 '<col style="width:9%" />',
 '<col style="width:8%" />',
 "</colgroup>",
 "<thead>",
 "<tr>",
 '<th class="yellow">Jangan diubah</th>',
 "<th>NOMOR SETTLEMENT</th>",
 "<th>ITEM</th>",
 "<th>ITEM SETT</th>",
 "<th>DEPARTMENT</th>",
 "<th>TANGGAL PEMBUATAN</th>",
 "<th>TANGGAL PER ITEM</th>",
 "<th>NAMA BARANG / JASA</th>",
 "<th>Qty</th>",
 "<th>HARGA PER Qty</th>",
 "<th>Total</th>",
 "<th>Keterangan</th>",
 "<th>Cost Center</th>",
 "<th>Nomer RAB/PB</th>",
 "<th>PIC</th>",
 "</tr>",
 "</thead>",
 "<tbody>",
 isiTabel,
 "</tbody>",
 "</table>",
 "</body>",
 "</html>",
 ].join("");

 const jendelaCetak = window.open("", "_blank", "width=1200,height=800");

 if (!jendelaCetak) {
 alert("Popup diblokir browser. Izinkan popup untuk localhost.");
 return;
 }

 jendelaCetak.document.open();
 jendelaCetak.document.write(html);
 jendelaCetak.document.close();

 setTimeout(() => {
 jendelaCetak.focus();
 jendelaCetak.print();
 }, 500);
 };


 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-2xl border border-red-100 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-lg">
 Memuat detail deklarasi?...
 </div>
 </main>
 );
 }

 if (pesanError && !deklarasi) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="max-w-md rounded-[28px] border border-red-100 bg-white p-6 text-center shadow-xl">
 <div className="text-xl font-black text-slate-900">
 Data tidak ditemukan
 </div>

 <p className="mt-2 text-sm leading-6 text-slate-500">
 {pesanError}
 </p>

 <button
 type="button"
 onClick={() => router.push(halamanKembali)}
 className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
 >
 {teksKembali}
 </button>
 </div>
 </main>
 );
 }

 if (!deklarasi) {
 return null;
 }

 /* PDF_TEMPLATE_START */
 const formatAngkaPdf = (nilai: string | number | unknown) => {
 const angka = Math.round(normalisasiAngka(nilai));

 return new Intl.NumberFormat("en-US", {
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(angka);
 };

 const renderNominalPdf = (nilai: number) => {
 if (!nilai || nilai <= 0) return "";
 return "Rp " + formatAngkaPdf(nilai);
 };

 const formatTanggalPdfDeklarasi = (tanggal: string | null | undefined) => {
 if (!tanggal) return "";

 const hasilTanggal = new Date(tanggal);
 if (Number.isNaN(hasilTanggal.getTime())) return "";

 const hari = String(hasilTanggal.getDate()).padStart(2, "0");
 const bulan = new Intl.DateTimeFormat("en-US", {
 month: "short",
 }).format(hasilTanggal);
 const tahun = String(hasilTanggal.getFullYear()).slice(-2);

 return hari + "-" + bulan + "-" + tahun;
 };

 const kategoriKolomDeklarasi = (kategori: string | null) => {
 const teksKategori = String(kategori || "").toUpperCase();

 if (teksKategori.includes("TRANSPORT")) return "transportasi";
 if (
 teksKategori.includes("AKOMODASI") ||
 teksKategori.includes("HOTEL")
 ) {
 return "hotel";
 }
 if (teksKategori.includes("MAKAN")) return "uang_makan";

 return "lain_lain";
 };

 const jumlahUangMukaPdf = normalisasiAngka(
 saldoDeklarasi?.nominal_transfer ?? deklarasi?.total_nominal
 );

 const totalDeklarasiPdf = daftarNotaUrut.reduce((total, nota) => {
 return total + normalisasiAngka(nota.nominal_final);
 }, 0);

 const selisihPdf = jumlahUangMukaPdf - totalDeklarasiPdf;
 const nilaiSelisihPdf = Math.abs(selisihPdf);
 const pihakSelisihPdf =
 selisihPdf === 0
 ? "Tidak Ada Pengembalian"
 : selisihPdf > 0
 ? "Pengembalian dari Karyawan"
 : "Pengembalian dari Perusahaan";

 const tanggalCetakPdf = formatTanggal(new Date().toISOString());

 const nomorSettlementDasarPdf = 1;
 const nomorSettlementUrutPdf = String(nomorSettlementDasarPdf).padStart(3, "0");

 const bulanRomawiPdf = (() => {
 const bulan = new Date(deklarasi?.tanggal_kegiatan).getMonth() + 1;
 const daftar = [
 "",
 "I",
 "II",
 "III",
 "IV",
 "V",
 "VI",
 "VII",
 "VIII",
 "IX",
 "X",
 "XI",
 "XII",
 ];

 return daftar[bulan] || "";
 })();

 const nomorSettlementLengkapPdf =
 nomorSettlementUrutPdf +
 "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 new Date(deklarasi?.tanggal_kegiatan).getFullYear();

 const barisPdfDeklarasi = daftarNotaUrut.map((nota) => {
 const nominal = normalisasiAngka(nota.nominal_final);
 const kolom = kategoriKolomDeklarasi(nota.kategori_nota);

 return {
 tanggal: formatTanggalPdfDeklarasi(nota.dibuat_pada),
 uang_makan: kolom === "uang_makan" ? nominal : 0,
 transportasi: kolom === "transportasi" ? nominal : 0,
 hotel: kolom === "hotel" ? nominal : 0,
 lain_lain: kolom === "lain_lain" ? nominal : 0,
 jumlah: nominal,
 keterangan: formatKategoriNota(nota.kategori_nota).toUpperCase(),
 };
 });

 while (barisPdfDeklarasi.length < 5) {
 barisPdfDeklarasi.push({
 tanggal: "",
 uang_makan: 0,
 transportasi: 0,
 hotel: 0,
 lain_lain: 0,
 jumlah: 0,
 keterangan: "",
 });
 }

 const barisPdfSettlement = daftarNotaUrut.map((nota, index) => {
 const nominal = normalisasiAngka(nota.nominal_final);
 const namaBarang =
 nota.barang_jasa && String(nota.barang_jasa).trim()
 ? String(nota.barang_jasa).trim()
 : formatKategoriNota(nota.kategori_nota).toUpperCase();

 const keteranganSettlement =
 nota.keterangan_settlement && String(nota.keterangan_settlement).trim()
 ? String(nota.keterangan_settlement).trim()
 : namaBarang;

 const picSettlement =
 nota.pic_settlement && String(nota.pic_settlement).trim()
 ? String(nota.pic_settlement).trim()
 : deklarasi?.nama_pengguna;

 return {
 nomor: index + 1,
 tanggal: formatTanggalPdfDeklarasi(nota.dibuat_pada),
 namaBarang,
 qty: 1,
 harga: nominal,
 jumlah: nominal,
 keterangan: keteranganSettlement,
 pic: picSettlement,
 };
 });

 while (barisPdfSettlement.length < 5) {
 barisPdfSettlement.push({
 nomor: barisPdfSettlement.length + 1,
 tanggal: "",
 namaBarang: "",
 qty: 0,
 harga: 0,
 jumlah: 0,
 keterangan: "",
 });
 }
 /* PDF_TEMPLATE_END */


 const cetakDatabaseSettlementFixScopeSekarang = () => {
 const escapeHtmlPdf = (nilai: unknown) => {
 return String(nilai ?? "").replace(/[&<>"']/g, (karakter) => {
 const daftarKarakter: Record<string, string> = {
 "&": "&amp;",
 "<": "&lt;",
 ">": "&gt;",
 '"': "&quot;",
 "'": "&#039;",
 };

 return daftarKarakter[karakter] || karakter;
 });
 };

 const dataBaris = barisPdfSettlement.filter((baris) => baris.namaBarang);

 const barisCetak =
 dataBaris.length > 0
 ? dataBaris
 : [
 {
 nomor: 1,
 tanggal: formatTanggalPdfDeklarasi(deklarasi?.tanggal_kegiatan),
 namaBarang: "-",
 qty: 1,
 harga: 0,
 jumlah: 0,
 keterangan: "-",
 },
 ];

 const isiTabel = barisCetak
 .map((baris, index) => {
 const nomorSettlementDb = nomorSettlementUrutPdf || "001";
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;

 const nomorRabPb =
 nomorSettlementDb + "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 new Date(deklarasi?.tanggal_kegiatan).getFullYear();

 return [
 "<tr>",
 "<td></td>",
 '<td class="center">' + nomorSettlementDb + "</td>",
 '<td class="center">' + nomorItemDb + "</td>",
 '<td class="center">' + escapeHtmlPdf(itemSettDb) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' +
 escapeHtmlPdf(formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)) +
 "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.tanggal) + "</td>",
 "<td>" + escapeHtmlPdf(baris.namaBarang) + "</td>",
 '<td class="center">' + escapeHtmlPdf(baris.qty) + "</td>",
 '<td class="money">' +
 escapeHtmlPdf(formatAngkaPdf(baris.harga)) +
 "</td>",
 '<td class="money">' +
 escapeHtmlPdf(formatAngkaPdf(baris.jumlah)) +
 "</td>",
 "<td>" + escapeHtmlPdf(baris.keterangan) + "</td>",
 '<td class="center">HCGA</td>',
 '<td class="center">' + escapeHtmlPdf(nomorRabPb) + "</td>",
 '<td class="center">' + escapeHtmlPdf((baris as any).pic || deklarasi?.nama_pengguna || "-") + "</td>",
 "</tr>",
 ].join("");
 })
 .join("");

 const html = [
 "<!doctype html>",
 '<html lang="id">',
 "<head>",
 '<meta charset="utf-8" />',
 "<title>Database Settlement</title>",
 "<style>",
 "@page { size: A4 landscape; margin: 6mm; }",
 "html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #000; }",
 ".title { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 3mm; }",
 "table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6px; }",
 "th, td { border: 1px solid #9fbbe7; padding: 1px 2px; vertical-align: middle; line-height: 1.05; overflow-wrap: break-word; }",
 "th { background: #4f81bd; color: #fff; text-align: center; font-weight: 700; }",
 "tbody tr:nth-child(odd) td { background: #d9eaf7; }",
 "tbody tr:nth-child(even) td { background: #ffffff; }",
 ".yellow { background: #fff200 !important; color: #000 !important; }",
 ".center { text-align: center; white-space: nowrap; }",
 ".money { text-align: right; white-space: nowrap; }",
 "</style>",
 "</head>",
 "<body>",
 '<div class="title">DATABASE SETTLEMENT</div>',
 "<table>",
 "<colgroup>",
 '<col style="width:4%" />',
 '<col style="width:7%" />',
 '<col style="width:5%" />',
 '<col style="width:6%" />',
 '<col style="width:6%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:22%" />',
 '<col style="width:4%" />',
 '<col style="width:8%" />',
 '<col style="width:8%" />',
 '<col style="width:18%" />',
 '<col style="width:7%" />',
 '<col style="width:9%" />',
 '<col style="width:8%" />',
 "</colgroup>",
 "<thead>",
 "<tr>",
 '<th class="yellow">Jangan diubah</th>',
 "<th>NOMOR SETTLEMENT</th>",
 "<th>ITEM</th>",
 "<th>ITEM SETT</th>",
 "<th>DEPARTMENT</th>",
 "<th>TANGGAL PEMBUATAN</th>",
 "<th>TANGGAL PER ITEM</th>",
 "<th>NAMA BARANG / JASA</th>",
 "<th>Qty</th>",
 "<th>HARGA PER Qty</th>",
 "<th>Total</th>",
 "<th>Keterangan</th>",
 "<th>Cost Center</th>",
 "<th>Nomer RAB/PB</th>",
 "<th>PIC</th>",
 "</tr>",
 "</thead>",
 "<tbody>",
 isiTabel,
 "</tbody>",
 "</table>",
 "</body>",
 "</html>",
 ].join("");

 const jendelaCetak = window.open("", "_blank", "width=1200,height=800");

 if (!jendelaCetak) {
 alert("Popup diblokir browser. Izinkan popup untuk localhost.");
 return;
 }

 jendelaCetak.document.open();
 jendelaCetak.document.write(html);
 jendelaCetak.document.close();

 setTimeout(() => {
 jendelaCetak.focus();
 jendelaCetak.print();
 }, 500);
 };


 return (
 <main className="min-h-screen bg-slate-50 px-4 py-6">

 


 

 <section className="no-print mx-auto max-w-5xl">
 <button
 type="button"
 onClick={() => router.push(halamanKembali)}
 className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
 >
 <ArrowLeft className="h-4 w-4" />
 {teksKembali}
 </button>

 <div className="rounded-[32px] bg-gradient-to-r from-red-700 via-red-600 to-rose-500 p-6 text-white shadow-[0_24px_80px_rgba(220,38,38,0.25)] md:p-8">
 <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
 <div>
 <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
 <FileText className="h-4 w-4" />
 Detail Deklarasi
 </div>

 <h1 className="text-3xl font-black md:text-4xl">
 {deklarasi?.kode_deklarasi}
 </h1>

 <p className="mt-3 max-w-2xl text-sm leading-7 text-white/90">
 Detail deklarasi milik {deklarasi?.nama_pengguna}. Admin / FA
 dapat memeriksa nomor nota, kategori, nominal, Upload Jam, dan
 melakukan koreksi OCR manual per nota.
 </p>
 </div>

 <div className="flex flex-col gap-3 md:items-end">
 <div
 className={`w-fit rounded-2xl px-4 py-3 text-sm font-black ${warnaStatus(
 deklarasi?.status
 )}`}
 >
 {deklarasi?.status}
 </div>

 <button
 type="button"
 onClick={handleRefresh}
 disabled={sedangRefresh}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <RefreshCw
 className={`h-4 w-4 ${sedangRefresh ? "animate-spin" : ""}`}
 />
 Refresh
 </button>

 {deklarasi?.status === "DISETUJUI" && (
 <>
 {deklarasi?.jenis_deklarasi === "UANG_OPERASIONAL" ? (
 <div className="flex flex-col gap-2 md:items-end">
 <button
 type="button"
 onClick={() => cetakPdfFinal("FORM_SETTLEMENT")}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-lg shadow-red-900/20 transition hover:bg-emerald-50"
 >
 <Printer className="h-4 w-4" />
 Cetak Form Settlement
 </button>

 <button
 type="button"
 onClick={() => cetakDatabaseSettlementFixScopeSekarang()}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg shadow-red-900/20 transition hover:bg-blue-50"
 >
 <Printer className="h-4 w-4" />
 Cetak Database Settlement
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => cetakPdfFinal()}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-lg shadow-red-900/20 transition hover:bg-emerald-50"
 >
 <Printer className="h-4 w-4" />
 Cetak PDF Final
 </button>
 )}
 </>
 )}

 {apakahAdminFa && (
 <div className="flex flex-col gap-3 md:items-end">
 {bolehVerifikasi && (
 <button
 type="button"
 onClick={() =>
 handleUbahStatusDeklarasi("DIVERIFIKASI")
 }
 disabled={sedangUbahStatus}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-900/20 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
 >
 <ShieldCheck className="h-4 w-4" />
 {sedangUbahStatus ? "Memproses..." : "Verifikasi"}
 </button>
 )}

 {bolehSetujui && (
 <button
 type="button"
 onClick={() => handleUbahStatusDeklarasi("DISETUJUI")}
 disabled={sedangUbahStatus}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
 >
 <CheckCircle2 className="h-4 w-4" />
 {sedangUbahStatus ? "Memproses..." : "Setujui Deklarasi"}
 </button>
 )}

 {bolehTolak && (
 <button
 type="button"
 onClick={() => handleUbahStatusDeklarasi("DITOLAK")}
 disabled={sedangUbahStatus}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
 >
 <XCircle className="h-4 w-4" />
 {sedangUbahStatus ? "Memproses..." : "Tolak Deklarasi"}
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 </div>

 {pesanError && (
 <div className="mt-5 rounded-[28px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 shadow-[0_12px_40px_rgba(220,38,38,0.08)]">
 {pesanError}
 </div>
 )}

 {pesanSukses && (
 <div className="mt-5 rounded-[28px] border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-[0_12px_40px_rgba(16,185,129,0.08)]">
 {pesanSukses}
 </div>
 )}

 {jumlahNotaDitolak > 0 && (
 <div className="mt-5 rounded-[28px] border border-red-100 bg-red-50 px-5 py-4 shadow-[0_12px_40px_rgba(220,38,38,0.08)]">
 <div className="flex items-start gap-3">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
 <AlertCircle className="h-5 w-5" />
 </div>

 <div>
 <div className="text-base font-black text-red-700">
 Ada {jumlahNotaDitolak} nota ditolak
 </div>

 <div className="mt-1 text-sm leading-6 text-red-700">
 Periksa alasan penolakan pada masing-masing nomor nota. Nota
 yang ditolak tidak dihitung ke total penggunaan.
 </div>
 </div>
 </div>
 </div>
 )}

 {deklarasi?.status === "DIAJUKAN" && apakahAdminFa && (
 <div className="mt-5 rounded-[28px] border border-blue-100 bg-blue-50 px-5 py-4 shadow-[0_12px_40px_rgba(59,130,246,0.08)]">
 <div className="flex items-start gap-3">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600">
 <ShieldCheck className="h-5 w-5" />
 </div>

 <div>
 <div className="text-base font-black text-blue-700">
 Menunggu Pemeriksaan Admin / FA
 </div>

 <div className="mt-1 text-sm leading-6 text-blue-700">
 Setujui atau tolak setiap nota terlebih dahulu. Jika nominal
 OCR salah, gunakan kolom OCR Manual di baris nota.
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
 <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <FileText className="h-6 w-6" />
 </div>
 <div className="text-sm text-slate-500">Jenis Deklarasi</div>
 <div className="mt-2 text-lg font-black text-slate-900">
 {formatJenisDeklarasi(deklarasi?.jenis_deklarasi)}
 </div>
 </div>

 <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <CalendarDays className="h-6 w-6" />
 </div>
 <div className="text-sm text-slate-500">Tanggal Kegiatan</div>
 <div className="mt-2 text-lg font-black text-slate-900">
 {formatTanggal(deklarasi?.tanggal_kegiatan)}
 </div>
 </div>

 <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <ReceiptText className="h-6 w-6" />
 </div>
 <div className="text-sm text-slate-500">Total Penggunaan Nota</div>
 <div className="mt-2 text-lg font-black text-slate-900">
 {formatRupiah(deklarasi?.total_nominal)}
 </div>
 <div className="mt-1 text-xs text-slate-500">
 {jumlahNotaDisetujui} nota disetujui • {jumlahNotaDitolak} nota
 ditolak
 </div>
 </div>
 </div>

 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <Wallet className="h-5 w-5" />
 </div>
 <div>
 <div className="text-xl font-black text-slate-900">
 Informasi Saldo
 </div>
 <div className="text-sm text-slate-500">
 Saldo transfer yang terhubung dengan deklarasi ini.
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div className="rounded-2xl bg-slate-50 px-4 py-4">
 <div className="text-xs font-semibold text-slate-500">
 Saldo Transfer
 </div>
 <div className="mt-2 text-lg font-black text-slate-900">
 {saldoDeklarasi
 ? formatRupiah(saldoDeklarasi.nominal_transfer)
 : "-"}
 </div>
 </div>

 <div className="rounded-2xl bg-slate-50 px-4 py-4">
 <div className="text-xs font-semibold text-slate-500">
 Total Penggunaan
 </div>
 <div className="mt-2 text-lg font-black text-slate-900">
 {formatRupiah(deklarasi?.total_nominal)}
 </div>
 </div>

 <div className="rounded-2xl bg-slate-50 px-4 py-4">
 <div className="text-xs font-semibold text-slate-500">
 Sisa Saldo
 </div>
 <div
 className={
 saldoDeklarasi &&
 normalisasiAngka(saldoDeklarasi.sisa_saldo) < 0
 ? "mt-2 text-lg font-black text-red-600"
 : "mt-2 text-lg font-black text-emerald-600"
 }
 >
 {saldoDeklarasi ? formatRupiah(saldoDeklarasi.sisa_saldo) : "-"}
 </div>
 </div>
 </div>

 {saldoDeklarasi && (
 <div className="mt-4 flex justify-end">
 <div
 className={`rounded-2xl px-4 py-3 text-sm font-black ${warnaStatusSaldo(
 saldoDeklarasi.status_saldo
 )}`}
 >
 Status Saldo: {saldoDeklarasi.status_saldo}
 </div>
 </div>
 )}
 </div>

 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <MapPin className="h-5 w-5" />
 </div>
 <div>
 <div className="text-xl font-black text-slate-900">
 Informasi Kegiatan
 </div>
 <div className="text-sm text-slate-500">
 Lokasi dan keterangan deklarasi?.
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 <div className="rounded-2xl bg-slate-50 px-4 py-3">
 <div className="text-xs font-semibold text-slate-500">Lokasi</div>
 <div className="mt-1 font-black text-slate-900">
 {deklarasi?.lokasi}
 </div>
 </div>

 <div className="rounded-2xl bg-slate-50 px-4 py-3">
 <div className="text-xs font-semibold text-slate-500">
 Dibuat Oleh
 </div>
 <div className="mt-1 font-black text-slate-900">
 {deklarasi?.nama_pengguna} / {deklarasi?.nrp}
 </div>
 </div>
 </div>

 <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
 <div className="text-xs font-semibold text-slate-500">
 Keterangan
 </div>
 <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
 {deklarasi?.keterangan}
 </div>
 </div>
 </div>

 <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="text-xl font-black text-slate-900">
 Daftar Nota
 </div>

 <p className="mt-2 text-sm leading-6 text-slate-500">
 Admin / FA dapat setujui atau tolak setiap nota berdasarkan
 nomor nota, kategori, nominal, dan Upload Jam. Koreksi OCR
 manual ada di baris nota.
 </p>
 </div>

 <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
 Total Nota: {daftarNotaUrut.length}
 </div>
 </div>

 <div className="mt-5">
 {daftarNotaUrut.length === 0 ? (
 <div className="rounded-3xl bg-slate-50 px-5 py-8 text-center">
 <ReceiptText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
 <p className="text-sm font-black text-slate-700">
 Belum ada nota.
 </p>
 </div>
 ) : (
 <div className="grid gap-4">
 {daftarNotaUrut.map((nota, index) => {
 const nomorNota = index + 1;
 const urlGambar = urlFile(nota.path_file);
 const sedangProsesNota = sedangKoreksiNota === nota.id;
 const sedangSimpanOcr = sedangSimpanOcrManual === nota.id;

 return (
 <div
 key={nota.id}
 className="rounded-[28px] border border-slate-100 bg-slate-50 p-4"
 >
 <div className="flex flex-col gap-4 md:flex-row">
 <button
 type="button"
 onClick={() => setGambarPreview(urlGambar)}
 className="h-44 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white md:w-32"
 >
 <img
 src={urlGambar}
 alt={`Nota ${nomorNota}`}
 className="h-full w-full object-cover"
 />
 </button>

 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
 Nota {nomorNota}
 </span>

 <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
 {formatKategoriNota(nota.kategori_nota)}
 </span>

 <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
 Upload Jam {formatJam(nota.dibuat_pada)}
 </span>

 <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
 Tanggal {formatTanggalSingkat(nota.dibuat_pada)}
 </span>

 <span
 className={`rounded-full px-3 py-1 text-xs font-black ${warnaStatusNota(
 nota.status_verifikasi
 )}`}
 >
 {nota.status_verifikasi}
 </span>

 {nota.apakah_dikoreksi &&
 nota.alasan_koreksi ===
 "Koreksi manual nominal OCR" && (
 <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
 OCR Manual
 </span>
 )}
 </div>

 {bolehKoreksiNota && (
 <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3">
 <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700">
 Koreksi OCR Manual
 </div>

 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
 <input
 type="text"
 inputMode="numeric"
 value={nominalOcrManual[nota.id] || ""}
 onChange={(event) =>
 handleInputOcrManual(
 nota.id,
 event.target.value
 )
 }
 placeholder="Contoh: 357500"
 className="min-h-11 flex-1 rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm font-black text-slate-900 outline-none transition focus:border-amber-400"
 />

 <button
 type="button"
 onClick={() =>
 handleSimpanOcrManual(nota, nomorNota)
 }
 disabled={sedangSimpanOcr}
 className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangSimpanOcr ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <ReceiptText className="h-4 w-4" />
 )}
 {sedangSimpanOcr
 ? "Menyimpan..."
 : "Simpan Koreksi"}
 </button>
 </div>

 <div className="mt-2 text-xs font-semibold leading-5 text-amber-700">
 Isi nominal final yang benar. Contoh:
 357500 atau 357.500.
 </div>
 </div>
 )}

 <div className="mt-3 text-sm font-black text-slate-900">
 {ambilNamaFile(nota.path_file)}
 </div>

 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <div className="rounded-2xl bg-white p-4">
 <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Nominal OCR
 </div>
 <div className="mt-1 text-lg font-black text-slate-900">
 {formatRupiah(nota.nominal_ocr)}
 </div>
 </div>

 <div className="rounded-2xl bg-white p-4">
 <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Nominal Final
 </div>
 <div className="mt-1 text-lg font-black text-slate-900">
 {formatRupiah(nota.nominal_final)}
 </div>
 </div>
 </div>

 {nota.status_verifikasi === "DITOLAK" &&
 nota.alasan_koreksi && (
 <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
 <div className="text-xs font-black uppercase tracking-[0.14em] text-red-500">
 Alasan Nota Ditolak
 </div>
 <div className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-red-700">
 {nota.alasan_koreksi}
 </div>
 </div>
 )}

 <div className="mt-4 rounded-2xl bg-white p-4">
 <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Hasil OCR
 </div>
 <div className="max-h-32 overflow-y-auto whitespace-pre-line text-sm leading-6 text-slate-600">
 {nota.hasil_ocr_text || "-"}
 </div>
 </div>

 {bolehKoreksiNota && (
 <div className="mt-4 flex flex-col gap-2 sm:flex-row">
 <button
 type="button"
 disabled={
 sedangProsesNota ||
 nota.status_verifikasi === "DIVERIFIKASI"
 }
 onClick={() =>
 handleUbahStatusNota(
 nota,
 nomorNota,
 "DIVERIFIKASI"
 )
 }
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {sedangProsesNota ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <CheckCircle2 className="h-4 w-4" />
 )}
 Setujui Nota
 </button>

 <button
 type="button"
 disabled={
 sedangProsesNota ||
 nota.status_verifikasi === "DITOLAK"
 }
 onClick={() =>
 handleUbahStatusNota(
 nota,
 nomorNota,
 "DITOLAK"
 )
 }
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {sedangProsesNota ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <XCircle className="h-4 w-4" />
 )}
 Tolak Nota
 </button>
 </div>
 )}

 <div className="mt-3 text-xs font-semibold text-slate-400">
 ID Nota: #{nota.id} • Upload lengkap:{" "}
 {formatTanggalJam(nota.dibuat_pada)} • Upload Jam{" "}
 {formatJam(nota.dibuat_pada)}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </section>
 {saldoDeklarasi &&
 (saldoDeklarasi.status_saldo === "MENUNGGU_PENGEMBALIAN" ||
 saldoDeklarasi.status_bukti_pengembalian !== "BELUM_UPLOAD" ||
 Number(saldoDeklarasi.nominal_pengembalian || 0) > 0 ||
 !!saldoDeklarasi.path_file_bukti_pengembalian) && (
 <section className="mx-auto mt-6 max-w-5xl rounded-[32px] border border-purple-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
 <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
 <div>
 <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-purple-700">
 Bukti Pengembalian
 </span>

 <h2 className="mt-3 text-2xl font-black text-slate-950">
 Riwayat Pengembalian Saldo
 </h2>

 <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
 Riwayat nominal, foto bukti transfer, status, dan hasil verifikasi pengembalian saldo.
 </p>
 </div>

 <span className="inline-flex w-fit rounded-full bg-purple-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-purple-700">
 {saldoDeklarasi.status_bukti_pengembalian || "BELUM_UPLOAD"}
 </span>
 </div>

 <div className="grid gap-4 md:grid-cols-3">
 <div className="rounded-3xl bg-slate-50 p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
 Wajib Dikembalikan
 </p>
 <p className="mt-2 text-xl font-black text-purple-700">
 {formatRupiah(saldoDeklarasi.sisa_saldo)}
 </p>
 </div>

 <div className="rounded-3xl bg-slate-50 p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
 Diinput Karyawan
 </p>
 <p className="mt-2 text-xl font-black text-slate-950">
 {formatRupiah(saldoDeklarasi.nominal_pengembalian || 0)}
 </p>
 </div>

 <div className="rounded-3xl bg-slate-50 p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
 Foto Bukti Transfer
 </p>

 {saldoDeklarasi.path_file_bukti_pengembalian ? (
 <button
 type="button"
 onClick={() => {
 const pathFile =
 saldoDeklarasi.path_file_bukti_pengembalian || "";
 const urlFile = pathFile.startsWith("http")
 ? pathFile
 : apiUrl + pathFile;

 window.open(urlFile, "_blank", "noopener,noreferrer");
 }}
 className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-purple-600 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-700"
 >
 Lihat Foto Bukti
 </button>
 ) : (
 <p className="mt-3 text-sm font-bold text-red-600">
 Belum ada foto bukti.
 </p>
 )}
 </div>
 </div>

 <div className="mt-4 grid gap-4 md:grid-cols-2">
 <div className="rounded-3xl bg-slate-50 p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
 Tanggal Upload Bukti
 </p>
 <p className="mt-2 text-sm font-black text-slate-900">
 {formatTanggal(saldoDeklarasi.tanggal_upload_bukti_pengembalian)}
 </p>
 </div>

 <div className="rounded-3xl bg-slate-50 p-5">
 <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
 Tanggal Verifikasi
 </p>
 <p className="mt-2 text-sm font-black text-slate-900">
 {formatTanggal(saldoDeklarasi.tanggal_verifikasi_pengembalian)}
 </p>
 </div>
 </div>

 {saldoDeklarasi.status_bukti_pengembalian === "DITOLAK" && (
 <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
 Alasan ditolak:{" "}
 {saldoDeklarasi.alasan_bukti_pengembalian_ditolak || "-"}
 </div>
 )}

 {saldoDeklarasi.status_bukti_pengembalian === "DIAJUKAN" ? (
 <div className="mt-5 grid gap-3 md:grid-cols-2">
 <button
 type="button"
 onClick={() =>
 ubahStatusBuktiPengembalianDetail("DISETUJUI")
 }
 className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
 >
 Setujui Bukti Pengembalian
 </button>

 <button
 type="button"
 onClick={() =>
 ubahStatusBuktiPengembalianDetail("DITOLAK")
 }
 className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
 >
 Tolak Bukti Pengembalian
 </button>
 </div>
 ) : (
 <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
 Riwayat pengembalian akan tetap tampil setelah bukti disetujui atau ditolak.
 </p>
 )}
 </section>
 )}



 {gambarPreview && (
 <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
 <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white p-4 shadow-2xl">
 <button
 type="button"
 onClick={() => setGambarPreview("")}
 className="absolute right-4 top-4 z-10 rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-lg hover:bg-red-700"
 >
 Tutup
 </button>

 <div className="flex max-h-[82vh] items-center justify-center overflow-auto rounded-2xl bg-slate-50 p-4">
 <img
 src={gambarPreview}
 alt="Preview nota"
 className="max-h-[78vh] max-w-full rounded-xl object-contain"
 />
 </div>
 </div>
 </div>
 )}
 <section className="hidden print:block">
 <div className="pdf-template-shell">
 {deklarasi?.jenis_deklarasi === "PERJALANAN_DINAS" ? (
 <div className="pdf-page">
 <table className="pdf-table pdf-header-top-table pdf-grid-7">
 <colgroup>
 <col style={{ width: "13.5%" }} />
 <col style={{ width: "13.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "33%" }} />
 </colgroup>
 <tbody>
 <tr>
 <td className="pdf-logo-cell" rowSpan={4}>
 <img src="/PPA_cut.png" alt="PPA" className="pdf-logo" />
 </td>
 <td className="pdf-title-cell" colSpan={4} rowSpan={4}>
 DEKLARASI PERJALANAN DINAS
 </td>
 <td className="pdf-doc-label">No.Dokumen</td>
 <td className="pdf-doc-value">: PPA-ADRO-F-FA-LOG-36</td>
 </tr>
 <tr>
 <td className="pdf-doc-label">Revisi</td>
 <td className="pdf-doc-value">:</td>
 </tr>
 <tr>
 <td className="pdf-doc-label">Tgl Efektif</td>
 <td className="pdf-doc-value">: 01 Oktober 2025</td>
 </tr>
 <tr>
 <td className="pdf-doc-label">Halaman</td>
 <td className="pdf-doc-value">:</td>
 </tr>
 </tbody>
 </table>

 <table className="pdf-table pdf-info-table pdf-grid-7">
 <colgroup>
 <col style={{ width: "13.5%" }} />
 <col style={{ width: "13.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "33%" }} />
 </colgroup>
 <tbody>
 <tr>
 <td>Nama</td>
 <td colSpan={2}>: {deklarasi?.nama_pengguna}</td>
 <td>Departemen</td>
 <td colSpan={2}>: HCGA</td>
 <td className="pdf-ket-heading">Keterangan Perjalanan :</td>
 </tr>
 <tr>
 <td>NRP</td>
 <td colSpan={2}>: {deklarasi?.nrp}</td>
 <td>Golongan</td>
 <td colSpan={2}>: TRAINING</td>
 <td className="pdf-ket-value" rowSpan={2}>
 {deklarasi?.keterangan || "-"}
 </td>
 </tr>
 <tr>
 <td>Jabatan</td>
 <td colSpan={2}>:</td>
 <td>No. STD</td>
 <td colSpan={2}>: {deklarasi?.nomor_std || deklarasi?.kode_deklarasi}</td>
 </tr>
 </tbody>
 </table>

 
 <table className="pdf-table pdf-main-table pdf-grid-7">
 <colgroup>
 <col style={{ width: "13.5%" }} />
 <col style={{ width: "13.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "33%" }} />
 </colgroup>
 <thead>
 <tr>
 <th rowSpan={2}>TANGGAL</th>
 <th colSpan={4}>PENGELUARAN</th>
 <th rowSpan={2}>JUMLAH</th>
 <th rowSpan={2}>KETERANGAN</th>
 </tr>
 <tr>
 <th>UANG MAKAN</th>
 <th>TRANSPORTASI</th>
 <th>HOTEL</th>
 <th>LAIN-LAIN</th>
 </tr>
 </thead>
 <tbody>
 {barisPdfDeklarasi.map((baris, index) => (
 <tr key={"deklarasi-pdf-" + index}>
 <td className="pdf-center">{baris.tanggal}</td>
 <td className="pdf-rp">{renderNominalPdf(baris.uang_makan)}</td>
 <td className="pdf-rp">{renderNominalPdf(baris.transportasi)}</td>
 <td className="pdf-rp">{renderNominalPdf(baris.hotel)}</td>
 <td className="pdf-rp">{renderNominalPdf(baris.lain_lain)}</td>
 <td className="pdf-rp pdf-bold">{renderNominalPdf(baris.jumlah)}</td>
 <td>{baris.keterangan}</td>
 </tr>
 ))}
 <tr>
 <td colSpan={5} className="pdf-center pdf-bold">TOTAL</td>
 <td className="pdf-rp pdf-bold">{renderNominalPdf(totalDeklarasiPdf)}</td>
 <td></td>
 </tr>
 </tbody>
 </table>

 
 <table className="pdf-table pdf-summary-table pdf-grid-7">
 <colgroup>
 <col style={{ width: "13.5%" }} />
 <col style={{ width: "13.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "10.1%" }} />
 <col style={{ width: "33%" }} />
 </colgroup>
 <tbody>
 <tr>
 <td colSpan={3} rowSpan={3} className="pdf-note-cell">
 Note : {formatTanggal(deklarasi?.tanggal_kegiatan)}
 </td>
 <td colSpan={2} className="pdf-bold">Total pengeluaran</td>
 <td className="pdf-rp pdf-bold">{renderNominalPdf(totalDeklarasiPdf)}</td>
 <td></td>
 </tr>
 <tr>
 <td colSpan={2} className="pdf-bold">Jumlah uang muka</td>
 <td className="pdf-rp pdf-bold">{renderNominalPdf(jumlahUangMukaPdf)}</td>
 <td></td>
 </tr>
 <tr>
 <td colSpan={2} className="pdf-bold">Status pengembalian</td>
 <td className="pdf-rp pdf-bold">
 {nilaiSelisihPdf === 0 ? "-" : renderNominalPdf(nilaiSelisihPdf)}
 </td>
 <td className="pdf-yellow-cell">{pihakSelisihPdf}</td>
 </tr>
 </tbody>
 </table>

 
 <div className="pdf-statement-box">
 <div className="pdf-center pdf-bold pdf-statement-title">
 PERNYATAAN
 </div>
 <p>
 Saya memahami bahwa jika dikemudian hari terbukti bahwa{" "}
 <b>
 <u>
 bukti transaksi ini tidak asli atau terdapat informasi
 yang tidak benar
 </u>
 </b>
 , maka saya bersedia menerima konsekuensi yang berlaku,
 termasuk tetapi tidak terbatas pada:
 </p>
 <p>1. Tindakan hukum sesuai dengan peraturan yang berlaku.</p>
 <p>
 2. Kerugian yang ditimbulkan akibat dari ketidakbenaran
 informasi yang terlampir.
 </p>
 <p>
 3. Pembatalan transaksi dan kewajiban untuk mengembalikan
 segala sesuatu yang telah diterima.
 </p>
 <p>
 Demikian pernyataan ini saya buat dengan sebenar-benarnya dan
 dalam keadaan sadar tanpa paksaan dari pihak manapun.
 </p>
 </div>

 <div className="pdf-sign-date">Tabalong, {tanggalCetakPdf}</div>

 <div className="pdf-sign-row pdf-sign-row-deklarasi">
 <div>
 <p>Dibuat Oleh,</p>
 <strong>{deklarasi?.nama_pengguna}</strong>
 <span>Karyawan</span>
 </div>
 <div>
 <p>Diperiksa Oleh,</p>
 <strong>............................</strong>
 <span>Group Leader HCGA</span>
 </div>
 <div>
 <p>Diketahui Oleh,</p>
 <strong>............................</strong>
 <span>Section Head HCGA</span>
 </div>
 <div>
 <p>Diperiksa Oleh,</p>
 <strong>............................</strong>
 <span>FAT</span>
 </div>
 <div>
 <p>Disetujui Oleh,</p>
 <strong>............................</strong>
 <span>Project Manager</span>
 </div>
 </div>
 </div>
 ) : (
 <div className="pdf-page">
 <table className="pdf-table pdf-header-top-table">
 <tbody>
 <tr>
 <td className="pdf-logo-cell" rowSpan={3}>
 <img src="/PPA_cut.png" alt="PPA" className="pdf-logo" />
 </td>
 <td className="pdf-title-cell" rowSpan={2}>
 SETTLEMENT PERMOHONAN BIAYA
 </td>
 <td className="pdf-doc-label">No.Dokumen</td>
 <td className="pdf-colon">:</td>
 <td className="pdf-doc-value"></td>
 </tr>
 <tr>
 <td className="pdf-doc-label">Revisi</td>
 <td className="pdf-colon">:</td>
 <td className="pdf-doc-value"></td>
 </tr>
 <tr>
 <td className="pdf-center pdf-bold">
 NOMOR SETTLEMENT: {nomorSettlementLengkapPdf}
 </td>
 <td className="pdf-doc-label">Tgl Efektif</td>
 <td className="pdf-colon">:</td>
 <td className="pdf-doc-value"></td>
 </tr>
 <tr>
 <td colSpan={2}>Department : HCGA</td>
 <td colSpan={2}>Tanggal</td>
 <td>: {formatTanggal(deklarasi?.tanggal_kegiatan)}</td>
 </tr>
 <tr>
 <td colSpan={2}>Site : {deklarasi?.lokasi || "-"}</td>
 <td colSpan={2}>Halaman</td>
 <td>:</td>
 </tr>
 <tr>
 <td colSpan={5}>Nomer RAB/PB : {deklarasi?.nomor_std || deklarasi?.kode_deklarasi}</td>
 </tr>
 </tbody>
 </table>

 <table className="pdf-table pdf-main-table">
 <thead>
 <tr>
 <th className="pdf-col-no">NO.</th>
 <th className="pdf-col-tanggal">TANGGAL</th>
 <th>NAMA BARANG / JASA</th>
 <th className="pdf-col-qty">QTY</th>
 <th>HCGA/@</th>
 <th className="pdf-col-jumlah">JUMLAH</th>
 <th className="pdf-col-keterangan">KETERANGAN</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td></td>
 <td></td>
 <td className="pdf-center pdf-bold">Advance/Uang Muka</td>
 <td></td>
 <td></td>
 <td className="pdf-rp pdf-bold">
 {renderNominalPdf(jumlahUangMukaPdf)}
 </td>
 <td></td>
 </tr>

 {barisPdfSettlement.map((baris, index) => (
 <tr key={"settlement-pdf-" + index}>
 <td className="pdf-center">
 {baris.namaBarang ? baris.nomor : ""}
 </td>
 <td className="pdf-center">{baris.tanggal}</td>
 <td>{baris.namaBarang}</td>
 <td className="pdf-center">
 {baris.namaBarang ? baris.qty : ""}
 </td>
 <td className="pdf-rp">
 {renderNominalPdf(baris.harga)}
 </td>
 <td className="pdf-rp pdf-bold">
 {renderNominalPdf(baris.jumlah)}
 </td>
 <td>{baris.keterangan}</td>
 </tr>
 ))}

 <tr>
 <td colSpan={5} className="pdf-right pdf-bold">TOTAL</td>
 <td className="pdf-rp pdf-bold">
 {renderNominalPdf(totalDeklarasiPdf)}
 </td>
 <td></td>
 </tr>
 <tr>
 <td colSpan={5} className="pdf-right pdf-bold">
 STATUS PENGEMBALIAN
 </td>
 <td className="pdf-rp pdf-bold">
 {nilaiSelisihPdf === 0
 ? "-"
 : renderNominalPdf(nilaiSelisihPdf)}
 </td>
 <td className="pdf-yellow-cell">{pihakSelisihPdf}</td>
 </tr>
 </tbody>
 </table>

 <div className="pdf-statement-box">
 <div className="pdf-center pdf-bold pdf-statement-title">
 PERNYATAAN
 </div>
 <p>
 Saya memahami bahwa jika dikemudian hari terbukti bahwa{" "}
 <b>
 <u>
 bukti transaksi ini tidak asli atau terdapat informasi
 yang tidak benar
 </u>
 </b>
 , maka saya bersedia menerima konsekuensi yang berlaku,
 termasuk tetapi tidak terbatas pada:
 </p>
 <p>1. Tindakan hukum sesuai dengan peraturan yang berlaku.</p>
 <p>
 2. Kerugian yang ditimbulkan akibat dari ketidakbenaran
 informasi yang terlampir.
 </p>
 <p>
 3. Pembatalan transaksi dan kewajiban untuk mengembalikan
 segala sesuatu yang telah diterima.
 </p>
 <p>
 Demikian pernyataan ini saya buat dengan sebenar-benarnya dan
 dalam keadaan sadar tanpa paksaan dari pihak manapun.
 </p>
 </div>

 <div className="pdf-sign-date">Tabalong, {tanggalCetakPdf}</div>

 <div className="pdf-sign-row pdf-sign-row-settlement">
 <div>
 <p>Dibuat Oleh,</p>
 <strong>{deklarasi?.nama_pengguna}</strong>
 </div>
 <div>
 <p>Diperiksa Oleh,</p>
 <strong>............................</strong>
 </div>
 <div>
 <p>Diperiksa Oleh,</p>
 <strong>............................</strong>
 </div>
 <div>
 <p>Disetujui Oleh,</p>
 <strong>............................</strong>
 </div>
 </div>
 
 {modePdfUangOperasional === "DATABASE_SETTLEMENT" && (
 <div className="pdf-page pdf-database-settlement-page">
 <div className="pdf-db-title">DATABASE SETTLEMENT</div>

 <table className="pdf-db-excel-table">
 <colgroup>
 <col style={{ width: "4%" }} />
 <col style={{ width: "7%" }} />
 <col style={{ width: "5%" }} />
 <col style={{ width: "6%" }} />
 <col style={{ width: "6%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "22%" }} />
 <col style={{ width: "4%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "18%" }} />
 <col style={{ width: "7%" }} />
 <col style={{ width: "11%" }} />
 </colgroup>
 <thead>
 <tr>
 <th className="pdf-db-yellow">Jangan diubah</th>
 <th>NOMOR SETTLEMENT</th>
 <th>ITEM</th>
 <th>ITEM SETT</th>
 <th>DEPARTMENT</th>
 <th>TANGGAL PEMBUATAN</th>
 <th>TANGGAL PER ITEM</th>
 <th>NAMA BARANG / JASA</th>
 <th>Qty</th>
 <th>HARGA PER Qty</th>
 <th>Total</th>
 <th>Keterangan</th>
 <th>Cost Center</th>
 <th>Nomer RAB/PB</th>
 </tr>
 </thead>
 <tbody>
 {barisPdfSettlement
 .filter((baris) => baris.namaBarang)
 .map((baris, index) => {
 const nomorSettlementDb = nomorSettlementUrutPdf || "001";
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;

 return (
 <tr key={"database-settlement-" + index}>
 <td></td>
 <td className="pdf-db-center">{nomorSettlementDb}</td>
 <td className="pdf-db-center">{nomorItemDb}</td>
 <td className="pdf-db-center">{itemSettDb}</td>
 <td className="pdf-db-center">HCGA</td>
 <td className="pdf-db-center">
 {formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)}
 </td>
 <td className="pdf-db-center">{baris.tanggal}</td>
 <td>{baris.namaBarang}</td>
 <td className="pdf-db-center">{baris.qty}</td>
 <td className="pdf-db-money">
 {formatAngkaPdf(baris.harga)}
 </td>
 <td className="pdf-db-money">
 {formatAngkaPdf(baris.jumlah)}
 </td>
 <td>{baris.keterangan}</td>
 <td className="pdf-db-center">HCGA</td>
 <td className="pdf-db-center">
 {nomorSettlementDb + "/HCGA/PPA-ADRO/" + bulanRomawiPdf + "/" + new Date(deklarasi?.tanggal_kegiatan).getFullYear()}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
</div>
 )}

 
 {deklarasi?.jenis_deklarasi === "UANG_OPERASIONAL" && (
 <div className="pdf-page pdf-database-settlement-page-v3">
 <div className="pdf-db-v3-title">DATABASE SETTLEMENT</div>

 <table className="pdf-db-v3-table">
 <colgroup>
 <col style={{ width: "4%" }} />
 <col style={{ width: "7%" }} />
 <col style={{ width: "5%" }} />
 <col style={{ width: "6%" }} />
 <col style={{ width: "6%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "22%" }} />
 <col style={{ width: "4%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "8%" }} />
 <col style={{ width: "18%" }} />
 <col style={{ width: "7%" }} />
 <col style={{ width: "11%" }} />
 </colgroup>

 <thead>
 <tr>
 <th className="pdf-db-v3-yellow">Jangan diubah</th>
 <th>NOMOR SETTLEMENT</th>
 <th>ITEM</th>
 <th>ITEM SETT</th>
 <th>DEPARTMENT</th>
 <th>TANGGAL PEMBUATAN</th>
 <th>TANGGAL PER ITEM</th>
 <th>NAMA BARANG / JASA</th>
 <th>Qty</th>
 <th>HARGA PER Qty</th>
 <th>Total</th>
 <th>Keterangan</th>
 <th>Cost Center</th>
 <th>Nomer RAB/PB</th>
 </tr>
 </thead>

 <tbody>
 {(barisPdfSettlement.filter((baris) => baris.namaBarang)
 .length > 0
 ? barisPdfSettlement.filter((baris) => baris.namaBarang)
 : [
 {
 nomor: 1,
 tanggal: formatTanggalPdfDeklarasi(
 deklarasi?.tanggal_kegiatan
 ),
 namaBarang: "-",
 qty: 1,
 harga: 0,
 jumlah: 0,
 keterangan: "-",
 },
 ]
 ).map((baris, index) => {
 const nomorSettlementDb = nomorSettlementUrutPdf || "001";
 const nomorItemDb = index + 1;
 const itemSettDb = nomorSettlementDb + "-" + nomorItemDb;

 return (
 <tr key={"database-settlement-v3-" + index}>
 <td></td>
 <td className="pdf-db-v3-center">
 {nomorSettlementDb}
 </td>
 <td className="pdf-db-v3-center">{nomorItemDb}</td>
 <td className="pdf-db-v3-center">{itemSettDb}</td>
 <td className="pdf-db-v3-center">HCGA</td>
 <td className="pdf-db-v3-center">
 {formatTanggalPdfDeklarasi(deklarasi?.dibuat_pada)}
 </td>
 <td className="pdf-db-v3-center">{baris.tanggal}</td>
 <td>{baris.namaBarang}</td>
 <td className="pdf-db-v3-center">{baris.qty}</td>
 <td className="pdf-db-v3-money">
 {formatAngkaPdf(baris.harga)}
 </td>
 <td className="pdf-db-v3-money">
 {formatAngkaPdf(baris.jumlah)}
 </td>
 <td>{baris.keterangan}</td>
 <td className="pdf-db-v3-center">HCGA</td>
 <td className="pdf-db-v3-center">
 {nomorSettlementDb + "/HCGA/PPA-ADRO/" +
 bulanRomawiPdf +
 "/" +
 new Date(
 deklarasi?.tanggal_kegiatan
 ).getFullYear()}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 </div>
 </section>
 <style jsx global>{`
 @media print {

 /* ===== FIX DATABASE SETTLEMENT BLANK V3 ===== */

 body.pdf-db-landscape-print .pdf-template-shell,
 body.pdf-db-landscape-print .pdf-template-shell * {
 visibility: visible !important;
 }

 body.pdf-db-landscape-print .pdf-template-shell {
 position: absolute !important;
 left: 0 !important;
 top: 0 !important;
 width: 100% !important;
 display: block !important;
 }

 body.pdf-db-landscape-print .pdf-page {
 display: none !important;
 visibility: hidden !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 {
 display: block !important;
 visibility: visible !important;
 width: 285mm !important;
 min-height: 190mm !important;
 margin: 0 auto !important;
 color: #000 !important;
 background: #fff !important;
 font-family: Arial, Helvetica, sans-serif !important;
 font-size: 6px !important;
 line-height: 1.1 !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 * {
 display: revert;
 visibility: visible !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 table {
 display: table !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 thead {
 display: table-header-group !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 tbody {
 display: table-row-group !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 tr {
 display: table-row !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 th,
 body.pdf-db-landscape-print .pdf-database-settlement-page-v3 td {
 display: table-cell !important;
 }

 .pdf-database-settlement-page-v3 {
 display: none;
 }

 .pdf-db-v3-title {
 width: 100% !important;
 text-align: center !important;
 font-weight: 700 !important;
 font-size: 9px !important;
 margin-bottom: 2mm !important;
 color: #000 !important;
 }

 .pdf-db-v3-table {
 width: 100% !important;
 border-collapse: collapse !important;
 table-layout: fixed !important;
 }

 .pdf-db-v3-table th,
 .pdf-db-v3-table td {
 border: 1px solid #9fbbe7 !important;
 padding: 1px 2px !important;
 vertical-align: middle !important;
 font-size: 5.8px !important;
 line-height: 1.05 !important;
 color: #000 !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-db-v3-table th {
 background: #4f81bd !important;
 color: #ffffff !important;
 font-weight: 700 !important;
 text-align: center !important;
 white-space: normal !important;
 }

 .pdf-db-v3-table tbody tr:nth-child(odd) td {
 background: #d9eaf7 !important;
 }

 .pdf-db-v3-table tbody tr:nth-child(even) td {
 background: #ffffff !important;
 }

 .pdf-db-v3-yellow {
 background: #fff200 !important;
 color: #000000 !important;
 font-weight: 700 !important;
 }

 .pdf-db-v3-center {
 text-align: center !important;
 white-space: nowrap !important;
 }

 .pdf-db-v3-money {
 text-align: right !important;
 white-space: nowrap !important;
 }


 /* ===== FIX DATABASE SETTLEMENT BLANK V2 ===== */

 @page databaseSettlementV2 {
 size: A4 landscape;
 margin: 6mm;
 }

 body.pdf-db-landscape-print .pdf-template-shell {
 position: absolute !important;
 left: 0 !important;
 top: 0 !important;
 width: 100% !important;
 visibility: visible !important;
 }

 body.pdf-db-landscape-print .pdf-page {
 display: none !important;
 visibility: hidden !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v2 {
 display: block !important;
 visibility: visible !important;
 page: databaseSettlementV2;
 width: 285mm !important;
 min-height: 198mm !important;
 margin: 0 auto !important;
 color: #000 !important;
 background: #fff !important;
 font-family: Arial, Helvetica, sans-serif !important;
 font-size: 6px !important;
 line-height: 1.1 !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page-v2 * {
 visibility: visible !important;
 }

 .pdf-database-settlement-page-v2 {
 display: none;
 }

 .pdf-db-v2-title {
 width: 100% !important;
 text-align: center !important;
 font-weight: 700 !important;
 font-size: 9px !important;
 margin-bottom: 2mm !important;
 color: #000 !important;
 }

 .pdf-db-v2-table {
 width: 100% !important;
 border-collapse: collapse !important;
 table-layout: fixed !important;
 }

 .pdf-db-v2-table th,
 .pdf-db-v2-table td {
 border: 1px solid #9fbbe7 !important;
 padding: 1px 2px !important;
 vertical-align: middle !important;
 font-size: 5.8px !important;
 line-height: 1.05 !important;
 color: #000 !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-db-v2-table th {
 background: #4f81bd !important;
 color: #ffffff !important;
 font-weight: 700 !important;
 text-align: center !important;
 white-space: normal !important;
 }

 .pdf-db-v2-table tbody tr:nth-child(odd) td {
 background: #d9eaf7 !important;
 }

 .pdf-db-v2-table tbody tr:nth-child(even) td {
 background: #ffffff !important;
 }

 .pdf-db-v2-yellow {
 background: #fff200 !important;
 color: #000000 !important;
 font-weight: 700 !important;
 }

 .pdf-db-v2-center {
 text-align: center !important;
 white-space: nowrap !important;
 }

 .pdf-db-v2-money {
 text-align: right !important;
 white-space: nowrap !important;
 }


 /* ===== DATABASE SETTLEMENT SESUAI EXCEL ===== */

 body.pdf-db-landscape-print @page {
 size: A4 landscape;
 margin: 6mm;
 }

 body.pdf-db-landscape-print .pdf-page:not(.pdf-database-settlement-page) {
 display: none !important;
 }

 body.pdf-db-landscape-print .pdf-database-settlement-page {
 display: block !important;
 }

 .pdf-database-settlement-page {
 width: 285mm !important;
 min-height: 198mm !important;
 margin: 0 auto !important;
 color: #000 !important;
 font-family: Arial, Helvetica, sans-serif !important;
 font-size: 6px !important;
 line-height: 1.1 !important;
 }

 .pdf-db-title {
 width: 100% !important;
 text-align: center !important;
 font-weight: 700 !important;
 font-size: 9px !important;
 margin-bottom: 2mm !important;
 }

 .pdf-db-excel-table {
 width: 100% !important;
 border-collapse: collapse !important;
 table-layout: fixed !important;
 }

 .pdf-db-excel-table th,
 .pdf-db-excel-table td {
 border: 1px solid #9fbbe7 !important;
 padding: 1px 2px !important;
 vertical-align: middle !important;
 font-size: 5.8px !important;
 line-height: 1.05 !important;
 overflow: hidden !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-db-excel-table th {
 background: #4f81bd !important;
 color: #ffffff !important;
 font-weight: 700 !important;
 text-align: center !important;
 white-space: normal !important;
 }

 .pdf-db-excel-table tbody tr:nth-child(odd) td {
 background: #d9eaf7 !important;
 }

 .pdf-db-excel-table tbody tr:nth-child(even) td {
 background: #ffffff !important;
 }

 .pdf-db-yellow {
 background: #fff200 !important;
 color: #000000 !important;
 font-weight: 700 !important;
 }

 .pdf-db-center {
 text-align: center !important;
 white-space: nowrap !important;
 }

 .pdf-db-money {
 text-align: right !important;
 white-space: nowrap !important;
 }


 /* ===== DATABASE SETTLEMENT PDF ===== */
 .pdf-database-settlement-page {
 width: 277mm !important;
 min-height: 190mm !important;
 font-family: Arial, Helvetica, sans-serif !important;
 font-size: 7px !important;
 color: #000 !important;
 }

 .pdf-db-title {
 font-size: 12px !important;
 font-weight: 700 !important;
 text-align: center !important;
 margin-bottom: 4mm !important;
 }

 .pdf-db-table {
 width: 100% !important;
 border-collapse: collapse !important;
 table-layout: fixed !important;
 }

 .pdf-db-table th,
 .pdf-db-table td {
 border: 1px solid #000 !important;
 padding: 2px !important;
 vertical-align: middle !important;
 font-size: 6px !important;
 line-height: 1.05 !important;
 word-break: break-word !important;
 }

 .pdf-db-table th {
 text-align: center !important;
 font-weight: 700 !important;
 background: #f2f2f2 !important;
 }


 /* ===== FIX PRESISI EXCEL: HEADER, KETERANGAN, GARIS ===== */
 .pdf-page {
 width: 190mm !important;
 margin: 0 auto !important;
 color: #000 !important;
 font-family: Arial, Helvetica, sans-serif !important;
 font-size: 7px !important;
 line-height: 1.08 !important;
 }

 .pdf-table {
 width: 100% !important;
 border-collapse: collapse !important;
 table-layout: fixed !important;
 }

 .pdf-table td,
 .pdf-table th {
 border: 1px solid #000 !important;
 padding: 1px 3px !important;
 vertical-align: middle !important;
 }

 .pdf-header-top-table td {
 height: 4.5mm !important;
 }

 .pdf-logo-cell {
 text-align: left !important;
 padding-left: 3px !important;
 }

 .pdf-logo {
 width: 12mm !important;
 height: 12mm !important;
 object-fit: contain !important;
 }

 .pdf-title-cell {
 text-align: center !important;
 font-size: 11px !important;
 font-weight: 700 !important;
 white-space: nowrap !important;
 }

 .pdf-doc-label,
 .pdf-doc-value {
 font-size: 7px !important;
 white-space: nowrap !important;
 }

 .pdf-colon {
 display: none !important;
 }

 .pdf-info-table {
 margin-top: 0 !important;
 }

 .pdf-info-table td {
 height: 4.2mm !important;
 font-size: 7px !important;
 line-height: 1.05 !important;
 }

 .pdf-ket-heading {
 text-align: center !important;
 font-weight: 700 !important;
 white-space: nowrap !important;
 }

 .pdf-ket-value {
 text-align: center !important;
 font-weight: 700 !important;
 font-size: 7px !important;
 line-height: 1.05 !important;
 white-space: normal !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-ket-colon {
 display: none !important;
 }

 .pdf-main-table {
 margin-top: 0 !important;
 }

 .pdf-main-table th {
 height: 4.3mm !important;
 text-align: center !important;
 background: #f2f2f2 !important;
 font-size: 7px !important;
 font-weight: 700 !important;
 line-height: 1.05 !important;
 }

 .pdf-main-table td {
 height: 4.1mm !important;
 font-size: 7px !important;
 line-height: 1.05 !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-rp {
 text-align: right !important;
 white-space: nowrap !important;
 }

 .pdf-summary-table {
 margin-top: 1mm !important;
 }

 .pdf-summary-table td {
 height: 4.4mm !important;
 font-size: 7px !important;
 line-height: 1.05 !important;
 }

 .pdf-note-cell {
 vertical-align: middle !important;
 }

 .pdf-yellow-cell {
 background: #fff200 !important;
 font-weight: 700 !important;
 text-align: left !important;
 white-space: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-statement-box {
 margin-top: 1mm !important;
 border: 1px solid #000 !important;
 padding: 2px 3px !important;
 font-size: 6.4px !important;
 line-height: 1.05 !important;
 }

 .pdf-statement-box p {
 margin: 0 0 1px 0 !important;
 }

 .pdf-sign-date {
 margin-top: 2mm !important;
 margin-left: 8mm !important;
 font-size: 7px !important;
 }

 .pdf-sign-row {
 display: grid !important;
 text-align: center !important;
 font-size: 7px !important;
 }

 .pdf-sign-row p {
 margin: 0 !important;
 }

 .pdf-sign-row strong {
 display: block !important;
 margin-top: 14mm !important;
 font-weight: 400 !important;
 text-decoration: underline !important;
 }

 .pdf-sign-row span {
 display: block !important;
 }

 .pdf-sign-row-deklarasi {
 grid-template-columns: repeat(5, 1fr) !important;
 margin-top: 2mm !important;
 }


 /* ===== FIX KETERANGAN PERJALANAN & STATUS PENGEMBALIAN ===== */

 .pdf-info-table {
 border-collapse: collapse !important;
 table-layout: fixed !important;
 width: 100% !important;
 margin-top: 0 !important;
 }

 .pdf-info-table td {
 height: 4.2mm !important;
 border: 1px solid #000 !important;
 padding: 1px 3px !important;
 vertical-align: middle !important;
 font-size: 7px !important;
 line-height: 1.05 !important;
 }

 .pdf-ket-heading {
 text-align: center !important;
 font-weight: 700 !important;
 white-space: nowrap !important;
 vertical-align: middle !important;
 border-bottom: 1px solid #000 !important;
 }

 .pdf-ket-colon {
 text-align: center !important;
 font-weight: 700 !important;
 vertical-align: middle !important;
 }

 .pdf-ket-value {
 text-align: center !important;
 font-weight: 700 !important;
 font-size: 7px !important;
 line-height: 1.05 !important;
 vertical-align: middle !important;
 white-space: normal !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-yellow-cell {
 background: #fff200 !important;
 font-weight: 700 !important;
 text-align: left !important;
 font-size: 7px !important;
 white-space: normal !important;
 word-break: normal !important;
 overflow-wrap: break-word !important;
 }

 .pdf-summary-table td {
 height: 4.4mm !important;
 vertical-align: middle !important;
 }

 @page {
 size: A4 portrait;
 margin: 8mm;
 }

 html,
 body {
 background: #ffffff !important;
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 }

 body * {
 visibility: hidden !important;
 }

 .pdf-template-shell,
 .pdf-template-shell * {
 visibility: visible !important;
 }

 .pdf-template-shell {
 position: absolute !important;
 left: 0 !important;
 top: 0 !important;
 width: 100% !important;
 }

 .no-print {
 display: none !important;
 }

 .print\:block {
 display: block !important;
 }

 .pdf-page {
 width: 190mm;
 margin: 0 auto;
 color: #000;
 font-family: Arial, Helvetica, sans-serif;
 font-size: 8px;
 line-height: 1.12;
 }

 .pdf-table {
 width: 100%;
 border-collapse: collapse;
 table-layout: fixed;
 }

 .pdf-table td,
 .pdf-table th {
 border: 1px solid #000;
 padding: 2px 3px;
 vertical-align: middle;
 }

 .pdf-logo-cell {
 width: 16mm;
 text-align: center;
 }

 .pdf-logo {
 width: 12mm;
 height: 12mm;
 object-fit: contain;
 }

 .pdf-title-cell {
 width: 78mm;
 text-align: center;
 font-size: 11px;
 font-weight: 700;
 white-space: nowrap;
 }

 .pdf-doc-label {
 width: 18mm;
 white-space: nowrap;
 }

 .pdf-colon {
 width: 3mm;
 text-align: center;
 }

 .pdf-doc-value {
 width: 30mm;
 white-space: nowrap;
 }

 .pdf-info-table td {
 font-size: 7px;
 line-height: 1.1;
 word-break: normal;
 overflow-wrap: break-word;
 }

 .pdf-ket-heading {
 text-align: center;
 font-weight: 700;
 white-space: nowrap;
 }

 .pdf-ket-value {
 text-align: center;
 font-weight: 700;
 font-size: 7px;
 line-height: 1.1;
 white-space: normal;
 word-break: break-word;
 overflow-wrap: anywhere;
 }

 .pdf-main-table {
 margin-top: 0;
 }

 .pdf-main-table th {
 text-align: center;
 background: #f2f2f2;
 font-size: 7px;
 line-height: 1.1;
 }

 .pdf-main-table td {
 font-size: 7px;
 line-height: 1.1;
 word-break: break-word;
 overflow-wrap: break-word;
 }

 .pdf-col-no {
 width: 8mm;
 }

 .pdf-col-tanggal {
 width: 18mm;
 }

 .pdf-col-qty {
 width: 8mm;
 }

 .pdf-col-jumlah {
 width: 20mm;
 }

 .pdf-col-keterangan {
 width: 28mm;
 }

 .pdf-rp {
 text-align: right;
 white-space: nowrap;
 }

 .pdf-summary-table {
 margin-top: 1mm;
 }

 .pdf-summary-table td {
 font-size: 7px;
 line-height: 1.1;
 word-break: break-word;
 overflow-wrap: break-word;
 }

 .pdf-note-cell {
 width: 42%;
 }

 .pdf-yellow-cell {
 background: #fff200 !important;
 font-weight: 700;
 }

 .pdf-statement-box {
 margin-top: 1mm;
 border: 1px solid #000;
 padding: 3px;
 font-size: 6.5px;
 line-height: 1.12;
 }

 .pdf-statement-title {
 margin-bottom: 2px;
 }

 .pdf-statement-box p {
 margin: 0 0 1px 0;
 }

 .pdf-sign-date {
 margin-top: 2mm;
 margin-left: 8mm;
 font-size: 7px;
 }

 .pdf-sign-row {
 display: grid;
 text-align: center;
 font-size: 7px;
 }

 .pdf-sign-row p {
 margin: 0;
 }

 .pdf-sign-row strong {
 display: block;
 margin-top: 14mm;
 font-weight: 400;
 text-decoration: underline;
 }

 .pdf-sign-row span {
 display: block;
 }

 .pdf-sign-row-deklarasi {
 grid-template-columns: repeat(5, 1fr);
 margin-top: 2mm;
 }

 .pdf-sign-row-settlement {
 grid-template-columns: repeat(4, 1fr);
 margin-top: 2mm;
 }

 .pdf-center {
 text-align: center;
 }

 .pdf-right {
 text-align: right;
 }

 .pdf-bold {
 font-weight: 700;
 }
 }
 `}</style>
 </main>
 );
}

/* <--- end ---> */