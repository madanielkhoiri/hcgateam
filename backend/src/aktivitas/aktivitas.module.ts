// ==================================================
// FILE: backend/src/aktivitas/aktivitas.module.ts
// FUNGSI: Modul Aktivitas Terbaru (rekap upload lintas modul)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AktivitasController } from './aktivitas.controller';
import { AktivitasService } from './aktivitas.service';

@Module({
  imports: [PrismaModule],
  controllers: [AktivitasController],
  providers: [AktivitasService],
})
export class AktivitasModule {}
