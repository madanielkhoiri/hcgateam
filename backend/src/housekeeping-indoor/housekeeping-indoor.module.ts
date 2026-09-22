import { Module } from '@nestjs/common';
import { HousekeepingIndoorController } from './housekeeping-indoor.controller';
import { HousekeepingIndoorService } from './housekeeping-indoor.service';
import { HousekeepingIndoorFileService } from './housekeeping-indoor-file.service';
import { HousekeepingIndoorDashboardController } from './dashboard/housekeeping-indoor-dashboard.controller';
import { HousekeepingIndoorDashboardService } from './dashboard/housekeeping-indoor-dashboard.service';

@Module({
  controllers: [HousekeepingIndoorController, HousekeepingIndoorDashboardController],
  providers: [
    HousekeepingIndoorService,
    HousekeepingIndoorFileService,
    HousekeepingIndoorDashboardService,
  ],
})
export class HousekeepingIndoorModule {}
