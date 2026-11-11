import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { KwhController } from './kwh.controller';
import { KwhService } from './kwh.service';

@Module({
  imports: [AuditModule],
  controllers: [KwhController],
  providers: [KwhService],
})
export class KwhModule {}
