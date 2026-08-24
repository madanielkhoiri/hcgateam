// ==================================================
// FILE: backend/src/eprom/progress/eprom-progress.controller.ts
// FUNGSI: Endpoint Inspeksi Area/Peralatan, Progress Harian/Mingguan/Bulanan, TTA, KTA
// ==================================================

import {
  BadRequestException,
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
import { BuatProgressDto, EpromProgressService } from './eprom-progress.service';

@Controller('eprom/progress')
@UseGuards(JwtAuthGuard)
export class EpromProgressController {
  constructor(private readonly service: EpromProgressService) {}

  @Get('mingguan/terbaru/:projectId')
  mingguanTerbaru(@Aktor() aktor: AktorEprom, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.service.progresMingguanTerbaru(aktor, projectId);
  }

  @Get(':tipe/jam')
  jamUpload(@Aktor() aktor: AktorEprom, @Param('tipe') tipeRaw: string) {
    return this.service.jamUpload(aktor, this.service.validasiTipe(tipeRaw));
  }

  @Get(':tipe/performa/:projectId')
  performa(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    const tipe = this.service.validasiTipe(tipeRaw);
    if (tipe !== 'tta' && tipe !== 'kta') {
      throw new BadRequestException('Persen performa hanya tersedia untuk TTA/KTA');
    }

    return this.service.performaBulanIni(aktor, tipe, projectId);
  }

  @Get(':tipe')
  daftar(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.service.daftar(aktor, this.service.validasiTipe(tipeRaw), projectId);
  }

  @Post(':tipe')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  buat(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Query('projectId', ParseIntPipe) projectId: number,
    @Body() dto: BuatProgressDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.buat(aktor, this.service.validasiTipe(tipeRaw), projectId, dto, file);
  }

  @Delete(':tipe/:id')
  hapus(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.hapus(aktor, this.service.validasiTipe(tipeRaw), id);
  }
}
