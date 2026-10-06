import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { EpromPerformanceVendorService } from './eprom-performance-vendor.service';

@Controller('eprom/performance-vendor')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_PROJECT')
export class EpromPerformanceVendorController {
  constructor(private readonly service: EpromPerformanceVendorService) {}

  @Get()
  daftar(@Aktor() aktor: AktorEprom) {
    return this.service.daftar(aktor);
  }

  @Get(':projectId')
  detail(
    @Aktor() aktor: AktorEprom,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.service.detail(aktor, projectId);
  }
}
