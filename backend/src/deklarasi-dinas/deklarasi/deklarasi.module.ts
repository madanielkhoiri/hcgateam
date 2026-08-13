import { Module } from '@nestjs/common';
import { DatabaseSettlementModule } from '../database-settlement/database-settlement.module';
import { DeklarasiController } from './deklarasi.controller';
import { DeklarasiService } from './deklarasi.service';

@Module({
  imports: [DatabaseSettlementModule],
  controllers: [DeklarasiController],
  providers: [DeklarasiService],
  exports: [DeklarasiService],
})
export class DeklarasiModule {}
