import { Module } from '@nestjs/common';
import { ApprovalSummaryController } from './approval-summary.controller';
import { ApprovalSummaryService } from './approval-summary.service';

@Module({
  controllers: [ApprovalSummaryController],
  providers: [ApprovalSummaryService],
})
export class ApprovalSummaryModule {}
