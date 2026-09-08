// ==================================================
// FILE: backend/src/whatsapp/whatsapp.service.ts
// FUNGSI: Kirim notifikasi WhatsApp keluar lewat Fonnte (fonnte.com).
// Kredensial diisi lewat env: FONNTE_TOKEN (device default/GA),
// FONNTE_TOKEN_HC (device WA milik HC — dipakai kalau parameter
// `departemen: 'HC'` diisi saat kirim, fallback ke device default kalau
// belum dikonfigurasi). Bila token belum diisi, pengiriman notifikasi
// dilewati (fitur lain tetap jalan) dan dicatat di log.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';

const FONNTE_ENDPOINT = 'https://api.fonnte.com/send';
const FONNTE_VALIDATE_ENDPOINT = 'https://api.fonnte.com/validate';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string | undefined;
  private readonly tokenHc: string | undefined;

  constructor() {
    this.token = process.env.FONNTE_TOKEN || undefined;
    this.tokenHc = process.env.FONNTE_TOKEN_HC || undefined;

    if (!this.token) {
      this.logger.warn(
        'FONNTE_TOKEN belum diisi di .env — notifikasi WhatsApp dilewati.',
      );
    }
  }

  get aktif(): boolean {
    return Boolean(this.token);
  }

  private pilihToken(departemen?: 'HC'): string | undefined {
    return departemen === 'HC' ? this.tokenHc || this.token : this.token;
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
   * `departemen: 'HC'` mengirim dari device WA HC (FONNTE_TOKEN_HC),
   * fallback ke device default kalau belum dikonfigurasi.
   */
  async kirim(
    tujuan: string | undefined | null,
    pesan: string,
    lampiran?: { url: string; namaFile?: string },
    departemen?: 'HC',
  ): Promise<boolean> {
    const token = this.pilihToken(departemen);

    if (!token || !tujuan) {
      return false;
    }

    try {
      const response = await fetch(FONNTE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: token,
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

  /**
   * Cek apakah satu nomor terdaftar di WhatsApp lewat Fonnte /validate.
   * Return `true`/`false` kalau berhasil dicek, `null` kalau tidak bisa
   * dipastikan (token/nomor kosong, request gagal, atau respons Fonnte
   * error) — pemanggil sebaiknya TIDAK menimpa status lama dengan `null`.
   */
  async validasiTerdaftar(
    nomor: string | undefined | null,
    departemen?: 'HC',
  ): Promise<boolean | null> {
    const token = this.pilihToken(departemen);

    if (!token || !nomor?.trim()) {
      return null;
    }

    try {
      const response = await fetch(FONNTE_VALIDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ target: nomor.trim() }),
      });

      if (!response.ok) {
        this.logger.error(`Fonnte validate membalas status ${response.status} untuk ${nomor}`);
        return null;
      }

      const data = (await response.json().catch(() => null)) as {
        status?: boolean;
        reason?: string;
        registered?: string[];
        not_registered?: string[];
      } | null;

      if (!data || data.status !== true) {
        this.logger.error(`Fonnte validate gagal untuk ${nomor}: ${data?.reason ?? 'respons tidak dikenal'}`);
        return null;
      }

      if ((data.registered?.length ?? 0) > 0) {
        return true;
      }

      if ((data.not_registered?.length ?? 0) > 0) {
        return false;
      }

      return null;
    } catch (error) {
      this.logger.error(`Gagal validasi nomor WA ${nomor}: ${(error as Error).message}`);
      return null;
    }
  }
}
