"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* <--- halaman input saldo lama dialihkan menjadi halaman pengajuan ---> */

export default function HalamanSaldoDialihkanKePengajuan() {
 const router = useRouter();

 useEffect(() => {
 router.replace("/hc/admin/pengajuan");
 }, [router]);

 return (
 <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
 <div className="rounded-[28px] border border-red-100 bg-white p-6 text-center shadow-sm">
 <p className="text-sm font-black text-slate-700">
 Mengalihkan ke halaman Pengajuan...
 </p>
 </div>
 </main>
 );
}

/* <--- end ---> */