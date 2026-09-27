import { Module } from '@nestjs/common';
import { SuratTugasDinasController } from './surat-tugas-dinas.controller';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';
import { SuratTugasDinasService } from './surat-tugas-dinas.service';
import { SuratTugasDinasDashboardController } from './dashboard/surat-tugas-dinas-dashboard.controller';
import { SuratTugasDinasDashboardService } from './dashboard/surat-tugas-dinas-dashboard.service';
import { SuratTugasDinasKaryawanController } from './surat-tugas-dinas-karyawan.controller';
import { SuratTugasDinasKaryawanService } from './surat-tugas-dinas-karyawan.service';
import { SuratTugasDinasAdvancePdfService } from './surat-tugas-dinas-advance-pdf.service';

@Module({
  controllers: [
    SuratTugasDinasController,
    SuratTugasDinasDashboardController,
    SuratTugasDinasKaryawanController,
  ],
  providers: [
    SuratTugasDinasService,
    SuratTugasDinasPdfService,
    SuratTugasDinasDashboardService,
    SuratTugasDinasKaryawanService,
    SuratTugasDinasAdvancePdfService,
  ],
})
export class SuratTugasDinasModule {}
