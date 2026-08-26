// ==================================================
// FILE: backend/src/album/album.controller.ts
// FUNGSI: Endpoint Album Dokumentasi
// ==================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor } from '../postingan/postingan-aktor';
import type { AktorPostingan } from '../postingan/postingan-aktor';
import { AlbumService } from './album.service';

@Controller('album')
@UseGuards(JwtAuthGuard)
export class AlbumController {
  constructor(private readonly service: AlbumService) {}

  @Get()
  daftar() {
    return this.service.daftar();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  buat(
    @Aktor() aktor: AktorPostingan,
    @Body('judul') judul: string,
    @Body('deskripsi') deskripsi?: string,
  ) {
    return this.service.buat(aktor, judul, deskripsi);
  }

  @Post(':id/foto')
  @UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage() }))
  tambahFoto(
    @Aktor() aktor: AktorPostingan,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.tambahFoto(aktor, id, files);
  }

  @Delete(':id')
  hapusAlbum(@Aktor() aktor: AktorPostingan, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusAlbum(aktor, id);
  }

  @Delete('foto/:id')
  hapusFoto(@Aktor() aktor: AktorPostingan, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusFoto(aktor, id);
  }
}
