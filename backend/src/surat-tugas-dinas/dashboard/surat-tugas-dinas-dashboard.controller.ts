// ==================================================
// FILE: backend/src/surat-tugas-dinas/dashboard/surat-tugas-dinas-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard Form Tugas Dinas
// ==================================================

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SuratTugasDinasDashboardService } from './surat-tugas-dinas-dashboard.service';

type AuthRequest = {
  user: {
    id: number;
    role: UserRole;
  };
};

@Controller('surat-tugas-dinas/dashboard')
@UseGuards(JwtAuthGuard)
export class SuratTugasDinasDashboardController {
  constructor(private readonly service: SuratTugasDinasDashboardService) {}

  @Get('ringkasan')
  ringkasan(@Req() request: AuthRequest) {
    return this.service.ringkasan(request.user);
  }

  @Get('tren')
  tren(@Req() request: AuthRequest) {
    return this.service.tren(request.user);
  }
}
