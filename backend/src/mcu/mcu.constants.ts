// ==================================================
// FILE: backend/src/mcu/mcu.constants.ts
// FUNGSI: Aturan tetap alur MCU Periodik
// Referensi: alur-workflow-mcu-periodik-v3.md
// ==================================================

/** Reminder MCU periodik dipicu H-3 bulan sebelum MCU terakhir expired. */
export const BULAN_REMINDER_SEBELUM_EXPIRED = 3;

/** Pendaftaran final terkunci 3 hari sebelum pelaksanaan MCU. */
export const HARI_LOCK_PENDAFTARAN = 3;

/** FU wajib close maksimal 2 bulan setelah MCU ulang. */
export const BULAN_MAKS_SIKLUS_FU = 2;

/** Retensi dokumen medis 6 bulan dihitung dari tanggal file diupload. */
export const BULAN_RETENSI_DOKUMEN = 6;

/** Masa berlaku hasil MCU yang sudah FIT. */
export const BULAN_MASA_BERLAKU_MCU = 12;
