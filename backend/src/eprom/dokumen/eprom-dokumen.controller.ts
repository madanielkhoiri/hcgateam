// ==================================================
// FILE: backend/src/eprom/dokumen/eprom-dokumen.controller.ts
// FUNGSI: Endpoint Surat Teguran, Surat Peringatan, Coaching & Counseling, Memo
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatDokumenSuratDto, EpromDokumenService } from './eprom-dokumen.service';

@Controller('eprom/dokumen')
@UseGuards(JwtAuthGuard)
export class EpromDokumenController {
  constructor(private readonly service: EpromDokumenService) {}

  @Get(':tipe')
  daftar(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.service.daftar(aktor, projectId, this.service.validasiTipe(tipeRaw));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  buat(
    @Aktor() aktor: AktorEprom,
    @Body() dto: BuatDokumenSuratDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.buat(aktor, dto, file);
  }

  @Delete(':id')
  hapus(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(aktor, id);
  }
}
