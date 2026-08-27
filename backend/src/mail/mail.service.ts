// ==================================================
// FILE: backend/src/mail/mail.service.ts
// FUNGSI: Kirim email keluar (SMTP Outlook/Microsoft 365) untuk
// keperluan seperti undangan tender ke vendor.
// Kredensial diisi lewat env: MAIL_HOST, MAIL_PORT, MAIL_SECURE,
// MAIL_USER, MAIL_PASS, MAIL_FROM. Bila belum diisi, pengiriman
// email dilewati (fitur lain tetap jalan) dan dicatat di log.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

export type LampiranEmail = {
  filename: string;
  path: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly pengirim: string | undefined;

  constructor() {
    const host = process.env.MAIL_HOST;
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (!host || !user || !pass) {
      this.logger.warn(
        'MAIL_HOST/MAIL_USER/MAIL_PASS belum diisi di .env — pengiriman email dilewati.',
      );
      this.transporter = null;
      this.pengirim = undefined;
      return;
    }

    this.pengirim = process.env.MAIL_FROM || user;
    this.transporter = createTransport({
      host,
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: process.env.MAIL_SECURE === 'true',
      auth: { user, pass },
    });
  }

  get aktif(): boolean {
    return this.transporter !== null;
  }

  async kirim(params: {
    to: string;
    subjek: string;
    teks: string;
    lampiran?: LampiranEmail[];
  }): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.pengirim,
        to: params.to,
        subject: params.subjek,
        text: params.teks,
        attachments: params.lampiran,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Gagal mengirim email ke ${params.to}: ${(error as Error).message}`,
      );

      return false;
    }
  }
}
