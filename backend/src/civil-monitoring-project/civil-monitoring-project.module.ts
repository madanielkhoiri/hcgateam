import { Module } from '@nestjs/common';
import { CivilMonitoringProjectController } from './civil-monitoring-project.controller';
import { CivilMonitoringProjectService } from './civil-monitoring-project.service';

@Module({ controllers: [CivilMonitoringProjectController], providers: [CivilMonitoringProjectService] })
export class CivilMonitoringProjectModule {}
