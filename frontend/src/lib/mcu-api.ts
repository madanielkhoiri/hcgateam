// ==================================================
// FILE: frontend/src/lib/mcu-api.ts
// FUNGSI: Klien API modul MCU Periodik + tipe data bersama
// Referensi alur: alur-workflow-mcu-periodik-v3.md
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ==================================================
// TIPE DATA
// ==================================================

export type PeranMcu =
  | 'KARYAWAN'
  | 'ADMIN_DEPT'
  | 'HC'
  | 'DOKTER'
  | 'SHE'
  | 'KLINIK';

export type StatusKerja = 'AKTIF' | 'DIRUMAHKAN' | 'RESIGN';
export type StatusKesehatanDirumahkan = 'SAKIT' | 'FIT_SAKIT';
export type JenisMcu = 'AWAL' | 'BERKALA' | 'KHUSUS';
export type StatusPendaftaran =
  | 'DRAFT'
  | 'TERKUNCI'
  | 'SELESAI'
  | 'DIBATALKAN';
export type StatusSuratPengantar = 'DRAFT' | 'TERKIRIM';
export type StatusReview = 'MENUNGGU' | 'DIREVIEW' | 'SELESAI';
export type StatusRekomendasi = 'FIT' | 'FOLLOW_UP';
export type StatusFollowUp =
  | 'MENUNGGU_TANGGAL'
  | 'TERJADWAL'
  | 'TERLAKSANA'
  | 'TERLAMBAT_RESCHEDULE'
  | 'SELESAI';
export type StatusInduksiUlang = 'MENUNGGU' | 'TERJADWAL' | 'SELESAI';
export type TipePengunggah =
  | 'KARYAWAN'
  | 'KLINIK_TERKONEKSI'
  | 'HC'
  | 'ADMIN_DEPT';

/** Enam kategori akun MCU sesuai Bagian 2 alur-workflow-mcu-periodik-v3.md. */
export const SEMUA_PERAN_MCU: PeranMcu[] = [
  'KARYAWAN',
  'ADMIN_DEPT',
  'HC',
  'DOKTER',
  'SHE',
  'KLINIK',
];

export type Departemen = {
  id: number;
  namaDepartemen: string;
  adminAkunId: number | null;
  aktif: boolean;
  adminAkun?: { id: number; name: string; email: string | null } | null;
  _count?: { karyawan: number };
};

export type Karyawan = {
  id: number;
  nik: string;
  nama: string;
  departemenId: number;
  jabatan: string | null;
  email: string | null;
  tanggalLahir: string | null;
  tanggalMcuTerakhir: string | null;
  tanggalMcuExpired: string | null;
  tanggalMcuBerikutnya: string | null;
  statusKerja: StatusKerja;
  statusKesehatanDirumahkan: StatusKesehatanDirumahkan | null;
  akunId: number | null;
  departemen: Departemen;
  sisaHariExpired: number | null;
  sisaHariReminder: number | null;
  sudahJatuhTempo: boolean;
  mcuKedaluwarsa: boolean;
};

export type Klinik = {
  id: number;
  namaKlinik: string;
  alamat: string | null;
  picKlinik: string | null;
  terkoneksi: boolean;
  akunId: number | null;
  statusAktif: boolean;
  _count?: { jadwalMcu: number };
};

export type JadwalMcu = {
  id: number;
  karyawanId: number;
  departemenId: number;
  tanggalMcu: string;
  jenisMcu: JenisMcu;
  klinikId: number | null;
  statusPendaftaran: StatusPendaftaran;
  tanggalLock: string;
  catatan: string | null;
  diubahOlehHcAt: string | null;
  alasanPerubahanHc: string | null;
  karyawan: Pick<Karyawan, 'id' | 'nik' | 'nama'> & { email?: string | null };
  departemen: { id: number; namaDepartemen: string };
  klinik: { id: number; namaKlinik: string; terkoneksi: boolean } | null;
  suratPengantar: {
    id: number;
    nomorSurat: string;
    status: StatusSuratPengantar;
  } | null;
  hasilMcu: { id: number; statusReview: StatusReview } | null;
  terkunci: boolean;
  sisaHariLock: number;
  sisaHariPelaksanaan: number;
};

