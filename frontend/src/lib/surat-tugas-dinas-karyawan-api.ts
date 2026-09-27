import { getAccessToken } from "./access-control";
import { urlUploads } from "./uploads-url";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type SuratTugasKaryawanSaya = {
  id: number;
  nrp: string;
  nama: string;
  nominalAdvance: number;
  advanceDikonfirmasiPada: string | null;
  advancePembuatNama: string | null;
  advanceShNama: string | null;
  advanceShJabatan: string | null;
  advanceFilePdf: string | null;
  surat: {
    id: number;
    nomor: string;
    tujuanLokasi: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    keteranganTugas: string;
    filePdf: string | null;
    suratTugasAsal: {
      id: number;
      nomor: string;
      filePdf: string | null;
    } | null;
  };
};

async function request<T>(path = "", init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/surat-tugas-dinas-karyawan${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const pesan = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || `Permintaan gagal (${response.status})`;
    throw new Error(pesan);
  }

  return (await response.json()) as T;
}

export const suratTugasKaryawanApi = {
  daftar: () => request<SuratTugasKaryawanSaya[]>(),
  konfirmasi: (id: number) =>
    request<SuratTugasKaryawanSaya>(`/${id}/konfirmasi-advance`, {
      method: "PATCH",
    }),
  urlPdf: (path: string) => urlUploads(path),
};
