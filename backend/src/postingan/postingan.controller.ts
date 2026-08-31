// ==================================================
// FILE: backend/src/postingan/postingan.controller.ts
// FUNGSI: Endpoint Postingan (poster/video carousel beranda)
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor } from './postingan-aktor';
import type { AktorPostingan } from './postingan-aktor';
import { PostinganService } from './postingan.service';

@Controller('postingan')
@UseGuards(JwtAuthGuard)
export class PostinganController {
  constructor(private readonly service: PostinganService) {}

  @Get()
  daftar() {
    return this.service.daftar();
  }

  @Get('beranda')
  untukBeranda() {
    return this.service.untukBeranda();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // Endpoint ini menerima poster (gambar, sudah dikompres di frontend)
      // ATAU video (tidak dikompres) — batas ukuran wajib ada supaya upload
      // video tidak bisa jadi vektor DoS (memoryStorage taruh file di RAM).
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  unggah(
    @Aktor() aktor: AktorPostingan,
    @UploadedFile() file: Express.Multer.File,
    @Body('judul') judul: string,
    @Body('tipe') tipe: string,
    @Body('deskripsi') deskripsi?: string,
    @Body('tampilBeranda') tampilBeranda?: string,
    @Body('urutan') urutan?: string,
  ) {
    return this.service.unggah(
      aktor,
      judul,
      deskripsi,
      tipe,
      tampilBeranda,
      urutan,
      file,
    );
  }

  @Patch(':id')
  ubah(
    @Aktor() aktor: AktorPostingan,
    @Param('id', ParseIntPipe) id: number,
    @Body('judul') judul?: string,
    @Body('deskripsi') deskripsi?: string,
    @Body('tampilBeranda') tampilBeranda?: boolean,
    @Body('urutan') urutan?: number,
  ) {
    return this.service.ubah(aktor, id, { judul, deskripsi, tampilBeranda, urutan });
  }

  @Delete(':id')
  hapus(@Aktor() aktor: AktorPostingan, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(aktor, id);
  }
}
