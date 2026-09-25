// ==================================================
// FILE: frontend/src/lib/tiket-billing-api.ts
// FUNGSI: Klien API modul Billing & Rekapan Tiket
// ==================================================

import { getAccessToken } from './access-control';
import { urlUploads } from './uploads-url';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type AkunRingkas = {
  id: number;
  name: string;
};

export type TiketBilling = {
  id: number;
  namaRekapan: string;
  bulan: number;
  tahun: number;
  namaFileZip: string;
  jumlahInvoice: number;
  subTotal: number;
  filePdf: string;
  ppn: number | null;
  pph23: number | null;
  grandTotalVendor: number | null;
  grandTotalHitung: number | null;
  dihitungPada: string | null;
  createdAt: string;
  pembuat: AkunRingkas;
  penghitung: AkunRingkas | null;
};

export class TiketBillingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TiketBillingApiError';
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/tiket/billing${path}`, {
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
    throw new TiketBillingApiError(await bacaError(response), response.status);
  }

  return (await response.json()) as T;
}

export const tiketBillingApi = {
  daftar: (filter?: { bulan?: number; tahun?: number }) => {
    const params = new URLSearchParams();

    if (filter?.bulan) {
      params.set('bulan', String(filter.bulan));
    }

    if (filter?.tahun) {
      params.set('tahun', String(filter.tahun));
    }

    const qs = params.toString();
    return request<TiketBilling[]>(qs ? `?${qs}` : '');
  },

  detail: (id: number) => request<TiketBilling>(`/${id}`),

  buat: (formData: FormData) =>
    request<TiketBilling>('', { method: 'POST', body: formData }),

  hitung: (
    id: number,
    dto: { ppn: number; pph23: number; grandTotalVendor: number },
  ) =>
    request<TiketBilling>(`/${id}/hitung`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  ubah: (
    id: number,
    dto: { namaRekapan?: string; bulan?: string; tahun?: string },
  ) =>
    request<TiketBilling>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  hapus: (id: number) => request<{ message: string }>(`/${id}`, { method: 'DELETE' }),

  urlPdf: (filePdf: string) => urlUploads(filePdf.replace(/^\/?uploads\//, '')),
};

export function formatRupiah(nilai: number | null | undefined): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(nilai ?? 0)}`;
}

export const LABEL_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatPeriode(bulan: number, tahun: number): string {
  return `${LABEL_BULAN[bulan - 1] ?? bulan} ${tahun}`;
}

export function formatWaktu(nilai: string | null | undefined): string {
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
