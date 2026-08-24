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
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TiketService } from './tiket.service';
import { BuatTiketDto, TautkanNikDto } from './dto/tiket.dto';

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
