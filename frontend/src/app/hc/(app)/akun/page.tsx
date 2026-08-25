"use client";

import {
 ArrowLeft,
 BadgeCheck,
 LogOut,
 Mail,
 Phone,
 ShieldCheck,
 Ticket,
 UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/* <--- fitur halaman info akun karyawan ---> */

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

type ItemAkun = {
 label: string;
 nilai: string;
 icon: React.ReactNode;
};

export default function HalamanAkunKaryawan() {
 const router = useRouter();
 const [pengguna, setPengguna] = useState<DataPenggunaTersimpan | null>(null);

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
 }, [router]);

 const inisialNama =
 pengguna?.nama
 ?.split(" ")
 .map((item) => item[0])
 .join("")
 .slice(0, 2)
 .toUpperCase() || "U";

 const handleKeluar = () => {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");
 router.replace("/");
 };

 const itemAkun: ItemAkun[] = [
 {
 label: "Kode Tiket",
 nilai: pengguna?.kode_tiket || "-",
 icon: <Ticket className="h-5 w-5" />,
 },
 {
 label: "Role",
 nilai: pengguna?.role || "-",
 icon: <ShieldCheck className="h-5 w-5" />,
 },
 {
 label: "Email",
 nilai: pengguna?.email || "Belum diisi",
 icon: <Mail className="h-5 w-5" />,
 },
 {
 label: "Nomor Telepon",
 nilai: pengguna?.nomor_telepon || "Belum diisi",
 icon: <Phone className="h-5 w-5" />,
 },
 ];

 return (
 <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-5 md:px-8">
 <section className="mx-auto w-full max-w-3xl">
 <button
 type="button"
 onClick={() => router.push("/hc/deklarasi-dinas")}
 className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
 >
 <ArrowLeft className="h-4 w-4" />
 Kembali ke Dashboard
 </button>

 <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-red-700 via-red-600 to-rose-500 px-5 py-7 text-white shadow-[0_18px_60px_rgba(220,38,38,0.22)] md:px-8 md:py-8">
 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
 <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />

 <div className="relative flex items-center justify-between gap-4">
 <div className="flex min-w-0 items-center gap-4">
 <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-white text-xl font-black text-red-600 shadow-xl">
 {inisialNama}
 </div>

 <div className="min-w-0">
 <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
 Info Akun
 </div>

 <h1 className="mt-1 truncate text-2xl font-black md:text-3xl">
 {pengguna?.nama || "Karyawan"}
 </h1>

 <div className="mt-1 text-sm font-semibold text-white/85">
 NRP {pengguna?.nrp || "-"}
 </div>
 </div>
 </div>

 <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur md:flex">
 <UserRound className="h-6 w-6" />
 </div>
 </div>
 </div>

 <div className="mt-5 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 <BadgeCheck className="h-6 w-6" />
 </div>

 <div className="min-w-0">
 <div className="text-2xl font-black text-slate-900">
 Detail Akun
 </div>
 <div className="mt-1 text-sm font-semibold text-slate-500">
 Data login dan identitas pengguna.
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 {itemAkun.map((item) => (
 <div
 key={item.label}
 className="flex min-w-0 items-start gap-4 rounded-3xl bg-slate-50 p-5"
 >
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
 {item.icon}
 </div>

 <div className="min-w-0">
 <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
 {item.label}
 </div>
 <div className="mt-1 break-words text-base font-black text-slate-900">
 {item.nilai}
 </div>
 </div>
 </div>
 ))}
 </div>

 <button
 type="button"
 onClick={handleKeluar}
 className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
 >
 <LogOut className="h-4 w-4" />
 Keluar
 </button>
 </div>
 </section>
 </main>
 );
}

/* <--- end ---> */