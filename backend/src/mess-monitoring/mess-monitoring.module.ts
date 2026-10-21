import { Module } from '@nestjs/common';
import { MessMonitoringController } from './mess-monitoring.controller';
import { MessMonitoringService } from './mess-monitoring.service';
@Module({ controllers: [MessMonitoringController], providers: [MessMonitoringService] })
export class MessMonitoringModule {}
