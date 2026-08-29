// ==================================================
// FILE: frontend/src/lib/kip-api.ts
// FUNGSI: Klien API modul KIP (Kartu Inspeksi Peralatan) + tipe data
// Lokasi (6 pilihan tetap) berperan langsung sebagai "barcode" — tidak ada
// entitas Barcode terpisah, satu form KIP sudah cukup untuk semuanya.
// ==================================================

import { getAccessToken } from './access-control';
import type { LokasiHousekeepingIndoor } from './housekeeping-indoor-api';

export type { LokasiHousekeepingIndoor } from './housekeeping-indoor-api';
export {
  LABEL_LOKASI_HOUSEKEEPING_INDOOR as LABEL_LOKASI_KIP,
  LOKASI_HOUSEKEEPING_INDOOR as LOKASI_KIP,
} from './housekeeping-indoor-api';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type StatusChecklistKip = 'BELUM' | 'SUDAH';

export type ParameterCeklisHasil = { label: string; checked: boolean };

export type KipChecklistBulan = {
  id: number;
  kipId: number;
  bulan: number;
  status: StatusChecklistKip;
  diperiksaOleh: number | null;
  tanggalPeriksa: string | null;
  fotoBukti: string | null;
  parameterCeklis: ParameterCeklisHasil[] | null;
  pemeriksa?: { id: number; name: string } | null;
};

export type Kip = {
  id: number;
  noKip: string;
  jenisPeralatan: string;
  departemen: string;
  tahun: number;
  lokasi: LokasiHousekeepingIndoor;
  parameterChecklist: string[];
  createdAt: string;
  checklist: KipChecklistBulan[];
};

export type GpsLokasiKip = { lokasi: LokasiHousekeepingIndoor; latitude: number; longitude: number };

export type StatusLokasi = { lokasi: LokasiHousekeepingIndoor; kip: Kip[]; gps: GpsLokasiKip | null };

/** Ambil posisi GPS browser saat ini (promise-based). Gagal/ditolak → reject dengan pesan Indonesia. */
export function ambilLokasiGps(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat tidak mendukung akses lokasi GPS'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => reject(new Error('Akses lokasi GPS ditolak/gagal — aktifkan izin lokasi lalu coba lagi')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export class KipApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'KipApiError';
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

async function request<T>(path: string, init: RequestInit = {}, wajibAuth = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(wajibAuth ? headerAuth() : {}),
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new KipApiError(await bacaError(response), response.status);
  }

  return (await response.json()) as T;
}

export const kipApi = {
  daftarKip: (filter?: { lokasi?: LokasiHousekeepingIndoor; tahun?: number }) => {
    const params = new URLSearchParams();
    if (filter?.lokasi) params.set('lokasi', filter.lokasi);
    if (filter?.tahun) params.set('tahun', String(filter.tahun));
    const qs = params.toString();
    return request<Kip[]>(`/kip/admin/kip${qs ? `?${qs}` : ''}`);
  },
  buatKip: (data: {
    noKip: string;
    jenisPeralatan: string;
    departemen: string;
    tahun: number;
    lokasi: LokasiHousekeepingIndoor;
    parameterChecklist: string[];
  }) => request<Kip>('/kip/admin/kip', { method: 'POST', body: JSON.stringify(data) }),
  ubahKip: (
    id: number,
    data: {
      noKip: string;
      jenisPeralatan: string;
      departemen: string;
      tahun: number;
      lokasi: LokasiHousekeepingIndoor;
      parameterChecklist: string[];
    },
  ) => request<Kip>(`/kip/admin/kip/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  hapusKip: (id: number) => request<{ message: string }>(`/kip/admin/kip/${id}`, { method: 'DELETE' }),

  /** Endpoint publik — dipakai halaman scan, tidak wajib login. */
  statusByKode: (kode: string) => request<StatusLokasi>(`/kip/publik/${encodeURIComponent(kode)}`, {}, false),

  ceklis: (
    kipId: number,
    bulan: number,
    data: {
      foto: File;
      parameterChecked: boolean[];
      lokasiSekarang?: { latitude: number; longitude: number };
    },
  ) => {
    const form = new FormData();
    form.append('foto', data.foto);
    form.append('parameterChecked', JSON.stringify(data.parameterChecked));
    if (data.lokasiSekarang) {
      form.append('latitude', String(data.lokasiSekarang.latitude));
      form.append('longitude', String(data.lokasiSekarang.longitude));
    }
    return request<KipChecklistBulan>(`/kip/${kipId}/checklist/${bulan}`, {
      method: 'POST',
      body: form,
    });
  },

  /** Simpan titik GPS acuan lokasi — dipanggil sekali saat admin cetak barcode sambil berdiri di lokasi tsb. */
  simpanGpsLokasi: (lokasi: LokasiHousekeepingIndoor, latitude: number, longitude: number) =>
    request<GpsLokasiKip>(`/kip/admin/lokasi-gps/${lokasi}`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }),

  /** SVG mentah (bukan JSON) — untuk ditampilkan/dicetak langsung sebagai label barcode lokasi. */
  qrSvg: async (lokasi: LokasiHousekeepingIndoor, target: string) => {
    const response = await fetch(`${API_URL}/kip/admin/qr/${lokasi}?target=${encodeURIComponent(target)}`, {
      headers: headerAuth(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new KipApiError(await bacaError(response), response.status);
    }

    return response.text();
  },
};

/** URL publik foto bukti inspeksi yang disimpan lewat KipFileService, disajikan statis lewat /api/uploads/. */
export function urlFotoKip(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}
