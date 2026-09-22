// ==================================================
// FILE: backend/src/mcu/dashboard/mcu-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan, durasi proses, dan history MCU
// ==================================================

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

  @Get('history/:karyawanId')
  historyKaryawan(
    @Aktor() aktor: AktorMcu,
    @Param('karyawanId', ParseIntPipe) karyawanId: number,
  ) {
    this.akses.wajibPeran(aktor, ...PERAN_DASHBOARD);
    return this.service.historyKaryawan(karyawanId);
  }
}
