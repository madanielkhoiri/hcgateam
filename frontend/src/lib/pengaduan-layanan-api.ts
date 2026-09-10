// ==================================================
// FILE: frontend/src/lib/pengaduan-layanan-api.ts
// FUNGSI: Klien API Pengaduan Layanan (rating bintang + komentar untuk
// kepuasan layanan HC/GA/CIVIL) + tipe data
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type DivisiPengaduan = 'HC' | 'GA' | 'CIVIL';
export type LokasiPengaduan = 'TAMBANG' | 'MESS';
export type StatusPengaduan = 'MENUNGGU' | 'DISETUJUI' | 'DITAHAN' | 'DITOLAK';

export type BuatPengaduanInput = {
  divisi: DivisiPengaduan;
  rating: number;
  /** Catatan pengalaman saat kasih rating (step 1). */
  komentar?: string;
  /** Deskripsi masalah/permintaan Aduan Layanan (step 2). */
  deskripsiAduan?: string;
  /** Wajib untuk divisi GA/CIVIL, tidak berlaku untuk HC. */
  lokasi?: LokasiPengaduan;
  /** Wajib minimal 1 foto — bukti/ilustrasi Aduan Layanan. */
  foto: File[];
};

export type FotoPengaduan = {
  id: number;
  urlFoto: string;
  namaFile: string;
};

export type DetailPengaduan = {
  id: number;
  rating: number;
  komentar: string | null;
  deskripsiAduan: string | null;
  foto: FotoPengaduan[];
  lokasi: LokasiPengaduan | null;
  status: StatusPengaduan;
  catatanAdmin: string | null;
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

function headerAuth(json = true): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';

  return headers;
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
    const form = new FormData();
    form.append('divisi', input.divisi);
    form.append('rating', String(input.rating));
    if (input.komentar) form.append('komentar', input.komentar);
    if (input.deskripsiAduan) form.append('deskripsiAduan', input.deskripsiAduan);
    if (input.lokasi) form.append('lokasi', input.lokasi);
    input.foto.forEach((file) => form.append('foto', file));

    const response = await fetch(`${API_URL}/pengaduan-layanan`, {
      method: 'POST',
      headers: headerAuth(false),
      body: form,
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

  /** Approve/Hold/Reject oleh admin — catatan wajib untuk Hold & Reject, opsional untuk Approve. */
  ubahStatus: async (
    id: number,
    status: Exclude<StatusPengaduan, 'MENUNGGU'>,
    catatanAdmin?: string,
  ): Promise<void> => {
    const response = await fetch(`${API_URL}/pengaduan-layanan/${id}/status`, {
      method: 'PATCH',
      headers: headerAuth(),
      body: JSON.stringify({ status, catatanAdmin }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new PengaduanLayananApiError(await bacaError(response), response.status);
    }
  },
};

export const LABEL_DIVISI_PENGADUAN: Record<DivisiPengaduan, string> = {
  HC: 'HC',
  GA: 'GA',
  CIVIL: 'Civil',
};

export const LABEL_LOKASI_PENGADUAN: Record<LokasiPengaduan, string> = {
  TAMBANG: 'Tambang',
  MESS: 'Mess',
};

export const LABEL_STATUS_PENGADUAN: Record<StatusPengaduan, string> = {
  MENUNGGU: 'Menunggu',
  DISETUJUI: 'Disetujui',
  DITAHAN: 'Ditahan',
  DITOLAK: 'Ditolak',
};

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function namaBulan(bulan: number): string {
  return NAMA_BULAN[bulan - 1] ?? String(bulan);
}

/** URL publik foto Aduan Layanan (disimpan di uploads/pengaduan-layanan/...). */
export function urlFotoPengaduan(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}
