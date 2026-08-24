// ==================================================
// FILE: backend/src/eprom/dashboard/eprom-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan dashboard e-ProM
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EpromDashboardService } from './eprom-dashboard.service';

@Controller('eprom/dashboard')
@UseGuards(JwtAuthGuard)
export class EpromDashboardController {
  constructor(private readonly service: EpromDashboardService) {}

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }
}
