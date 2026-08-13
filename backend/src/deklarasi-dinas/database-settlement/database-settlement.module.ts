import { Module } from '@nestjs/common';
import { DatabaseSettlementController } from './database-settlement.controller';
import { DatabaseSettlementService } from './database-settlement.service';

@Module({
  controllers: [DatabaseSettlementController],
  providers: [DatabaseSettlementService],
  exports: [DatabaseSettlementService],
})
export class DatabaseSettlementModule {}
