// ==================================================
// FILE: backend/src/drive/drive.controller.ts
// FUNGSI: Endpoint Drive Administrasi (CSR, Form Download)
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Aktor } from '../postingan/postingan-aktor';
import type { AktorPostingan } from '../postingan/postingan-aktor';
import { DriveService } from './drive.service';

@Controller('drive')
@UseGuards(JwtAuthGuard)
export class DriveController {
  constructor(private readonly service: DriveService) {}

  @Get()
  isiFolder(
    @Aktor() aktor: AktorPostingan,
    @Query('scope') scope: string,
    @Query('parentFolderId') parentFolderId?: string,
  ) {
    return this.service.isiFolder(
      aktor,
      scope,
      parentFolderId ? Number(parentFolderId) : undefined,
    );
  }

  @Get('dashboard/ringkasan')
  ringkasan(@Aktor() aktor: AktorPostingan, @Query('scope') scope: string) {
    return this.service.ringkasan(aktor, scope);
  }

  @Get('dashboard/tren')
  trenDanJenis(@Aktor() aktor: AktorPostingan, @Query('scope') scope: string) {
    return this.service.trenDanJenis(aktor, scope);
  }

  @Post('folder')
  buatFolder(
    @Aktor() aktor: AktorPostingan,
    @Body('scope') scope: string,
    @Body('namaFolder') namaFolder: string,
    @Body('parentFolderId') parentFolderId?: number,
  ) {
    return this.service.buatFolder(aktor, scope, namaFolder, parentFolderId);
  }

  @Patch('folder/:id')
  ubahFolder(
    @Aktor() aktor: AktorPostingan,
    @Param('id', ParseIntPipe) id: number,
    @Body('namaFolder') namaFolder: string,
  ) {
    return this.service.ubahFolder(aktor, id, namaFolder);
  }

  @Delete('folder/:id')
  hapusFolder(@Aktor() aktor: AktorPostingan, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusFolder(aktor, id);
  }

  @Post('folder/:id/file')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggahFile(
    @Aktor() aktor: AktorPostingan,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.unggahFile(aktor, id, file);
  }

  @Patch('file/:id')
  ubahFile(
    @Aktor() aktor: AktorPostingan,
    @Param('id', ParseIntPipe) id: number,
    @Body('namaFile') namaFile: string,
  ) {
    return this.service.ubahFile(aktor, id, namaFile);
  }

  @Delete('file/:id')
  hapusFile(@Aktor() aktor: AktorPostingan, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusFile(aktor, id);
  }
}
