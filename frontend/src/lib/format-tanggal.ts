// ==================================================
// Format tanggal standar aplikasi: "01 - November - 2026"
// (opsional + jam: "01 - November - 2026, 14.30").
// ==================================================

export type OpsiFormatTanggal = {
  /** Tambahkan jam:menit. */
  waktu?: boolean;
  /** Tambahkan detik (hanya jika waktu = true). */
  detik?: boolean;
  /** Awali dengan nama hari, mis. "Senin, 01 - November - 2026". */
  hari?: "short" | "long";
  /** Zona waktu IANA, mis. "Asia/Makassar". Default: zona waktu browser. */
  timeZone?: string;
};

type NilaiTanggal = Date | string | number | null | undefined;

/** "01 - November - 2026". Nilai kosong / tidak valid -> "-". */
export function formatTanggal(nilai: NilaiTanggal, opsi: OpsiFormatTanggal = {}): string {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  const tanggal = nilai instanceof Date ? nilai : new Date(nilai);
  if (Number.isNaN(tanggal.getTime())) return "-";

  const bagian = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(opsi.hari ? { weekday: opsi.hari } : {}),
    ...(opsi.waktu ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
    ...(opsi.waktu && opsi.detik ? { second: "2-digit" } : {}),
    ...(opsi.timeZone ? { timeZone: opsi.timeZone } : {}),
  }).formatToParts(tanggal);
  const ambil = (jenis: Intl.DateTimeFormatPartTypes) => bagian.find((p) => p.type === jenis)?.value ?? "";

  let hasil = `${ambil("day")} - ${ambil("month")} - ${ambil("year")}`;
  if (opsi.hari) hasil = `${ambil("weekday")}, ${hasil}`;
  if (opsi.waktu) {
    hasil += `, ${ambil("hour")}.${ambil("minute")}`;
    if (opsi.detik) hasil += `.${ambil("second")}`;
  }
  return hasil;
}

/** Singkatan: tanggal + jam. */
export function formatTanggalWaktu(nilai: NilaiTanggal, opsi: Omit<OpsiFormatTanggal, "waktu"> = {}): string {
  return formatTanggal(nilai, { ...opsi, waktu: true });
}
