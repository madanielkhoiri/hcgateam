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
import { TiketService } from './tiket.service';
import { BuatTiketDto, RescheduleTiketDto, TautkanNikDto } from './dto/tiket.dto';

@Controller('tiket')
@UseGuards(JwtAuthGuard)
export class TiketController {
  constructor(private readonly service: TiketService) {}

  // ---------- Admin (digerbang accessKey GA_TRANSPORT_TIKET) ----------

  @Get('admin')
  daftarAdmin() {
    return this.service.daftarAdmin();
  }

  @Get('admin/karyawan')
  karyawanRingkas(@Query('search') search?: string) {
    return this.service.karyawanRingkas(search);
  }

  @Post('admin')
  @UseInterceptors(FilesInterceptor('file', 5, { storage: memoryStorage() }))
  kirim(
    @Body() dto: BuatTiketDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.kirim(dto, files ?? [], req.user.id);
  }

  @Delete('admin/:id')
  hapus(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(id);
  }

  /** Perubahan jadwal dadakan dari penerbangan (delay/cuaca buruk/dsb) — kirim notifikasi WA khusus, bukan hapus-buat-ulang. */
  @Patch('admin/:id/reschedule')
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
