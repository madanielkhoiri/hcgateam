import { Module } from '@nestjs/common';
import { MonitoringRkbController } from './monitoring-rkb.controller';
import { MonitoringRkbService } from './monitoring-rkb.service';
import { MonitoringRkbFileService } from './monitoring-rkb-file.service';

@Module({ controllers: [MonitoringRkbController], providers: [MonitoringRkbService, MonitoringRkbFileService] })
export class MonitoringRkbModule {}
