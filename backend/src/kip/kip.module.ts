import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { KipController } from './kip.controller';
import { KipService } from './kip.service';
import { KipAksesService } from './kip-akses.service';
import { KipFileService } from './kip-file.service';

@Module({
  imports: [AuditModule],
  controllers: [KipController],
  providers: [KipService, KipAksesService, KipFileService],
})
export class KipModule {}
