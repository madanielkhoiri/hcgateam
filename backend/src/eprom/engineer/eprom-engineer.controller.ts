// ==================================================
// FILE: backend/src/eprom/engineer/eprom-engineer.controller.ts
// FUNGSI: Endpoint Shop Drawing, Material Approval, Metode Pekerjaan,
// Sertifikasi Pekerjaan, dan Daftar Peralatan
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
import { BuatEngineerDto, EpromEngineerService, ReviewEngineerDto } from './eprom-engineer.service';

@Controller('eprom/engineer')
@UseGuards(JwtAuthGuard)
export class EpromEngineerController {
  constructor(private readonly service: EpromEngineerService) {}

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
    @Body() dto: BuatEngineerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.buat(aktor, this.service.validasiTipe(tipeRaw), dto.projectId, dto, file);
  }

  @Patch(':tipe/:id/review')
  review(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewEngineerDto,
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
