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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatOpnameDto, EpromFinancialService, ReviewOpnameDto, UbahOpnameDto } from './eprom-financial.service';
import { ApproveEngineerDto } from '../engineer/eprom-engineer.service';

@Controller('eprom/financial')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_PROJECT')
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

  @Get('signatures/available')
  tandaTangan(@Aktor() aktor: AktorEprom) {
    return this.service.daftarTandaTangan(aktor);
  }

  @Get('opname/:id/approval')
  detailApproval(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.detailApproval(aktor, id);
  }

  @Post('opname/:id/approve')
  approve(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number, @Body() dto: ApproveEngineerDto) {
    return this.service.approveDenganTandaTangan(aktor, id, dto);
  }

  @Post('opname/:id/approve-tanpa-ttd')
  approveTanpaTandaTangan(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.approveTanpaTandaTangan(aktor, id);
  }

  @Post('opname')
  @UseInterceptors(FilesInterceptor('file', 50, { storage: memoryStorage() }))
  buat(
    @Aktor() aktor: AktorEprom,
    @Body() dto: BuatOpnameDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.service.buat(aktor, dto, files);
  }

  @Patch('opname/:id/review')
  review(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewOpnameDto,
  ) {
    return this.service.review(aktor, id, dto);
  }

  @Patch('opname/:id')
  ubah(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahOpnameDto,
  ) {
    return this.service.ubah(aktor, id, dto);
  }

  @Delete('opname/:id')
  hapus(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(aktor, id);
  }
}
