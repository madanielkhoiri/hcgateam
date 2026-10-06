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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { Aktor, type AktorPostingan } from '../postingan/postingan-aktor';
import { CivilTps3rService } from './civil-tps3r.service';
import { BuatLaporanTps3rDto, BuatSampahTerkelolaTps3rDto, UbahLaporanTps3rDto, UbahSampahTerkelolaTps3rDto } from './dto/tps3r.dto';
import { CivilTps3rFileService } from './civil-tps3r-file.service';

@Controller('civil-tps3r')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_TPS3R')
export class CivilTps3rController {
  constructor(private readonly service: CivilTps3rService, private readonly files: CivilTps3rFileService) {}

  @Get('terkelola')
  daftarTerkelola() { return this.service.daftarTerkelola(); }

  @Post('terkelola')
  buatTerkelola(@Aktor() aktor: AktorPostingan, @Body() dto: BuatSampahTerkelolaTps3rDto) { return this.service.buatTerkelola(aktor, dto); }

  @Patch('terkelola/:id')
  ubahTerkelola(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahSampahTerkelolaTps3rDto) { return this.service.ubahTerkelola(id, dto); }

  @Delete('terkelola/:id')
  hapusTerkelola(@Param('id', ParseIntPipe) id: number) { return this.service.hapusTerkelola(id); }

  @Get('foto-penyerahan')
  fotoPenyerahan() { return this.service.daftarFoto(); }

  @Post('foto-penyerahan')
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  tambahFoto(@Aktor() aktor: AktorPostingan, @Body('tanggal') tanggal: string, @UploadedFile() foto?: Express.Multer.File) {
    const url = this.files.simpan(foto);
    return this.service.tambahFoto(aktor, tanggal, url).catch((error) => { this.files.hapus(url); throw error; });
  }

  @Delete('foto-penyerahan/:id')
  async hapusFoto(@Param('id', ParseIntPipe) id: number) {
    const foto = await this.service.hapusFoto(id);
    this.files.hapus(foto.urlFoto);
    return { message: 'Foto berhasil dihapus' };
  }

  @Get()
  daftar(
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('halaman') halaman?: string,
    @Query('ukuranHalaman') ukuranHalaman?: string,
  ) {
    return this.service.daftar(
      bulan ? Number(bulan) : undefined,
      tahun ? Number(tahun) : undefined,
      halaman,
      ukuranHalaman,
    );
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
