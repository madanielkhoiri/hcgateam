// ==================================================
// FILE: backend/src/kip/kip.controller.ts
// FUNGSI: Endpoint modul KIP — admin (JWT), scan publik (tanpa JWT), ceklis (JWT)
// ==================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KipService } from './kip.service';
import { BuatKipDto, CeklisDto, SimpanGpsLokasiDto } from './dto/kip.dto';

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
    return this.service.buatKip(dto, req.user.id);
  }

  @Delete('admin/kip/:id')
  @UseGuards(JwtAuthGuard)
  hapusKip(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapusKip(id);
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
  ceklis(
    @Param('kipId', ParseIntPipe) kipId: number,
    @Param('bulan', ParseIntPipe) bulan: number,
    @Body() dto: CeklisDto,
    @Req() req: any,
  ) {
    const lokasiSekarang =
      dto.latitude !== undefined && dto.longitude !== undefined
        ? { latitude: dto.latitude, longitude: dto.longitude }
        : undefined;

    return this.service.ceklis(req.user.role, req.user.id, kipId, bulan, lokasiSekarang);
  }
}
