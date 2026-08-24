// ==================================================
// FILE: backend/src/eprom/konstruksi/eprom-konstruksi.controller.ts
// FUNGSI: Endpoint Checklist Tahapan Pekerjaan, IBPR, JSA
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatKonstruksiDto, EpromKonstruksiService, ReviewKonstruksiDto } from './eprom-konstruksi.service';

@Controller('eprom/konstruksi')
@UseGuards(JwtAuthGuard)
export class EpromKonstruksiController {
  constructor(private readonly service: EpromKonstruksiService) {}

  @Get('ringkasan/:projectId')
  ringkasan(@Aktor() aktor: AktorEprom, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.service.ringkasanPending(aktor, projectId);
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
    @Body() dto: BuatKonstruksiDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.buat(aktor, this.service.validasiTipe(tipeRaw), dto.projectId, dto, file);
  }

  @Patch(':tipe/:id/review')
  review(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewKonstruksiDto,
  ) {
    return this.service.review(aktor, this.service.validasiTipe(tipeRaw), id, dto);
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
