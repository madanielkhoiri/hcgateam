// ==================================================
// FILE: backend/src/mcu/surat/mcu-surat.controller.ts
// FUNGSI: Endpoint surat pengantar MCU
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatusSuratPengantar } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/mcu-aktor';
import type { AktorMcu } from '../common/mcu-aktor';
import { McuSuratService, TerbitkanSuratDto } from './mcu-surat.service';

@Controller('mcu/surat-pengantar')
@UseGuards(JwtAuthGuard)
export class McuSuratController {
  constructor(private readonly service: McuSuratService) {}

  @Get()
  daftar(@Query('status') status?: StatusSuratPengantar) {
    return this.service.daftar({ status });
  }

  @Get('menunggu-terbit')
  jadwalMenungguSurat() {
    return this.service.jadwalMenungguSurat();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post('jadwal/:jadwalId/terbitkan')
  terbitkan(
    @Aktor() aktor: AktorMcu,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Body() dto: TerbitkanSuratDto,
  ) {
    return this.service.terbitkan(jadwalId, dto, aktor);
  }

  @Post(':id/kirim')
  kirim(@Aktor() aktor: AktorMcu, @Param('id', ParseIntPipe) id: number) {
    return this.service.kirim(id, aktor);
  }
}
