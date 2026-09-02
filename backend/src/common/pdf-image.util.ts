// ==================================================
// FILE: backend/src/common/pdf-image.util.ts
// FUNGSI: PDFKit hanya bisa membaca JPEG/PNG — foto yang sudah dikompres
// jadi WebP di frontend (lihat compress-image.ts) gagal ditampilkan kalau
// langsung dikasih ke doc.image(). Helper ini convert WebP ke PNG di
// memori dulu sebelum diserahkan ke PDFKit; format lain dibiarkan apa
// adanya (path asli, tidak perlu baca-tulis file tambahan).
// ==================================================

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import sharp from 'sharp';

/**
 * Siapkan sumber gambar yang aman untuk doc.image() milik PDFKit.
 * Mengembalikan path asli untuk JPEG/PNG, atau Buffer PNG hasil konversi
 * untuk WebP (dan format lain yang tidak didukung PDFKit secara native).
 */
export async function siapkanGambarUntukPdfKit(
  absolutePath: string,
): Promise<string | Buffer> {
  const ekstensi = extname(absolutePath).toLowerCase();

  if (ekstensi === '.jpg' || ekstensi === '.jpeg' || ekstensi === '.png') {
    return absolutePath;
  }

  return sharp(readFileSync(absolutePath)).png().toBuffer();
}
