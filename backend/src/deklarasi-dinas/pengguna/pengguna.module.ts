import { Module } from '@nestjs/common';
import { PenggunaController } from './pengguna.controller';
import { PenggunaService } from './pengguna.service';

@Module({
  controllers: [PenggunaController],
  providers: [PenggunaService],
  exports: [PenggunaService],
})
export class PenggunaModule {}
