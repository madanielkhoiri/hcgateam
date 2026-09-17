// ==================================================
// FILE: backend/src/mcu/rekomendasi/mcu-rekomendasi.controller.ts
// FUNGSI: Endpoint review Dokter & penerusan rekomendasi
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { StatusRekomendasi } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import {
  McuRekomendasiService,
  SubmitRekomendasiDto,
} from './mcu-rekomendasi.service';

@Controller('mcu/rekomendasi')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_MCU')
export class McuRekomendasiController {
  constructor(private readonly service: McuRekomendasiService) {}

  @Get()
  daftar(
    @Query('status') status?: StatusRekomendasi,
    @Query('karyawanId') karyawanId?: string,
    @Query('belumDiteruskan') belumDiteruskan?: string,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('halaman') halaman?: string,
    @Query('ukuranHalaman') ukuranHalaman?: string,
  ) {
    return this.service.daftar({
      status,
      karyawanId: karyawanId ? Number(karyawanId) : undefined,
      belumDiteruskan: belumDiteruskan === 'true',
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
      halaman,
      ukuranHalaman,
    });
  }

  @Get('antrean-review')
  antreanReview() {
    return this.service.antreanReview();
  }

  /** Ringkasan untuk akun karyawan - status FIT/FU saja. */
  @Get('saya')
  rekomendasiSaya(@Aktor() aktor: AktorMcu) {
    return this.service.rekomendasiKaryawan(aktor);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post('hasil/:hasilMcuId/submit')
  submit(
    @Aktor() aktor: AktorMcu,
    @Param('hasilMcuId', ParseIntPipe) hasilMcuId: number,
    @Body() dto: SubmitRekomendasiDto,
  ) {
    return this.service.submit(hasilMcuId, dto, aktor);
  }

  @Post(':id/teruskan')
  teruskan(@Aktor() aktor: AktorMcu, @Param('id', ParseIntPipe) id: number) {
    return this.service.teruskanKeKaryawan(id, aktor);
  }

  @Get(':id/surat-rujukan')
  async suratRujukan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const path = await this.service.pathSuratRujukan(id, aktor);
    return response.sendFile(path);
  }
}
