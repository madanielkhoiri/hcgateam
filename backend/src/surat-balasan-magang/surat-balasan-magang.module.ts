import { Module } from '@nestjs/common';
import { McuModule } from '../mcu/mcu.module';
import { SuratBalasanMagangController } from './surat-balasan-magang.controller';
import { SuratBalasanMagangPdfService } from './surat-balasan-magang-pdf.service';
import { SuratBalasanMagangService } from './surat-balasan-magang.service';

@Module({
  imports: [McuModule],
  controllers: [SuratBalasanMagangController],
  providers: [SuratBalasanMagangService, SuratBalasanMagangPdfService],
})
export class SuratBalasanMagangModule {}
