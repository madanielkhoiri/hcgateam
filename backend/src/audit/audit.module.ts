import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditAksesService } from './audit-akses.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditAksesService, AuditInterceptor],
  exports: [AuditLogService, AuditInterceptor],
})
export class AuditModule {}
