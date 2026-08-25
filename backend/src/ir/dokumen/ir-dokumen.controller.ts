// ==================================================
// FILE: backend/src/ir/dokumen/ir-dokumen.controller.ts
// FUNGSI: Endpoint dokumen IR (SK/IM/FORM)
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
import { IrAksesService } from '../common/ir-akses.service';
import { Aktor } from '../common/ir-aktor';
import type { AktorIr } from '../common/ir-aktor';
import { IrDokumenService } from './ir-dokumen.service';

@Controller('ir/dokumen')
@UseGuards(JwtAuthGuard)
export class IrDokumenController {
  constructor(
    private readonly service: IrDokumenService,
    private readonly akses: IrAksesService,
  ) {}

  @Get()
  daftar(@Query('kategori') kategori?: string) {
    return this.service.daftar(kategori);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggah(
    @Aktor() aktor: AktorIr,
    @UploadedFile() file: Express.Multer.File,
    @Body('kategori') kategori: string,
    @Body('judul') judul: string,
  ) {
    this.akses.wajibKelola(aktor);
    return this.service.unggah(kategori, judul, file, aktor);
  }

  @Delete(':id')
  hapus(@Aktor() aktor: AktorIr, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibKelola(aktor);
    return this.service.hapus(id);
  }
}
