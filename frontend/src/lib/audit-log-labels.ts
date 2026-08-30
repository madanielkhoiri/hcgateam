// ==================================================
// FILE: frontend/src/lib/audit-log-labels.ts
// FUNGSI: Terjemahkan kode aksi audit log (mesin) jadi kalimat manusiawi,
// supaya admin/section head yang tidak paham istilah teknis tetap mengerti.
// ==================================================

/** Aksi yang sudah diaudit manual (Auth/User/Kip) — sudah pasti berbahasa Indonesia jelas. */
const LABEL_AKSI_MANUAL: Record<string, string> = {
  LOGIN_BERHASIL: 'Login berhasil',
  LOGIN_GAGAL: 'Login gagal',
  USER_DIBUAT: 'Akun dibuat',
  USER_DIUBAH: 'Akun diubah',
  USER_AKSES_DIUBAH: 'Akses akun diubah',
  USER_DIHAPUS: 'Akun dihapus',
  KIP_DIBUAT: 'KIP dibuat',
  KIP_DIUBAH: 'KIP diubah',
  KIP_DIHAPUS: 'KIP dihapus',
  KIP_CEKLIS: 'KIP diceklis',
};

/** Nama modul/entitas generik (dari path URL) -> nama yang dikenal orang awam. */
const LABEL_ENTITAS: Record<string, string> = {
  aktivitas: 'Aktivitas',
  album: 'Album Dokumentasi',
  'anak-magang': 'Anak Magang',
  'civil-tps3r': 'TPS 3R',
  'daily-activities': 'Aktivitas Harian',
  'daily-activity-images': 'Foto Aktivitas Harian',
  'database-karyawan': 'Database Karyawan',
  'database-settlement': 'Database Settlement',
  deklarasi: 'Deklarasi Dinas',
  drive: 'Drive/Dokumen',
  'eprom/closing': 'Closing Proyek',
  'eprom/dashboard': 'Dashboard e-ProM',
  'eprom/documents': 'Dokumen Proyek',
  'eprom/dokumen': 'Dokumen Proyek',
  'eprom/engineer': 'Engineer',
  'eprom/financial': 'Financial Proyek',
  'eprom/konstruksi': 'Konstruksi',
  'eprom/kontrak': 'Kontrak',
  'eprom/meeting': 'Meeting Proyek',
  'eprom/performance-vendor': 'Performa Vendor',
  'eprom/progress': 'Progress Proyek',
  'eprom/projects': 'Proyek',
  'eprom/safety-meeting': 'Safety Meeting',
  'eprom/sosialisasi-jsa': 'Sosialisasi JSA',
  'eprom/tender': 'Tender',
  'eprom/vendors': 'Vendor',
  handovers: 'Serah Terima Pekerjaan',
  helpdesk: 'Helpdesk',
  'housekeeping-indoor': 'Housekeeping Indoor',
  inventory: 'Inventory',
  'inventory-area/stock-outs': 'Barang Keluar',
  'inventory-area': 'Area Inventory',
  'inventory-dashboard': 'Dashboard Inventory',
  'ir/aspirasi': 'Aspirasi (IR)',
  'ir/course': 'Pelatihan (IR)',
  'ir/dokumen': 'Dokumen IR',
  karyawan: 'Data Karyawan',
  mcu: 'MCU',
  'mcu/follow-up': 'Follow Up MCU',
  'mcu/hasil': 'Hasil MCU',
  'mcu/induksi-ulang': 'Induksi Ulang MCU',
  'mcu/jadwal': 'Jadwal MCU',
  'mcu/klinik': 'Klinik MCU',
  'mcu/notifikasi': 'Notifikasi MCU',
  'mcu/rekomendasi': 'Rekomendasi MCU',
  'mcu/retensi': 'Retensi MCU',
  'mcu/surat-pengantar': 'Surat Pengantar MCU',
  nota: 'Nota Deklarasi Dinas',
  'order-pack-meal': 'Order Pack Meal',
  p5m: 'P5M / Safety Meeting',
  pengajuan: 'Pengajuan Deklarasi Dinas',
  pengguna: 'Pengguna Deklarasi Dinas',
  'post-activities': 'Post Activities',
  postingan: 'Postingan',
  'pre-activity-checks': 'Pre-Activity Check',
  saldo: 'Saldo Deklarasi Dinas',
  'signature-library': 'Tanda Tangan',
  'surat-balasan-magang': 'Surat Balasan Magang',
  'surat-penolakan-magang': 'Surat Penolakan Magang',
  'surat-tugas-dinas': 'Surat Tugas Dinas',
  tiket: 'Tiket Transport',
  transport: 'Transport',
  travel: 'Travel',
  'work-orders': 'Pekerjaan (Work Order)',
  'work-order-images': 'Foto Pekerjaan',
};

const LABEL_VERBA: Record<string, string> = {
  DIBUAT: 'ditambahkan',
  DIUBAH: 'diubah',
  DIHAPUS: 'dihapus',
};

/** Nama entitas mentah (mis. "inventory-area/stock-outs") -> label yang dikenal orang awam, untuk dropdown filter. */
export function labelEntitas(entitasKode: string): string {
  return LABEL_ENTITAS[entitasKode.toLowerCase()] ?? judulKata(entitasKode);
}

function judulKata(teks: string): string {
  return teks
    .replace(/[-/]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1).toLowerCase())
    .join(' ');
}

/** Terjemahkan kode aksi (mis. "INVENTORY-AREA/STOCK-OUTS_DIBUAT") jadi kalimat manusiawi. */
export function terjemahkanAksi(aksiRaw: string): string {
  if (LABEL_AKSI_MANUAL[aksiRaw]) {
    return LABEL_AKSI_MANUAL[aksiRaw];
  }

  const match = aksiRaw.match(/^(.+)_(DIBUAT|DIUBAH|DIHAPUS)(_GAGAL)?$/);
  if (!match) {
    return judulKata(aksiRaw);
  }

  const [, entitasKode, verba, gagal] = match;
  const entitasKey = entitasKode.toLowerCase();
  const labelEntitas = LABEL_ENTITAS[entitasKey] ?? judulKata(entitasKode);
  const labelVerba = LABEL_VERBA[verba] ?? verba.toLowerCase();

  return `${labelEntitas} ${labelVerba}${gagal ? ' (gagal)' : ''}`;
}