export type SuratPengantar = {
  id: number;
  nomorSurat: string;
  tanggalTerbit: string;
  status: StatusSuratPengantar;
  tanggalKirim: string | null;
  filePdf: string | null;
  jadwalMcu: {
    id: number;
    tanggalMcu: string;
    jenisMcu: JenisMcu;
    karyawan: { id: number; nik: string; nama: string };
    departemen: { id: number; namaDepartemen: string };
  };
  klinik: { id: number; namaKlinik: string; terkoneksi: boolean } | null;
};

export type HasilMcu = {
  id: number;
  tanggalUpload: string;
  tipePengunggah: TipePengunggah;
  namaFileAsli: string | null;
  statusReview: StatusReview;
  retensiHapusAt: string;
  fileDihapusAt: string | null;
  jadwalMcu: {
    id: number;
    tanggalMcu: string;
    jenisMcu: JenisMcu;
    karyawan: { id: number; nik: string; nama: string };
    departemen: { id: number; namaDepartemen: string };
  };
  rekomendasi: Array<{
    id: number;
    status: StatusRekomendasi;
    tanggalSubmit: string;
    siklusKe: number;
  }>;
};

export type Rekomendasi = {
  id: number;
  status: StatusRekomendasi;
  catatanMedisTerbatas: string | null;
  filePdfRekomendasi: string | null;
  suratRujukanFu: string | null;
  nomorSuratRujukan: string | null;
  siklusKe: number;
  tanggalSubmit: string;
  diteruskanKeDeptAt: string | null;
  diteruskanKeKaryawanAt: string | null;
  dokter: { id: number; name: string };
  hasilMcu: {
    id: number;
    jadwalMcu: {
      id: number;
      tanggalMcu: string;
      karyawan: { id: number; nik: string; nama: string };
      departemen: { id: number; namaDepartemen: string };
    };
  };
  followUp: {
    id: number;
    status: StatusFollowUp;
    batasWaktuFu: string | null;
  } | null;
  induksiUlang: { id: number; status: StatusInduksiUlang } | null;
};

export type FollowUp = {
  id: number;
  karyawanId: number;
  posBiaya: 'MANDIRI';
  batasWaktuFu: string | null;
  tanggalPilihanKaryawan: string | null;
  status: StatusFollowUp;
  jumlahReminderHc: number;
  siklusKe: number;
  ditutupAt: string | null;
  sisaHariBatas: number | null;
  melewatiBatas: boolean;
  karyawan: {
    id: number;
    nik: string;
    nama: string;
    departemen: { id: number; namaDepartemen: string };
  };
  rekomendasi: {
    id: number;
    siklusKe: number;
    suratRujukanFu: string | null;
    nomorSuratRujukan: string | null;
    catatanMedisTerbatas: string | null;
    hasilMcu: { id: number; jadwalMcu: { id: number; tanggalMcu: string } };
  };
  klinik: { id: number; namaKlinik: string } | null;
  ditetapkanOleh: { id: number; name: string } | null;
  hasilFollowUp: Array<{
    id: number;
    tanggalSubmit: string;
    statusReview: StatusReview;
    tipePengunggah: TipePengunggah;
    namaFileAsli: string | null;
    rekomendasiBaru: { id: number; status: StatusRekomendasi } | null;
  }>;
};

export type InduksiUlang = {
  id: number;
  tanggalDaftar: string;
  tanggalPelaksanaan: string | null;
  status: StatusInduksiUlang;
  catatan: string | null;
  karyawan: { id: number; nik: string; nama: string; statusKerja: StatusKerja };
  departemen: { id: number; namaDepartemen: string };
  rekomendasiPemic: { id: number; tanggalSubmit: string; siklusKe: number };
  she: { id: number; name: string } | null;
};

export type RingkasanMcu = {
  karyawanAktif: number;
  karyawanDirumahkan: number;
  reminderJatuhTempo: number;
  jadwalDraft: number;
  jadwalTerkunci: number;
  suratMenungguKirim: number;
  hasilMenungguReview: number;
  rekomendasiFit: number;
  rekomendasiFollowUp: number;
  rekomendasiBelumDiteruskan: number;
  followUpBerjalan: number;
  followUpTerlambat: number;
  induksiMenunggu: number;
  induksiTerjadwal: number;
};

export type PeranSaya = {
  akunId: number;
  peran: PeranMcu[];
  labelPeran: string[];
  karyawan: Karyawan | null;
  klinik: Klinik | null;
  departemen: Array<{ id: number; namaDepartemen: string }>;
};

