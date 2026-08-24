import { Module } from '@nestjs/common';
import { TravelController } from './travel.controller';
import { TravelService } from './travel.service';
import { TravelFileService } from './travel-file.service';
import { TravelAksesService } from './travel-akses.service';

@Module({
  controllers: [TravelController],
  providers: [TravelService, TravelFileService, TravelAksesService],
})
export class TravelModule {}
