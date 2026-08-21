import { Module } from '@nestjs/common';
import { McuModule } from '../mcu/mcu.module';
import { AnakMagangController } from './anak-magang.controller';
import { AnakMagangService } from './anak-magang.service';

@Module({
  imports: [McuModule],
  controllers: [AnakMagangController],
  providers: [AnakMagangService],
  exports: [AnakMagangService],
})
export class AnakMagangModule {}
