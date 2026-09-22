// ==================================================
// FILE: frontend/src/lib/pagination.ts
// FUNGSI: Tipe bersama untuk daftar besar yang dipaginate — bentuknya
// harus sama persis dengan backend/src/common/pagination.util.ts biar
// semua modul (HC, GA, Civil, Administrasi) konsisten satu sama lain.
// ==================================================

export type HasilHalaman<T> = {
  data: T[];
  total: number;
  halaman: number;
  ukuranHalaman: number;
};
