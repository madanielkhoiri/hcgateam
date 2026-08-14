// ==================================================
// FILE: backend/src/mcu/common/mcu-peran.controller.ts
// FUNGSI: Info role MCU akun sendiri & upload dokumen MCU
// Referensi: Bagian 2 alur-workflow-mcu-periodik-v3.md
// Satu akun = satu role; pengaturan role dilakukan Administrator
// lewat halaman Manajemen Akun (kolom Role), bukan di sini.
// ==================================================

import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LABEL_PERAN, McuAksesService } from './mcu-akses.service';
import { Aktor } from './mcu-aktor';
import type { AktorMcu } from './mcu-aktor';
import { McuFileService } from './mcu-file.service';

@Controller('mcu')
@UseGuards(JwtAuthGuard)
export class McuPeranController {
  constructor(
    private readonly akses: McuAksesService,
    private readonly berkas: McuFileService,
  ) {}

  /** Role MCU akun yang sedang login - dipakai UI untuk gating tombol. */
  @Get('peran/saya')
  async peranSaya(@Aktor() aktor: AktorMcu) {
    const peran = this.akses.peranAktor(aktor);
    const [karyawan, klinik, departemen] = await Promise.all([
      this.akses.karyawanDariAkun(aktor),
      this.akses.klinikDariAkun(aktor),
      this.akses.departemenDariAkun(aktor),
    ]);

    return {
      akunId: aktor.id,
      peran,
      labelPeran: peran.map((item) => LABEL_PERAN[item] ?? item),
      karyawan,
      klinik,
      departemen,
    };
  }

  /**
   * Upload dokumen pendukung (PDF rekomendasi, surat rujukan Dokter).
   * Mengembalikan path relatif untuk disimpan pada record terkait.
   */
  @Post('dokumen/:kategori')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggahDokumen(
    @Aktor() aktor: AktorMcu,
    @Param('kategori') kategoriValue: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.akses.wajibPeran(
      aktor,
      UserRole.HC,
      UserRole.DOKTER,
      UserRole.KLINIK,
      UserRole.ADMIN_DEPT,
    );

    const kategori = this.berkas.parseKategori(kategoriValue);
    const path = this.berkas.simpan(file, kategori);

    return { path, namaFileAsli: file.originalname ?? null };
  }
}
