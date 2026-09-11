// ==================================================
// FILE: backend/src/housekeeping-indoor/dashboard/housekeeping-indoor-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard Housekeeping Indoor
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { HousekeepingIndoorDashboardService } from './housekeeping-indoor-dashboard.service';

@Controller('housekeeping-indoor/dashboard')
@UseGuards(JwtAuthGuard)
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
