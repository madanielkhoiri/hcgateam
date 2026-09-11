import { Module } from '@nestjs/common';
import { HelpdeskController } from './helpdesk.controller';
import { HelpdeskService } from './helpdesk.service';
import { HelpdeskDashboardController } from './dashboard/helpdesk-dashboard.controller';
import { HelpdeskDashboardService } from './dashboard/helpdesk-dashboard.service';

@Module({
  controllers: [HelpdeskController, HelpdeskDashboardController],
  providers: [HelpdeskService, HelpdeskDashboardService],
})
export class HelpdeskModule {}
