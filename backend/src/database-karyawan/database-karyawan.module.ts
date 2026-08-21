import { Module } from '@nestjs/common';
import { McuModule } from '../mcu/mcu.module';
import { DatabaseKaryawanController } from './database-karyawan.controller';

@Module({
  imports: [McuModule],
  controllers: [DatabaseKaryawanController],
})
export class DatabaseKaryawanModule {}