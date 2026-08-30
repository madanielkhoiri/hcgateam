// ==================================================
// FILE: backend/src/kip/kip.controller.ts
// FUNGSI: Endpoint modul KIP — admin (JWT), scan publik (tanpa JWT), ceklis (JWT)
// ==================================================

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AktorKip, KipService } from './kip.service';
import { BuatKipDto, SimpanGpsLokasiDto } from './dto/kip.dto';

/** Ambil info pelaku dari payload JWT (req.user) untuk audit log — bukan cuma ID. */
function ambilAktor(req: any): AktorKip {
  return {
    id: req.user.id,
    username: req.user.username,
    nama: req.user.nama,
    nrp: req.user.nrp,
  };
}

@Controller('kip')
export class KipController {
  constructor(private readonly service: KipService) {}

  // ---------- Admin (JWT + accessKey CIVIL_ELECTRIC_KIP lewat routeAccessMap) ----------

  @Get('admin/kip')
  @UseGuards(JwtAuthGuard)
  daftarKip(@Query('lokasi') lokasi?: string, @Query('tahun') tahun?: string) {
    return this.service.daftarKip(lokasi, tahun ? Number(tahun) : undefined);
  }

  @Post('admin/kip')
  @UseGuards(JwtAuthGuard)
  buatKip(@Body() dto: BuatKipDto, @Req() req: any) {
    return this.service.buatKip(dto, ambilAktor(req));
  }

  @Patch('admin/kip/:id')
  @UseGuards(JwtAuthGuard)
  ubahKip(@Param('id', ParseIntPipe) id: number, @Body() dto: BuatKipDto, @Req() req: any) {
    return this.service.ubahKip(id, dto, ambilAktor(req));
  }

  @Delete('admin/kip/:id')
  @UseGuards(JwtAuthGuard)
  hapusKip(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.hapusKip(id, ambilAktor(req));
  }

  @Get('admin/qr/:lokasi')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'image/svg+xml')
  qrSvg(@Param('lokasi') lokasi: string, @Query('target') target: string) {
    return this.service.qrSvg(lokasi, target);
  }

  /** Simpan titik GPS acuan lokasi — dipanggil sekali saat admin cetak barcode sambil berdiri di lokasi tsb. */
  @Post('admin/lokasi-gps/:lokasi')
  @UseGuards(JwtAuthGuard)
  simpanGpsLokasi(@Param('lokasi') lokasi: string, @Body() dto: SimpanGpsLokasiDto) {
    return this.service.simpanGpsLokasi(lokasi, dto);
  }

  // ---------- Publik (tanpa JWT sama sekali) ----------

  @Get('publik/:kode')
  statusByKode(@Param('kode') kode: string) {
    return this.service.statusByKode(kode);
  }

  // ---------- Ceklis bulanan (JWT, role Elektrik/Admin dicek di service) ----------

  @Post(':kipId/checklist/:bulan')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  ceklis(
    @Param('kipId', ParseIntPipe) kipId: number,
    @Param('bulan', ParseIntPipe) bulan: number,
    @Body('latitude') latitudeRaw: string | undefined,
    @Body('longitude') longitudeRaw: string | undefined,
    @Body('parameterChecked') parameterCheckedRaw: string | undefined,
    @UploadedFile() foto: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    const lokasiSekarang =
      latitudeRaw !== undefined && longitudeRaw !== undefined
        ? { latitude: Number(latitudeRaw), longitude: Number(longitudeRaw) }
        : undefined;

    let parameterChecked: boolean[] | undefined;
    if (parameterCheckedRaw) {
      try {
        parameterChecked = JSON.parse(parameterCheckedRaw);
      } catch {
        throw new BadRequestException('Format checklist parameter tidak valid');
      }
    }

    return this.service.ceklis(
      req.user.role,
      ambilAktor(req),
      kipId,
      bulan,
      foto,
      parameterChecked,
      lokasiSekarang,
    );
  }
}
