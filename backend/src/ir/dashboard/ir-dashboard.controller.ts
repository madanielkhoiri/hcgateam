// ==================================================
// FILE: backend/src/ir/dashboard/ir-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard PORTAL IR
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { IrDashboardService } from './ir-dashboard.service';

@Controller('ir/dashboard')
@UseGuards(JwtAuthGuard)
export class IrDashboardController {
  constructor(private readonly service: IrDashboardService) {}

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Get('tren')
  tren() {
    return this.service.tren();
  }
}
