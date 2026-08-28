// ==================================================
// FILE: frontend/src/lib/eprom-api.ts
// FUNGSI: Klien API modul e-ProM (Tender, Kontrak, Vendor, Dokumen) + tipe data
// ==================================================

import { getAccessToken, type PortalUser } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ==================================================
// TIPE DATA
// ==================================================

export type StatusLegalitasVendor = 'BELUM_LENGKAP' | 'LENGKAP';
export type StatusTender = 'PERSIAPAN' | 'UNDANGAN_TERKIRIM' | 'EVALUASI_SPH' | 'SELESAI';
export type ScopeDocumentFolder = 'TENDER_DOKUMEN' | 'LEGALITAS_VENDOR';
export type TipeFileEprom = 'PDF' | 'RAB' | 'CAD' | 'FOTO';

export type Vendor = {
  id: number;
  namaVendor: string;
  email: string | null;
  noTelepon: string | null;
  statusAktif: boolean;
  legalitasStatus: StatusLegalitasVendor;
  users?: { id: number; name: string; username: string | null }[];
  _count?: { kontrak: number };
};

export type TenderUndangan = {
  id: number;
  tenderId: number;
  vendorId: number;
  fileUndangan: string | null;
  tanggalKirim: string | null;
  vendor: Vendor;
};

export type TenderSPH = {
  id: number;
  tenderId: number;
  vendorId: number;
  roundKe: number;
  fileSph: string | null;
  hargaPenawaran: string | null;
  isFinal: boolean;
  statusPemenang: boolean;
  vendor?: Vendor;
};

export type TenderProcess = {
  id: number;
  namaTender: string;
  status: StatusTender;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  _count?: { undangan: number; sph: number };
  kontrak?: { id: number } | null;
  /** SPH pemenang (statusPemenang=true), terisi hanya saat status SELESAI. */
  pemenang?: { vendorId: number; vendor: { id: number; namaVendor: string } } | null;
};

export type TenderDetail = TenderProcess & {
  undangan: TenderUndangan[];
  sph: TenderSPH[];
};

export type KategoriEvaluasiVendor =
  | 'bumdesKode'
  | 'bupatiDprKode'
  | 'lingkunganKode'
  | 'pekerjaLokalKode'
  | 'kepolisianKode'
  | 'dlhKode'
  | 'dpuprKode';

export const KATEGORI_EVALUASI_VENDOR: KategoriEvaluasiVendor[] = [
  'bumdesKode',
  'bupatiDprKode',
  'lingkunganKode',
  'pekerjaLokalKode',
  'kepolisianKode',
  'dlhKode',
  'dpuprKode',
];

export const LABEL_KATEGORI_EVALUASI_VENDOR: Record<KategoriEvaluasiVendor, string> = {
  bumdesKode: 'Bumdes',
  bupatiDprKode: 'Bupati & DPR/tim bersangkutan',
  lingkunganKode: 'Lingkungan',
  pekerjaLokalKode: 'Pekerja Lokal',
  kepolisianKode: 'Kepolisian',
  dlhKode: 'DLH',
  dpuprKode: 'DPUPR',
};

export const KODE_EVALUASI_VENDOR: Record<number, { keterangan: string; bobot: number }> = {
  1: { keterangan: 'Sudah Terjalin Komunikasi', bobot: 100 },
  2: { keterangan: 'Pernah Menjalin Komunikasi', bobot: 75 },
  3: { keterangan: 'Belum Menjalin Komunikasi', bobot: 50 },
  4: { keterangan: 'Track Record Tidak Baik', bobot: 0 },
};

export type KategoriEvaluasiTeknis =
  | 'teknikalMetode'
  | 'teknikalAlatKerja'
  | 'teknikalSpesifikasi'
  | 'teknikalPengalaman'
  | 'teknikalKomunikatif'
  | 'scheduleSkor'
  | 'hargaKetepatanWaktu'
  | 'hargaNegosiasi'
  | 'sheSkor'
  | 'legalitasSkor';

export const ITEM_TEKNIKAL: KategoriEvaluasiTeknis[] = [
  'teknikalMetode',
  'teknikalAlatKerja',
  'teknikalSpesifikasi',
  'teknikalPengalaman',
  'teknikalKomunikatif',
];

export const ITEM_HARGA: KategoriEvaluasiTeknis[] = ['hargaKetepatanWaktu', 'hargaNegosiasi'];

export const KATEGORI_EVALUASI_TEKNIS: KategoriEvaluasiTeknis[] = [
  ...ITEM_TEKNIKAL,
  'scheduleSkor',
  ...ITEM_HARGA,
  'sheSkor',
  'legalitasSkor',
];

export const LABEL_ITEM_TEKNIS: Record<KategoriEvaluasiTeknis, string> = {
  teknikalMetode: 'Metode Pelaksanaan',
  teknikalAlatKerja: 'Alat Kerja dan Man Power',
  teknikalSpesifikasi: 'Spesifikasi Teknik',
  teknikalPengalaman: 'Pengalaman',
  teknikalKomunikatif: 'Komunikatif',
  scheduleSkor: 'Schedule',
  hargaKetepatanWaktu: 'Ketepatan Waktu Pengiriman',
  hargaNegosiasi: 'Negosiasi',
  sheSkor: 'SHE',
  legalitasSkor: 'Legalitas Perusahaan',
};

