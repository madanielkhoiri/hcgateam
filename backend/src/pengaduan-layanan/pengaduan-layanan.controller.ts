// ==================================================
// FILE: backend/src/pengaduan-layanan/pengaduan-layanan.controller.ts
// FUNGSI: Endpoint Pengaduan Layanan (rating bintang + komentar) untuk
// HC/GA/CIVIL. Submit terbuka untuk semua akun login; rekap performa
// bulanan dibatasi Admin/Super Admin/Section Head lewat akses service.
// ==================================================

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DivisiPengaduan, LokasiPengaduan, UserRole } from '@prisma/client';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePengaduanLayananDto } from './dto/create-pengaduan-layanan.dto';
import { UbahStatusPengaduanLayananDto } from './dto/ubah-status-pengaduan-layanan.dto';
import { PengaduanLayananAksesService } from './pengaduan-layanan-akses.service';
import { PengaduanLayananService } from './pengaduan-layanan.service';

type AuthRequest = {
  user: {
    id: number;
    role: UserRole;
  };
};

function validasiDivisi(raw: string | undefined): DivisiPengaduan {
  if (raw && Object.values(DivisiPengaduan).includes(raw as DivisiPengaduan)) {
    return raw as DivisiPengaduan;
  }

  throw new BadRequestException('Divisi wajib salah satu dari HC, GA, CIVIL');
}

function validasiRating(raw: string | undefined): number {
  const rating = Number(raw);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BadRequestException('Rating wajib angka 1-5');
  }

  return rating;
}

function validasiLokasi(raw: string | undefined): LokasiPengaduan | undefined {
  if (!raw) {
    return undefined;
  }

  if (!Object.values(LokasiPengaduan).includes(raw as LokasiPengaduan)) {
    throw new BadRequestException('Lokasi wajib salah satu dari Tambang, Mess');
  }

  return raw as LokasiPengaduan;
}

function pastikanFolderFotoPengaduanAda(): string {
  const folder = './uploads/pengaduan-layanan';

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return folder;
}

@Controller('pengaduan-layanan')
@UseGuards(JwtAuthGuard)
export class PengaduanLayananController {
  constructor(
    private readonly service: PengaduanLayananService,
    private readonly akses: PengaduanLayananAksesService,
  ) {}

  /** multipart/form-data karena wajib lampiran foto — field lain diekstrak & divalidasi manual. */
  @Post()
  @UseInterceptors(
    FilesInterceptor('foto', 10, {
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, pastikanFolderFotoPengaduanAda());
        },
        filename: (req, file, callback) => {
          const ekstensiAsli = extname(file.originalname).toLowerCase();
          const namaUnik = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}${ekstensiAsli || '.bin'}`;
          callback(null, namaUnik);
        },
      }),
      fileFilter: (req, file, callback) => {
        const tipeDiizinkan = ['image/jpeg', 'image/png', 'image/webp'];

        if (!tipeDiizinkan.includes(file.mimetype)) {
          return callback(new Error('Foto harus berupa JPG, PNG, atau WEBP.'), false);
        }

        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @Req() request: AuthRequest,
    @Body('divisi') divisiRaw: string,
    @Body('rating') ratingRaw: string,
    @Body('komentar') komentar: string | undefined,
    @Body('deskripsiAduan') deskripsiAduan: string | undefined,
    @Body('lokasi') lokasiRaw: string | undefined,
    @UploadedFiles() foto?: Express.Multer.File[],
  ) {
    const dto: CreatePengaduanLayananDto = {
      divisi: validasiDivisi(divisiRaw),
      rating: validasiRating(ratingRaw),
      komentar,
      deskripsiAduan,
      lokasi: validasiLokasi(lokasiRaw),
    };

    const fotoTersimpan = (foto ?? []).map((berkas) => ({
      urlFoto: `pengaduan-layanan/${berkas.filename}`,
      namaFile: berkas.originalname,
    }));

    return this.service.create(dto, request.user.id, fotoTersimpan);
  }

  @Get('rekap')
  rekap(
    @Req() request: AuthRequest,
    @Query('divisi') divisiRaw?: string,
    @Query('bulan') bulanRaw?: string,
    @Query('tahun') tahunRaw?: string,
  ) {
    this.akses.wajibBolehLihatRekap(request.user.role);

    const divisi = validasiDivisi(divisiRaw);

    return this.service.rekap(
      divisi,
      bulanRaw ? Number(bulanRaw) : undefined,
      tahunRaw ? Number(tahunRaw) : undefined,
    );
  }

  @Patch(':id/status')
  ubahStatus(
    @Req() request: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahStatusPengaduanLayananDto,
  ) {
    this.akses.wajibBolehKelolaStatus(request.user.role);
    return this.service.ubahStatus(id, dto, request.user.id);
  }
}
