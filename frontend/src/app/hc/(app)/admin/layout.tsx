"use client";
import "../hc-globals.css";


import {
 BarChart3,
 ClipboardList,
 FileText,
 Home,
 Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/* <--- layout admin dengan menu input saldo diganti pengajuan ---> */

type LayoutAdminProps = {
 children: ReactNode;
};

export default function LayoutAdmin({ children }: LayoutAdminProps) {
 const router = useRouter();
 const pathname = usePathname();

 const apakahAktif = (path: string) => {
 if (path === "/hc/admin") {
 return pathname === "/hc/admin";
 }

 return pathname.startsWith(path);
 };

 const menuBawahAdmin = [
 {
 judul: "Beranda",
 path: "/hc/admin",
 icon: <Home className="h-5 w-5" />,
 aktif: apakahAktif("/hc/admin"),
 aksi: () => router.push("/hc/admin"),
 },
 {
 judul: "Akun",
 path: "/hc/admin/karyawan",
 icon: <Users className="h-5 w-5" />,
 aktif: apakahAktif("/hc/admin/karyawan"),
 aksi: () => router.push("/hc/admin/karyawan"),
 },
 {
 judul: "Pengajuan",
 path: "/hc/admin/pengajuan",
 icon: <FileText className="h-5 w-5" />,
 aktif: apakahAktif("/hc/admin/pengajuan") || apakahAktif("/hc/admin/saldo"),
 aksi: () => router.push("/hc/admin/pengajuan"),
 },
 {
 judul: "Data",
 path: "/hc/admin/deklarasi",
 icon: <ClipboardList className="h-5 w-5" />,
 aktif: apakahAktif("/hc/admin/deklarasi"),
 aksi: () => router.push("/hc/admin/deklarasi"),
 },
 {
 judul: "Laporan",
 path: "/hc/admin/laporan",
 icon: <BarChart3 className="h-5 w-5" />,
 aktif: apakahAktif("/hc/admin/laporan"),
 aksi: () => router.push("/hc/admin/laporan"),
 },
 ];

 return (
 <>
 {children}

 <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-red-100 bg-white/95 px-3 pb-3 pt-2 shadow-[0_-10px_40px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
 <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1 rounded-[28px] bg-white">
 {menuBawahAdmin.map((menu) => (
 <button
 key={menu.judul}
 type="button"
 onClick={menu.aksi}
 className={`flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition ${
 menu.aktif
 ? "text-red-600"
 : "text-slate-500 hover:bg-red-50 hover:text-red-600"
 }`}
 >
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
 menu.aktif
 ? "bg-red-600 text-white shadow-lg shadow-red-200"
 : "bg-slate-50 text-slate-500"
 }`}
 >
 {menu.icon}
 </div>

 <div
 className={`mt-1 truncate text-[11px] font-black ${
 menu.aktif ? "text-red-600" : "text-slate-500"
 }`}
 >
 {menu.judul}
 </div>
 </button>
 ))}
 </div>
 </nav>

 <style jsx global>{`
 @media (max-width: 767px) {
 body {
 overflow-x: hidden;
 }

 main {
 padding-bottom: 7.5rem !important;
 }
 }
 `}</style>
 </>
 );
}

/* <--- end ---> */