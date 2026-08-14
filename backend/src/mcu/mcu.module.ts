// ==================================================
// FILE: backend/src/mcu/mcu.module.ts
// FUNGSI: Module Digitalisasi Monitoring MCU Periodik
// Referensi: alur-workflow-mcu-periodik-v3.md
// ==================================================

import { Module } from '@nestjs/common';
import { McuAksesService } from './common/mcu-akses.service';
import { McuFileService } from './common/mcu-file.service';
import { McuPeranController } from './common/mcu-peran.controller';
import { McuDashboardController } from './dashboard/mcu-dashboard.controller';
import { McuDashboardService } from './dashboard/mcu-dashboard.service';
import { McuFollowUpController } from './follow-up/mcu-follow-up.controller';
import { McuFollowUpService } from './follow-up/mcu-follow-up.service';
import { McuHasilController } from './hasil/mcu-hasil.controller';
import { McuHasilService } from './hasil/mcu-hasil.service';
import { McuInduksiController } from './induksi/mcu-induksi.controller';
import { McuInduksiService } from './induksi/mcu-induksi.service';
import { McuJadwalController } from './jadwal/mcu-jadwal.controller';
import { McuJadwalService } from './jadwal/mcu-jadwal.service';
import { McuKaryawanController } from './karyawan/mcu-karyawan.controller';
import { McuKaryawanService } from './karyawan/mcu-karyawan.service';
import { McuKlinikController } from './klinik/mcu-klinik.controller';
import { McuKlinikService } from './klinik/mcu-klinik.service';
import { McuNotifikasiController } from './notifikasi/mcu-notifikasi.controller';
import { McuNotifikasiService } from './notifikasi/mcu-notifikasi.service';
import { McuRekomendasiController } from './rekomendasi/mcu-rekomendasi.controller';
import { McuRekomendasiService } from './rekomendasi/mcu-rekomendasi.service';
import { McuRetensiController } from './retensi/mcu-retensi.controller';
import { McuRetensiService } from './retensi/mcu-retensi.service';
import { McuSuratController } from './surat/mcu-surat.controller';
import { McuSuratService } from './surat/mcu-surat.service';

@Module({
  controllers: [
    McuDashboardController,
    McuPeranController,
    McuKaryawanController,
    McuKlinikController,
    McuJadwalController,
    McuSuratController,
    McuHasilController,
    McuRekomendasiController,
    McuFollowUpController,
    McuInduksiController,
    McuRetensiController,
    McuNotifikasiController,
  ],
  providers: [
    McuAksesService,
    McuFileService,
    McuNotifikasiService,
    McuDashboardService,
    McuKaryawanService,
    McuKlinikService,
    McuJadwalService,
    McuSuratService,
    McuHasilService,
    McuRekomendasiService,
    McuFollowUpService,
    McuInduksiService,
    McuRetensiService,
  ],
  exports: [McuAksesService, McuNotifikasiService],
})
export class McuModule {}

// ==================================================
// SELESAI: backend/src/mcu/mcu.module.ts
// ==================================================
