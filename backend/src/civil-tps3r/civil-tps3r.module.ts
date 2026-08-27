// ==================================================
// FILE: backend/src/civil-tps3r/civil-tps3r.module.ts
// FUNGSI: Modul Laporan Timbangan Sampah TPS 3R (Civil Infras)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CivilTps3rController } from './civil-tps3r.controller';
import { CivilTps3rService } from './civil-tps3r.service';

@Module({
  imports: [PrismaModule],
  controllers: [CivilTps3rController],
  providers: [CivilTps3rService],
})
export class CivilTps3rModule {}
