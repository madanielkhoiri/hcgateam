// ==================================================
// FILE: backend/src/ir/aspirasi/ir-aspirasi.controller.ts
// FUNGSI: Endpoint Aspirasi Karyawan (kuesioner pilihan ganda/essay)
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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { IrAksesService } from '../common/ir-akses.service';
import { Aktor } from '../common/ir-aktor';
import type { AktorIr } from '../common/ir-aktor';
import {
  BuatPertanyaanDto,
  JawabPertanyaanDto,
  UbahPertanyaanDto,
} from './ir-aspirasi.dto';
import { IrAspirasiService } from './ir-aspirasi.service';

@Controller('ir/aspirasi')
@UseGuards(JwtAuthGuard)
export class IrAspirasiController {
  constructor(
    private readonly service: IrAspirasiService,
    private readonly akses: IrAksesService,
  ) {}

  @Get('pertanyaan')
  daftar(@Aktor() aktor: AktorIr) {
    return this.akses.bolehKelola(aktor)
      ? this.service.daftarUntukKelola()
      : this.service.daftarUntukDiisi(aktor);
  }

  @Post('pertanyaan')
  buat(@Aktor() aktor: AktorIr, @Body() dto: BuatPertanyaanDto) {
    this.akses.wajibKelola(aktor);
    return this.service.buatPertanyaan(dto, aktor);
  }

  @Patch('pertanyaan/:id')
  ubah(
    @Aktor() aktor: AktorIr,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahPertanyaanDto,
  ) {
    this.akses.wajibKelola(aktor);
    return this.service.ubahPertanyaan(id, dto);
  }

  @Delete('pertanyaan/:id')
  hapus(@Aktor() aktor: AktorIr, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibKelola(aktor);
    return this.service.hapusPertanyaan(id);
  }

  @Post('pertanyaan/:id/jawaban')
  jawab(
    @Aktor() aktor: AktorIr,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JawabPertanyaanDto,
  ) {
    return this.service.jawab(id, dto, aktor);
  }

  @Get('pertanyaan/:id/jawaban')
  rekap(@Aktor() aktor: AktorIr, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibKelola(aktor);
    return this.service.rekapJawaban(id);
  }
}
