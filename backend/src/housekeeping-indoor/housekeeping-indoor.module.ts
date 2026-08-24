import { Module } from '@nestjs/common';
import { HousekeepingIndoorController } from './housekeeping-indoor.controller';
import { HousekeepingIndoorService } from './housekeeping-indoor.service';
import { HousekeepingIndoorFileService } from './housekeeping-indoor-file.service';

@Module({
  controllers: [HousekeepingIndoorController],
  providers: [HousekeepingIndoorService, HousekeepingIndoorFileService],
})
export class HousekeepingIndoorModule {}