export const LABEL_ROUND_TEKNIS: Record<number, string> = {
  1: 'Kurang',
  2: 'Cukup',
  3: 'Baik',
};

export type EvaluasiVendorDetail = Partial<
  Record<KategoriEvaluasiVendor | KategoriEvaluasiTeknis, number | null>
>;

export type EvaluasiVendorItem = {
  vendorId: number;
  namaVendor: string;
  evaluasi: EvaluasiVendorDetail | null;
  nilaiAvg: number | null;
  teknikalAvg: number | null;
  hargaAvg: number | null;
  nilaiTeknis: number | null;
  roundTeknis: number | null;
};

export type Kontrak = {
  id: number;
  tenderId: number;
  vendorId: number;
  nomorKontrak: string;
  fileKontrak: string | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  tender: { id: number; namaTender: string };
  vendor: { id: number; namaVendor: string };
  project: { id: number; namaProject: string }[];
};

export type DashboardRingkasanEprom = {
  totalProject: number;
  tenderAktif: number;
  totalKontrak: number;
  sphMenungguFinal: number;
  legalitasBelumLengkap: number;
  approvalPending: number;
  progressFisikRataRata: number | null;
  progressKeuanganRataRata: number | null;
  progressPerProject: { id: number; namaProject: string; progressPersen: number }[];
  progressTrend: {
    id: number;
    namaProject: string;
    data: { bulan: string; actual: number }[];
  }[];
  aktivitasTerbaru: { pesan: string; waktu: string }[];
};

export type DocumentFolder = {
  id: number;
  scope: ScopeDocumentFolder;
  tenderId: number | null;
  vendorId: number | null;
  namaFolder: string;
  parentFolderId: number | null;
};

export type FileUpload = {
  id: number;
  folderId: number;
  namaFile: string;
  tipeFile: TipeFileEprom;
  urlFile: string;
  uploadedAt: string;
  uploadedBy: { id: number; name: string };
};

export type Project = {
  id: number;
  kontrakId: number;
  namaProject: string;
  createdAt: string;
  kontrak: {
    id: number;
    nomorKontrak: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    tender: { id: number; namaTender: string };
    vendor: { id: number; namaVendor: string };
  };
  _count?: {
    shopDrawings: number;
    materialApprovals: number;
    metodePekerjaan: number;
    sertifikasiPekerjaan: number;
    peralatanList: number;
    komisioningAlatBerat: number;
    checklistKonstruksi: number;
    ibpr: number;
    jsa: number;
    opnamePekerjaan: number;
    asBuildDrawing: number;
    komisioning: number;
    serahTerima: number;
    masaPemeliharaanChecklist: number;
    baSerahTerima: number;
  };
  pendingEngineer?: number;
  pendingKonstruksi?: number;
  pendingFinancial?: number;
  pendingClosing?: number;
};

export type TipeEngineer =
  | 'shop-drawing'
  | 'material-approval'
  | 'metode-pekerjaan'
  | 'sertifikasi-pekerjaan'
  | 'peralatan-list'
  | 'komisioning-alat-berat';

export type StatusApprovalEprom = 'PENDING' | 'APPROVED' | 'REJECTED';

export type EngineerItem = {
  id: number;
  projectId: number;
  fileUrl: string | null;
  originalFileName: string | null;
  effectiveFileUrl: string | null;
  status: StatusApprovalEprom;
  komentar: string | null;
  createdAt: string;
  updatedAt: string;
  namaPekerjaan?: string;
  namaMaterial?: string;
  namaMetode?: string;
  latestApproval: EngineerDocumentApproval | null;
};

export type EngineerDocumentApproval = {
  id: number;
  documentId: number;
  documentType:
    | 'SHOP_DRAWING'
    | 'MATERIAL_APPROVAL'
    | 'METODE_PEKERJAAN'
    | 'SERTIFIKASI_PEKERJAAN'
    | 'DAFTAR_PERALATAN'
    | 'KOMISIONING_ALAT_BERAT';
  approvedAt: string;
  signatureFile: string;
  signaturePage: number;
  signatureXRatio: number;
  signatureYRatio: number;
  signatureWidthRatio: number;
  signatureHeightRatio: number;
  signaturePlacements: EngineerSignaturePosition[] | null;
  originalFilePath: string;
  sourceFilePath: string;
  signedFilePath: string;
  approvedBy: { id: number; name: string };
};

export type EngineerSignature = {
  filename: string;
  name: string;
  path: string;
};

export type EngineerApprovalDetail = {
  item: EngineerItem;
  project: Project;
  documentType: EngineerDocumentApproval['documentType'];
  documentLabel: string;
  canSign: boolean;
};

export type EngineerSignaturePosition = {
  signatureFile: string;
  signaturePage: number;
  signatureXRatio: number;
  signatureYRatio: number;
  signatureWidthRatio: number;
  signatureHeightRatio: number;
};

export type RingkasanPendingEngineer = Record<TipeEngineer, number>;

