import { Module } from '@nestjs/common';
import { McuModule } from '../mcu/mcu.module';
import { AnakMagangController } from './anak-magang.controller';
import { AnakMagangService } from './anak-magang.service';
import { AnakMagangDashboardController } from './dashboard/anak-magang-dashboard.controller';
import { AnakMagangDashboardService } from './dashboard/anak-magang-dashboard.service';

@Module({
  imports: [McuModule],
  controllers: [AnakMagangController, AnakMagangDashboardController],
  providers: [AnakMagangService, AnakMagangDashboardService],
  exports: [AnakMagangService],
})
export class AnakMagangModule {}
