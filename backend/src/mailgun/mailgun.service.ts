// ==================================================
// FILE: backend/src/mailgun/mailgun.service.ts
// FUNGSI: Kirim email keluar lewat Mailgun (mailgun.com). Kredensial
// diisi lewat env: MAILGUN_API_KEY, MAILGUN_DOMAIN,
// MAILGUN_WEBHOOK_SIGNING_KEY (dari Account Settings → API Security,
// BUKAN sama dengan MAILGUN_API_KEY). Bila MAILGUN_API_KEY/DOMAIN belum
// diisi, pengiriman email dilewati (fitur lain tetap jalan) dan dicatat
// di log — pola sama persis dengan WhatsappService (Fonnte).
// ==================================================

import { Injectable, Logger } from '@nestjs/common';

export type LampiranEmail = { namaFile: string; data: Buffer };

export type HasilKirimEmail =
  | { berhasil: true; messageId: string | null }
  | { berhasil: false };

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private readonly apiKey: string | undefined;
  private readonly domain: string | undefined;
  private readonly webhookSigningKey: string | undefined;

  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY || undefined;
    this.domain = process.env.MAILGUN_DOMAIN || undefined;
    this.webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || undefined;

    if (!this.apiKey || !this.domain) {
      this.logger.warn(
        'MAILGUN_API_KEY/MAILGUN_DOMAIN belum diisi di .env — pengiriman email dilewati.',
      );
    }
  }

  get aktif(): boolean {
    return Boolean(this.apiKey && this.domain);
  }

  /**
   * Dipakai controller webhook untuk verifikasi signature (lihat
   * mailgun-signature.util.ts) — Mailgun menandatangani webhook pakai
   * "HTTP webhook signing key" TERPISAH dari API key biasa (Account
   * Settings → API Security), bukan MAILGUN_API_KEY.
   */
  get kunciWebhook(): string | undefined {
    return this.webhookSigningKey;
  }

  get domainAktif(): string | undefined {
    return this.domain;
  }

  private get endpoint(): string {
    const base =
      process.env.MAILGUN_BASE_URL?.trim().replace(/\/+$/, '') ||
      'https://api.mailgun.net';

    return `${base}/v3/${this.domain}/messages`;
  }

  private get alamatPengirim(): string {
    return (
      process.env.MAILGUN_FROM?.trim() ||
      `Portal ONE FOR ALL <postmaster@${this.domain}>`
    );
  }

  /**
   * Kirim satu email. `replyTo` dipakai supaya balasan vendor terarah ke
   * alamat inbound Mailgun yang benar (bukan ke alamat pengirim asli).
   * `inReplyTo`/`references` (header Message-Id email sebelumnya) dipakai
   * supaya email masuk sebagai satu thread yang sama di inbox vendor.
   */
  async kirim(params: {
    to: string;
    subjek: string;
    teks: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    lampiran?: LampiranEmail[];
  }): Promise<HasilKirimEmail> {
    if (!this.apiKey || !this.domain) {
      return { berhasil: false };
    }

    try {
      const form = new FormData();
      form.append('from', this.alamatPengirim);
      form.append('to', params.to);
      form.append('subject', params.subjek);
      form.append('text', params.teks);

      if (params.replyTo) {
        form.append('h:Reply-To', params.replyTo);
      }

      if (params.inReplyTo) {
        form.append('h:In-Reply-To', params.inReplyTo);
      }

      if (params.references) {
        form.append('h:References', params.references);
      }

      for (const file of params.lampiran ?? []) {
        form.append(
          'attachment',
          new Blob([new Uint8Array(file.data)]),
          file.namaFile,
        );
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
        body: form,
      });

      if (!response.ok) {
        this.logger.error(
          `Mailgun membalas status ${response.status} untuk tujuan ${params.to}`,
        );
        return { berhasil: false };
      }

      const data = (await response.json().catch(() => null)) as {
        id?: string;
      } | null;

      return { berhasil: true, messageId: data?.id ?? null };
    } catch (error) {
      this.logger.error(
        `Gagal kirim email ke ${params.to}: ${(error as Error).message}`,
      );
      return { berhasil: false };
    }
  }
}
