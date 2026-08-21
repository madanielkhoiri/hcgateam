// ==================================================
// FILE: backend/src/database-karyawan/database-karyawan.controller.ts
// FUNGSI: Card "Database Karyawan" berdiri sendiri di HC - master data
// seluruh karyawan, terpisah dari alur MCU Periodik, dan bisa dipakai
// card lain yang butuh data karyawan. Memakai ulang McuKaryawanService
// (satu tabel karyawan, satu sumber data) supaya tidak ada logika ganda.
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { McuAksesService } from '../mcu/common/mcu-akses.service';
import { Aktor } from '../mcu/common/mcu-aktor';
import type { AktorMcu } from '../mcu/common/mcu-aktor';
import {
  BuatKaryawanDto,
  UbahKaryawanDto,
  UbahStatusKerjaDto,
} from '../mcu/karyawan/dto/mcu-karyawan.dto';
import { McuKaryawanService } from '../mcu/karyawan/mcu-karyawan.service';

@Controller('database-karyawan')
@UseGuards(JwtAuthGuard)
export class DatabaseKaryawanController {
  constructor(
    private readonly service: McuKaryawanService,
    private readonly akses: McuAksesService,
  ) {}

  @Get('departemen')
  daftarDepartemen() {
    return this.service.daftarDepartemen();
  }

  @Get()
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

  @Get('jatuh-tempo')
  karyawanJatuhTempo(@Query('hariKeDepan') hariKeDepan?: string) {
    return this.service.karyawanJatuhTempo(
      hariKeDepan ? Number(hariKeDepan) : 0,
    );
  }

  @Post('kirim-reminder')
  async kirimReminder(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.jalankanReminderJatuhTempo();
  }

  @Get(':id')
  detailKaryawan(@Param('id', ParseIntPipe) id: number) {
    return this.service.detailKaryawan(id);
  }

  @Post()
  async buatKaryawan(@Aktor() aktor: AktorMcu, @Body() dto: BuatKaryawanDto) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.buatKaryawan(dto);
  }

  @Patch(':id')
  async ubahKaryawan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahKaryawanDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubahKaryawan(id, dto);
  }

  @Patch(':id/status-kerja')
  async ubahStatusKerja(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahStatusKerjaDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubahStatusKerja(id, dto);
  }

  @Delete(':id')
  async hapusKaryawan(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.hapusKaryawan(id);
  }
}