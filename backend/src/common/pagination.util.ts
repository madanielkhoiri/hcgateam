// ==================================================
// FILE: backend/src/common/pagination.util.ts
// FUNGSI: Helper pagination seragam untuk seluruh daftar besar — pola
// query `?halaman=` + `skip`/`take` ini awalnya dipakai di Audit Log,
// sekarang dipakai bersama supaya konsisten (bentuk respons yang sama:
// { data, total, halaman, ukuranHalaman }) dan gampang dipasang ulang
// di modul lain tanpa menulis ulang perhitungan skip/take tiap kali.
// ==================================================

const UKURAN_HALAMAN_DEFAULT = 20;
const UKURAN_HALAMAN_MAKS = 100;

export type ParamHalaman = {
  skip: number;
  take: number;
  halaman: number;
  ukuranHalaman: number;
};

export type HasilHalaman<T> = {
  data: T[];
  total: number;
  halaman: number;
  ukuranHalaman: number;
};

/** Ubah query string `?halaman=` (opsional `?ukuranHalaman=`) jadi skip/take siap pakai di Prisma. */
export function paramHalaman(
  halamanRaw?: string | number,
  ukuranHalamanRaw?: string | number,
  ukuranHalamanDefault: number = UKURAN_HALAMAN_DEFAULT,
): ParamHalaman {
  const halaman = Math.max(1, Math.trunc(Number(halamanRaw)) || 1);
  const ukuranHalaman = Math.min(
    UKURAN_HALAMAN_MAKS,
    Math.max(1, Math.trunc(Number(ukuranHalamanRaw)) || ukuranHalamanDefault),
  );

  return {
    skip: (halaman - 1) * ukuranHalaman,
    take: ukuranHalaman,
    halaman,
    ukuranHalaman,
  };
}

export function hasilHalaman<T>(
  data: T[],
  total: number,
  param: ParamHalaman,
): HasilHalaman<T> {
  return { data, total, halaman: param.halaman, ukuranHalaman: param.ukuranHalaman };
}
