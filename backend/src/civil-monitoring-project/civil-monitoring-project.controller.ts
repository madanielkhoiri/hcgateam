import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { CivilMonitoringProjectService } from './civil-monitoring-project.service';
import { SimpanMonitoringProjectDto, UbahTahapanProjectDto } from './dto/civil-monitoring-project.dto';

@Controller('civil-monitoring-project')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('CIVIL_MONITORING_PROJECT_TAMBANG')
export class CivilMonitoringProjectController {
  constructor(private readonly service: CivilMonitoringProjectService) {}

  @Get() daftar() { return this.service.daftar(); }
  @Get(':id/riwayat') riwayat(@Param('id', ParseIntPipe) id: number) { return this.service.riwayat(id); }
  @Post() buat(@Req() req: any, @Body() dto: SimpanMonitoringProjectDto) { return this.service.buat(req.user, dto); }
  @Patch(':id/nama') ubahNama(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() dto: SimpanMonitoringProjectDto) { return this.service.ubahNama(id, req.user, dto); }
  @Patch(':id/tahapan') ubahTahapan(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() dto: UbahTahapanProjectDto) { return this.service.ubahTahapan(id, req.user, dto); }
  @Delete(':id') hapus(@Param('id', ParseIntPipe) id: number) { return this.service.hapus(id); }
}
