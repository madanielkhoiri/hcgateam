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
import { HousekeepingIndoorService } from './housekeeping-indoor.service';
import { BuatHousekeepingIndoorDto, LOKASI_HOUSEKEEPING_INDOOR } from './dto/housekeeping-indoor.dto';

@Controller('housekeeping-indoor')
@UseGuards(JwtAuthGuard)
export class HousekeepingIndoorController {
  constructor(private readonly service: HousekeepingIndoorService) {}

  @Get()
  daftar(@Query('lokasi') lokasi?: string) {
    const valid = lokasi && LOKASI_HOUSEKEEPING_INDOOR.includes(lokasi as LokasiHousekeepingIndoor);
    return this.service.daftar(valid ? (lokasi as LokasiHousekeepingIndoor) : undefined);
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
