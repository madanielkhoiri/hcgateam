// ==================================================
// FILE: backend/src/mcu/mcu-penyakit.util.ts
// FUNGSI: Pecah & rapikan isian nama penyakit rekomendasi Follow Up
// supaya rekap tidak memecah penyakit yang sama karena huruf besar/kecil
// atau spasi berlebih.
// ==================================================

/** Satu isian boleh memuat beberapa penyakit, dipisah koma, titik koma, atau baris baru. */
export function pecahPenyakit(teks: string | null | undefined): string[] {
  if (!teks) {
    return [];
  }

  const hasil = new Map<string, string>();

  for (const bagian of teks.split(/[,;\n]+/)) {
    const nama = bagian.replace(/\s+/g, ' ').trim();

    if (nama && !hasil.has(nama.toLowerCase())) {
      hasil.set(nama.toLowerCase(), nama);
    }
  }

  return Array.from(hasil.values());
}
