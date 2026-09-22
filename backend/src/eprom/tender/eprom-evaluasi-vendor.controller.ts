// ==================================================
// FILE: backend/src/eprom/tender/eprom-evaluasi-vendor.controller.ts
// FUNGSI: Endpoint Evaluasi Vendor (eksternal)
// ==================================================

import { Body, Controller, Get, Param, Patch, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { EpromEvaluasiVendorService, UbahEvaluasiVendorDto } from './eprom-evaluasi-vendor.service';

@Controller('eprom/tender/:tenderId/evaluasi-vendor')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_PROJECT')
export class EpromEvaluasiVendorController {
  constructor(private readonly service: EpromEvaluasiVendorService) {}

  @Get()
  daftar(@Param('tenderId', ParseIntPipe) tenderId: number) {
    return this.service.daftar(tenderId);
  }

  @Patch(':vendorId')
  ubah(
    @Param('tenderId', ParseIntPipe) tenderId: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() dto: UbahEvaluasiVendorDto,
  ) {
    return this.service.ubah(tenderId, vendorId, dto);
  }
}
