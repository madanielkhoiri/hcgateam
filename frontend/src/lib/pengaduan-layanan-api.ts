// ==================================================
// FILE: frontend/src/lib/pengaduan-layanan-api.ts
// FUNGSI: Klien API Pengaduan Layanan (rating bintang + komentar untuk
// kepuasan layanan HC/GA/CIVIL) + tipe data
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type DivisiPengaduan = 'HC' | 'GA' | 'CIVIL';

export type BuatPengaduanInput = {
  divisi: DivisiPengaduan;
  rating: number;
  komentar?: string;
};

export type DetailPengaduan = {
  id: number;
  rating: number;
  komentar: string | null;
  pengirim: string;
  createdAt: string;
};

export type TrenBulananPengaduan = {
  bulan: number;
  tahun: number;
  label: string;
  rataRata: number;
  jumlah: number;
};

export type RekapPengaduan = {
  divisi: DivisiPengaduan;
  bulan: number;
  tahun: number;
  rataRata: number;
  jumlahPengaduan: number;
  distribusiBintang: Record<'1' | '2' | '3' | '4' | '5', number>;
  daftar: DetailPengaduan[];
  tren: TrenBulananPengaduan[];
};

export class PengaduanLayananApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PengaduanLayananApiError';
  }
}

function headerAuth(): HeadersInit {
  const token = getAccessToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function bacaError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }

    return data.message || `Permintaan gagal (${response.status})`;
  } catch {
    return `Permintaan gagal (${response.status})`;
  }
}

export const pengaduanLayananApi = {
  kirim: async (input: BuatPengaduanInput): Promise<void> => {
    const response = await fetch(`${API_URL}/pengaduan-layanan`, {
      method: 'POST',
      headers: headerAuth(),
      body: JSON.stringify(input),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new PengaduanLayananApiError(await bacaError(response), response.status);
    }
  },

  rekap: async (
    divisi: DivisiPengaduan,
    bulan?: number,
    tahun?: number,
  ): Promise<RekapPengaduan> => {
    const params = new URLSearchParams({ divisi });
    if (bulan) params.set('bulan', String(bulan));
    if (tahun) params.set('tahun', String(tahun));

    const response = await fetch(
      `${API_URL}/pengaduan-layanan/rekap?${params.toString()}`,
      { headers: headerAuth(), cache: 'no-store' },
    );

    if (!response.ok) {
      throw new PengaduanLayananApiError(await bacaError(response), response.status);
    }

    return (await response.json()) as RekapPengaduan;
  },
};

export const LABEL_DIVISI_PENGADUAN: Record<DivisiPengaduan, string> = {
  HC: 'HC',
  GA: 'GA',
  CIVIL: 'Civil',
};

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function namaBulan(bulan: number): string {
  return NAMA_BULAN[bulan - 1] ?? String(bulan);
}
