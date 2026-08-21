// ==================================================
// FILE: backend/src/anak-magang/anak-magang.controller.ts
// FUNGSI: Endpoint Database Anak Magang (R & D) - master data mahasiswa
// magang, dipakai bersama Surat Balasan & Surat Penolakan Magang.
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
import { StatusAnakMagang, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { McuAksesService } from '../mcu/common/mcu-akses.service';
import { Aktor } from '../mcu/common/mcu-aktor';
import type { AktorMcu } from '../mcu/common/mcu-aktor';
import { AnakMagangService } from './anak-magang.service';
import { BuatAnakMagangDto, UbahAnakMagangDto } from './dto/anak-magang.dto';

@Controller('anak-magang')
@UseGuards(JwtAuthGuard)
export class AnakMagangController {
  constructor(
    private readonly service: AnakMagangService,
    private readonly akses: McuAksesService,
  ) {}

  @Get()
  daftar(
    @Query('status') status?: StatusAnakMagang,
    @Query('cari') cari?: string,
  ) {
    return this.service.daftar({ status, cari: cari?.trim() || undefined });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  buat(@Aktor() aktor: AktorMcu, @Body() dto: BuatAnakMagangDto) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.buat(dto);
  }

  @Patch(':id')
  ubah(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahAnakMagangDto,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.ubah(id, dto);
  }
}
