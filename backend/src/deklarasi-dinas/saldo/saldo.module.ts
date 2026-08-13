import { Module } from '@nestjs/common';
import { SaldoController } from './saldo.controller';
import { SaldoService } from './saldo.service';

@Module({
  controllers: [SaldoController],
  providers: [SaldoService],
  exports: [SaldoService],
})
export class SaldoModule {}
