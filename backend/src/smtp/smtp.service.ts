// ==================================================
// FILE: backend/src/smtp/smtp.service.ts
// FUNGSI: Kirim email keluar lewat SMTP gratis (mis. Gmail + App Password).
// Kredensial diisi lewat env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
// SMTP_FROM (opsional). Bila belum diisi, pengiriman email dilewati
// (fitur lain tetap jalan) dan dicatat di log — pola sama persis dengan
// WhatsappService (Fonnte) dan MailgunService.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

export type LampiranSmtp = { namaFile: string; data: Buffer };

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);
  private readonly user: string | undefined;
  private readonly transporter: Transporter | undefined;

  constructor() {
    const host = process.env.SMTP_HOST || undefined;
    const port = Number(process.env.SMTP_PORT || 587);
    this.user = process.env.SMTP_USER || undefined;
    const pass = process.env.SMTP_PASS || undefined;

    if (!host || !this.user || !pass) {
      this.logger.warn(
        'SMTP_HOST/SMTP_USER/SMTP_PASS belum diisi di .env — pengiriman email dilewati.',
      );
      return;
    }

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: this.user, pass },
    });
  }

  get aktif(): boolean {
    return Boolean(this.transporter);
  }

  private get alamatPengirim(): string {
    return process.env.SMTP_FROM?.trim() || `Portal ONE FOR ALL <${this.user}>`;
  }

  /** Kirim satu email. Tidak pernah melempar error — kegagalan cuma dicatat di log. */
  async kirim(params: {
    to: string;
    subjek: string;
    teks: string;
    lampiran?: LampiranSmtp[];
  }): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.alamatPengirim,
        to: params.to,
        subject: params.subjek,
        text: params.teks,
        attachments: params.lampiran?.map((file) => ({
          filename: file.namaFile,
          content: file.data,
        })),
      });

      return true;
    } catch (error) {
      this.logger.error(`Gagal kirim email ke ${params.to}: ${(error as Error).message}`);
      return false;
    }
  }
}
