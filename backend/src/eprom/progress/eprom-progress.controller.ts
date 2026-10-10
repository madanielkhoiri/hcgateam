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
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatProgressDto, EpromProgressService } from './eprom-progress.service';

@Controller('eprom/progress')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_PROJECT')
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

  @Post(':tipe/form')
  @UseInterceptors(FilesInterceptor('file', 100, { storage: memoryStorage() }))
  buatForm(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Query('projectId', ParseIntPipe) projectId: number,
    @Body('formData') formData: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.buatForm(
      aktor,
      this.service.validasiTipe(tipeRaw),
      projectId,
      formData,
      files,
    );
  }

  @Delete(':tipe/:id')
  hapus(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.hapus(aktor, this.service.validasiTipe(tipeRaw), id);
  }

  @Patch(':tipe/:id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  ubah(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BuatProgressDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.ubah(aktor, this.service.validasiTipe(tipeRaw), id, dto, file);
  }
}
