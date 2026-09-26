// ==================================================
// FILE: backend/src/mcu/dashboard/mcu-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan, durasi proses, dan history MCU
// ==================================================

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { McuAksesService } from '../common/mcu-akses.service';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import { McuDashboardService } from './mcu-dashboard.service';

/** Ringkasan/tren/history lintas karyawan — bukan konsumsi Karyawan/SHE/Klinik. */
const PERAN_DASHBOARD = [UserRole.HC, UserRole.ADMIN_DEPT, UserRole.DOKTER];

@Controller('mcu')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_MCU')
export class McuDashboardController {
  constructor(
    private readonly service: McuDashboardService,
    private readonly akses: McuAksesService,
  ) {}

  @Get('ringkasan')
  ringkasan(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, ...PERAN_DASHBOARD);
    return this.service.ringkasan();
  }

  @Get('dashboard/tren')
  trenDanStatus(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, ...PERAN_DASHBOARD);
    return this.service.trenDanStatus();
  }

  @Get('durasi-proses')
  durasiProses(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, ...PERAN_DASHBOARD);
    return this.service.durasiProses();
  }

  /** Rekap penyakit penyebab Follow Up: data medis, hanya HC & Dokter (bukan Admin Dept). */
  @Get('dashboard/penyakit')
  penyakitTerbanyak(
    @Aktor() aktor: AktorMcu,
    @Query('periode') periode?: string,
    @Query('tahun') tahun?: string,
    @Query('bulan') bulan?: string,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC, UserRole.DOKTER);

    const periodeValid = (periode ?? 'TAHUN').toUpperCase();

    if (periodeValid !== 'TAHUN' && periodeValid !== 'BULAN') {
      throw new BadRequestException('Periode harus TAHUN atau BULAN');
    }

    const sekarang = new Date();
    const tahunAngka = tahun ? Number(tahun) : sekarang.getUTCFullYear();
    const bulanAngka = bulan ? Number(bulan) : sekarang.getUTCMonth() + 1;

    if (!Number.isInteger(tahunAngka) || tahunAngka < 2000 || tahunAngka > 2100) {
      throw new BadRequestException('Tahun tidak valid');
    }

    if (
      periodeValid === 'BULAN' &&
      (!Number.isInteger(bulanAngka) || bulanAngka < 1 || bulanAngka > 12)
    ) {
      throw new BadRequestException('Bulan tidak valid');
    }

    return this.service.penyakitTerbanyak(periodeValid, tahunAngka, bulanAngka);
  }

  @Get('history/:karyawanId')
  historyKaryawan(
    @Aktor() aktor: AktorMcu,
    @Param('karyawanId', ParseIntPipe) karyawanId: number,
  ) {
    this.akses.wajibPeran(aktor, ...PERAN_DASHBOARD);
    return this.service.historyKaryawan(
      karyawanId,
      this.akses.punyaPeran(aktor, UserRole.HC, UserRole.DOKTER),
    );
  }
}
