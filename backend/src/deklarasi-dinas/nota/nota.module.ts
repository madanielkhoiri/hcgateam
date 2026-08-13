import { Module } from '@nestjs/common';
import { NotaController } from './nota.controller';
import { NotaService } from './nota.service';
import { SaldoModule } from '../saldo/saldo.module';
import { OcrSpaceService } from './ocr-space.service';

@Module({
  imports: [SaldoModule],
  controllers: [NotaController],
  providers: [NotaService, OcrSpaceService],
  exports: [NotaService],
})
export class NotaModule {}
