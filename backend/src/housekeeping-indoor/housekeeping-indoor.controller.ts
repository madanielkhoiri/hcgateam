// ==================================================
// FILE: backend/src/housekeeping-indoor/housekeeping-indoor.controller.ts
// FUNGSI: Endpoint modul Housekeeping Indoor
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
import { LokasiHousekeepingIndoor } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { HousekeepingIndoorService } from './housekeeping-indoor.service';
import { BuatHousekeepingIndoorDto, LOKASI_HOUSEKEEPING_INDOOR } from './dto/housekeeping-indoor.dto';

@Controller('housekeeping-indoor')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_GS_HOUSEKEEPING_INDOOR')
export class HousekeepingIndoorController {
  constructor(private readonly service: HousekeepingIndoorService) {}

  @Get()
  daftar(
    @Query('lokasi') lokasi?: string,
    @Query('bulan') bulan?: string,
    @Query('tahun') tahun?: string,
    @Query('halaman') halaman?: string,
    @Query('ukuranHalaman') ukuranHalaman?: string,
  ) {
    const valid = lokasi && LOKASI_HOUSEKEEPING_INDOOR.includes(lokasi as LokasiHousekeepingIndoor);
    return this.service.daftar({
      lokasi: valid ? (lokasi as LokasiHousekeepingIndoor) : undefined,
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
      halaman,
      ukuranHalaman,
    });
  }

  @Post()
  @UseInterceptors(FilesInterceptor('file', 150, { storage: memoryStorage() }))
  buat(
    @Body() dto: BuatHousekeepingIndoorDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.buat(dto, files ?? [], req.user.id);
  }

  @Delete(':id')
  hapus(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(id);
  }
}
