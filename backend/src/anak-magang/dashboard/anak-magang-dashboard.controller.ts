// ==================================================
// FILE: backend/src/anak-magang/dashboard/anak-magang-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard Database Anak Magang
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AnakMagangDashboardService } from './anak-magang-dashboard.service';

@Controller('anak-magang/dashboard')
@UseGuards(JwtAuthGuard)
export class AnakMagangDashboardController {
  constructor(private readonly service: AnakMagangDashboardService) {}

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Get('tren')
  tren() {
    return this.service.tren();
  }
}
