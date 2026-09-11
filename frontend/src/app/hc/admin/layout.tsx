"use client";
import "../(app)/hc-globals.css";


import {
 BarChart3,
 ClipboardList,
 FileText,
 Home,
 LayoutDashboard,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ModuleShell, type ModuleShellMenuItem } from "@/components/module-shell/module-shell";

const MENU_ADMIN_DEKLARASI: ModuleShellMenuItem[] = [
 { label: "Dashboard", href: "/hc/admin/dashboard", initial: "DB" },
 { label: "Beranda", href: "/hc/admin", initial: "BR", exact: true },
 { label: "Pengajuan", href: "/hc/admin/pengajuan", initial: "PJ" },
 { label: "Data Deklarasi", href: "/hc/admin/deklarasi", initial: "DD" },
 { label: "Laporan", href: "/hc/admin/laporan", initial: "LP" },
 { label: "Database Settlement", href: "/hc/admin/database-settlement", initial: "DS" },
];

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
 judul: "Dashboard",
 path: "/hc/admin/dashboard",
 icon: <LayoutDashboard className="h-5 w-5" />,
 aktif: apakahAktif("/hc/admin/dashboard"),
 aksi: () => router.push("/hc/admin/dashboard"),
 },
 {
 judul: "Beranda",
 path: "/hc/admin",
 icon: <Home className="h-5 w-5" />,
 aktif: pathname === "/hc/admin",
 aksi: () => router.push("/hc/admin"),
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
 <ModuleShell
  title="Deklarasi Dinas"
  subtitle="Admin / HC"
  deptBadge={{ text: "HC", color: "#0868f6", soft: "#eaf2ff" }}
  menuItems={MENU_ADMIN_DEKLARASI}
  backHref="/hc"
  backLabel="Kembali ke HC"
 >
  {children}
 </ModuleShell>

 <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d8e4f2] bg-white/95 px-3 pb-3 pt-2 shadow-[0_-10px_40px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
 <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1 rounded-[28px] bg-white">
 {menuBawahAdmin.map((menu) => (
 <button
 key={menu.judul}
 type="button"
 onClick={menu.aksi}
 className={`flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition ${
 menu.aktif
 ? "text-[#0868f6]"
 : "text-slate-500 hover:bg-[#eaf2ff] hover:text-[#0868f6]"
 }`}
 >
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
 menu.aktif
 ? "bg-[#0868f6] text-white shadow-lg shadow-[#cfe0fb]"
 : "bg-slate-50 text-slate-500"
 }`}
 >
 {menu.icon}
 </div>

 <div
 className={`mt-1 truncate text-[11px] font-black ${
 menu.aktif ? "text-[#0868f6]" : "text-slate-500"
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