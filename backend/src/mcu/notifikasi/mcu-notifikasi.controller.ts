// ==================================================
// FILE: backend/src/mcu/notifikasi/mcu-notifikasi.controller.ts
// FUNGSI: Endpoint log & antrean notifikasi MCU
// ==================================================

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  StatusKirimNotifikasi,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { McuAksesService } from '../common/mcu-akses.service';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import { McuNotifikasiService } from './mcu-notifikasi.service';

@Controller('mcu/notifikasi')
@UseGuards(JwtAuthGuard)
export class McuNotifikasiController {
  constructor(
    private readonly service: McuNotifikasiService,
    private readonly akses: McuAksesService,
  ) {}

  /** Seluruh log notifikasi - untuk halaman monitoring HC. */
  @Get()
  async daftar(
    @Aktor() aktor: AktorMcu,
    @Query('tipe') tipe?: TipeNotifikasiMcu,
    @Query('statusKirim') statusKirim?: StatusKirimNotifikasi,
    @Query('batas') batas?: string,
  ) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    return this.service.daftar({
      tipe,
      statusKirim,
      batas: batas ? Number(batas) : undefined,
    });
  }

  /** Notifikasi milik akun yang sedang login. */
  @Get('saya')
  notifikasiSaya(
    @Aktor() aktor: AktorMcu,
    @Query('belumDibaca') belumDibaca?: string,
  ) {
    return this.service.daftar({
      penerimaId: aktor.id,
      belumDibaca: belumDibaca === 'true',
      batas: 50,
    });
  }

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Post(':id/dibaca')
  tandaiDibaca(
    @Aktor() aktor: AktorMcu,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.tandaiDibaca(id, aktor.id);
  }

  /** Proses antrean email Outlook (SMTP internal). */
  @Post('proses-antrean')
  async prosesAntrean(@Aktor() aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);
    return this.service.prosesAntreanEmail();
  }
}
