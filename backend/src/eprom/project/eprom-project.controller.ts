// ==================================================
// FILE: backend/src/eprom/project/eprom-project.controller.ts
// FUNGSI: Endpoint daftar & detail Project
// ==================================================

import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { EpromProjectService } from './eprom-project.service';

@Controller('eprom/projects')
@UseGuards(JwtAuthGuard)
export class EpromProjectController {
  constructor(private readonly service: EpromProjectService) {}

  @Get()
  daftar(@Aktor() aktor: AktorEprom) {
    return this.service.daftar(aktor);
  }

  @Get(':id')
  detail(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(aktor, id);
  }
}
