// ==================================================
// FILE: backend/src/mcu/jadwal/mcu-jadwal.controller.ts
// FUNGSI: Endpoint penjadwalan MCU & lock H-3 hari
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JenisMcu, StatusPendaftaran, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { McuAksesService } from '../common/mcu-akses.service';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import {
  BatalkanJadwalDto,
  BuatJadwalBatchDto,
  BuatJadwalMcuDto,
  McuJadwalService,
  UbahJadwalMcuDto,
} from './mcu-jadwal.service';

@Controller('mcu/jadwal')
@UseGuards(JwtAuthGuard)
export class McuJadwalController {
  constructor(
    private readonly service: McuJadwalService,
    private readonly akses: McuAksesService,
  ) {}

  @Get()
  daftar(
    @Query('status') status?: StatusPendaftaran,
    @Query('jenisMcu') jenisMcu?: JenisMcu,
    @Query('departemenId') departemenId?: string,
    @Query('karyawanId') karyawanId?: string,
    @Query('dariTanggal') dariTanggal?: string,
    @Query('sampaiTanggal') sampaiTanggal?: string,
  ) {
    return this.service.daftar({
      status,
      jenisMcu,
      departemenId: departemenId ? Number(departemenId) : undefined,
      karyawanId: karyawanId ? Number(karyawanId) : undefined,
      dariTanggal,
      sampaiTanggal,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  buat(@Aktor() aktor: AktorMcu, @Body() dto: BuatJadwalMcuDto) {
    return this.service.buat(dto, aktor);
  }

  @Post('batch')
  buatBatch(@Aktor() aktor: AktorMcu, @Body() dto: BuatJadwalBatchDto) {
    return this.service.buatBatch(dto, aktor);
  }

  @Post('kunci-jatuh-tempo')
  async kunciJatuhTempo(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.kunciJadwalJatuhTempo();
  }

  @Patch(':id')
  ubah(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahJadwalMcuDto,
  ) {
    return this.service.ubah(id, dto, aktor);
  }

  @Post(':id/batalkan')
  batalkan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BatalkanJadwalDto,
  ) {
    return this.service.batalkan(id, dto, aktor);
  }
}
