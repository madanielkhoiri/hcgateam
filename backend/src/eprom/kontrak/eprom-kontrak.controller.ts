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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
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
export class EpromKontrakController {
  constructor(
    private readonly service: EpromKontrakService,
    private readonly akses: EpromAksesService,
  ) {}

  @Get()
  daftar() {
    return this.service.daftar();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  buat(
    @Aktor() aktor: AktorEprom,
    @Body() dto: BuatKontrakDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.buat(dto, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  ubah(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahKontrakDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.ubah(id, dto, file);
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
