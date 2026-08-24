// ==================================================
// FILE: backend/src/eprom/vendor/eprom-vendor.controller.ts
// FUNGSI: Endpoint master data Vendor (Owner-managed)
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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EpromAksesService } from '../common/eprom-akses.service';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import {
  BuatVendorDto,
  EpromVendorService,
  TautkanUserVendorDto,
  UbahVendorDto,
} from './eprom-vendor.service';

@Controller('eprom/vendors')
@UseGuards(JwtAuthGuard)
export class EpromVendorController {
  constructor(
    private readonly service: EpromVendorService,
    private readonly akses: EpromAksesService,
  ) {}

  @Get()
  daftar(@Query('hanyaAktif') hanyaAktif?: string) {
    return this.service.daftar(hanyaAktif === 'true');
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  buat(@Aktor() aktor: AktorEprom, @Body() dto: BuatVendorDto) {
    this.akses.wajibOwner(aktor);
    return this.service.buat(dto);
  }

  @Patch(':id')
  async ubah(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahVendorDto,
  ) {
    // Owner boleh mengubah vendor manapun; akun Vendor cuma boleh mengubah
    // profilnya sendiri (tidak boleh menghapus, lihat endpoint hapus di bawah).
    await this.akses.wajibVendorSendiri(aktor, id);
    return this.service.ubah(id, dto, this.akses.isOwner(aktor));
  }

  @Delete(':id')
  hapus(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibOwner(aktor);
    return this.service.hapus(id);
  }

  @Post(':id/tautkan-user')
  tautkanUser(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TautkanUserVendorDto,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.tautkanUser(id, dto);
  }

  @Post(':id/klaim')
  klaim(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.klaimAkun(aktor, id);
  }
}
