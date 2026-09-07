// ==================================================
// FILE: backend/src/mailgun/mailgun.module.ts
// FUNGSI: Modul global kirim email (Mailgun).
// ==================================================

import { Global, Module } from '@nestjs/common';
import { MailgunService } from './mailgun.service';

@Global()
@Module({
  providers: [MailgunService],
  exports: [MailgunService],
})
export class MailgunModule {}
