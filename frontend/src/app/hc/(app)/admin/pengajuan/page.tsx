"use client";

import {
 ArrowLeft,
 CalendarDays,
 CheckCircle2,
 ClipboardList,
 FileText,
 Loader2,
 RefreshCw,
 Search,
 Send,
 Trash2,
 UploadCloud,
 WalletCards,
 X,
 XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

/* <--- halaman admin pengajuan STD/RAB dan approval FA ---> */

type RolePengguna = "SUPER_ADMIN" | "ADMIN" | "SECTION_HEAD" | "FA" | "KARYAWAN";

type DataPengguna = {
 id: number;
 nrp: string;
 nama: string;
 email: string | null;
 nomor_telepon: string | null;
 role: RolePengguna;
 aktif: boolean;
 kode_tiket?: string;
};

type StatusPengajuan =
 | "DIAJUKAN"
 | "DISETUJUI"
 | "DITOLAK"
 | "MENUNGGU_TRANSFER"
 | "SELESAI";

type JenisPengajuan = "PERJALANAN_DINAS" | "UANG_OPERASIONAL";

type DataPengajuan = {
 id: number;
 id_pengguna: number;
 nrp: string;
 nama_pengguna: string;
 jenis_pengajuan: JenisPengajuan;
 lokasi: string | null;
 keterangan: string | null;
 nomor_std: string | null;
 nomor_rab: string | null;
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

type FormPengajuan = {
 id_pengguna: string;
 jenis_pengajuan: JenisPengajuan;
 tanggal_pengajuan: string;
 lokasi: string;
 keterangan: string;
 nomor_std: string;
 nomor_rab: string;
 file_std: File | null;
 file_rab: File | null;
};

type FormBuktiTransfer = {
 nominal_transfer: string;
 tanggal_transfer: string;
 keterangan: string;
 bukti_transfer: File | null;
};

const formAwal: FormPengajuan = {
 id_pengguna: "",
 jenis_pengajuan: "PERJALANAN_DINAS",
 tanggal_pengajuan: new Date().toISOString().slice(0, 10),
 lokasi: "",
 keterangan: "",
 nomor_std: "",
 nomor_rab: "",
 file_std: null,
 file_rab: null,
};

const formBuktiTransferAwal: FormBuktiTransfer = {
 nominal_transfer: "",
 tanggal_transfer: new Date().toISOString().slice(0, 10),
 keterangan: "",
 bukti_transfer: null,
};

export default function HalamanPengajuanAdmin() {
 const router = useRouter();
 const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

 const [roleLogin, setRoleLogin] = useState<RolePengguna | null>(null);
 const [namaLogin, setNamaLogin] = useState("");

 const [daftarPengguna, setDaftarPengguna] = useState<DataPengguna[]>([]);
 const [daftarPengajuan, setDaftarPengajuan] = useState<DataPengajuan[]>([]);

 const [formPengajuan, setFormPengajuan] =
 useState<FormPengajuan>(formAwal);

 const [formBuktiTransfer, setFormBuktiTransfer] =
 useState<FormBuktiTransfer>(formBuktiTransferAwal);

 const [pengajuanDipilih, setPengajuanDipilih] =
 useState<DataPengajuan | null>(null);

 const [pengajuanDitolak, setPengajuanDitolak] =
 useState<DataPengajuan | null>(null);

 const [sedangMemuat, setSedangMemuat] = useState(true);
 const [sedangRefresh, setSedangRefresh] = useState(false);
 const [sedangSimpan, setSedangSimpan] = useState(false);
 const [sedangUploadBukti, setSedangUploadBukti] = useState(false);
 const [sedangTolak, setSedangTolak] = useState(false);
 const [idProses, setIdProses] = useState<number | null>(null);
 const [alasanPenolakan, setAlasanPenolakan] = useState("");
 const [fileBuktiTransfer, setFileBuktiTransfer] = useState<File | null>(null);

 const [pesanError, setPesanError] = useState("");
 const [pesanSukses, setPesanSukses] = useState("");

 const [kataKunci, setKataKunci] = useState("");
 const [filterStatus, setFilterStatus] = useState<"SEMUA" | StatusPengajuan>(
 "SEMUA"
 );
 const [filterJenis, setFilterJenis] = useState<"SEMUA" | JenisPengajuan>(
 "SEMUA"
 );
 const [tampilkanForm, setTampilkanForm] = useState(true);

 const apakahAdmin =
 roleLogin === "SUPER_ADMIN" ||
 roleLogin === "ADMIN" ||
 roleLogin === "SECTION_HEAD";
 const apakahFa = roleLogin === "FA";

 const ambilToken = () => {
 if (typeof window === "undefined") return "";

 return (
 (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token")) ||
 localStorage.getItem("token") ||
 localStorage.getItem("access_token") ||
 ""
 );
 };

 const headerJson = () => {
 const token = ambilToken();

 if (!token) {
 return {
 "Content-Type": "application/json",
 };
 }

 return {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`,
 };
 };

 const headerAuth = (): Record<string, string> => {
 const token = ambilToken();

 if (!token) {
 return {};
 }

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

 const formatRupiah = (nilai: unknown) => {
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
 month: "long",
 year: "numeric",
 }).format(hasil);
 };

 const formatJenis = (jenis: string) => {
 if (jenis === "PERJALANAN_DINAS") return "Perjalanan Dinas";
 if (jenis === "UANG_OPERASIONAL") return "Uang Operasional";
 return jenis;
 };

 const formatStatus = (status: string) => {
 if (status === "DIAJUKAN") return "Diajukan";
 if (status === "DISETUJUI") return "Disetujui";
 if (status === "DITOLAK") return "Ditolak";
 if (status === "MENUNGGU_TRANSFER") return "Menunggu Transfer";
 if (status === "SELESAI") return "Selesai";
 return status;
 };

 const warnaStatus = (status: string) => {
 if (status === "DIAJUKAN") {
 return "border-amber-100 bg-amber-50 text-amber-700";
 }

 if (status === "DISETUJUI") {
 return "border-blue-100 bg-blue-50 text-blue-700";
 }

 if (status === "MENUNGGU_TRANSFER") {
 return "border-purple-100 bg-purple-50 text-purple-700";
 }

 if (status === "SELESAI") {
 return "border-emerald-100 bg-emerald-50 text-emerald-700";
 }

 if (status === "DITOLAK") {
 return "border-red-100 bg-red-50 text-red-700";
 }

 return "border-slate-100 bg-slate-50 text-slate-700";
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

 const ambilData = async (mode: "awal" | "refresh" = "awal") => {
 try {
 setPesanError("");
 setPesanSukses("");

 if (mode === "awal") {
 setSedangMemuat(true);
 } else {
 setSedangRefresh(true);
 }

 const [resPengguna, resPengajuan] = await Promise.all([
 fetch(`${apiUrl}/pengguna`, {
 headers: headerAuth() as HeadersInit,
 }),
 fetch(`${apiUrl}/pengajuan`, {
 headers: headerAuth() as HeadersInit,
 }),
 ]);

 if (!resPengguna.ok) {
 throw new Error("Gagal mengambil data karyawan.");
 }

 if (!resPengajuan.ok) {
 throw new Error("Gagal mengambil data pengajuan.");
 }

 const dataPengguna = (await resPengguna.json()) as DataPengguna[];
 const dataPengajuan = (await resPengajuan.json()) as DataPengajuan[];

 setDaftarPengguna(Array.isArray(dataPengguna) ? dataPengguna : []);
 setDaftarPengajuan(Array.isArray(dataPengajuan) ? dataPengajuan : []);
 } catch (error) {
 const pesan =
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat mengambil data.";

 setPesanError(pesan);
 } finally {
 setSedangMemuat(false);
 setSedangRefresh(false);
 }
 };

 useEffect(() => {
 if (typeof window !== "undefined") {
 const dataPengguna =
 (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user")) ||
 localStorage.getItem("pengguna") ||
 "";

 if (dataPengguna) {
 try {
 const parsed = ((p: any) => ({...p, nama: p.nama || p.name, nrp: p.nrp || p.username}))(JSON.parse(dataPengguna)) as DataPengguna;

 setRoleLogin(parsed.role);
 setNamaLogin(parsed.nama || "");
 } catch {
 setRoleLogin(null);
 setNamaLogin("");
 }
 }
 }

 ambilData("awal");
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const daftarKaryawanAktif = useMemo(() => {
 return daftarPengguna
 .filter((pengguna) => pengguna.aktif && pengguna.role === "KARYAWAN")
 .sort((a, b) => a.nama.localeCompare(b.nama));
 }, [daftarPengguna]);

 const daftarPengajuanTersaring = useMemo(() => {
 const keyword = kataKunci.trim().toLowerCase();

 return daftarPengajuan.filter((pengajuan) => {
 const cocokKeyword =
 !keyword ||
 pengajuan.nama_pengguna.toLowerCase().includes(keyword) ||
 pengajuan.nrp.toLowerCase().includes(keyword) ||
 String(pengajuan.id).includes(keyword) ||
 (pengajuan.lokasi || "").toLowerCase().includes(keyword) ||
 (pengajuan.keterangan || "").toLowerCase().includes(keyword);

 const cocokStatus =
 filterStatus === "SEMUA" ||
 pengajuan.status_pengajuan === filterStatus;

 const cocokJenis =
 filterJenis === "SEMUA" || pengajuan.jenis_pengajuan === filterJenis;

 return cocokKeyword && cocokStatus && cocokJenis;
 });
 }, [daftarPengajuan, kataKunci, filterStatus, filterJenis]);

 const totalPengajuan = daftarPengajuan.length;
 const totalDiajukan = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "DIAJUKAN"
 ).length;
 const totalMenungguTransfer = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "MENUNGGU_TRANSFER"
 ).length;
 const totalSelesai = daftarPengajuan.filter(
 (item) => item.status_pengajuan === "SELESAI"
 ).length;

 const ubahForm = (
 field: keyof Omit<FormPengajuan, "file_std" | "file_rab">,
 value: string
 ) => {
 setFormPengajuan((sebelumnya) => {
 if (field === "jenis_pengajuan") {
 const inputStd = document.getElementById(
 "file_std"
 ) as HTMLInputElement | null;
 const inputRab = document.getElementById(
 "file_rab"
 ) as HTMLInputElement | null;

 if (inputStd) inputStd.value = "";
 if (inputRab) inputRab.value = "";

 return {
 ...sebelumnya,
 jenis_pengajuan: value as JenisPengajuan,
 nomor_std: "",
 nomor_rab: "",
 file_std: null,
 file_rab: null,
 };
 }

 return {
 ...sebelumnya,
 [field]: value,
 };
 });
 };

 const ubahFile = (
 event: ChangeEvent<HTMLInputElement>,
 field: "file_std" | "file_rab"
 ) => {
 const file = event.target.files?.[0] || null;

 if (!file) {
 setFormPengajuan((sebelumnya) => ({
 ...sebelumnya,
 [field]: null,
 }));
 return;
 }

 if (
 field === "file_std" &&
 formPengajuan.jenis_pengajuan === "PERJALANAN_DINAS"
 ) {
 const hasilNomorStd = window.prompt(
 "Masukkan Nomor STD:",
 formPengajuan.nomor_std || ""
 );

 if (!hasilNomorStd || !hasilNomorStd.trim()) {
 event.target.value = "";

 setFormPengajuan((sebelumnya) => ({
 ...sebelumnya,
 file_std: null,
 nomor_std: "",
 }));

 setPesanError("Nomor STD wajib diisi untuk Perjalanan Dinas.");
 return;
 }

 setFormPengajuan((sebelumnya) => ({
 ...sebelumnya,
 file_std: file,
 nomor_std: hasilNomorStd.trim(),
 }));

 setPesanError("");
 return;
 }

 if (
 field === "file_rab" &&
 formPengajuan.jenis_pengajuan === "UANG_OPERASIONAL"
 ) {
 const hasilNomorRab = window.prompt(
 "Masukkan Nomor RAB:",
 formPengajuan.nomor_rab || ""
 );

 if (!hasilNomorRab || !hasilNomorRab.trim()) {
 event.target.value = "";

 setFormPengajuan((sebelumnya) => ({
 ...sebelumnya,
 file_rab: null,
 nomor_rab: "",
 }));

 setPesanError("Nomor RAB wajib diisi untuk Uang Operasional.");
 return;
 }

 setFormPengajuan((sebelumnya) => ({
 ...sebelumnya,
 file_rab: file,
 nomor_rab: hasilNomorRab.trim(),
 }));

 setPesanError("");
 return;
 }

 setFormPengajuan((sebelumnya) => ({
 ...sebelumnya,
 [field]: file,
 }));
 };

 const resetForm = () => {
 setFormPengajuan({
 ...formAwal,
 tanggal_pengajuan: new Date().toISOString().slice(0, 10),
 });

 const inputStd = document.getElementById(
 "file_std"
 ) as HTMLInputElement | null;
 const inputRab = document.getElementById(
 "file_rab"
 ) as HTMLInputElement | null;

 if (inputStd) inputStd.value = "";
 if (inputRab) inputRab.value = "";
 };

 const simpanPengajuan = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();

 try {
 setPesanError("");
 setPesanSukses("");

 if (!apakahAdmin) {
 setPesanError("Hanya Admin yang dapat membuat pengajuan.");
 return;
 }

 if (!formPengajuan.id_pengguna) {
 setPesanError("Karyawan wajib dipilih.");
 return;
 }

 if (
 formPengajuan.jenis_pengajuan === "PERJALANAN_DINAS" &&
 !formPengajuan.file_std
 ) {
 setPesanError("File STD wajib diupload untuk Perjalanan Dinas.");
 return;
 }

 if (!formPengajuan.file_rab) {
 setPesanError("File RAB wajib diupload.");
 return;
 }

 if (
 formPengajuan.jenis_pengajuan === "PERJALANAN_DINAS" &&
 !formPengajuan.nomor_std.trim()
 ) {
 const hasilNomorStd = window.prompt("Masukkan Nomor STD:", "");

 if (!hasilNomorStd || !hasilNomorStd.trim()) {
 setPesanError("Nomor STD wajib diisi untuk Perjalanan Dinas.");
 return;
 }

 formPengajuan.nomor_std = hasilNomorStd.trim();
 }

 if (
 formPengajuan.jenis_pengajuan === "UANG_OPERASIONAL" &&
 !formPengajuan.nomor_rab.trim()
 ) {
 const hasilNomorRab = window.prompt("Masukkan Nomor RAB:", "");

 if (!hasilNomorRab || !hasilNomorRab.trim()) {
 setPesanError("Nomor RAB wajib diisi untuk Uang Operasional.");
 return;
 }

 formPengajuan.nomor_rab = hasilNomorRab.trim();
 }

 setSedangSimpan(true);

 const karyawanDipilih = daftarKaryawanAktif.find(
 (item) => String(item.id) === formPengajuan.id_pengguna
 );

 const formData = new FormData();

 formData.append("id_pengguna", formPengajuan.id_pengguna);
 formData.append("jenis_pengajuan", formPengajuan.jenis_pengajuan);
 formData.append("tanggal_pengajuan", formPengajuan.tanggal_pengajuan);
 formData.append("lokasi", formPengajuan.lokasi.trim());
 formData.append("keterangan", formPengajuan.keterangan.trim());

 if (formPengajuan.nomor_std.trim()) {
 formData.append("nomor_std", formPengajuan.nomor_std.trim());
 }

 if (formPengajuan.nomor_rab.trim()) {
 formData.append("nomor_rab", formPengajuan.nomor_rab.trim());
 }

 if (karyawanDipilih) {
 formData.append("nrp", karyawanDipilih.nrp || "");
 formData.append("nama_pengguna", karyawanDipilih.nama || "");
 }

 if (formPengajuan.file_std) {
 formData.append("file_std", formPengajuan.file_std);
 }

 formData.append("file_rab", formPengajuan.file_rab);

 const response = await fetch(`${apiUrl}/pengajuan`, {
 method: "POST",
 headers: headerAuth() as HeadersInit,
 body: formData,
 });

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(
 hasil?.message ||
 "Pengajuan gagal disimpan. Periksa kembali data dan file."
 );
 }

 setPesanSukses(
 formPengajuan.jenis_pengajuan === "UANG_OPERASIONAL"
 ? "Pengajuan RAB Uang Operasional berhasil dibuat. Nomor RAB tersimpan."
 : "Pengajuan STD dan RAB berhasil dibuat. Notifikasi WA dikirim ke FA jika token dan nomor WA sudah tersedia."
 );

 resetForm();
 await ambilData("refresh");
 } catch (error) {
 const pesan =
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menyimpan pengajuan.";

 setPesanError(pesan);
 } finally {
 setSedangSimpan(false);
 }
 };

 const setujuiPengajuanFa = async (idPengajuan: number) => {
 const yakin = window.confirm(
 "Setujui pengajuan ini dan ubah status menjadi Menunggu Transfer?"
 );

 if (!yakin) return;

 try {
 setPesanError("");
 setPesanSukses("");
 setIdProses(idPengajuan);

 const response = await fetch(
 `${apiUrl}/pengajuan/${idPengajuan}/status`,
 {
 method: "PATCH",
 headers: headerJson(),
 body: JSON.stringify({
 status_pengajuan: "MENUNGGU_TRANSFER",
 catatan_admin:
 "Pengajuan disetujui oleh FA dan menunggu proses transfer.",
 }),
 }
 );

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(hasil?.message || "Pengajuan gagal disetujui.");
 }

 setPesanSukses("Pengajuan disetujui. Status menjadi Menunggu Transfer.");
 await ambilData("refresh");
 } catch (error) {
 const pesan =
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menyetujui pengajuan.";

 setPesanError(pesan);
 } finally {
 setIdProses(null);
 }
 };

 const bukaModalTolak = (pengajuan: DataPengajuan) => {
 setPesanError("");
 setPesanSukses("");
 setPengajuanDitolak(pengajuan);
 setAlasanPenolakan("");
 };

 const tutupModalTolak = () => {
 if (sedangTolak) return;

 setPengajuanDitolak(null);
 setAlasanPenolakan("");
 };

 const tolakPengajuanFa = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();

 if (!pengajuanDitolak) {
 setPesanError("Data pengajuan tidak ditemukan.");
 return;
 }

 if (!alasanPenolakan.trim()) {
 setPesanError("Alasan penolakan wajib diisi.");
 return;
 }

 try {
 setPesanError("");
 setPesanSukses("");
 setSedangTolak(true);

 const response = await fetch(
 `${apiUrl}/pengajuan/${pengajuanDitolak.id}/status`,
 {
 method: "PATCH",
 headers: headerJson(),
 body: JSON.stringify({
 status_pengajuan: "DITOLAK",
 catatan_admin: alasanPenolakan.trim(),
 }),
 }
 );

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(hasil?.message || "Pengajuan gagal ditolak.");
 }

 setPesanSukses("Pengajuan berhasil ditolak.");
 setPengajuanDitolak(null);
 setAlasanPenolakan("");
 await ambilData("refresh");
 } catch (error) {
 const pesan =
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menolak pengajuan.";

 setPesanError(pesan);
 } finally {
 setSedangTolak(false);
 }
 };

 const hapusPengajuan = async (idPengajuan: number) => {
 const yakin = window.confirm(
 "Yakin ingin menghapus pengajuan ini? File STD dan RAB juga akan dihapus."
 );

 if (!yakin) return;

 try {
 setPesanError("");
 setPesanSukses("");
 setIdProses(idPengajuan);

 const response = await fetch(`${apiUrl}/pengajuan/${idPengajuan}`, {
 method: "DELETE",
 headers: headerAuth() as HeadersInit,
 });

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(hasil?.message || "Pengajuan gagal dihapus.");
 }

 setPesanSukses("Pengajuan berhasil dihapus.");
 await ambilData("refresh");
 } catch (error) {
 const pesan =
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat menghapus pengajuan.";

 setPesanError(pesan);
 } finally {
 setIdProses(null);
 }
 };

 const bukaModalBuktiTransfer = (pengajuan: DataPengajuan) => {
 setPesanError("");
 setPesanSukses("");
 setPengajuanDipilih(pengajuan);
 setFormBuktiTransfer({
 nominal_transfer: "",
 tanggal_transfer: new Date().toISOString().slice(0, 10),
 keterangan: pengajuan.keterangan || `Transfer pengajuan #${pengajuan.id}`,
 bukti_transfer: null,
 });

 setTimeout(() => {
 const inputBukti = document.getElementById(
 "bukti_transfer"
 ) as HTMLInputElement | null;

 if (inputBukti) inputBukti.value = "";
 }, 0);
 };

 const tutupModalBuktiTransfer = () => {
 if (sedangUploadBukti) return;

 setPengajuanDipilih(null);
 setFormBuktiTransfer(formBuktiTransferAwal);
 };

 const ubahFileBuktiTransfer = (event: ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0] || null;

 setFormBuktiTransfer((sebelumnya) => ({
 ...sebelumnya,
 bukti_transfer: file,
 }));
 };

 const uploadBuktiTransfer = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();

 if (!pengajuanDipilih) {
 setPesanError("Data pengajuan tidak ditemukan.");
 return;
 }

 try {
 setPesanError("");
 setPesanSukses("");

 if (!apakahFa) {
 setPesanError("Hanya FA yang dapat upload bukti transfer.");
 return;
 }

 if (!formBuktiTransfer.nominal_transfer.trim()) {
 setPesanError("Nominal transfer wajib diisi.");
 return;
 }

 const nominal = normalisasiAngka(formBuktiTransfer.nominal_transfer);

 if (nominal <= 0) {
 setPesanError("Nominal transfer wajib lebih dari 0.");
 return;
 }

 if (!formBuktiTransfer.tanggal_transfer) {
 setPesanError("Tanggal transfer wajib diisi.");
 return;
 }

 if (!formBuktiTransfer.bukti_transfer) {
 setPesanError("Bukti transfer wajib diupload.");
 return;
 }

 setSedangUploadBukti(true);

 const formData = new FormData();

 formData.append("nominal_transfer", String(nominal));
 formData.append("tanggal_transfer", formBuktiTransfer.tanggal_transfer);
 formData.append("keterangan", formBuktiTransfer.keterangan.trim());
 formData.append("bukti_transfer", formBuktiTransfer.bukti_transfer);

 const response = await fetch(
 `${apiUrl}/pengajuan/${pengajuanDipilih.id}/upload-bukti-transfer`,
 {
 method: "POST",
 headers: headerAuth() as HeadersInit,
 body: formData,
 }
 );

 const hasil = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(
 hasil?.message ||
 "Upload bukti transfer gagal. Periksa kembali data."
 );
 }

 setPesanSukses(
 "Bukti transfer berhasil diupload. Saldo otomatis masuk ke akun karyawan."
 );

 setPengajuanDipilih(null);
 setFormBuktiTransfer(formBuktiTransferAwal);
 await ambilData("refresh");
 } catch (error) {
 const pesan =
 error instanceof Error
 ? error.message
 : "Terjadi kesalahan saat upload bukti transfer.";

 setPesanError(pesan);
 } finally {
 setSedangUploadBukti(false);
 }
 };

 return (
 <main className="min-h-screen bg-[#f8fafc] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
 <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
 <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-red-600 via-red-600 to-red-800 p-5 text-white shadow-xl shadow-red-100 sm:p-7">
 <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
 <div className="flex items-start gap-4">
 <button
 type="button"
 onClick={() => router.push("/hc/admin")}
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25"
 >
 <ArrowLeft className="h-5 w-5" />
 </button>

 <div>
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">
 <ClipboardList className="h-3.5 w-3.5" />
 {apakahFa ? "Approval FA" : "Pengajuan"}
 </div>

 <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
 {apakahFa
 ? "Review Pengajuan dan Transfer"
 : "Pengajuan STD dan RAB"}
 </h1>

 <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-red-50">
 {apakahFa
 ? "FA melakukan review STD/RAB, menyetujui atau menolak pengajuan, lalu upload bukti transfer jika disetujui."
 : "Admin / Admin HC membuat pengajuan dengan file STD dan RAB. Notifikasi akan dikirim ke FA untuk proses review."}
 </p>

 {namaLogin && (
 <p className="mt-2 text-xs font-bold text-red-50">
 Login sebagai: {namaLogin}
 </p>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
 <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
 <p className="text-xs font-bold text-red-50">Total</p>
 <p className="mt-1 text-2xl font-black">{totalPengajuan}</p>
 </div>

 <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
 <p className="text-xs font-bold text-red-50">Diajukan</p>
 <p className="mt-1 text-2xl font-black">{totalDiajukan}</p>
 </div>

 <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
 <p className="text-xs font-bold text-red-50">Transfer</p>
 <p className="mt-1 text-2xl font-black">
 {totalMenungguTransfer}
 </p>
 </div>

 <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
 <p className="text-xs font-bold text-red-50">Selesai</p>
 <p className="mt-1 text-2xl font-black">{totalSelesai}</p>
 </div>
 </div>
 </div>
 </section>

 {pesanError && (
 <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
 {pesanError}
 </div>
 )}

 {pesanSukses && (
 <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
 {pesanSukses}
 </div>
 )}

 {apakahAdmin && (
 <section className="rounded-[32px] border border-red-100 bg-white p-5 shadow-sm sm:p-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 className="text-lg font-black text-slate-950">
 Buat Pengajuan
 </h2>
 <p className="mt-1 text-sm font-semibold text-slate-500">
 Pilih karyawan, isi informasi pengajuan, lalu upload file STD
 dan RAB.
 </p>
 </div>

 <button
 type="button"
 onClick={() => setTampilkanForm((nilai) => !nilai)}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black !text-white shadow-lg shadow-red-100 transition hover:bg-red-700"
 >
 <UploadCloud className="h-4 w-4" />
 {tampilkanForm ? "Sembunyikan Form" : "Tampilkan Form"}
 </button>
 </div>

 {tampilkanForm && (
 <form
 onSubmit={simpanPengajuan}
 className="mt-5 grid gap-4 lg:grid-cols-2"
 >
 <div className="lg:col-span-2">
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Karyawan
 </label>

 <select
 value={formPengajuan.id_pengguna}
 onChange={(event) =>
 ubahForm("id_pengguna", event.target.value)
 }
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 >
 <option value="">Pilih karyawan</option>

 {daftarKaryawanAktif.map((pengguna) => (
 <option key={pengguna.id} value={pengguna.id}>
 {pengguna.nama} / {pengguna.nrp}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Jenis Pengajuan
 </label>

 <select
 value={formPengajuan.jenis_pengajuan}
 onChange={(event) =>
 ubahForm(
 "jenis_pengajuan",
 event.target.value as JenisPengajuan
 )
 }
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 >
 <option value="PERJALANAN_DINAS">Perjalanan Dinas</option>
 <option value="UANG_OPERASIONAL">Uang Operasional</option>
 </select>
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Tanggal Pengajuan
 </label>

 <div className="relative">
 <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
 <input
 type="date"
 value={formPengajuan.tanggal_pengajuan}
 onChange={(event) =>
 ubahForm("tanggal_pengajuan", event.target.value)
 }
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm font-bold outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 />
 </div>
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Lokasi
 </label>

 <input
 type="text"
 value={formPengajuan.lokasi}
 onChange={(event) => ubahForm("lokasi", event.target.value)}
 placeholder="Contoh: Bali"
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Keterangan
 </label>

 <input
 type="text"
 value={formPengajuan.keterangan}
 onChange={(event) =>
 ubahForm("keterangan", event.target.value)
 }
 placeholder="Contoh: Pengajuan perjalanan dinas Bali"
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 File STD
 </label>

 <input
 id="file_std"
 type="file"
 accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
 onChange={(event) => ubahFile(event, "file_std")}
 className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 outline-none file:mr-4 file:border-0 file:bg-red-600 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-red-700"
 />

 <p className="mt-2 text-xs font-semibold text-slate-500">
 {formPengajuan.file_std
 ? formPengajuan.file_std.name
 : formPengajuan.jenis_pengajuan === "PERJALANAN_DINAS"
 ? "Belum ada file STD."
 : "File STD tidak wajib untuk Uang Operasional."}
 </p>

 {formPengajuan.nomor_std && (
 <p className="mt-1 text-xs font-black text-red-600">
 Nomor STD: {formPengajuan.nomor_std}
 </p>
 )}
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 File RAB
 </label>

 <input
 id="file_rab"
 type="file"
 accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
 onChange={(event) => ubahFile(event, "file_rab")}
 className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 outline-none file:mr-4 file:border-0 file:bg-red-600 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-red-700"
 />

 <p className="mt-2 text-xs font-semibold text-slate-500">
 {formPengajuan.file_rab
 ? formPengajuan.file_rab.name
 : "Belum ada file RAB."}
 </p>
 </div>

 <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
 <button
 type="submit"
 disabled={sedangSimpan}
 className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black !text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangSimpan ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <Send className="h-4 w-4" />
 )}
 Simpan Pengajuan
 </button>

 <button
 type="button"
 onClick={resetForm}
 disabled={sedangSimpan}
 className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
 >
 Reset Form
 </button>
 </div>
 </form>
 )}
 </section>
 )}

 {apakahFa && (
 <section className="rounded-[28px] border border-purple-100 bg-purple-50 p-5">
 <p className="text-sm font-black text-purple-700">
 Mode FA: review pengajuan dari Admin, pilih Setuju/Tolak, lalu
 upload bukti transfer jika pengajuan sudah disetujui.
 </p>
 </section>
 )}

 <section className="rounded-[32px] border border-red-100 bg-white p-5 shadow-sm sm:p-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 className="text-lg font-black text-slate-950">
 Daftar Pengajuan
 </h2>
 <p className="mt-1 text-sm font-semibold text-slate-500">
 {apakahFa
 ? "FA melakukan review STD/RAB, lalu upload bukti transfer jika sudah disetujui."
 : "Data pengajuan STD/RAB yang dibuat Admin / Admin HC."}
 </p>
 </div>

 <button
 type="button"
 onClick={() => ambilData("refresh")}
 disabled={sedangRefresh}
 className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <RefreshCw
 className={`h-4 w-4 ${sedangRefresh ? "animate-spin" : ""}`}
 />
 Refresh
 </button>
 </div>

 <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
 <div className="relative">
 <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

 <input
 type="text"
 value={kataKunci}
 onChange={(event) => setKataKunci(event.target.value)}
 placeholder="Cari nama, NRP, lokasi, atau keterangan"
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 />
 </div>

 <select
 value={filterJenis}
 onChange={(event) =>
 setFilterJenis(event.target.value as "SEMUA" | JenisPengajuan)
 }
 className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 >
 <option value="SEMUA">Semua Jenis</option>
 <option value="PERJALANAN_DINAS">Perjalanan Dinas</option>
 <option value="UANG_OPERASIONAL">Uang Operasional</option>
 </select>

 <select
 value={filterStatus}
 onChange={(event) =>
 setFilterStatus(event.target.value as "SEMUA" | StatusPengajuan)
 }
 className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 >
 <option value="SEMUA">Semua Status</option>
 <option value="DIAJUKAN">Diajukan</option>
 <option value="MENUNGGU_TRANSFER">Menunggu Transfer</option>
 <option value="SELESAI">Selesai</option>
 <option value="DITOLAK">Ditolak</option>
 </select>
 </div>

 <div className="mt-5">
 {sedangMemuat ? (
 <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 text-slate-500">
 <Loader2 className="mb-3 h-8 w-8 animate-spin text-red-600" />
 <p className="text-sm font-black">Memuat data pengajuan...</p>
 </div>
 ) : daftarPengajuanTersaring.length === 0 ? (
 <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 text-center">
 <FileText className="mb-3 h-10 w-10 text-slate-300" />
 <p className="text-sm font-black text-slate-700">
 Belum ada data pengajuan.
 </p>
 </div>
 ) : (
 <div className="grid gap-4">
 {daftarPengajuanTersaring.map((pengajuan) => (
 <div
 key={pengajuan.id}
 className="rounded-[28px] border border-slate-100 bg-slate-50 p-4 transition hover:border-red-100 hover:bg-white hover:shadow-sm"
 >
 <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
 #{pengajuan.id}
 </span>

 <span
 className={`rounded-full border px-3 py-1 text-xs font-black ${warnaStatus(
 pengajuan.status_pengajuan
 )}`}
 >
 {formatStatus(pengajuan.status_pengajuan)}
 </span>

 <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-black text-slate-600">
 {formatJenis(pengajuan.jenis_pengajuan)}
 </span>
 </div>

 <h3 className="mt-3 text-lg font-black text-slate-950">
 {pengajuan.nama_pengguna}
 </h3>

 <p className="mt-1 text-sm font-bold text-slate-500">
 NRP: {pengajuan.nrp || "-"} • Tanggal:{" "}
 {formatTanggal(pengajuan.tanggal_pengajuan)}
 </p>

 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <div className="rounded-2xl bg-white p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Lokasi
 </p>
 <p className="mt-1 text-sm font-black text-slate-800">
 {pengajuan.lokasi || "-"}
 </p>
 </div>

 <div className="rounded-2xl bg-white p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 Keterangan
 </p>
 <p className="mt-1 text-sm font-black text-slate-800">
 {pengajuan.keterangan || "-"}
 </p>
 </div>
 </div>

 <div className="mt-3 grid gap-3 md:grid-cols-2">
 <button
 type="button"
 onClick={() => bukaFile(pengajuan.path_file_std)}
 className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-red-100 hover:bg-red-50"
 >
 <FileText className="h-5 w-5 shrink-0 text-red-600" />
 <div className="min-w-0">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 File STD
 </p>
 <p className="truncate text-sm font-black text-slate-800">
 {ambilNamaFile(pengajuan.path_file_std)}
 </p>
 </div>
 </button>

 <button
 type="button"
 onClick={() => bukaFile(pengajuan.path_file_rab)}
 className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-red-100 hover:bg-red-50"
 >
 <FileText className="h-5 w-5 shrink-0 text-red-600" />
 <div className="min-w-0">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
 File RAB
 </p>
 <p className="truncate text-sm font-black text-slate-800">
 {ambilNamaFile(pengajuan.path_file_rab)}
 </p>
 </div>
 </button>
 </div>

 {pengajuan.status_pengajuan === "DITOLAK" && (
 <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-red-600">
 Alasan Ditolak
 </p>
 <p className="mt-1 text-sm font-bold text-red-800">
 {pengajuan.catatan_admin || "-"}
 </p>
 </div>
 )}

 {pengajuan.status_pengajuan === "SELESAI" && (
 <div className="mt-3 grid gap-3 md:grid-cols-3">
 <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
 Nominal Transfer
 </p>
 <p className="mt-1 text-sm font-black text-emerald-800">
 {formatRupiah(pengajuan.nominal_transfer)}
 </p>
 </div>

 <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
 <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
 Tanggal Transfer
 </p>
 <p className="mt-1 text-sm font-black text-emerald-800">
 {formatTanggal(pengajuan.tanggal_transfer)}
 </p>
 </div>

 <button
 type="button"
 onClick={() =>
 bukaFile(pengajuan.path_file_bukti_transfer)
 }
 className="rounded-2xl border border-emerald-100 bg-white p-4 text-left transition hover:bg-emerald-50"
 >
 <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
 Bukti Transfer
 </p>
 <p className="mt-1 truncate text-sm font-black text-emerald-800">
 {ambilNamaFile(
 pengajuan.path_file_bukti_transfer
 )}
 </p>
 </button>
 </div>
 )}
 </div>

 <div className="grid gap-2 sm:grid-cols-2 xl:w-[280px] xl:grid-cols-1">
 {apakahFa && pengajuan.status_pengajuan === "DIAJUKAN" && (
 <>
 <button
 type="button"
 disabled={idProses === pengajuan.id}
 onClick={() => setujuiPengajuanFa(pengajuan.id)}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white !text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {idProses === pengajuan.id ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <CheckCircle2 className="h-4 w-4" />
 )}
 Setuju
 </button>

 <button
 type="button"
 disabled={idProses === pengajuan.id}
 onClick={() => bukaModalTolak(pengajuan)}
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white !text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <XCircle className="h-4 w-4" />
 Tolak
 </button>
 </>
 )}

 {apakahAdmin &&
 pengajuan.status_pengajuan !== "MENUNGGU_TRANSFER" &&
 pengajuan.status_pengajuan !== "SELESAI" && (
 <button
 type="button"
 disabled={idProses === pengajuan.id}
 onClick={() => hapusPengajuan(pengajuan.id)}
 className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <Trash2 className="h-4 w-4" />
 Hapus
 </button>
 )}

 {apakahAdmin &&
 pengajuan.status_pengajuan === "DIAJUKAN" && (
 <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
 Menunggu review dari FA.
 </div>
 )}

 {apakahFa &&
 pengajuan.status_pengajuan ===
 "MENUNGGU_TRANSFER" && (
 <>
 <button
 type="button"
 onClick={() =>
 bukaModalBuktiTransfer(pengajuan)
 }
 className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-black text-white !text-white transition hover:bg-purple-700"
 >
 <WalletCards className="h-4 w-4" />
 Upload Bukti Transfer
 </button>

 <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm font-bold text-purple-700">
 Pengajuan disetujui. Silakan upload bukti
 transfer.
 </div>
 </>
 )}

 {apakahAdmin &&
 pengajuan.status_pengajuan ===
 "MENUNGGU_TRANSFER" && (
 <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm font-bold text-purple-700">
 Menunggu FA upload bukti transfer.
 </div>
 )}

 {pengajuan.status_pengajuan === "SELESAI" && (
 <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
 Transfer selesai. Saldo sudah masuk ke karyawan.
 </div>
 )}

 {pengajuan.status_pengajuan === "DITOLAK" && (
 <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
 Pengajuan ditolak.
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </section>
 </div>

 {pengajuanDipilih && (
 <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
 <div className="w-full max-w-2xl rounded-[32px] bg-white p-5 shadow-2xl sm:p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-purple-600">
 <WalletCards className="h-3.5 w-3.5" />
 Bukti Transfer
 </div>

 <h2 className="text-xl font-black text-slate-950">
 Upload Bukti Transfer
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Pengajuan #{pengajuanDipilih.id} •{" "}
 {pengajuanDipilih.nama_pengguna} / {pengajuanDipilih.nrp}
 </p>
 </div>

 <button
 type="button"
 onClick={tutupModalBuktiTransfer}
 disabled={sedangUploadBukti}
 className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <form onSubmit={uploadBuktiTransfer} className="mt-5 grid gap-4">
 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Nominal Transfer
 </label>

 <input
 type="text"
 value={formBuktiTransfer.nominal_transfer}
 onChange={(event) =>
 setFormBuktiTransfer((sebelumnya) => ({
 ...sebelumnya,
 nominal_transfer: event.target.value,
 }))
 }
 placeholder="Contoh: 3000000"
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
 />

 <p className="mt-2 text-xs font-semibold text-slate-500">
 Terbaca: {formatRupiah(formBuktiTransfer.nominal_transfer)}
 </p>
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Tanggal Transfer
 </label>

 <input
 type="date"
 value={formBuktiTransfer.tanggal_transfer}
 onChange={(event) =>
 setFormBuktiTransfer((sebelumnya) => ({
 ...sebelumnya,
 tanggal_transfer: event.target.value,
 }))
 }
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Keterangan Transfer
 </label>

 <input
 type="text"
 value={formBuktiTransfer.keterangan}
 onChange={(event) =>
 setFormBuktiTransfer((sebelumnya) => ({
 ...sebelumnya,
 keterangan: event.target.value,
 }))
 }
 placeholder="Contoh: Transfer saldo perjalanan dinas"
 className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
 />
 </div>

 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 File Bukti Transfer
 </label>

 <input
 id="bukti_transfer"
 type="file"
 accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
 onChange={ubahFileBuktiTransfer}
 className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 outline-none file:mr-4 file:border-0 file:bg-purple-600 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-purple-700"
 />

 <p className="mt-2 text-xs font-semibold text-slate-500">
 {formBuktiTransfer.bukti_transfer
 ? formBuktiTransfer.bukti_transfer.name
 : "Belum ada file bukti transfer."}
 </p>
 </div>

 <div className="flex flex-col gap-3 sm:flex-row">
 <button
 type="submit"
 disabled={sedangUploadBukti}
 className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white !text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangUploadBukti ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <UploadCloud className="h-4 w-4" />
 )}
 Simpan Bukti Transfer
 </button>

 <button
 type="button"
 onClick={tutupModalBuktiTransfer}
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

 {pengajuanDitolak && (
 <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
 <div className="w-full max-w-xl rounded-[32px] bg-white p-5 shadow-2xl sm:p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-600">
 <XCircle className="h-3.5 w-3.5" />
 Tolak Pengajuan
 </div>

 <h2 className="text-xl font-black text-slate-950">
 Alasan Penolakan
 </h2>

 <p className="mt-1 text-sm font-semibold text-slate-500">
 Pengajuan #{pengajuanDitolak.id} •{" "}
 {pengajuanDitolak.nama_pengguna} / {pengajuanDitolak.nrp}
 </p>
 </div>

 <button
 type="button"
 onClick={tutupModalTolak}
 disabled={sedangTolak}
 className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <form onSubmit={tolakPengajuanFa} className="mt-5 grid gap-4">
 <div>
 <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
 Alasan
 </label>

 <textarea
 value={alasanPenolakan}
 onChange={(event) => setAlasanPenolakan(event.target.value)}
 placeholder="Contoh: File RAB belum sesuai nominal atau dokumen STD belum lengkap."
 rows={5}
 className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
 />
 </div>

 <div className="flex flex-col gap-3 sm:flex-row">
 <button
 type="submit"
 disabled={sedangTolak}
 className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white !text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {sedangTolak ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <XCircle className="h-4 w-4" />
 )}
 Tolak Pengajuan
 </button>

 <button
 type="button"
 onClick={tutupModalTolak}
 disabled={sedangTolak}
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