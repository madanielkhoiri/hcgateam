"use client";
import "./hc-globals.css";


import {
 FileText,
 History,
 Home,
 LogOut,
 PlusCircle,
 UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/* <--- layout karyawan dengan bottom navigation mobile seperti livin ---> */

type LayoutKaryawanProps = {
 children: ReactNode;
};

export default function LayoutKaryawan({ children }: LayoutKaryawanProps) {
 const router = useRouter();
 const pathname = usePathname();

 const handleKeluar = () => {
 localStorage.removeItem("hcga_access_token");
 localStorage.removeItem("hcga_user");
  sessionStorage.removeItem("hcga_access_token");
  sessionStorage.removeItem("hcga_user");
 router.replace("/");
 };

 const apakahAktif = (path: string) => {
  if (path === "/hc/deklarasi-dinas") {
  return pathname === "/hc/deklarasi-dinas";
  }

  return pathname.startsWith(path);
  };

  const menuBawahKaryawan = [
  {
  judul: "Beranda",
  path: "/hc/deklarasi-dinas",
  icon: <Home className="h-5 w-5" />,
  aktif: apakahAktif("/hc/deklarasi-dinas"),
  aksi: () => router.push("/hc/deklarasi-dinas"),
  },
 {
 judul: "Buat",
 path: "/hc/deklarasi/buat",
 icon: <PlusCircle className="h-5 w-5" />,
 aktif: apakahAktif("/hc/deklarasi/buat"),
 aksi: () => router.push("/hc/deklarasi/buat"),
 },
 {
 judul: "Deklarasi",
 path: "/hc/deklarasi/buat",
 icon: <FileText className="h-7 w-7" />,
 aktif: apakahAktif("/hc/deklarasi/buat"),
 aksi: () => router.push("/hc/deklarasi/buat"),
 tengah: true,
 },
 {
 judul: "Riwayat",
 path: "/hc/riwayat",
 icon: <History className="h-5 w-5" />,
 aktif: apakahAktif("/hc/riwayat"),
 aksi: () => router.push("/hc/riwayat"),
 },
 {
 judul: "Akun",
 path: "/hc/akun",
 icon: <UserRound className="h-5 w-5" />,
 aktif: apakahAktif("/hc/akun"),
 aksi: () => router.push("/hc/akun"),
 },
 ];

 return (
 <>
 {children}

 <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-red-100 bg-white/95 px-3 pb-3 pt-2 shadow-[0_-10px_40px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
 <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1 rounded-[28px] bg-white">
 {menuBawahKaryawan.map((menu) => (
 <button
 key={menu.judul}
 type="button"
 onClick={menu.aksi}
 className={`flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition ${
 menu.aktif
 ? "text-red-600"
 : "text-slate-500 hover:bg-red-50 hover:text-red-600"
 } ${menu.tengah ? "-mt-8" : ""}`}
 >
 <div
 className={`flex items-center justify-center rounded-2xl transition ${
 menu.tengah
 ? "h-14 w-14 rounded-full border-4 border-white bg-red-600 text-white shadow-xl shadow-red-200"
 : menu.aktif
 ? "h-10 w-10 bg-red-600 text-white shadow-lg shadow-red-200"
 : "h-10 w-10 bg-slate-50 text-slate-500"
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