import { Module } from '@nestjs/common';
import { KipController } from './kip.controller';
import { KipService } from './kip.service';
import { KipAksesService } from './kip-akses.service';
import { KipFileService } from './kip-file.service';

@Module({
  controllers: [KipController],
  providers: [KipService, KipAksesService, KipFileService],
})
export class KipModule {}
