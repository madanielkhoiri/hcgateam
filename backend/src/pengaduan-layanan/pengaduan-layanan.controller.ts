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
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DivisiPengaduan, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePengaduanLayananDto } from './dto/create-pengaduan-layanan.dto';
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

@Controller('pengaduan-layanan')
@UseGuards(JwtAuthGuard)
export class PengaduanLayananController {
  constructor(
    private readonly service: PengaduanLayananService,
    private readonly akses: PengaduanLayananAksesService,
  ) {}

  @Post()
  create(@Body() dto: CreatePengaduanLayananDto, @Req() request: AuthRequest) {
    return this.service.create(dto, request.user.id);
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
}
