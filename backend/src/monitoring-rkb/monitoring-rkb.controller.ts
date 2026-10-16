import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { Aktor, type AktorPostingan } from '../postingan/postingan-aktor';
import { BarangRkbDto, SimpanMonitoringRkbDto, TambahBarangRkbDto } from './dto/monitoring-rkb.dto';
import { MonitoringRkbService } from './monitoring-rkb.service';

@Controller('monitoring-rkb')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_MONITORING_RKB')
export class MonitoringRkbController {
  constructor(private readonly service: MonitoringRkbService) {}
  @Get() daftar(@Query('kategori') kategori?: string, @Query('status') status?: string, @Query('cari') cari?: string) { return this.service.daftar(kategori, status, cari); }
  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) { return this.service.detail(id); }
  @Post() buat(@Aktor() aktor: AktorPostingan, @Body() dto: SimpanMonitoringRkbDto) { return this.service.buat(aktor.id, dto); }
  @Post(':id/barang') tambahBarang(@Param('id', ParseIntPipe) id: number, @Body() dto: TambahBarangRkbDto) { return this.service.tambahBarang(id, dto.barang); }
  @Patch(':id/barang/:barangId') ubahBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number, @Body() dto: BarangRkbDto) { return this.service.ubahBarang(id, barangId, dto); }
  @Delete(':id/barang/:barangId') hapusBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number) { return this.service.hapusBarang(id, barangId); }
  @Patch(':id') ubah(@Param('id', ParseIntPipe) id: number, @Body() dto: SimpanMonitoringRkbDto) { return this.service.ubah(id, dto); }
  @Delete(':id') hapus(@Param('id', ParseIntPipe) id: number) { return this.service.hapus(id); }
}