export type TipeKonstruksi = 'checklist-tahapan' | 'ibpr' | 'jsa';

export type KonstruksiItem = {
  id: number;
  projectId: number;
  fileUrl: string | null;
  status: StatusApprovalEprom;
  komentar: string | null;
  createdAt: string;
  updatedAt: string;
  namaTahap?: string;
  namaPekerjaan?: string;
};

export type RingkasanPendingKonstruksi = Record<TipeKonstruksi, number>;

export type TipeProgress =
  | 'inspeksi-area'
  | 'inspeksi-peralatan'
  | 'progress-harian'
  | 'progress-mingguan'
  | 'progress-bulanan'
  | 'tta'
  | 'kta';

export type StatusDeviasi = 'ON_TRACK' | 'WASPADA' | 'TERLAMBAT';

export type ProgressItem = {
  id: number;
  projectId: number;
  fileUrl: string | null;
  uploadedAt?: string;
  tanggalUpload?: string;
  tanggal?: string;
  mingguKe?: number;
  bulan?: string;
  namaPekerjaan?: string;
  planned?: string;
  actual?: string;
  deviasi?: number;
  status?: StatusDeviasi;
};

export type JamUploadInfo = {
  dibatasi: boolean;
  bukaSekarang: boolean;
  bebasSebagaiOwner: boolean;
  jamBuka: string | null;
  jamTutup: string | null;
};

export type PerformaBulanIni = {
  bulan: string;
  jumlah: number;
  target: number;
  persen: number;
};

export type SosialisasiJsaSlot = {
  id: number;
  fileUrl: string | null;
  tanggal: string | null;
};

export type JsaDenganSosialisasi = KonstruksiItem & {
  sosialisasi: SosialisasiJsaSlot | null;
};

export type TipeLinkMeeting = 'MINGGUAN' | 'BULANAN';

export type MeetingItem = {
  id: number;
  projectId: number;
  tipeLink: TipeLinkMeeting;
  refProgressId: number | null;
  tanggalMeeting: string | null;
  createdAt: string;
  _count?: { dokumentasi: number; mom: number };
  progressLabel?: string | null;
  progressFileUrl?: string | null;
};

export type DokumentasiMeetingItem = {
  id: number;
  meetingId: number;
  fileFoto: string | null;
  createdAt: string;
};

export type TipeDokumenSurat = 'SURAT_TEGURAN' | 'SURAT_PERINGATAN' | 'COACHING_COUNSELING' | 'MEMO';

export type DokumenSuratItem = {
  id: number;
  projectId: number;
  tipe: TipeDokumenSurat;
  fileUrl: string | null;
  tanggal: string | null;
  createdAt: string;
};

