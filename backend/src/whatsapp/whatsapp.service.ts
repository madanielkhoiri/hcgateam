// ==================================================
// FILE: backend/src/whatsapp/whatsapp.service.ts
// FUNGSI: Kirim notifikasi WhatsApp keluar lewat Fonnte (fonnte.com).
// Kredensial diisi lewat env: FONNTE_TOKEN. Bila belum diisi,
// pengiriman notifikasi dilewati (fitur lain tetap jalan) dan
// dicatat di log.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';

const FONNTE_ENDPOINT = 'https://api.fonnte.com/send';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string | undefined;

  constructor() {
    this.token = process.env.FONNTE_TOKEN || undefined;

    if (!this.token) {
      this.logger.warn(
        'FONNTE_TOKEN belum diisi di .env — notifikasi WhatsApp dilewati.',
      );
    }
  }

  get aktif(): boolean {
    return Boolean(this.token);
  }

  /**
   * URL publik dari path relatif uploads/ — dipakai untuk parameter `url`
   * lampiran Fonnte (WAJIB URL publik, Fonnte tidak bisa akses localhost).
   * Kembalikan null kalau BACKEND_PUBLIC_URL belum di-set di .env server —
   * pemanggil harus fallback ke kirim pesan teks biasa tanpa lampiran.
   */
  urlPublikLampiran(pathRelatifUploads: string): string | null {
    const base = process.env.BACKEND_PUBLIC_URL?.trim().replace(/\/+$/, '');

    if (!base) {
      return null;
    }

    const bersih = pathRelatifUploads.replace(/^\/+/, '');

    return `${base}/uploads/${bersih}`;
  }

  /**
   * Kirim satu pesan WA ke satu nomor tujuan (format bebas: 08xx atau 62xx).
   * `lampiran.url` WAJIB URL publik (lihat urlPublikLampiran) — Fonnte hanya
   * mendukung lampiran di paket Super/Advanced/Ultra; paket di bawah itu
   * akan mengabaikan parameter `url` (pesan teks tetap terkirim).
   */
  async kirim(
    tujuan: string | undefined | null,
    pesan: string,
    lampiran?: { url: string; namaFile?: string },
  ): Promise<boolean> {
    if (!this.token || !tujuan) {
      return false;
    }

    try {
      const response = await fetch(FONNTE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          target: tujuan,
          message: pesan,
          ...(lampiran
            ? {
                url: lampiran.url,
                ...(lampiran.namaFile ? { filename: lampiran.namaFile } : {}),
              }
            : {}),
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Fonnte membalas status ${response.status} untuk tujuan ${tujuan}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Gagal kirim WA ke ${tujuan}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
