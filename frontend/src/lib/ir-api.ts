// ==================================================
// FILE: frontend/src/lib/ir-api.ts
// FUNGSI: Klien API PORTAL IR (Upload Dokumen, Aspirasi Karyawan, IR Course) + tipe data
// ==================================================

import { getAccessToken, type PortalUser } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ==================================================
// TIPE DATA
// ==================================================

export type KategoriDokumenIr = 'SK' | 'IM' | 'FORM';
export type TipeAspirasiPertanyaan = 'PILIHAN_GANDA' | 'ESSAY';

export type DokumenIr = {
  id: number;
  kategori: KategoriDokumenIr;
  judul: string;
  namaFile: string;
  urlFile: string;
  createdAt: string;
  uploadedBy: { id: number; name: string; nrp: string | null };
};

export type AspirasiOpsi = { id: number; teks: string; urutan: number };

export type AspirasiJawaban = {
  id: number;
  pertanyaanId: number;
  userId: number;
  opsiId: number | null;
  jawabanTeks: string | null;
  namaPenjawab: string;
  nrpPenjawab: string | null;
  createdAt: string;
  opsi?: AspirasiOpsi | null;
};

/** Bentuk respons GET /aspirasi/pertanyaan untuk akun biasa (isi jawaban). */
export type AspirasiPertanyaanUntukDiisi = {
  id: number;
  teks: string;
  tipe: TipeAspirasiPertanyaan;
  opsi: AspirasiOpsi[];
  jawabanSaya: AspirasiJawaban | null;
};

/** Bentuk respons GET /aspirasi/pertanyaan untuk Admin/Admin HC/Section Head. */
export type AspirasiPertanyaanKelola = {
  id: number;
  teks: string;
  tipe: TipeAspirasiPertanyaan;
  aktif: boolean;
  urutan: number;
  createdAt: string;
  opsi: AspirasiOpsi[];
  createdBy: { id: number; name: string; nrp: string | null };
  _count: { jawaban: number };
};

export type AspirasiRekap = AspirasiPertanyaanKelola & {
  jawaban: AspirasiJawaban[];
};

export type IrCourseVideo = {
  id: number;
  judul: string;
  deskripsi: string | null;
  urlVideo: string;
  uploadedBy: { id: number; name: string; nrp: string | null };
  createdAt: string;
  totalDitonton: number;
  sudahDitonton: boolean;
  ditontonPada: string | null;
};

export type IrCoursePenonton = {
  id: number;
  judul: string;
  tontonan: {
    ditontonPada: string;
    user: { id: number; name: string; nrp: string | null };
  }[];
};

// ==================================================
// KLIEN HTTP
// ==================================================

export class IrApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function headerAuth(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function bacaError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const pesan = Array.isArray(data?.message) ? data.message[0] : data?.message;
    return pesan || `Permintaan gagal (${response.status})`;
  } catch {
    return `Permintaan gagal (${response.status})`;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/ir${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      ...(init.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new IrApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const irApi = {
  dokumen: {
    daftar: (kategori?: KategoriDokumenIr) =>
      request<DokumenIr[]>(`/dokumen${kategori ? `?kategori=${kategori}` : ''}`),
    unggah: (kategori: KategoriDokumenIr, judul: string, file: File) => {
      const form = new FormData();
      form.append('kategori', kategori);
      form.append('judul', judul);
      form.append('file', file);
      return request<DokumenIr>('/dokumen', { method: 'POST', body: form });
    },
    hapus: (id: number) =>
      request<{ message: string }>(`/dokumen/${id}`, { method: 'DELETE' }),
  },

  aspirasi: {
    daftar: () =>
      request<(AspirasiPertanyaanUntukDiisi | AspirasiPertanyaanKelola)[]>(
        '/aspirasi/pertanyaan',
      ),
    buat: (data: {
      teks: string;
      tipe: TipeAspirasiPertanyaan;
      opsi?: string[];
    }) =>
      request<AspirasiPertanyaanKelola>('/aspirasi/pertanyaan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    ubah: (
      id: number,
      data: Partial<{ teks: string; aktif: boolean; opsi: string[] }>,
    ) =>
      request<AspirasiPertanyaanKelola>(`/aspirasi/pertanyaan/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    hapus: (id: number) =>
      request<{ message: string }>(`/aspirasi/pertanyaan/${id}`, {
        method: 'DELETE',
      }),
    jawab: (id: number, data: { opsiId?: number; jawabanTeks?: string }) =>
      request<AspirasiJawaban>(`/aspirasi/pertanyaan/${id}/jawaban`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    rekap: (id: number) =>
      request<AspirasiRekap>(`/aspirasi/pertanyaan/${id}/jawaban`),
  },

  course: {
    daftar: () => request<IrCourseVideo[]>('/course/video'),
    unggah: (judul: string, deskripsi: string | undefined, file: File) => {
      const form = new FormData();
      form.append('judul', judul);
      if (deskripsi) form.append('deskripsi', deskripsi);
      form.append('file', file);
      return request<IrCourseVideo>('/course/video', {
        method: 'POST',
        body: form,
      });
    },
    hapus: (id: number) =>
      request<{ message: string }>(`/course/video/${id}`, {
        method: 'DELETE',
      }),
    tandaiDitonton: (id: number) =>
      request(`/course/video/${id}/tonton`, { method: 'POST' }),
    penonton: (id: number) =>
      request<IrCoursePenonton>(`/course/video/${id}/penonton`),
  },
};

/** URL publik file yang disimpan lewat IrFileService, disajikan statis lewat /api/uploads/. */
export function urlFileIr(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}

export function isIrPengelola(user: PortalUser | null): boolean {
  return (
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SECTION_HEAD'
  );
}
