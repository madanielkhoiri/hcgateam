// ==================================================
// FILE: frontend/src/lib/surat-tugas-dinas-api.ts
// FUNGSI: Klien API Form Tugas Dinas (R & D) + tipe data bersama
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type StatusSuratTugas =
  | 'MENUNGGU_SH'
  | 'MENUNGGU_PJO'
  | 'DISETUJUI'
  | 'DITOLAK';

export type KaryawanTugas = {
  id: number;
  urutan: number;
  nrp: string;
  nama: string;
  departemen: string;
  jabatan: string;
};

export type AkunRingkas = {
  id: number;
  name: string;
  role: string;
};

export type SuratTugasDinas = {
  id: number;
  nomor: string;
  tujuanLokasi: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keteranganTugas: string;
  status: StatusSuratTugas;
  filePdf: string | null;
  disetujuiShPada: string | null;
  disetujuiPjoPada: string | null;
  alasanTolak: string | null;
  createdAt: string;
  karyawan: KaryawanTugas[];
  dibuatOleh: AkunRingkas;
  disetujuiShOleh: AkunRingkas | null;
  disetujuiPjoOleh: AkunRingkas | null;
};

export class SuratTugasApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SuratTugasApiError';
  }
}

function headerAuth(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}/surat-tugas-dinas${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new SuratTugasApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const suratTugasApi = {
  ambil: <T>(path: string) => request<T>(path),

  kirim: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  ubah: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  urlPdf: (filePdf: string) => `${API_URL}/uploads/${filePdf}`,
};

export function formatTanggal(nilai: string | null | undefined): string {
  if (!nilai) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(nilai));
}

export function formatTanggalWaktu(nilai: string | null | undefined): string {
  if (!nilai) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(nilai));
}

export const LABEL_STATUS_SURAT_TUGAS: Record<StatusSuratTugas, string> = {
  MENUNGGU_SH: 'Menunggu Persetujuan SH',
  MENUNGGU_PJO: 'Menunggu Persetujuan PJO',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

export function nadaStatusSuratTugas(nilai: StatusSuratTugas): string {
  switch (nilai) {
    case 'DISETUJUI':
      return 'sukses';
    case 'DITOLAK':
      return 'bahaya';
    default:
      return 'peringatan';
  }
}