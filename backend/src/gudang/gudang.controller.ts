// ==================================================
// FILE: backend/src/gudang/gudang.controller.ts
// FUNGSI: Endpoint alur self-order "Ambil Barang" — sengaja TIDAK lewat
// prefix /inventory-area (yang di-gate accessKey GA_INVENTORY di
// routeAccessMap) supaya akun role GUDANG yang tidak punya accessKey
// admin tetap bisa pakai. Cukup butuh JWT valid; pembatasan peran
// sungguhan terjadi di GudangAksesService.wajibGudang().
// ==================================================

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GudangService } from './gudang.service';

const gudangPhotoDirectory = join(process.cwd(), 'uploads', 'gudang-checkout');

if (!existsSync(gudangPhotoDirectory)) {
  mkdirSync(gudangPhotoDirectory, { recursive: true });
}

const gudangPhotoUpload = FileInterceptor('photo', {
  storage: diskStorage({
    destination: gudangPhotoDirectory,
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();

      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (_request, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Foto hanya boleh JPG, PNG, atau WEBP'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

@Controller('gudang')
export class GudangController {
  constructor(private readonly service: GudangService) {}

  @Get('barang')
  @UseGuards(JwtAuthGuard)
  daftarBarang(@Query('scope') scope: string, @Req() req: any) {
    return this.service.daftarBarang(req.user, scope);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(gudangPhotoUpload)
  checkout(
    @Body()
    body: {
      scope?: string;
      taker?: string;
      department?: string;
      note?: string;
      items?: string;
    },
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!body.scope) {
      throw new BadRequestException('Lingkup gudang wajib dipilih');
    }

    let items: { itemId: number; quantity: number }[];

    try {
      items = JSON.parse(body.items ?? '[]');
    } catch {
      throw new BadRequestException('Format daftar barang tidak valid');
    }

    return this.service.checkout(
      req.user,
      body.scope,
      {
        taker: body.taker ?? '',
        department: body.department ?? '',
        note: body.note,
        items,
      },
      file?.filename,
    );
  }
}
