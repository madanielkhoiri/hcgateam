// ==================================================
// FILE: backend/src/eprom/dashboard/eprom-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan dashboard e-ProM
// ==================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EpromAksesService } from '../common/eprom-akses.service';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { EpromDashboardService } from './eprom-dashboard.service';

@Controller('eprom/dashboard')
@UseGuards(JwtAuthGuard)
export class EpromDashboardController {
  constructor(
    private readonly service: EpromDashboardService,
    private readonly akses: EpromAksesService,
  ) {}

  @Get('ringkasan')
  ringkasan(@Aktor() aktor: AktorEprom) {
    this.akses.wajibOwner(aktor);
    return this.service.ringkasan();
  }
}
