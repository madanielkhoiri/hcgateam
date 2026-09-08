// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender-mailgun-webhook.controller.ts
// FUNGSI: Terima webhook "inbound" Mailgun — dipanggil Mailgun sendiri
// tiap kali vendor membalas email undangan tender. SENGAJA TIDAK
// pakai JwtAuthGuard (endpoint ini publik, dipanggil server Mailgun
// dari internet) — keamanan dijaga lewat verifikasi signature HMAC.
// ==================================================

import { Body, Controller, ForbiddenException, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MailgunService } from '../../mailgun/mailgun.service';
import { verifikasiSignatureMailgun } from '../../mailgun/mailgun-signature.util';
import { EpromTenderChatService } from './eprom-tender-chat.service';

@Controller('mailgun')
export class EpromTenderMailgunWebhookController {
  constructor(
    private readonly chatService: EpromTenderChatService,
    private readonly mailgun: MailgunService,
  ) {}

  @Post('inbound')
  @UseInterceptors(AnyFilesInterceptor({ storage: memoryStorage() }))
  async inbound(
    @Body() body: Record<string, string>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const valid = verifikasiSignatureMailgun(
      body.timestamp,
      body.token,
      body.signature,
      this.mailgun.kunciWebhook,
    );

    if (!valid) {
      throw new ForbiddenException('Signature Mailgun tidak valid');
    }

    await this.chatService.terimaPesanMasuk(body, files ?? []);

    return { message: 'ok' };
  }
}
