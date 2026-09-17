// ==================================================
// FILE: backend/src/tiket/tiket.controller.ts
// FUNGSI: Endpoint modul Tiket (admin GA + self-service karyawan)
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
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { TiketService } from './tiket.service';
import { BuatTiketDto, RescheduleTiketDto, TautkanNikDto } from './dto/tiket.dto';

@Controller('tiket')
@UseGuards(JwtAuthGuard)
export class TiketController {
  constructor(private readonly service: TiketService) {}

  // ---------- Admin (digerbang accessKey GA_TRANSPORT_TIKET) ----------

  @Get('admin/dashboard')
  @RequireAccessKey('GA_TRANSPORT_TIKET')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('admin')
  @RequireAccessKey('GA_TRANSPORT_TIKET')
  daftarAdmin(
    @Query('cari') cari?: string,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('halaman') halaman?: string,
    @Query('ukuranHalaman') ukuranHalaman?: string,
  ) {
    return this.service.daftarAdmin({
      cari,
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
      halaman,
      ukuranHalaman,
    });
  }

  @Get('admin/karyawan')
  @RequireAccessKey('GA_TRANSPORT_TIKET')
  karyawanRingkas(@Query('search') search?: string) {
    return this.service.karyawanRingkas(search);
  }

  @Post('admin')
  @RequireAccessKey('GA_TRANSPORT_TIKET')
  @UseInterceptors(FilesInterceptor('file', 5, { storage: memoryStorage() }))
  kirim(
    @Body() dto: BuatTiketDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.kirim(dto, files ?? [], req.user.id);
  }

  @Delete('admin/:id')
  @RequireAccessKey('GA_TRANSPORT_TIKET')
  hapus(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(id);
  }

  /** Perubahan jadwal dadakan dari penerbangan (delay/cuaca buruk/dsb) — kirim notifikasi WA khusus, bukan hapus-buat-ulang. */
  @Patch('admin/:id/reschedule')
  @RequireAccessKey('GA_TRANSPORT_TIKET')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleTiketDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.reschedule(id, dto, file);
  }

  // ---------- Self-service karyawan (tanpa accessKey, cukup login) ----------

  @Get('saya')
  daftarSaya(@Req() req: any) {
    return this.service.daftarSaya(req.user.id);
  }

  @Get('saya/profil')
  profilSaya(@Req() req: any) {
    return this.service.profilSaya(req.user.id);
  }

  @Post('saya/tautkan-nik')
  tautkanNik(@Body() dto: TautkanNikDto, @Req() req: any) {
    return this.service.tautkanNik(req.user.id, dto.nik);
  }
}
