import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { EpromPerformanceVendorService } from './eprom-performance-vendor.service';

@Controller('eprom/performance-vendor')
@UseGuards(JwtAuthGuard)
export class EpromPerformanceVendorController {
  constructor(private readonly service: EpromPerformanceVendorService) {}

  @Get()
  daftar(@Aktor() aktor: AktorEprom, @Query('bulan') bulan?: string) {
    return this.service.daftar(aktor, bulan);
  }

  @Get(':projectId')
  detail(
    @Aktor() aktor: AktorEprom,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('bulan') bulan?: string,
  ) {
    return this.service.detail(aktor, projectId, bulan);
  }
}
