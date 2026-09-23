// ==================================================
// FILE: backend/src/mcu/scheduler/mcu-scheduler.service.ts
// FUNGSI: Penjadwal harian otomatis untuk proses MCU Periodik yang
// sebelumnya harus dipicu manual oleh HC — sekarang jalan sendiri tiap
// hari tanpa perlu diklik. Referensi: Bagian 4.1, 4.2, 4.7
// alur-workflow-mcu-periodik-v3.md.
//
// Retensi dokumen (hapus fisik file 6 bulan) SENGAJA TIDAK dijadwalkan
// otomatis di sini karena aksinya menghapus permanen berkas medis —
// tetap dipicu manual oleh HC dari halaman Retensi sampai ada konfirmasi
// eksplisit bahwa itu juga boleh berjalan sendiri.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserRole } from '@prisma/client';
import { AktorMcu } from '../common/mcu-aktor';
import { McuJadwalService } from '../jadwal/mcu-jadwal.service';
import { McuKaryawanService } from '../karyawan/mcu-karyawan.service';
import { McuFollowUpService } from '../follow-up/mcu-follow-up.service';

/** Aktor sistem — dipakai penjadwal cron, bukan akun sungguhan (tidak pernah disimpan sebagai FK). */
const AKTOR_SISTEM: AktorMcu = { id: 0, username: 'sistem-penjadwal', role: UserRole.HC };

@Injectable()
export class McuSchedulerService {
  private readonly logger = new Logger(McuSchedulerService.name);

  constructor(
    private readonly jadwal: McuJadwalService,
    private readonly karyawan: McuKaryawanService,
    private readonly followUp: McuFollowUpService,
  ) {}

  /** Kunci jadwal yang sudah menyentuh H-3 hari — tiap hari jam 06:00. */
  @Cron('0 6 * * *')
  async kunciJadwalJatuhTempo() {
    try {
      const hasil = await this.jadwal.kunciJadwalJatuhTempo();
      this.logger.log(`Kunci jadwal H-3 hari: ${hasil.terkunci} jadwal dikunci`);
    } catch (error) {
      this.logger.error('Gagal menjalankan kunci jadwal H-3 hari', error as Error);
    }
  }

  /** Reminder H-3 bulan ke Admin Dept (tembusan HC) — tiap hari jam 06:05. */
  @Cron('5 6 * * *')
  async reminderH3Bulan() {
    try {
      const hasil = await this.karyawan.jalankanReminderJatuhTempo();
      this.logger.log(
        `Reminder H-3 bulan: ${hasil.karyawan} karyawan, ${hasil.dikirim} notifikasi terkirim`,
      );
    } catch (error) {
      this.logger.error('Gagal menjalankan reminder H-3 bulan', error as Error);
    }
  }

  /** Reminder Follow Up yang lewat batas waktu tanpa ditutup — tiap hari jam 06:10. */
  @Cron('10 6 * * *')
  async reminderFuTerlambat() {
    try {
      const hasil = await this.followUp.tandaiSeluruhFuTerlambat(AKTOR_SISTEM);
      this.logger.log(`Reminder Follow Up terlambat: ${hasil.diproses} Follow Up diproses`);
    } catch (error) {
      this.logger.error('Gagal menjalankan reminder Follow Up terlambat', error as Error);
    }
  }
}

// ==================================================
// SELESAI: backend/src/mcu/scheduler/mcu-scheduler.service.ts
// ==================================================
