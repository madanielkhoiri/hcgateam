// ==================================================
// FILE: backend/src/eprom/financial/eprom-financial.controller.ts
// FUNGSI: Endpoint Opname Pekerjaan
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
import { BuatOpnameDto, EpromFinancialService, ReviewOpnameDto } from './eprom-financial.service';

@Controller('eprom/financial')
@UseGuards(JwtAuthGuard)
export class EpromFinancialController {
  constructor(private readonly service: EpromFinancialService) {}

  @Get('ringkasan/:projectId')
  ringkasan(@Aktor() aktor: AktorEprom, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.service.ringkasanPending(aktor, projectId);
  }

  @Get('opname')
  daftar(@Aktor() aktor: AktorEprom, @Query('projectId', ParseIntPipe) projectId: number) {
    return this.service.daftar(aktor, projectId);
  }

  @Post('opname')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  buat(
    @Aktor() aktor: AktorEprom,
    @Body() dto: BuatOpnameDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.buat(aktor, dto, file);
  }

  @Patch('opname/:id/review')
  review(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewOpnameDto,
  ) {
    return this.service.review(aktor, id, dto);
  }

  @Delete('opname/:id')
  hapus(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(aktor, id);
  }
}
