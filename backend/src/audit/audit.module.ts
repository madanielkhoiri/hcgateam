import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditAksesService } from './audit-akses.service';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditAksesService],
  exports: [AuditLogService],
})
export class AuditModule {}
