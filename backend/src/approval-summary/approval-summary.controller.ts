// ==================================================
// FILE: backend/src/approval-summary/approval-summary.controller.ts
// FUNGSI: Endpoint ringkasan jumlah approval yang menunggu akun yang login
// ==================================================

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApprovalSummaryService } from './approval-summary.service';

@Controller('approval-summary')
export class ApprovalSummaryController {
  constructor(private readonly service: ApprovalSummaryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  ringkasan(@Req() req: any) {
    return this.service.ringkasan({ role: req.user.role });
  }
}
