// ==================================================
// FILE: frontend/src/lib/aktivitas-api.ts
// FUNGSI: Klien API Aktivitas Terbaru (rekap upload lintas modul)
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type JenisAktivitas =
  | 'POSTINGAN_POSTER'
  | 'POSTINGAN_VIDEO'
  | 'DOKUMEN_IR'
  | 'IR_COURSE';

export type AktivitasItem = {
  judul: string;
  jenis: JenisAktivitas;
  uploadedBy: { id: number; name: string; nrp: string | null };
  createdAt: string;
};

function headerAuth(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const aktivitasApi = {
  terbaru: async (): Promise<AktivitasItem[]> => {
    const response = await fetch(`${API_URL}/aktivitas/terbaru`, {
      headers: headerAuth(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as AktivitasItem[];
  },
};

export const LABEL_JENIS_AKTIVITAS: Record<JenisAktivitas, string> = {
  POSTINGAN_POSTER: 'Poster baru diunggah',
  POSTINGAN_VIDEO: 'Video informasi baru diunggah',
  DOKUMEN_IR: 'Dokumen IR baru diunggah',
  IR_COURSE: 'Video IR Course baru diunggah',
};
