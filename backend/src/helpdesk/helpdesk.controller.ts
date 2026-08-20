// ==================================================
// FILE: backend/src/helpdesk/helpdesk.controller.ts
// FUNGSI: Endpoint Helpdesk Center
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SelesaikanTiketDto } from './dto/selesaikan-tiket.dto';
import { HelpdeskService } from './helpdesk.service';

type AuthRequest = {
  user: {
    id: number;
    role: UserRole;
  };
};

function pastikanFolderHelpdeskAda() {
  const folder = './uploads/helpdesk';

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return folder;
}

@Controller('helpdesk')
@UseGuards(JwtAuthGuard)
export class HelpdeskController {
  constructor(private readonly service: HelpdeskService) {}

  @Get('kategori')
  kategori() {
    return this.service.kategoriTersedia();
  }

  @Get('ringkasan')
  ringkasan(@Req() request: AuthRequest) {
    return this.service.ringkasan(request.user);
  }

  @Get()
  daftar(@Req() request: AuthRequest, @Query('status') status?: string) {
    return this.service.daftar(request.user, status);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.service.detail(id, request.user);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('lampiran', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, pastikanFolderHelpdeskAda());
        },
        filename: (req, file, callback) => {
          const ekstensiAsli = extname(file.originalname).toLowerCase();
          const namaUnik = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}${ekstensiAsli || '.bin'}`;
          callback(null, namaUnik);
        },
      }),
      fileFilter: (req, file, callback) => {
        const tipeDiizinkan = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];

        if (!tipeDiizinkan.includes(file.mimetype)) {
          return callback(
            new Error('Lampiran harus berupa JPG, PNG, WEBP, atau PDF.'),
            false,
          );
        }

        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  buat(
    @Req() request: AuthRequest,
    @Body('kategori') kategori: string,
    @Body('subKategori') subKategori: string,
    @Body('masalah') masalah: string,
    @Body('deskripsi') deskripsi: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.buat(
      request.user,
      { kategori, subKategori, masalah, deskripsi },
      file,
    );
  }

  @Patch(':id/proses')
  proses(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    return this.service.proses(id, request.user);
  }

  @Patch(':id/selesaikan')
  selesaikan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SelesaikanTiketDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.selesaikan(id, request.user, dto);
  }
}
