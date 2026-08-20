// ==================================================
// FILE: backend/src/helpdesk/helpdesk.constants.ts
// FUNGSI: Struktur Kategori Masalah > Sub Kategori > Masalah Helpdesk Center
// ==================================================

export const POHON_KATEGORI_HELPDESK = {
  'Web OFA': {
    'User Access - Web OFA': [
      'Penambahan Akses Fitur',
      'Pendaftaran Akun / Gagal Login',
    ],
    'Mine Map - Web OFA': ['Ketidaksesuaian Informasi', 'Kendala Penggunaan Fitur'],
    'RAW Cycle Production - Web OFA': [
      'Ritase Tidak Tercatat',
      'Kendala Penggunaan Fitur',
    ],
  },
  'Dashboard SS6': {
    'Fuel, Oil, Grease - Dashboard SS6': [
      'Penyesuaian Transaksi Flowmeter',
      'Data Oil Tidak Sinkron (SAP x SS6)',
    ],
    'User Access - Dashboard SS6': [
      'Pendaftaran Akun / Gagal Login',
      'Penambahan Akses Fitur',
    ],
  },
  SS6: {
    'PPA Team Android': [
      'Cuti',
      'Tidak Bisa login',
      'Izin',
      'Oil Grease',
      'Safety Accountability Program (SAP)',
      'Induksi Karyawan',
      'Koperasi',
      'DAR',
      'Index (ATR)',
      'Waterfall Analysis',
      'Start Operasi',
      'Catatan HM',
      'Benefit Claim',
      'Lupa Password',
      'P2H',
      'Approval',
    ],
    'PPA Team IOS': [
      'Start Operasi',
      'Tidak Bisa login',
      'P2H',
      'Benefit Claim',
      'Izin',
      'Cuti',
      'Lupa Password',
      'Safety Accountability Program (SAP)',
      'Catatan HM',
      'DAR',
      'Approval',
      'Beta Test Full',
      'Induksi Karyawan',
      'Koperasi',
      'Index (ATR)',
    ],
    'OFA Web': [
      'Map Unit',
      'Dashboard',
      'Map Area',
      'Towerlamp',
      'Precise',
      'Setting Fleet',
      'Unit Status',
    ],
    'OFA Tab': ['HPR'],
    'Web SS6': [
      'Roster',
      'Upload Hourly Production',
      'Productivity',
      'Jojonomic',
      'Fuel',
      'Akses SS6',
      'Approval',
      'angka PA UA',
      'Permasalahan SK',
      'Breakdown',
      'SPL',
      'SP (Surat Pelanggaran)',
      'Penilaian kontrak',
      'Refueling',
      'HM Revision',
      'P2H',
      'Safety Accountability Program (SAP)',
      'Index (ATR)',
      'VHMS',
      'Benefit Claim',
      'Cuti',
      'Produksi Overburden',
      'Flowmeter',
      'Terminate',
      'Mutasi',
      'QCC',
      'Payroll',
      'Dashboard HPR',
      'Oil Grease',
      'DAR',
      'Breakdown Sub Contractor',
      'RKB',
      'Safety Performance',
      'Equipment Cost',
      'Assessment',
      'Packmeals',
      'BAPA',
      'Manpower',
      'License',
      'Populasi Unit',
      'Fit To Work (FTW)',
    ],
    'Web Sysdev': ['Audite', 'QCC', 'E-Legal'],
  },
  'HPR Web': {
    'Form HPR - HPR Web': [
      'HPR',
      'Kendala Penggunaan Fitur',
      'Informasi Tidak Sesuai',
    ],
  },
} as const;

export type KategoriTiketHelpdesk = keyof typeof POHON_KATEGORI_HELPDESK;

export const KATEGORI_TIKET_HELPDESK = Object.keys(
  POHON_KATEGORI_HELPDESK,
) as KategoriTiketHelpdesk[];

export function subKategoriValid(kategori: string, subKategori: string): boolean {
  const pohonKategori = (
    POHON_KATEGORI_HELPDESK as Record<string, Record<string, readonly string[]>>
  )[kategori];

  return Boolean(pohonKategori && subKategori in pohonKategori);
}

export function masalahValid(
  kategori: string,
  subKategori: string,
  masalah: string,
): boolean {
  const pohonKategori = (
    POHON_KATEGORI_HELPDESK as Record<string, Record<string, readonly string[]>>
  )[kategori];
  const daftarMasalah = pohonKategori?.[subKategori];

  return Boolean(daftarMasalah && (daftarMasalah as string[]).includes(masalah));
}

export const LEVEL_TIKET_HELPDESK = ['RENDAH', 'SEDANG', 'TINGGI'] as const;

export type LevelTiketHelpdesk = (typeof LEVEL_TIKET_HELPDESK)[number];
