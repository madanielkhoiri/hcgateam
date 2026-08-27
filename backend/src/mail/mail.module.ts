// ==================================================
// FILE: backend/src/mail/mail.module.ts
// FUNGSI: Modul global pengiriman email (SMTP Outlook/M365).
// ==================================================

import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
