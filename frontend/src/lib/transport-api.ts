// ==================================================
// FILE: frontend/src/lib/transport-api.ts
// FUNGSI: Klien API modul Transport ▸ Tiket & Travel + tipe data
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ==================================================
// TIPE DATA
// ==================================================

export type KaryawanRingkas = {
  id: number;
  nama: string;
  nik: string;
  departemen: { namaDepartemen: string } | null;
};

export type TransportTiketFile = {
  id: number;
  fileUrl: string;
  namaFile: string;
};

export type JenisTiket = 'PULANG_PERGI' | 'BERANGKAT_SAJA' | 'PULANG_SAJA';

export const LABEL_JENIS_TIKET: Record<JenisTiket, string> = {
  PULANG_PERGI: 'Pulang-Pergi',
  BERANGKAT_SAJA: 'Berangkat Saja',
  PULANG_SAJA: 'Pulang Saja',
};

export type TransportTiket = {
  id: number;
  karyawanId: number;
  jenisTiket: JenisTiket;
  tanggalMulai: string | null;
  jamMulai: string | null;
  tanggalSelesai: string | null;
  jamSelesai: string | null;
  keterangan: string | null;
  createdAt: string;
  karyawan?: KaryawanRingkas;
  pengirim?: { id: number; name: string };
  files: TransportTiketFile[];
};

export type StatusTravel = 'DIJADWALKAN' | 'BERJALAN' | 'SELESAI' | 'DIBATALKAN';

export type Driver = {
  id: number;
  nama: string;
  noTelepon: string | null;
  statusAktif: boolean;
  users?: { id: number; name: string; username: string | null }[];
  _count?: { travelJadwal: number };
};

export type TravelPenumpang = {
  id: number;
  travelId: number;
  karyawanId: number;
  checkInWaktu: string | null;
  checkOutWaktu: string | null;
  ratingBintang: number | null;
  ratingUlasan: string | null;
  karyawan?: KaryawanRingkas;
};

export type TravelJadwal = {
  id: number;
  armada: string;
  driverId: number;
  asal: string | null;
  tujuan: string;
  waktuBerangkatRencana: string;
  status: StatusTravel;
  catatan: string | null;
  driverCheckIn: string | null;
  driverCheckInFoto: string | null;
  driverCheckOut: string | null;
  durasiMenit: number | null;
  driver?: { id: number; nama: string };
  penumpang?: TravelPenumpang[];
  _count?: { penumpang: number };
};

export type TripDriver = TravelJadwal & {
  jumlahPenumpang: number;
  jumlahCheckin: number;
};

export type TravelSaya = TravelPenumpang & { travel: TravelJadwal };

// ==================================================
// KLIEN HTTP
// ==================================================

