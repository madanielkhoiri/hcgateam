// ==================================================
// FILE: backend/src/eprom/kontrak/eprom-kontrak.controller.ts
// FUNGSI: Endpoint Kontrak & Buka Project (Owner only)
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { EpromAksesService } from '../common/eprom-akses.service';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import {
  BukaProjectDto,
  BuatKontrakDto,
  EpromKontrakService,
  UbahKontrakDto,
} from './eprom-kontrak.service';

@Controller('eprom/kontrak')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_PROJECT')
export class EpromKontrakController {
  constructor(
    private readonly service: EpromKontrakService,
    private readonly akses: EpromAksesService,
  ) {}

  @Get()
  daftar(@Aktor() aktor: AktorEprom) {
    this.akses.wajibOwner(aktor);
    return this.service.daftar();
  }

  @Get(':id')
  detail(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibOwner(aktor);
    return this.service.detail(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('file', 50, { storage: memoryStorage() }))
  buat(
    @Aktor() aktor: AktorEprom,
    @Body() dto: BuatKontrakDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.buat(dto, files ?? []);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('file', 50, { storage: memoryStorage() }))
  ubah(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahKontrakDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.ubah(id, dto, files ?? []);
  }

  @Delete(':id')
  hapus(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibOwner(aktor);
    return this.service.hapus(id);
  }

  @Post(':id/buka-project')
  bukaProject(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BukaProjectDto,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.bukaProject(id, dto);
  }
}
