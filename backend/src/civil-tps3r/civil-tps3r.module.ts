// ==================================================
// FILE: backend/src/civil-tps3r/civil-tps3r.module.ts
// FUNGSI: Modul Laporan Timbangan Sampah TPS 3R (Civil Infras)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CivilTps3rController } from './civil-tps3r.controller';
import { CivilTps3rService } from './civil-tps3r.service';
import { CivilTps3rFileService } from './civil-tps3r-file.service';

@Module({
  imports: [PrismaModule],
  controllers: [CivilTps3rController],
  providers: [CivilTps3rService, CivilTps3rFileService],
})
export class CivilTps3rModule {}
