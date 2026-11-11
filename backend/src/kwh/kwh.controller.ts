// ==================================================
// FILE: backend/src/kwh/kwh.controller.ts
// FUNGSI: Endpoint Perhitungan KWH (JWT + accessKey CIVIL_ELECTRIC_KWH)
// ==================================================

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { AktorKwh, KwhService } from './kwh.service';
import { BuatPencatatanKwhDto, UbahPencatatanKwhDto } from './dto/kwh.dto';

function ambilAktor(req: any): AktorKwh {
  return { id: req.user.id, username: req.user.username, nama: req.user.nama, nrp: req.user.nrp };
}

@Controller('kwh')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_ELECTRIC_KWH')
export class KwhController {
  constructor(private readonly service: KwhService) {}

  @Get('dashboard/ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Get('dashboard/tren')
  tren() {
    return this.service.tren();
  }

  @Get('meter')
  daftarMeter() {
    return this.service.daftarMeter();
  }

  @Get('pencatatan')
  daftarPencatatan(@Query('tahun') tahun?: string, @Query('meterId') meterId?: string) {
    return this.service.daftarPencatatan({
      tahun: tahun ? Number(tahun) : undefined,
      meterId: meterId ? Number(meterId) : undefined,
    });
  }

  @Post('pencatatan')
  buat(@Body() dto: BuatPencatatanKwhDto, @Req() req: any) {
    return this.service.buat(dto, ambilAktor(req));
  }

  @Patch('pencatatan/:id')
  ubah(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahPencatatanKwhDto, @Req() req: any) {
    return this.service.ubah(id, dto, ambilAktor(req));
  }

  @Delete('pencatatan/:id')
  hapus(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.hapus(id, ambilAktor(req));
  }
}
