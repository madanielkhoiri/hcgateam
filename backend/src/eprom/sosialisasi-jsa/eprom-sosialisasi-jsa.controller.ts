// ==================================================
// FILE: backend/src/eprom/sosialisasi-jsa/eprom-sosialisasi-jsa.controller.ts
// FUNGSI: Endpoint Sosialisasi JSA
// ==================================================

import {
  Controller,
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
import { EpromSosialisasiJsaService } from './eprom-sosialisasi-jsa.service';

@Controller('eprom/sosialisasi-jsa')
@UseGuards(JwtAuthGuard)
export class EpromSosialisasiJsaController {
  constructor(private readonly service: EpromSosialisasiJsaService) {}

  @Get()
  daftar(@Aktor() aktor: AktorEprom, @Query('projectId', ParseIntPipe) projectId: number) {
    return this.service.daftar(aktor, projectId);
  }

  @Post(':jsaId')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggah(
    @Aktor() aktor: AktorEprom,
    @Param('jsaId', ParseIntPipe) jsaId: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.unggah(aktor, jsaId, file);
  }
}
