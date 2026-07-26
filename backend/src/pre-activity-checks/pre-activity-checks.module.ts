import { Module } from '@nestjs/common';
import { PreActivityChecksController } from './pre-activity-checks.controller';
import { PreActivityCheckPdfService } from './pre-activity-check-pdf.service';
import { PreActivityChecksService } from './pre-activity-checks.service';

@Module({
  controllers: [PreActivityChecksController],
  providers: [PreActivityChecksService, PreActivityCheckPdfService],
  exports: [PreActivityChecksService],
})
export class PreActivityChecksModule {}
