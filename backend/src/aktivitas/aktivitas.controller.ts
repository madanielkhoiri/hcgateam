// ==================================================
// FILE: backend/src/aktivitas/aktivitas.controller.ts
// FUNGSI: Endpoint Aktivitas Terbaru - khusus Admin/Admin HC/
// Admin Comben/Section Head.
// ==================================================

import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor, bolehKelolaPostingan } from '../postingan/postingan-aktor';
import type { AktorPostingan } from '../postingan/postingan-aktor';
import { AktivitasService } from './aktivitas.service';

@Controller('aktivitas')
@UseGuards(JwtAuthGuard)
export class AktivitasController {
  constructor(private readonly service: AktivitasService) {}

  @Get('terbaru')
  terbaru(@Aktor() aktor: AktorPostingan) {
    if (!bolehKelolaPostingan(aktor)) {
      throw new ForbiddenException(
        'Aktivitas Terbaru hanya dapat dilihat oleh Admin/Admin HC/Admin Comben/Section Head',
      );
    }

    return this.service.terbaru();
  }
}
