// ==================================================
// FILE: backend/src/mcu/karyawan/mcu-karyawan.controller.ts
// FUNGSI: Endpoint master karyawan, departemen, dan reminder H-3 bulan
// ==================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatusKerja, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { McuAksesService } from '../common/mcu-akses.service';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import {
  BuatDepartemenDto,
  BuatKaryawanDto,
  UbahDepartemenDto,
  UbahKaryawanDto,
  UbahStatusKerjaDto,
} from './dto/mcu-karyawan.dto';
import { McuKaryawanService } from './mcu-karyawan.service';

@Controller('mcu')
@UseGuards(JwtAuthGuard)
export class McuKaryawanController {
  constructor(
    private readonly service: McuKaryawanService,
    private readonly akses: McuAksesService,
  ) {}

  // ==================================================
  // DEPARTEMEN
  // ==================================================

  @Get('departemen')
  daftarDepartemen() {
    return this.service.daftarDepartemen();
  }

  @Post('departemen')
  async buatDepartemen(
    @Aktor() aktor: AktorMcu,
    @Body() dto: BuatDepartemenDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.buatDepartemen(dto);
  }

  @Patch('departemen/:id')
  async ubahDepartemen(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahDepartemenDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubahDepartemen(id, dto);
  }

  @Delete('departemen/:id')
  async hapusDepartemen(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.hapusDepartemen(id);
  }

  // ==================================================
  // KARYAWAN
  // ==================================================

  @Get('karyawan')
  daftarKaryawan(
    @Query('departemenId') departemenId?: string,
    @Query('statusKerja') statusKerja?: StatusKerja,
    @Query('cari') cari?: string,
  ) {
    return this.service.daftarKaryawan({
      departemenId: departemenId ? Number(departemenId) : undefined,
      statusKerja,
      cari: cari?.trim() || undefined,
    });
  }

  @Get('karyawan/jatuh-tempo')
  karyawanJatuhTempo(@Query('hariKeDepan') hariKeDepan?: string) {
    return this.service.karyawanJatuhTempo(
      hariKeDepan ? Number(hariKeDepan) : 0,
    );
  }

  @Post('karyawan/kirim-reminder')
  async kirimReminder(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.jalankanReminderJatuhTempo();
  }

  @Get('karyawan/:id')
  detailKaryawan(@Param('id', ParseIntPipe) id: number) {
    return this.service.detailKaryawan(id);
  }

  @Post('karyawan')
  async buatKaryawan(@Aktor() aktor: AktorMcu, @Body() dto: BuatKaryawanDto) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.buatKaryawan(dto);
  }

  @Patch('karyawan/:id')
  async ubahKaryawan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahKaryawanDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubahKaryawan(id, dto);
  }

  @Patch('karyawan/:id/status-kerja')
  async ubahStatusKerja(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahStatusKerjaDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubahStatusKerja(id, dto);
  }

  @Delete('karyawan/:id')
  async hapusKaryawan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.hapusKaryawan(id);
  }
}
