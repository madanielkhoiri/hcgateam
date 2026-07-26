import { Module } from '@nestjs/common';
import { P5mController } from './p5m.controller';
import { P5mPdfService } from './p5m-pdf.service';
import { P5mService } from './p5m.service';

@Module({
  controllers: [P5mController],
  providers: [P5mService, P5mPdfService],
  exports: [P5mService],
})
export class P5mModule {}
