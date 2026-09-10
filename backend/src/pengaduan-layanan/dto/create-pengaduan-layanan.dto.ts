import { DivisiPengaduan, LokasiPengaduan } from '@prisma/client';

/**
 * Endpoint create sekarang menerima multipart/form-data (karena wajib
 * lampiran foto), jadi field-field ini diekstrak & divalidasi manual di
 * controller/service (bukan lewat ValidationPipe seperti DTO JSON biasa —
 * multer mengirim semua field non-file sebagai string). Tipe ini cuma
 * dipakai sebagai bentuk data yang sudah tervalidasi saat sampai ke service.
 */
export class CreatePengaduanLayananDto {
  divisi: DivisiPengaduan;
  /** Wajib untuk divisi GA/CIVIL, tidak berlaku untuk HC — divalidasi di service. */
  lokasi?: LokasiPengaduan;
  rating: number;
  komentar?: string;
  deskripsiAduan?: string;
}