export type OpnameItem = {
  id: number;
  projectId: number;
  progressPersen: string;
  fileUrl: string | null;
  status: StatusApprovalEprom;
  komentar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TipeClosing =
  | 'as-build-drawing'
  | 'komisioning'
  | 'serah-terima'
  | 'masa-pemeliharaan-checklist'
  | 'ba-serah-terima';

export type ClosingItem = {
  id: number;
  projectId: number;
  fileUrl: string | null;
  status: StatusApprovalEprom;
  komentar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RingkasanPendingClosing = Record<TipeClosing, number>;

export type TipeSafetyMeeting = 'p5m' | 'safety-talk' | 'fatigue-test';

export type SafetyMeetingFileItem = {
  id: number;
  projectId: number;
  tipe: 'P5M' | 'SAFETY_TALK' | 'FATIGUE_TEST';
  fileUrl: string;
  originalFileName: string;
  uploadedAt: string;
  uploadedBy: { id: number; name: string };
};

export type StatusKewajibanUpload = 'HIJAU' | 'MERAH' | 'ABU_ABU' | 'ORANYE';

export type KewajibanUploadVendor = {
  tanggal: string;
  tipe:
    | 'inspeksi-area'
    | 'inspeksi-peralatan'
    | 'progress-harian'
    | 'progress-mingguan'
    | 'progress-bulanan';
  label: string;
  jamBuka: string;
  jamTutup: string;
  status: StatusKewajibanUpload;
  keterangan: string;
  uploadedAt: string | null;
};

export type KomponenPerformanceVendor = {
  key: 'upload' | 'deviasi' | 'ttaKta' | 'jsa' | 'pica';
  label: string;
  bobot: number;
  nilai: number | null;
  keterangan: string;
};

export type PerformanceVendorItem = {
  bulan: string;
  project: {
    id: number;
    namaProject: string;
    tender: { id: number; namaTender: string };
    vendor: { id: number; namaVendor: string };
    kontrak: {
      id: number;
      nomorKontrak: string;
      tanggalMulai: string;
      tanggalSelesai: string;
    };
  };
  nilaiAkhir: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  komponen: KomponenPerformanceVendor[];
  upload: {
    hijau: number;
    merah: number;
    abuAbu: number;
    oranye: number;
    jatuhTempo: number;
    total: number;
    kewajiban?: KewajibanUploadVendor[];
  };
};

export type MomItem = {
  id: number;
  meetingId: number;
  pica: string;
  dueDate: string;
  pic: string;
  statusClose: boolean;
  tglClose: string | null;
  fileFotoClose: string | null;
  hariTerlambat: number | null;
  hariTerlambatLive: number | null;
  createdAt: string;
  updatedAt: string;
};

// ==================================================
// KLIEN HTTP
// ==================================================

export class EpromApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'EpromApiError';
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
  const response = await fetch(`${API_URL}/eprom${path}`, {
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
    throw new EpromApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function unduhBlob(path: string): Promise<{ blob: Blob; namaFile: string }> {
  const response = await fetch(`${API_URL}/eprom${path}`, {
    headers: headerAuth(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new EpromApiError(await bacaError(response), response.status);
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^"]+)"?/.exec(disposition);

  return { blob: await response.blob(), namaFile: match?.[1] ?? 'unduhan' };
}

export function picuUnduhan(blob: Blob, namaFile: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = namaFile;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** URL publik file yang disimpan lewat EpromFileService (mis. fileKontrak), disajikan statis lewat /api/uploads/. */
export function urlFileEprom(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}

export const epromApi = {
  vendor: {
    daftar: (hanyaAktif?: boolean) =>
      request<Vendor[]>(`/vendors${hanyaAktif ? '?hanyaAktif=true' : ''}`),
    detail: (id: number) => request<Vendor>(`/vendors/${id}`),
    buat: (data: { namaVendor: string; email?: string; noTelepon?: string }) =>
      request<Vendor>('/vendors', { method: 'POST', body: JSON.stringify(data) }),
    ubah: (
      id: number,
      data: Partial<{
        namaVendor: string;
        email: string;
        noTelepon: string;
        legalitasStatus: StatusLegalitasVendor;
        statusAktif: boolean;
      }>,
    ) => request<Vendor>(`/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    tautkanUser: (id: number, userId: number) =>
      request<Vendor>(`/vendors/${id}/tautkan-user`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    hapus: (id: number) => request<{ message: string }>(`/vendors/${id}`, { method: 'DELETE' }),
    /** Akun Vendor menautkan dirinya sendiri ke satu Vendor (sekali saja, sebelum tertaut). */
    klaim: (id: number) => request<Vendor>(`/vendors/${id}/klaim`, { method: 'POST' }),
  },

  tender: {
    daftar: () => request<TenderProcess[]>('/tender'),
    detail: (id: number) => request<TenderDetail>(`/tender/${id}`),
    buat: (data: { namaTender: string; tanggalMulai?: string; tanggalSelesai?: string }) =>
      request<TenderProcess>('/tender', { method: 'POST', body: JSON.stringify(data) }),
    ubah: (id: number, data: Partial<{ namaTender: string; tanggalMulai: string; tanggalSelesai: string }>) =>
      request<TenderProcess>(`/tender/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    /** Kirim undangan ke beberapa vendor sekaligus — file lampiran per vendor berbeda-beda. */
    kirimUndangan: (id: number, vendorIds: number[]) =>
      request<TenderDetail>(`/tender/${id}/undangan`, {
        method: 'POST',
        body: JSON.stringify({ vendorIds }),
      }),
    hapus: (id: number) => request<{ message: string }>(`/tender/${id}`, { method: 'DELETE' }),
    hapusUndangan: (tenderId: number, vendorId: number) =>
      request<{ message: string }>(`/tender/${tenderId}/undangan/${vendorId}`, { method: 'DELETE' }),
    buatRoundSph: (
      tenderId: number,
      vendorId: number,
      file?: File | null,
      hargaPenawaran?: number,
    ) => {
      const form = new FormData();
      if (file) form.append('file', file);
      if (hargaPenawaran !== undefined) form.append('hargaPenawaran', String(hargaPenawaran));
      return request<TenderSPH>(`/tender/${tenderId}/sph/${vendorId}`, {
        method: 'POST',
        body: form,
      });
    },
    ubahRoundSph: (
      tenderId: number,
      vendorId: number,
      roundId: number,
      file?: File | null,
      hargaPenawaran?: number,
    ) => {
      const form = new FormData();
      if (file) form.append('file', file);
      if (hargaPenawaran !== undefined) form.append('hargaPenawaran', String(hargaPenawaran));
      return request<TenderSPH>(`/tender/${tenderId}/sph/${vendorId}/${roundId}`, {
        method: 'PATCH',
        body: form,
      });
    },
    hapusRoundSph: (tenderId: number, vendorId: number, roundId: number) =>
      request<{ message: string }>(`/tender/${tenderId}/sph/${vendorId}/${roundId}`, {
        method: 'DELETE',
      }),
    finalisasiTender: (tenderId: number) =>
      request<TenderDetail>(`/tender/${tenderId}/finalisasi`, { method: 'POST' }),
    tetapkanPemenang: (tenderId: number, vendorId: number) =>
      request<TenderDetail>(`/tender/${tenderId}/tetapkan-pemenang/${vendorId}`, { method: 'POST' }),
    evaluasiVendor: {
      daftar: (tenderId: number) =>
        request<EvaluasiVendorItem[]>(`/tender/${tenderId}/evaluasi-vendor`),
      ubah: (
        tenderId: number,
        vendorId: number,
        data: Partial<Record<KategoriEvaluasiVendor | KategoriEvaluasiTeknis, number | null>>,
      ) =>
        request<EvaluasiVendorDetail>(`/tender/${tenderId}/evaluasi-vendor/${vendorId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
    },
  },

  kontrak: {
    daftar: () => request<Kontrak[]>('/kontrak'),
    detail: (id: number) => request<Kontrak>(`/kontrak/${id}`),
    buat: (
      data: { tenderId: number; nomorKontrak: string; tanggalMulai: string; tanggalSelesai: string },
      file?: File | null,
    ) => {
      const form = new FormData();
      form.append('tenderId', String(data.tenderId));
      form.append('nomorKontrak', data.nomorKontrak);
      form.append('tanggalMulai', data.tanggalMulai);
      form.append('tanggalSelesai', data.tanggalSelesai);
      if (file) form.append('file', file);
      return request<Kontrak>('/kontrak', { method: 'POST', body: form });
    },
    ubah: (
      id: number,
      data: Partial<{ nomorKontrak: string; tanggalMulai: string; tanggalSelesai: string }>,
      file?: File | null,
    ) => {
      const form = new FormData();
      if (data.nomorKontrak !== undefined) form.append('nomorKontrak', data.nomorKontrak);
      if (data.tanggalMulai !== undefined) form.append('tanggalMulai', data.tanggalMulai);
      if (data.tanggalSelesai !== undefined) form.append('tanggalSelesai', data.tanggalSelesai);
      if (file) form.append('file', file);
      return request<Kontrak>(`/kontrak/${id}`, { method: 'PATCH', body: form });
    },
    hapus: (id: number) => request<{ message: string }>(`/kontrak/${id}`, { method: 'DELETE' }),
    bukaProject: (id: number, namaProject: string) =>
      request<{ id: number; namaProject: string }>(`/kontrak/${id}/buka-project`, {
        method: 'POST',
        body: JSON.stringify({ namaProject }),
      }),
  },

  dashboard: {
    ringkasan: () => request<DashboardRingkasanEprom>('/dashboard/ringkasan'),
  },

  documents: {
    isiFolder: (filter: {
      scope: ScopeDocumentFolder;
      tenderId?: number;
      vendorId?: number;
      parentFolderId?: number | null;
    }) => {
      const params = new URLSearchParams();
      params.set('scope', filter.scope);
      if (filter.tenderId) params.set('tenderId', String(filter.tenderId));
      if (filter.vendorId) params.set('vendorId', String(filter.vendorId));
      if (filter.parentFolderId) params.set('parentFolderId', String(filter.parentFolderId));
      return request<{ folders: DocumentFolder[]; files: FileUpload[] }>(
        `/documents?${params.toString()}`,
      );
    },
    buatFolder: (data: {
      scope: ScopeDocumentFolder;
      tenderId?: number;
      vendorId?: number;
      namaFolder: string;
      parentFolderId?: number;
    }) => request<DocumentFolder>('/documents/folders', { method: 'POST', body: JSON.stringify(data) }),
    unggahFile: (folderId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<FileUpload>(`/documents/folders/${folderId}/files`, {
        method: 'POST',
        body: form,
      });
    },
    unduhSatu: async (id: number) => {
      const { blob, namaFile } = await unduhBlob(`/documents/files/${id}/download`);
      picuUnduhan(blob, namaFile);
    },
    /** Buka file di tab baru (preview PDF/gambar via viewer bawaan browser). */
    previewSatu: async (id: number) => {
      const { blob } = await unduhBlob(`/documents/files/${id}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    unduhSemua: async (fileIds: number[]) => {
      const { blob } = await unduhBlob(`/documents/files/download-all?fileIds=${fileIds.join(',')}`);
      picuUnduhan(blob, 'dokumen-eprom.zip');
    },
    /** Unduh semua file di seluruh folder tender/vendor sekaligus (zip, struktur folder dipertahankan). */
    unduhSemuaDokumen: async (filter: {
      scope: ScopeDocumentFolder;
      tenderId?: number;
      vendorId?: number;
    }) => {
      const params = new URLSearchParams();
      params.set('scope', filter.scope);
      if (filter.tenderId) params.set('tenderId', String(filter.tenderId));
      if (filter.vendorId) params.set('vendorId', String(filter.vendorId));
      const { blob } = await unduhBlob(`/documents/download-semua?${params.toString()}`);
      picuUnduhan(blob, 'dokumen-eprom.zip');
    },
    ubahFolder: (folderId: number, namaFolder: string) =>
      request<DocumentFolder>(`/documents/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ namaFolder }),
      }),
    hapusFolder: (folderId: number) =>
      request<{ message: string }>(`/documents/folders/${folderId}`, { method: 'DELETE' }),
    hapusFile: (fileId: number) =>
      request<{ message: string }>(`/documents/files/${fileId}`, { method: 'DELETE' }),
  },

  project: {
    daftar: () => request<Project[]>('/projects'),
    detail: (id: number) => request<Project>(`/projects/${id}`),
  },

  engineer: {
    daftar: (tipe: TipeEngineer, projectId: number) =>
      request<EngineerItem[]>(`/engineer/${tipe}?projectId=${projectId}`),
    buat: (tipe: TipeEngineer, projectId: number, nama: string | undefined, file: File | null) => {
      const form = new FormData();
      form.append('projectId', String(projectId));
      if (nama) form.append('nama', nama);
      if (file) form.append('file', file);
      return request<EngineerItem>(`/engineer/${tipe}`, { method: 'POST', body: form });
    },
    reject: (tipe: TipeEngineer, id: number, komentar: string) =>
      request<EngineerItem>(`/engineer/${tipe}/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED', komentar }),
      }),
    detailApproval: (tipe: TipeEngineer, id: number) =>
      request<EngineerApprovalDetail>(`/engineer/${tipe}/${id}/approval`),
    daftarTandaTangan: () =>
      request<EngineerSignature[]>('/engineer/signatures/available'),
    approveDenganTandaTangan: (
      tipe: TipeEngineer,
      id: number,
      payload: { placements: EngineerSignaturePosition[] },
    ) =>
      request<EngineerItem>(`/engineer/${tipe}/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    hapus: (tipe: TipeEngineer, id: number) =>
      request<{ message: string }>(`/engineer/${tipe}/${id}`, { method: 'DELETE' }),
    ringkasan: (projectId: number) =>
      request<RingkasanPendingEngineer>(`/engineer/ringkasan/${projectId}`),
  },

  konstruksi: {
    daftar: (tipe: TipeKonstruksi, projectId: number) =>
      request<KonstruksiItem[]>(`/konstruksi/${tipe}?projectId=${projectId}`),
    buat: (tipe: TipeKonstruksi, projectId: number, nama: string | undefined, file: File | null) => {
      const form = new FormData();
      form.append('projectId', String(projectId));
      if (nama) form.append('nama', nama);
      if (file) form.append('file', file);
      return request<KonstruksiItem>(`/konstruksi/${tipe}`, { method: 'POST', body: form });
    },
    review: (tipe: TipeKonstruksi, id: number, status: 'APPROVED' | 'REJECTED', komentar?: string) =>
      request<KonstruksiItem>(`/konstruksi/${tipe}/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, komentar }),
      }),
    hapus: (tipe: TipeKonstruksi, id: number) =>
      request<{ message: string }>(`/konstruksi/${tipe}/${id}`, { method: 'DELETE' }),
    ringkasan: (projectId: number) =>
      request<RingkasanPendingKonstruksi>(`/konstruksi/ringkasan/${projectId}`),
  },

  progress: {
    daftar: (tipe: TipeProgress, projectId: number) =>
      request<ProgressItem[]>(`/progress/${tipe}?projectId=${projectId}`),
    buat: (
      tipe: TipeProgress,
      projectId: number,
      file: File | null,
      dataMingguan?: { namaPekerjaan: string; planned: number; actual: number },
    ) => {
      const form = new FormData();
      if (file) form.append('file', file);
      if (dataMingguan) {
        form.append('namaPekerjaan', dataMingguan.namaPekerjaan);
        form.append('planned', String(dataMingguan.planned));
        form.append('actual', String(dataMingguan.actual));
      }
      return request<ProgressItem>(`/progress/${tipe}?projectId=${projectId}`, {
        method: 'POST',
        body: form,
      });
    },
    hapus: (tipe: TipeProgress, id: number) =>
      request<{ message: string }>(`/progress/${tipe}/${id}`, { method: 'DELETE' }),
    jamUpload: (tipe: TipeProgress) => request<JamUploadInfo>(`/progress/${tipe}/jam`),
    performa: (tipe: 'tta' | 'kta', projectId: number) =>
      request<PerformaBulanIni>(`/progress/${tipe}/performa/${projectId}`),
    mingguanTerbaru: (projectId: number) =>
      request<ProgressItem[]>(`/progress/mingguan/terbaru/${projectId}`),
  },

  sosialisasiJsa: {
    daftar: (projectId: number) =>
      request<JsaDenganSosialisasi[]>(`/sosialisasi-jsa?projectId=${projectId}`),
    unggah: (jsaId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<SosialisasiJsaSlot>(`/sosialisasi-jsa/${jsaId}`, {
        method: 'POST',
        body: form,
      });
    },
  },

  meeting: {
    daftar: (projectId: number) => request<MeetingItem[]>(`/meeting?projectId=${projectId}`),
    sumberProgress: (projectId: number, tipeLink: TipeLinkMeeting) =>
      request<ProgressItem[]>(`/meeting/sumber-progress?projectId=${projectId}&tipeLink=${tipeLink}`),
    buat: (data: {
      projectId: number;
      tipeLink: TipeLinkMeeting;
      refProgressId: number;
      tanggalMeeting: string;
    }) => request<MeetingItem>('/meeting', { method: 'POST', body: JSON.stringify(data) }),
    hapus: (id: number) => request<{ message: string }>(`/meeting/${id}`, { method: 'DELETE' }),

    daftarDokumentasi: (meetingId: number) =>
      request<DokumentasiMeetingItem[]>(`/meeting/${meetingId}/dokumentasi`),
    unggahDokumentasi: (meetingId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<DokumentasiMeetingItem>(`/meeting/${meetingId}/dokumentasi`, {
        method: 'POST',
        body: form,
      });
    },
    hapusDokumentasi: (id: number) =>
      request<{ message: string }>(`/meeting/dokumentasi/${id}`, { method: 'DELETE' }),

    daftarMom: (meetingId: number) => request<MomItem[]>(`/meeting/${meetingId}/mom`),
    buatMom: (meetingId: number, data: { pica: string; dueDate: string; pic: string }) =>
      request<MomItem>(`/meeting/${meetingId}/mom`, { method: 'POST', body: JSON.stringify(data) }),
    closeMom: (id: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<MomItem>(`/meeting/mom/${id}/close`, { method: 'PATCH', body: form });
    },
    hapusMom: (id: number) => request<{ message: string }>(`/meeting/mom/${id}`, { method: 'DELETE' }),
  },

  dokumen: {
    daftar: (tipe: TipeDokumenSurat, projectId: number) =>
      request<DokumenSuratItem[]>(`/dokumen/${tipe}?projectId=${projectId}`),
    buat: (data: { projectId: number; tipe: TipeDokumenSurat; tanggal: string }, file: File | null) => {
      const form = new FormData();
      form.append('projectId', String(data.projectId));
      form.append('tipe', data.tipe);
      form.append('tanggal', data.tanggal);
      if (file) form.append('file', file);
      return request<DokumenSuratItem>('/dokumen', { method: 'POST', body: form });
    },
    hapus: (id: number) => request<{ message: string }>(`/dokumen/${id}`, { method: 'DELETE' }),
  },

  financial: {
    daftar: (projectId: number) => request<OpnameItem[]>(`/financial/opname?projectId=${projectId}`),
    buat: (data: { projectId: number; progressPersen: number }, file: File | null) => {
      const form = new FormData();
      form.append('projectId', String(data.projectId));
      form.append('progressPersen', String(data.progressPersen));
      if (file) form.append('file', file);
      return request<OpnameItem>('/financial/opname', { method: 'POST', body: form });
    },
    review: (id: number, status: 'APPROVED' | 'REJECTED', komentar?: string) =>
      request<OpnameItem>(`/financial/opname/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, komentar }),
      }),
    hapus: (id: number) => request<{ message: string }>(`/financial/opname/${id}`, { method: 'DELETE' }),
    ringkasan: (projectId: number) =>
      request<{ 'opname-pekerjaan': number }>(`/financial/ringkasan/${projectId}`),
  },

  closing: {
    daftar: (tipe: TipeClosing, projectId: number) =>
      request<ClosingItem[]>(`/closing/${tipe}?projectId=${projectId}`),
    buat: (tipe: TipeClosing, projectId: number, files: File[]) => {
      const form = new FormData();
      form.append('projectId', String(projectId));
      files.forEach((file) => form.append('file', file));
      return request<ClosingItem[]>(`/closing/${tipe}`, { method: 'POST', body: form });
    },
    review: (tipe: TipeClosing, id: number, status: 'APPROVED' | 'REJECTED', komentar?: string) =>
      request<ClosingItem>(`/closing/${tipe}/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, komentar }),
      }),
    hapus: (tipe: TipeClosing, id: number) =>
      request<{ message: string }>(`/closing/${tipe}/${id}`, { method: 'DELETE' }),
    ringkasan: (projectId: number) =>
      request<RingkasanPendingClosing>(`/closing/ringkasan/${projectId}`),
  },

  safetyMeeting: {
    daftar: (tipe: TipeSafetyMeeting, projectId: number) =>
      request<SafetyMeetingFileItem[]>(
        `/safety-meeting/${tipe}?projectId=${projectId}`,
      ),
    unggah: (tipe: TipeSafetyMeeting, projectId: number, files: File[]) => {
      const form = new FormData();
      form.append('projectId', String(projectId));
      files.forEach((file) => form.append('file', file));
      return request<SafetyMeetingFileItem[]>(`/safety-meeting/${tipe}`, {
        method: 'POST',
        body: form,
      });
    },
    hapus: (tipe: TipeSafetyMeeting, id: number) =>
      request<{ message: string }>(`/safety-meeting/${tipe}/${id}`, {
        method: 'DELETE',
      }),
  },

  performanceVendor: {
    daftar: (bulan: string) =>
      request<{ bulan: string; items: PerformanceVendorItem[] }>(
        `/performance-vendor?bulan=${encodeURIComponent(bulan)}`,
      ),
    detail: (projectId: number, bulan: string) =>
      request<PerformanceVendorItem>(
        `/performance-vendor/${projectId}?bulan=${encodeURIComponent(bulan)}`,
      ),
  },
};

export const LABEL_TIPE_ENGINEER: Record<TipeEngineer, string> = {
  'shop-drawing': 'Shop Drawing',
  'material-approval': 'Material Approval',
  'metode-pekerjaan': 'Metode Pekerjaan',
  'sertifikasi-pekerjaan': 'Sertifikasi Pekerjaan',
  'peralatan-list': 'Daftar Peralatan',
  'komisioning-alat-berat': 'Komisioning Alat Berat',
};

export const LABEL_TIPE_KONSTRUKSI: Record<TipeKonstruksi, string> = {
  'checklist-tahapan': 'Checklist Tahapan Pekerjaan',
  ibpr: 'IBPR',
  jsa: 'JSA',
};

export const LABEL_TIPE_PROGRESS: Record<TipeProgress, string> = {
  'inspeksi-area': 'Inspeksi Area Pekerjaan',
  'inspeksi-peralatan': 'Inspeksi Peralatan',
  'progress-harian': 'Progress Harian',
  'progress-mingguan': 'Progress Mingguan',
  'progress-bulanan': 'Progress Bulanan',
  tta: 'Tindakan Tidak Aman (TTA)',
  kta: 'Kondisi Tidak Aman (KTA)',
};

export const LABEL_STATUS_DEVIASI: Record<StatusDeviasi, string> = {
  ON_TRACK: 'Sesuai/Lebih Cepat',
  WASPADA: 'Waspada',
  TERLAMBAT: 'Terlambat',
};

export const LABEL_STATUS_APPROVAL: Record<StatusApprovalEprom, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const LABEL_TIPE_LINK_MEETING: Record<TipeLinkMeeting, string> = {
  MINGGUAN: 'Progress Mingguan',
  BULANAN: 'Progress Bulanan',
};

export const LABEL_TIPE_DOKUMEN_SURAT: Record<TipeDokumenSurat, string> = {
  SURAT_TEGURAN: 'Surat Teguran',
  SURAT_PERINGATAN: 'Surat Peringatan',
  COACHING_COUNSELING: 'Coaching & Counseling',
  MEMO: 'Memo',
};

export const LABEL_TIPE_CLOSING: Record<TipeClosing, string> = {
  'as-build-drawing': 'As Build Drawing',
  komisioning: 'Komisioning',
  'serah-terima': 'Serah Terima',
  'masa-pemeliharaan-checklist': 'Checklist Masa Pemeliharaan',
  'ba-serah-terima': 'BA Serah Terima',
};

export const LABEL_TIPE_SAFETY_MEETING: Record<TipeSafetyMeeting, string> = {
  p5m: 'P5M',
  'safety-talk': 'Safety Talk',
  'fatigue-test': 'Fatigue Test',
};

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
  }).format(new Date(nilai));
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatBulanLabel(bulan: string | null | undefined): string {
  if (!bulan) {
    return '-';
  }

  const [tahun, bulanAngka] = bulan.split('-').map(Number);
  if (!tahun || !bulanAngka || bulanAngka < 1 || bulanAngka > 12) {
    return bulan;
  }

  return `${NAMA_BULAN[bulanAngka - 1]} ${tahun}`;
}

/** Versi singkat "Agu 2026" dari string "YYYY-MM" — dipakai untuk label sumbu grafik. */
export function formatBulanSingkat(bulan: string | null | undefined): string {
  if (!bulan) {
    return '-';
  }

  const [tahun, bulanAngka] = bulan.split('-').map(Number);
  if (!tahun || !bulanAngka || bulanAngka < 1 || bulanAngka > 12) {
    return bulan;
  }

  return `${NAMA_BULAN[bulanAngka - 1].slice(0, 3)} ${String(tahun).slice(2)}`;
}

/** Format tanggal+jam dalam WITA (UTC+8) — konsisten dengan aturan jam buka/tutup upload (bagian 3.3). */
export function formatWaktuWITA(nilai: string | null | undefined): string {
  if (!nilai) {
    return '-';
  }

  const wita = new Date(new Date(nilai).getTime() + 8 * 60 * 60 * 1000);
  const tanggal = String(wita.getUTCDate()).padStart(2, '0');
  const bulan = NAMA_BULAN[wita.getUTCMonth()].slice(0, 3);
  const tahun = wita.getUTCFullYear();
  const jam = String(wita.getUTCHours()).padStart(2, '0');
  const menit = String(wita.getUTCMinutes()).padStart(2, '0');

  return `${tanggal} ${bulan} ${tahun}, ${jam}:${menit} WITA`;
}

export function formatWaktuRelatif(nilai: string | null | undefined): string {
  if (!nilai) {
    return '-';
  }

  const detik = Math.max(0, (Date.now() - new Date(nilai).getTime()) / 1000);

  if (detik < 60) return 'Baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

export function formatRupiah(nilai: string | number | null | undefined): string {
  if (nilai === null || nilai === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(nilai));
}

export const LABEL_STATUS_TENDER: Record<StatusTender, string> = {
  PERSIAPAN: 'Persiapan',
  UNDANGAN_TERKIRIM: 'Undangan Terkirim',
  EVALUASI_SPH: 'Evaluasi SPH',
  SELESAI: 'Selesai',
};

export const LABEL_LEGALITAS_VENDOR: Record<StatusLegalitasVendor, string> = {
  BELUM_LENGKAP: 'Belum Lengkap',
  LENGKAP: 'Lengkap',
};

export function isEpromOwner(user: PortalUser | null): boolean {
  return (
    user?.role === 'OWNER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SECTION_HEAD'
  );
}

export function isEpromVendor(user: PortalUser | null): boolean {
  return user?.role === 'VENDOR';
}
