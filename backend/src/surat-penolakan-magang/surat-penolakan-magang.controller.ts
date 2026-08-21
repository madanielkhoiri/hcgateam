// ==================================================
// FILE: backend/src/surat-penolakan-magang/surat-penolakan-magang.controller.ts
// FUNGSI: Endpoint Surat Penolakan Magang (R & D)
// ==================================================

import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor } from '../mcu/common/mcu-aktor';
import type { AktorMcu } from '../mcu/common/mcu-aktor';
import { BuatSuratPenolakanMagangDto } from './dto/surat-penolakan-magang.dto';
import { SuratPenolakanMagangService } from './surat-penolakan-magang.service';

@Controller('surat-penolakan-magang')
@UseGuards(JwtAuthGuard)
export class SuratPenolakanMagangController {
  constructor(private readonly service: SuratPenolakanMagangService) {}

  @Get()
  daftar() {
    return this.service.daftar();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  terbitkan(
    @Aktor() aktor: AktorMcu,
    @Body() dto: BuatSuratPenolakanMagangDto,
  ) {
    return this.service.terbitkan(dto, aktor);
  }

  @Post(':id/cetak-ulang')
  cetakUlang(@Param('id', ParseIntPipe) id: number) {
    return this.service.cetakUlang(id);
  }
}
