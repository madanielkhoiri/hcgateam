// ==================================================
// FILE: backend/src/surat-balasan-magang/surat-balasan-magang.controller.ts
// FUNGSI: Endpoint Surat Balasan Magang (R & D)
// ==================================================

import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { Aktor } from '../mcu/common/mcu-aktor';
import type { AktorMcu } from '../mcu/common/mcu-aktor';
import { BuatSuratBalasanMagangDto } from './dto/surat-balasan-magang.dto';
import { SuratBalasanMagangService } from './surat-balasan-magang.service';

@Controller('surat-balasan-magang')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_SURAT_BALASAN_MAGANG')
export class SuratBalasanMagangController {
  constructor(private readonly service: SuratBalasanMagangService) {}

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
    @Body() dto: BuatSuratBalasanMagangDto,
  ) {
    return this.service.terbitkan(dto, aktor);
  }

  @Post(':id/cetak-ulang')
  cetakUlang(@Param('id', ParseIntPipe) id: number) {
    return this.service.cetakUlang(id);
  }
}
