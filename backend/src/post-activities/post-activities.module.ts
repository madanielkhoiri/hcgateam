import { Module } from '@nestjs/common';
import { PostActivitiesController } from './post-activities.controller';
import { PostActivitiesService } from './post-activities.service';
import { PostActivityPdfService } from './post-activity-pdf.service';

@Module({
  controllers: [PostActivitiesController],
  providers: [PostActivitiesService, PostActivityPdfService],
  exports: [PostActivitiesService],
})
export class PostActivitiesModule {}
