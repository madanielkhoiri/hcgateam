// ==================================================
// FILE: frontend/src/lib/approval-summary-api.ts
// FUNGSI: Ambil jumlah item yang menunggu approval dari akun yang login,
// dipakai untuk badge angka di kartu dashboard GA/HC/CIVIL.
// ==================================================

import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type RingkasanApproval = {
  workOrders: number;
  suratTugasDinas: number;
  eprom: number;
  deklarasiPengajuan: number;
  deklarasiNota: number;
  deklarasiSaldo: number;
};

const KOSONG: RingkasanApproval = {
  workOrders: 0,
  suratTugasDinas: 0,
  eprom: 0,
  deklarasiPengajuan: 0,
  deklarasiNota: 0,
  deklarasiSaldo: 0,
};

/** Diam-diam gagal (kembalikan 0 semua) kalau API error — badge cuma informasi tambahan, tidak boleh sampai bikin halaman dashboard gagal tampil. */
export async function ambilRingkasanApproval(): Promise<RingkasanApproval> {
  const token = getAccessToken();
  if (!token) return KOSONG;

  try {
    const response = await fetch(`${API_URL}/approval-summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) return KOSONG;

    return (await response.json()) as RingkasanApproval;
  } catch {
    return KOSONG;
  }
}
