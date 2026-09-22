// ==================================================
// FILE: backend/src/surat-tugas-dinas/surat-tugas-dinas.controller.ts
// FUNGSI: Endpoint Surat Tugas Dinas (R & D)
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import {
  BuatSuratTugasDinasDto,
  TolakSuratTugasDinasDto,
} from './dto/surat-tugas-dinas.dto';
import { SuratTugasDinasService } from './surat-tugas-dinas.service';

type AuthRequest = {
  user: {
    id: number;
    role: UserRole;
  };
};

@Controller('surat-tugas-dinas')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_TUGAS_DINAS')
export class SuratTugasDinasController {
  constructor(private readonly service: SuratTugasDinasService) {}

  @Get()
  daftar(
    @Req() request: AuthRequest,
    @Query('status') status?: string,
    @Query('halaman') halaman?: string,
    @Query('ukuranHalaman') ukuranHalaman?: string,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('cari') cari?: string,
  ) {
    return this.service.daftar(
      request.user,
      status,
      halaman,
      ukuranHalaman,
      bulan ? Number(bulan) : undefined,
      tahun ? Number(tahun) : undefined,
      cari?.trim() || undefined,
    );
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.service.detail(id, request.user);
  }

  @Post()
  buat(@Body() dto: BuatSuratTugasDinasDto, @Req() request: AuthRequest) {
    return this.service.buat(dto, request.user);
  }

  @Patch(':id/cetak-ulang')
  cetakUlang(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.service.cetakUlangManual(id, request.user);
  }

  @Patch(':id/setujui')
  setujui(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.service.setujui(id, request.user);
  }

  @Patch(':id/tolak')
  tolak(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TolakSuratTugasDinasDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.tolak(id, dto, request.user);
  }
}