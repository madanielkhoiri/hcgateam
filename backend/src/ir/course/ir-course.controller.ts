// ==================================================
// FILE: backend/src/ir/course/ir-course.controller.ts
// FUNGSI: Endpoint IR Course (video pelatihan)
// ==================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { IrCourseService } from './ir-course.service';

@Controller('ir/course')
@UseGuards(JwtAuthGuard)
export class IrCourseController {
  constructor(
    private readonly service: IrCourseService,
    private readonly akses: IrAksesService,
  ) {}

  @Get('video')
  daftar(@Aktor() aktor: AktorIr) {
    return this.service.daftar(aktor);
  }

  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // Video tidak dikompres di frontend (beda dari foto) — batas ukuran
      // wajib di sini supaya upload video tidak bisa jadi vektor DoS
      // (memoryStorage menyimpan seluruh file di RAM server).
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  unggah(
    @Aktor() aktor: AktorIr,
    @UploadedFile() file: Express.Multer.File,
    @Body('judul') judul: string,
    @Body('deskripsi') deskripsi?: string,
  ) {
    this.akses.wajibKelola(aktor);
    return this.service.unggah(judul, deskripsi, file, aktor);
  }

  @Delete('video/:id')
  hapus(@Aktor() aktor: AktorIr, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibKelola(aktor);
    return this.service.hapus(id);
  }

  @Post('video/:id/tonton')
  tandaiDitonton(
    @Aktor() aktor: AktorIr,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.tandaiDitonton(id, aktor);
  }

  @Get('video/:id/penonton')
  penonton(@Aktor() aktor: AktorIr, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibKelola(aktor);
    return this.service.daftarPenonton(id);
  }
}
