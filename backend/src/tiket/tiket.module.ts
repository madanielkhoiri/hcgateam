import { Module } from '@nestjs/common';
import { TiketController } from './tiket.controller';
import { TiketService } from './tiket.service';
import { TiketFileService } from './tiket-file.service';

@Module({
  controllers: [TiketController],
  providers: [TiketService, TiketFileService],
})
export class TiketModule {}
