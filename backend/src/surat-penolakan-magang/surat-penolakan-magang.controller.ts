// ==================================================
// FILE: backend/src/surat-penolakan-magang/surat-penolakan-magang.controller.ts
// FUNGSI: Endpoint Surat Penolakan Magang (R & D)
// ==================================================

import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { Aktor } from '../mcu/common/mcu-aktor';
import type { AktorMcu } from '../mcu/common/mcu-aktor';
import { BuatSuratPenolakanMagangDto } from './dto/surat-penolakan-magang.dto';
import { SuratPenolakanMagangService } from './surat-penolakan-magang.service';

@Controller('surat-penolakan-magang')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_SURAT_PENOLAKAN_MAGANG')
export class SuratPenolakanMagangController {
  constructor(private readonly service: SuratPenolakanMagangService) {}

  @Get()
  daftar(
    @Query('halaman') halaman?: string,
    @Query('ukuranHalaman') ukuranHalaman?: string,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
  ) {
    return this.service.daftar({
      halaman,
      ukuranHalaman,
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
    });
  }

  @Get('dashboard/ringkasan')
  ringkasanDashboard() {
    return this.service.ringkasanDashboard();
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
