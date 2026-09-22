import { Module } from '@nestjs/common';
import { McuModule } from '../mcu/mcu.module';
import { DatabaseKaryawanController } from './database-karyawan.controller';
import { DatabaseKaryawanDashboardController } from './dashboard/database-karyawan-dashboard.controller';
import { DatabaseKaryawanDashboardService } from './dashboard/database-karyawan-dashboard.service';

@Module({
  imports: [McuModule],
  controllers: [DatabaseKaryawanController, DatabaseKaryawanDashboardController],
  providers: [DatabaseKaryawanDashboardService],
})
export class DatabaseKaryawanModule {}