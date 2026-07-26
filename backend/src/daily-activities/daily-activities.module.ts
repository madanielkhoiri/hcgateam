import { Module } from '@nestjs/common';
import { DailyActivitiesController } from './daily-activities.controller';
import { DailyActivityImagesController } from './daily-activity-images.controller';
import { DailyActivitiesService } from './daily-activities.service';
import { DailyActivityImagesService } from './daily-activity-images.service';

@Module({
  controllers: [DailyActivitiesController, DailyActivityImagesController],
  providers: [DailyActivitiesService, DailyActivityImagesService],
})
export class DailyActivitiesModule {}