export type LogNotifikasi = {
  id: number;
  tipe: string;
  refTabel: string;
  refId: number;
  judul: string;
  pesan: string;
  kanal: 'EMAIL_OUTLOOK' | 'IN_APP';
  statusKirim: 'MENUNGGU' | 'TERKIRIM' | 'GAGAL';
  waktuKirim: string | null;
  dibacaAt: string | null;
  createdAt: string;
  penerima: { id: number; name: string; email: string | null } | null;
};

export type DokumenRetensi = {
  id: number;
  jenis: string;
  namaFileAsli: string | null;
  tanggalUpload: string;
  retensiHapusAt: string;
  sisaHari: number;
  karyawan: { id: number; nik: string; nama: string };
};

// ==================================================
// KLIEN HTTP
// ==================================================

export class McuApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'McuApiError';
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
  const response = await fetch(`${API_URL}/mcu${path}`, {
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
    throw new McuApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const mcuApi = {
  ambil: <T>(path: string) => request<T>(path),

  kirim: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  ubah: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  hapus: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  unggah: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);

    return request<T>(path, { method: 'POST', body: form });
  },

  /** URL berkas yang perlu header Authorization - dibuka via unduhBerkas. */
  urlBerkas: (path: string) => `${API_URL}/mcu${path}`,
};

/** Unduh file terproteksi (hasil MCU/FU, surat rujukan) lalu buka di tab baru. */
export async function unduhBerkas(path: string, namaFile: string) {
  const response = await fetch(mcuApi.urlBerkas(path), {
    headers: headerAuth(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new McuApiError(await bacaError(response), response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');

  tautan.href = url;
  tautan.download = namaFile;
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  URL.revokeObjectURL(url);
}

// ==================================================
// FORMAT TAMPILAN
// ==================================================

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

/** Ubah tanggal ISO menjadi nilai untuk <input type="date">. */
export function nilaiInputTanggal(nilai: string | null | undefined): string {
  if (!nilai) {
    return '';
  }

  return new Date(nilai).toISOString().slice(0, 10);
}

export const LABEL_STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  TERKUNCI: 'Terkunci',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
  TERKIRIM: 'Terkirim',
  MENUNGGU: 'Menunggu',
  DIREVIEW: 'Direview',
  FIT: 'FIT',
  FOLLOW_UP: 'Follow Up',
  MENUNGGU_TANGGAL: 'Menunggu Tanggal',
  TERJADWAL: 'Terjadwal',
  TERLAKSANA: 'Terlaksana',
  TERLAMBAT_RESCHEDULE: 'Terlambat - Jadwal Ulang',
  AKTIF: 'Aktif',
  DIRUMAHKAN: 'Dirumahkan',
  RESIGN: 'Resign',
  SAKIT: 'Sakit',
  FIT_SAKIT: 'FIT dari Sakit',
  AWAL: 'MCU Awal',
  BERKALA: 'MCU Berkala',
  KHUSUS: 'MCU Khusus',
  KARYAWAN: 'Karyawan',
  KLINIK_TERKONEKSI: 'Klinik Terkoneksi',
  HC: 'HC',
  ADMIN_DEPT: 'Admin Dept',
  DOKTER: 'Dokter',
  SHE: 'SHE (K3)',
  KLINIK: 'Klinik Provider',
  EMAIL_OUTLOOK: 'Email Outlook',
  'IN_APP': 'In-App',
  GAGAL: 'Gagal',
};

export function labelStatus(nilai: string | null | undefined): string {
  if (!nilai) {
    return '-';
  }

  return LABEL_STATUS[nilai] ?? nilai;
}

/** Kelas warna badge per status; dipakai seluruh halaman MCU. */
export function nadaStatus(nilai: string | null | undefined): string {
  switch (nilai) {
    case 'FIT':
    case 'SELESAI':
    case 'TERKIRIM':
    case 'AKTIF':
    case 'FIT_SAKIT':
    case 'TERLAKSANA':
      return 'sukses';
    case 'FOLLOW_UP':
    case 'TERLAMBAT_RESCHEDULE':
    case 'DIBATALKAN':
    case 'RESIGN':
      return 'bahaya';
    case 'TERKUNCI':
    case 'MENUNGGU':
    case 'MENUNGGU_TANGGAL':
    case 'DIRUMAHKAN':
    case 'SAKIT':
      return 'peringatan';
    case 'DIREVIEW':
    case 'TERJADWAL':
      return 'info';
    default:
      return 'netral';
  }
}
