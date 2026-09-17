// ==================================================
// FILE: backend/src/housekeeping-indoor/dashboard/housekeeping-indoor-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard Housekeeping Indoor
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { HousekeepingIndoorDashboardService } from './housekeeping-indoor-dashboard.service';

@Controller('housekeeping-indoor/dashboard')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_GS_HOUSEKEEPING_INDOOR')
export class HousekeepingIndoorDashboardController {
  constructor(private readonly service: HousekeepingIndoorDashboardService) {}

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Get('tren')
  trenDanLokasi() {
    return this.service.trenDanLokasi();
  }
}
