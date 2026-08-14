// ==================================================
// FILE: backend/src/mcu/klinik/mcu-klinik.controller.ts
// FUNGSI: Endpoint master klinik provider
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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { McuAksesService } from '../common/mcu-akses.service';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import {
  BuatKlinikDto,
  McuKlinikService,
  UbahKlinikDto,
} from './mcu-klinik.service';

@Controller('mcu/klinik')
@UseGuards(JwtAuthGuard)
export class McuKlinikController {
  constructor(
    private readonly service: McuKlinikService,
    private readonly akses: McuAksesService,
  ) {}

  @Get()
  daftar(
    @Query('terkoneksi') terkoneksi?: string,
    @Query('hanyaAktif') hanyaAktif?: string,
  ) {
    return this.service.daftar({
      terkoneksi: terkoneksi === undefined ? undefined : terkoneksi === 'true',
      hanyaAktif: hanyaAktif === 'true',
    });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  async buat(@Aktor() aktor: AktorMcu, @Body() dto: BuatKlinikDto) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.buat(dto);
  }

  @Patch(':id')
  async ubah(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahKlinikDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubah(id, dto);
  }

  @Delete(':id')
  async hapus(@Aktor() aktor: AktorMcu, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.hapus(id);
  }
}
