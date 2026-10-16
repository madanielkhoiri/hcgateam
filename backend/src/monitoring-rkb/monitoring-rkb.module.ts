import { Module } from '@nestjs/common';
import { MonitoringRkbController } from './monitoring-rkb.controller';
import { MonitoringRkbService } from './monitoring-rkb.service';

@Module({ controllers: [MonitoringRkbController], providers: [MonitoringRkbService] })
export class MonitoringRkbModule {}
