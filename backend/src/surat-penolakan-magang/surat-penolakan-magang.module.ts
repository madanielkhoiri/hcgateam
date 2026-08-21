import { Module } from '@nestjs/common';
import { McuModule } from '../mcu/mcu.module';
import { SuratPenolakanMagangController } from './surat-penolakan-magang.controller';
import { SuratPenolakanMagangPdfService } from './surat-penolakan-magang-pdf.service';
import { SuratPenolakanMagangService } from './surat-penolakan-magang.service';

@Module({
  imports: [McuModule],
  controllers: [SuratPenolakanMagangController],
  providers: [SuratPenolakanMagangService, SuratPenolakanMagangPdfService],
})
export class SuratPenolakanMagangModule {}
