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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { McuDashboardService } from './mcu-dashboard.service';

@Controller('mcu')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_MCU')
export class McuDashboardController {
  constructor(private readonly service: McuDashboardService) {}

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Get('dashboard/tren')
  trenDanStatus() {
    return this.service.trenDanStatus();
  }

  @Get('durasi-proses')
  durasiProses() {
    return this.service.durasiProses();
  }

  @Get('history/:karyawanId')
  historyKaryawan(@Param('karyawanId', ParseIntPipe) karyawanId: number) {
    return this.service.historyKaryawan(karyawanId);
  }
}
