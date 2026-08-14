// ==================================================
// FILE: backend/src/mcu/mcu-date.util.ts
// FUNGSI: Perhitungan tanggal alur MCU (lock, retensi, H-3 bulan)
// ==================================================

/**
 * Normalisasi ke tengah hari UTC supaya kolom `@db.Date` tidak bergeser
 * satu hari saat server berjalan di zona waktu WITA/WIB.
 */
export function tanggalSaja(value: Date | string): Date {
  const source = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(source.getTime())) {
    throw new Error('Tanggal tidak valid');
  }

  return new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth(),
      source.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
}

export function hariIni(): Date {
  return tanggalSaja(new Date());
}

export function tambahHari(value: Date | string, jumlah: number): Date {
  const base = tanggalSaja(value);
  base.setUTCDate(base.getUTCDate() + jumlah);
  return base;
}

/**
 * Penambahan bulan yang aman terhadap akhir bulan.
 * 31 Januari + 1 bulan menjadi 28/29 Februari, bukan 3 Maret.
 */
export function tambahBulan(value: Date | string, jumlah: number): Date {
  const base = tanggalSaja(value);
  const tanggalAwal = base.getUTCDate();

  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + jumlah);

  const hariTerakhirBulanTujuan = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12, 0, 0, 0),
  ).getUTCDate();

  base.setUTCDate(Math.min(tanggalAwal, hariTerakhirBulanTujuan));

  return base;
}

export function kurangBulan(value: Date | string, jumlah: number): Date {
  return tambahBulan(value, -jumlah);
}

export function selisihHari(
  dari: Date | string,
  sampai: Date | string,
): number {
  const awal = tanggalSaja(dari).getTime();
  const akhir = tanggalSaja(sampai).getTime();

  return Math.round((akhir - awal) / 86_400_000);
}

/** Durasi proses dalam hari, dipakai modul Durasi Proses (Bagian 4.9). */
export function durasiHari(
  mulai: Date | null | undefined,
  selesai: Date | null | undefined,
): number | null {
  if (!mulai || !selesai) {
    return null;
  }

  return selisihHari(mulai, selesai);
}

export function formatTanggalIndonesia(value: Date | string | null): string {
  if (!value) {
    return '-';
  }

  const tanggal = tanggalSaja(value);

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(tanggal);
}
