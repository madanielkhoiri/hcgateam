// ==================================================
// FILE: backend/src/mcu/induksi/mcu-induksi.controller.ts
// FUNGSI: Endpoint induksi ulang K3
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatusInduksiUlang } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import {
  DaftarInduksiDto,
  JadwalkanInduksiDto,
  McuInduksiService,
  SelesaikanInduksiDto,
} from './mcu-induksi.service';

@Controller('mcu/induksi-ulang')
@UseGuards(JwtAuthGuard)
export class McuInduksiController {
  constructor(private readonly service: McuInduksiService) {}

  @Get()
  daftar(
    @Query('status') status?: StatusInduksiUlang,
    @Query('karyawanId') karyawanId?: string,
  ) {
    return this.service.daftar({
      status,
      karyawanId: karyawanId ? Number(karyawanId) : undefined,
    });
  }

  @Get('menunggu-pendaftaran')
  menungguPendaftaran() {
    return this.service.menungguPendaftaran();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post('rekomendasi/:rekomendasiId/daftarkan')
  daftarkan(
    @Aktor() aktor: AktorMcu,
    @Param('rekomendasiId', ParseIntPipe) rekomendasiId: number,
    @Body() dto: DaftarInduksiDto,
  ) {
    return this.service.daftarkan(rekomendasiId, dto, aktor);
  }

  @Post(':id/jadwalkan')
  jadwalkan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JadwalkanInduksiDto,
  ) {
    return this.service.jadwalkan(id, dto, aktor);
  }

  @Post(':id/selesaikan')
  selesaikan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SelesaikanInduksiDto,
  ) {
    return this.service.selesaikan(id, dto, aktor);
  }

  /** Tahap 1 karyawan dirumahkan: FIT dari sakit. */
  @Post('karyawan/:karyawanId/fit-sakit')
  tandaiFitSakit(
    @Aktor() aktor: AktorMcu,
    @Param('karyawanId', ParseIntPipe) karyawanId: number,
  ) {
    return this.service.tandaiFitSakit(karyawanId, aktor);
  }
}
