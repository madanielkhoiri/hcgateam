import { Module } from '@nestjs/common';
import { KaryawanController } from './karyawan.controller';
import { KaryawanService } from './karyawan.service';

@Module({
  controllers: [KaryawanController],
  providers: [KaryawanService]
})
export class KaryawanModule {}
