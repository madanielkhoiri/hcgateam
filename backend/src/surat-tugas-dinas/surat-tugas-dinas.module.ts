import { Module } from '@nestjs/common';
import { SuratTugasDinasController } from './surat-tugas-dinas.controller';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';
import { SuratTugasDinasService } from './surat-tugas-dinas.service';
import { SuratTugasDinasDashboardController } from './dashboard/surat-tugas-dinas-dashboard.controller';
import { SuratTugasDinasDashboardService } from './dashboard/surat-tugas-dinas-dashboard.service';

@Module({
  controllers: [SuratTugasDinasController, SuratTugasDinasDashboardController],
  providers: [
    SuratTugasDinasService,
    SuratTugasDinasPdfService,
    SuratTugasDinasDashboardService,
  ],
})
export class SuratTugasDinasModule {}