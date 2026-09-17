// ==================================================
// FILE: backend/src/mcu/retensi/mcu-retensi.controller.ts
// FUNGSI: Endpoint retensi dokumen medis 6 bulan
// ==================================================

import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import { McuRetensiService } from './mcu-retensi.service';

@Controller('mcu/retensi')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_MCU')
export class McuRetensiController {
  constructor(private readonly service: McuRetensiService) {}

  @Get()
  daftarDokumen(@Query('hariKeDepan') hariKeDepan?: string) {
    return this.service.daftarDokumen(hariKeDepan ? Number(hariKeDepan) : 30);
  }

  @Get('ringkasan')
  ringkasan() {
    return this.service.ringkasan();
  }

  @Post('jalankan')
  jalankan(@Aktor() aktor: AktorMcu) {
    return this.service.jalankanPembersihan(aktor);
  }
}
