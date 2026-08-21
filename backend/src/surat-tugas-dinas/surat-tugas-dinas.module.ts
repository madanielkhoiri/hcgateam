import { Module } from '@nestjs/common';
import { SuratTugasDinasController } from './surat-tugas-dinas.controller';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';
import { SuratTugasDinasService } from './surat-tugas-dinas.service';

@Module({
  controllers: [SuratTugasDinasController],
  providers: [SuratTugasDinasService, SuratTugasDinasPdfService],
})
export class SuratTugasDinasModule {}