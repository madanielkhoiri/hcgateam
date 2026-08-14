// ==================================================
// FILE: backend/src/mcu/follow-up/mcu-follow-up.controller.ts
// FUNGSI: Endpoint siklus Follow Up
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { StatusFollowUp } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import {
  McuFollowUpService,
  PilihTanggalFuDto,
  ReminderFuDto,
  TetapkanBatasFuDto,
} from './mcu-follow-up.service';

@Controller('mcu/follow-up')
@UseGuards(JwtAuthGuard)
export class McuFollowUpController {
  constructor(private readonly service: McuFollowUpService) {}

  @Get()
  daftar(
    @Query('status') status?: StatusFollowUp,
    @Query('karyawanId') karyawanId?: string,
    @Query('terlambat') terlambat?: string,
  ) {
    return this.service.daftar({
      status,
      karyawanId: karyawanId ? Number(karyawanId) : undefined,
      terlambat: terlambat === 'true',
    });
  }

  @Get('saya')
  followUpSaya(@Aktor() aktor: AktorMcu) {
    return this.service.followUpSaya(aktor);
  }

  @Get('antrean-review-ulang')
  antreanReviewUlang() {
    return this.service.antreanReviewUlang();
  }

  @Post('tandai-terlambat')
  tandaiSeluruhTerlambat(@Aktor() aktor: AktorMcu) {
    return this.service.tandaiSeluruhFuTerlambat(aktor);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post(':id/batas-waktu')
  tetapkanBatas(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TetapkanBatasFuDto,
  ) {
    return this.service.tetapkanBatas(id, dto, aktor);
  }

  @Post(':id/pilih-tanggal')
  pilihTanggal(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PilihTanggalFuDto,
  ) {
    return this.service.pilihTanggal(id, dto, aktor);
  }

  @Post(':id/unggah-hasil')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggahHasil(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.unggahHasil(id, file, aktor);
  }

  @Post(':id/reminder')
  reminder(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReminderFuDto,
  ) {
    return this.service.reminderFuTerlambat(id, dto, aktor);
  }

  /** File hasil FU mentah - hanya HC & Dokter. */
  @Get('hasil/:hasilId/file')
  async fileHasil(
    @Aktor() aktor: AktorMcu,
    @Param('hasilId', ParseIntPipe) hasilId: number,
    @Res() response: Response,
  ) {
    const path = await this.service.pathFileHasil(hasilId, aktor);
    return response.sendFile(path);
  }
}
