// ==================================================
// FILE: backend/src/mcu/hasil/mcu-hasil.controller.ts
// FUNGSI: Endpoint upload & akses hasil MCU
// ==================================================

import {
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
import { StatusReview } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import { McuHasilService } from './mcu-hasil.service';

@Controller('mcu/hasil')
@UseGuards(JwtAuthGuard)
export class McuHasilController {
  constructor(private readonly service: McuHasilService) {}

  @Get()
  daftar(
    @Query('statusReview') statusReview?: StatusReview,
    @Query('karyawanId') karyawanId?: string,
  ) {
    return this.service.daftar({
      statusReview,
      karyawanId: karyawanId ? Number(karyawanId) : undefined,
    });
  }

  @Get('menunggu-upload')
  jadwalMenungguHasil() {
    return this.service.jadwalMenungguHasil();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post('jadwal/:jadwalId/unggah')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggah(
    @Aktor() aktor: AktorMcu,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.unggah(jadwalId, file, aktor);
  }

  /** Unduh file mentah - hanya HC & Dokter. */
  @Get(':id/file')
  async file(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const path = await this.service.pathFile(id, aktor);
    return response.sendFile(path);
  }

  @Post(':id/tandai-direview')
  tandaiDireview(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.tandaiDireview(id, aktor);
  }
}