export class TransportApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TransportApiError';
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
  const response = await fetch(`${API_URL}${path}`, {
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
    throw new TransportApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** URL publik file yang disimpan lewat TiketFileService/TravelFileService, disajikan statis lewat /api/uploads/. */
export function urlFileTransport(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}

export const transportApi = {
  tiket: {
    daftarAdmin: () => request<TransportTiket[]>('/tiket/admin'),
    karyawanRingkas: (search?: string) =>
      request<KaryawanRingkas[]>(`/tiket/admin/karyawan${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    kirim: (
      data: {
        karyawanId: number;
        jenisTiket: JenisTiket;
        tanggalMulai?: string;
        jamMulai?: string;
        tanggalSelesai?: string;
        jamSelesai?: string;
        keterangan?: string;
      },
      files: File[],
    ) => {
      const form = new FormData();
      form.append('karyawanId', String(data.karyawanId));
      form.append('jenisTiket', data.jenisTiket);
      if (data.tanggalMulai) form.append('tanggalMulai', data.tanggalMulai);
      if (data.jamMulai) form.append('jamMulai', data.jamMulai);
      if (data.tanggalSelesai) form.append('tanggalSelesai', data.tanggalSelesai);
      if (data.jamSelesai) form.append('jamSelesai', data.jamSelesai);
      if (data.keterangan) form.append('keterangan', data.keterangan);
      files.forEach((file) => form.append('file', file));
      return request<TransportTiket>('/tiket/admin', { method: 'POST', body: form });
    },
    hapus: (id: number) => request<{ message: string }>(`/tiket/admin/${id}`, { method: 'DELETE' }),
    /** Perubahan jadwal dadakan dari penerbangan (delay/cuaca buruk/dsb) — kirim notifikasi WA khusus ke karyawan, bukan hapus-buat-ulang. Isi salah satu leg saja (berangkat/pulang) atau dua-duanya. */
    reschedule: (
      id: number,
      data: { tanggalMulai?: string; jamMulai?: string; tanggalSelesai?: string; jamSelesai?: string; alasan?: string },
      fileBaru?: File,
    ) => {
      const form = new FormData();
      if (data.tanggalMulai) form.append('tanggalMulai', data.tanggalMulai);
      if (data.jamMulai) form.append('jamMulai', data.jamMulai);
      if (data.tanggalSelesai) form.append('tanggalSelesai', data.tanggalSelesai);
      if (data.jamSelesai) form.append('jamSelesai', data.jamSelesai);
      if (data.alasan) form.append('alasan', data.alasan);
      if (fileBaru) form.append('file', fileBaru);
      return request<TransportTiket>(`/tiket/admin/${id}/reschedule`, { method: 'PATCH', body: form });
    },
    daftarSaya: () => request<TransportTiket[]>('/tiket/saya'),
    profilSaya: () => request<KaryawanRingkas | null>('/tiket/saya/profil'),
    tautkanNik: (nik: string) =>
      request<KaryawanRingkas>('/tiket/saya/tautkan-nik', { method: 'POST', body: JSON.stringify({ nik }) }),
  },

  travel: {
    daftarDriver: () => request<Driver[]>('/travel/admin/driver'),
    buatDriver: (data: { nama: string; noTelepon?: string; username?: string; password?: string }) =>
      request<Driver>('/travel/admin/driver', { method: 'POST', body: JSON.stringify(data) }),
    ubahDriver: (id: number, data: Partial<{ nama: string; noTelepon: string; statusAktif: boolean }>) =>
      request<Driver>(`/travel/admin/driver/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    hapusDriver: (id: number) => request<{ message: string }>(`/travel/admin/driver/${id}`, { method: 'DELETE' }),

    karyawanRingkas: (search?: string) =>
      request<KaryawanRingkas[]>(`/travel/admin/karyawan${search ? `?search=${encodeURIComponent(search)}` : ''}`),

    daftarJadwalAdmin: () => request<TravelJadwal[]>('/travel/admin/jadwal'),
    detailJadwalAdmin: (id: number) => request<TravelJadwal>(`/travel/admin/jadwal/${id}`),
    buatJadwal: (data: {
      armada: string;
      driverId: number;
      asal?: string;
      tujuan: string;
      waktuBerangkatRencana: string;
      catatan?: string;
      karyawanIds: number[];
    }) => request<TravelJadwal>('/travel/admin/jadwal', { method: 'POST', body: JSON.stringify(data) }),
    ubahJadwal: (
      id: number,
      data: Partial<{
        armada: string;
        driverId: number;
        asal: string;
        tujuan: string;
        waktuBerangkatRencana: string;
        catatan: string;
        status: 'DIJADWALKAN' | 'DIBATALKAN';
        karyawanIds: number[];
      }>,
    ) => request<TravelJadwal>(`/travel/admin/jadwal/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    hapusJadwal: (id: number) => request<{ message: string }>(`/travel/admin/jadwal/${id}`, { method: 'DELETE' }),

    daftarSaya: () => request<TravelSaya[]>('/travel/saya'),
    detailSaya: (id: number) => request<{ jadwal: TravelJadwal; penumpangSaya: TravelPenumpang }>(`/travel/saya/${id}`),
    checkin: (id: number) => request<TravelPenumpang>(`/travel/saya/${id}/checkin`, { method: 'POST' }),
    checkout: (id: number) => request<TravelPenumpang>(`/travel/saya/${id}/checkout`, { method: 'POST' }),
    rating: (id: number, data: { bintang: number; ulasan?: string }) =>
      request<TravelPenumpang>(`/travel/saya/${id}/rating`, { method: 'POST', body: JSON.stringify(data) }),

    daftarTripSaya: () => request<TripDriver[]>('/travel/driver'),
    detailTrip: (id: number) => request<TravelJadwal>(`/travel/driver/${id}`),
    driverCheckin: (id: number, foto: File) => {
      const form = new FormData();
      form.append('foto', foto);
      return request<TravelJadwal>(`/travel/driver/${id}/checkin`, { method: 'POST', body: form });
    },
    driverCheckout: (id: number) => request<TravelJadwal>(`/travel/driver/${id}/checkout`, { method: 'POST' }),
  },
};
