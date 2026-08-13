import { Module } from '@nestjs/common';
import { SaldoModule } from '../saldo/saldo.module';
import { PengajuanController } from './pengajuan.controller';
import { PengajuanService } from './pengajuan.service';

@Module({
  imports: [SaldoModule],
  controllers: [PengajuanController],
  providers: [PengajuanService],
  exports: [PengajuanService],
})
export class PengajuanModule {}
