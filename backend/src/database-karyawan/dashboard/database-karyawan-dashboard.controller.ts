// ==================================================
// FILE: backend/src/database-karyawan/dashboard/database-karyawan-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard Database Karyawan
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DatabaseKaryawanDashboardService } from './database-karyawan-dashboard.service';

@Controller('database-karyawan/dashboard')
@UseGuards(JwtAuthGuard)
export class DatabaseKaryawanDashboardController {
  constructor(private readonly service: DatabaseKaryawanDashboardService) {}

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Get('tren')
  tren() {
    return this.service.tren();
  }
}
