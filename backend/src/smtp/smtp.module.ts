// ==================================================
// FILE: backend/src/smtp/smtp.module.ts
// FUNGSI: Registrasi global SmtpService — dipakai modul mana saja tanpa perlu import ulang.
// ==================================================

import { Global, Module } from '@nestjs/common';
import { SmtpService } from './smtp.service';

@Global()
@Module({
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
