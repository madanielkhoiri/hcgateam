// ==================================================
// FILE: backend/src/civil-tps3r/civil-tps3r.controller.ts
// FUNGSI: Endpoint Laporan Timbangan Sampah TPS 3R (Civil Infras)
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor, type AktorPostingan } from '../postingan/postingan-aktor';
import { CivilTps3rService } from './civil-tps3r.service';
import { BuatLaporanTps3rDto, UbahLaporanTps3rDto } from './dto/tps3r.dto';

@Controller('civil-tps3r')
@UseGuards(JwtAuthGuard)
export class CivilTps3rController {
  constructor(private readonly service: CivilTps3rService) {}

  @Get()
  daftar(@Query('bulan') bulan?: string, @Query('tahun') tahun?: string) {
    return this.service.daftar(bulan ? Number(bulan) : undefined, tahun ? Number(tahun) : undefined);
  }

  @Get('ringkasan')
  ringkasan(@Query('bulan') bulan?: string, @Query('tahun') tahun?: string) {
    return this.service.ringkasan(bulan ? Number(bulan) : undefined, tahun ? Number(tahun) : undefined);
  }

  @Get('tren')
  tren(@Query('tahun') tahun?: string) {
    return this.service.trenBulanan(tahun ? Number(tahun) : new Date().getFullYear());
  }

  @Post()
  buat(@Aktor() aktor: AktorPostingan, @Body() dto: BuatLaporanTps3rDto) {
    return this.service.buat(aktor, dto);
  }

  @Patch(':id')
  ubah(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahLaporanTps3rDto) {
    return this.service.ubah(id, dto);
  }

  @Delete(':id')
  hapus(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(id);
  }
}
