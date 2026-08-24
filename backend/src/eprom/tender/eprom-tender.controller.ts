// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender.controller.ts
// FUNGSI: Endpoint Tender, Undangan Tender, dan Klasifikasi & Evaluasi (SPH)
// ==================================================

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EpromAksesService } from '../common/eprom-akses.service';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatTenderDto, EpromTenderService, UbahTenderDto } from './eprom-tender.service';

@Controller('eprom/tender')
@UseGuards(JwtAuthGuard)
export class EpromTenderController {
  constructor(
    private readonly service: EpromTenderService,
    private readonly akses: EpromAksesService,
  ) {}

  @Get()
  daftar() {
    return this.service.daftar();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  buat(@Aktor() aktor: AktorEprom, @Body() dto: BuatTenderDto) {
    this.akses.wajibOwner(aktor);
    return this.service.buat(dto);
  }

  @Patch(':id')
  ubah(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UbahTenderDto,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.ubah(id, dto);
  }

  @Delete(':id')
  hapus(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibOwner(aktor);
    return this.service.hapus(id);
  }

  @Post(':id/undangan')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  kirimUndangan(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Body('vendorIds') vendorIdsRaw: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.akses.wajibOwner(aktor);

    const vendorIds = (vendorIdsRaw ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (vendorIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu vendor untuk diundang');
    }

    return this.service.kirimUndangan(id, { vendorIds }, file);
  }

  @Delete(':id/undangan/:vendorId')
  hapusUndangan(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.hapusUndangan(id, vendorId);
  }

  @Post(':id/sph/:vendorId')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async buatRoundSph(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body('hargaPenawaran') hargaPenawaranRaw: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    await this.akses.wajibVendorSendiri(aktor, vendorId);
    return this.service.buatRoundSph(aktor, id, vendorId, file, parseHarga(hargaPenawaranRaw));
  }

  @Patch(':id/sph/:vendorId/:roundId')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async ubahRoundSph(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body('hargaPenawaran') hargaPenawaranRaw: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Owner boleh mengubah SPH vendor manapun; akun Vendor cuma boleh
    // mengubah SPH miliknya sendiri (tidak boleh menghapus).
    await this.akses.wajibVendorSendiri(aktor, vendorId);
    return this.service.ubahRoundSph(id, vendorId, roundId, file, parseHarga(hargaPenawaranRaw));
  }

  @Delete(':id/sph/:vendorId/:roundId')
  hapusRoundSph(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.hapusRoundSph(id, vendorId, roundId);
  }

  @Post(':id/finalisasi')
  finalisasiTender(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    this.akses.wajibOwner(aktor);
    return this.service.finalisasiTender(id);
  }

  @Post(':id/tetapkan-pemenang/:vendorId')
  tetapkanPemenang(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.tetapkanPemenang(id, vendorId);
  }
}

function parseHarga(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException('Harga penawaran tidak valid');
  }

  return value;
}
