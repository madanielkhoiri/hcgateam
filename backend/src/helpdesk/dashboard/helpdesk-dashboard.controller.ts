// ==================================================
// FILE: backend/src/helpdesk/dashboard/helpdesk-dashboard.controller.ts
// FUNGSI: Endpoint ringkasan & tren dashboard Helpdesk Center
// ==================================================

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { HelpdeskDashboardService } from './helpdesk-dashboard.service';

type AuthRequest = {
  user: {
    id: number;
    role: UserRole;
  };
};

@Controller('helpdesk/dashboard')
@UseGuards(JwtAuthGuard)
export class HelpdeskDashboardController {
  constructor(private readonly service: HelpdeskDashboardService) {}

  @Get('ringkasan')
  ringkasan(@Req() request: AuthRequest) {
    return this.service.ringkasan(request.user);
  }

  @Get('tren')
  tren(@Req() request: AuthRequest) {
    return this.service.tren(request.user);
  }
}
