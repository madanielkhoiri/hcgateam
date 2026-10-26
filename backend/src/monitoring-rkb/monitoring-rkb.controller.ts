import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { Aktor, type AktorPostingan } from '../postingan/postingan-aktor';
import { BarangRkbDto, SimpanMonitoringRkbDto, SimpanProjectRkbDto, TambahBarangRkbDto, UbahKeteranganRkbDto, UbahStatusRkbDto } from './dto/monitoring-rkb.dto';
import { MonitoringRkbService } from './monitoring-rkb.service';

@Controller('monitoring-rkb')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_MONITORING_RKB')
export class MonitoringRkbController {
  constructor(private readonly service: MonitoringRkbService) {}
  @Get() daftar(@Query('kategori') kategori?: string, @Query('status') status?: string, @Query('cari') cari?: string, @Query('projectId') projectId?: string) { return this.service.daftar(kategori, status, cari, projectId ? Number(projectId) : undefined); }
  @Get('projects') daftarProject() { return this.service.daftarProject(); }
  @Get('projects/:id') detailProject(@Param('id', ParseIntPipe) id: number) { return this.service.detailProject(id); }
  @Post('projects') buatProject(@Aktor() aktor: AktorPostingan, @Body() dto: SimpanProjectRkbDto) { return this.service.buatProject(aktor.id, dto); }
  @Patch('projects/:id') ubahProject(@Param('id', ParseIntPipe) id: number, @Body() dto: SimpanProjectRkbDto) { return this.service.ubahProject(id, dto); }
  @Delete('projects/:id') hapusProject(@Param('id', ParseIntPipe) id: number) { return this.service.hapusProject(id); }
  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) { return this.service.detail(id); }
  @Post() buat(@Aktor() aktor: AktorPostingan, @Body() dto: SimpanMonitoringRkbDto) { return this.service.buat(aktor.id, dto); }
  @Post(':id/barang') tambahBarang(@Param('id', ParseIntPipe) id: number, @Body() dto: TambahBarangRkbDto) { return this.service.tambahBarang(id, dto.barang); }
  @Patch(':id/barang/:barangId') ubahBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number, @Body() dto: BarangRkbDto) { return this.service.ubahBarang(id, barangId, dto); }
  @Post(':id/barang/:barangId/foto')
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  unggahFotoBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number, @UploadedFile() foto?: Express.Multer.File) { return this.service.unggahFotoBarang(id, barangId, foto); }
  @Patch(':id/barang/:barangId/status') ubahStatusBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number, @Body() dto: UbahStatusRkbDto) { return this.service.ubahStatusBarang(id, barangId, dto.status); }
  @Patch(':id/barang/:barangId/keterangan') ubahKeteranganBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number, @Body() dto: UbahKeteranganRkbDto) { return this.service.ubahKeteranganBarang(id, barangId, dto.keterangan ?? null); }
  @Delete(':id/barang/:barangId') hapusBarang(@Param('id', ParseIntPipe) id: number, @Param('barangId', ParseIntPipe) barangId: number) { return this.service.hapusBarang(id, barangId); }
  @Patch(':id/status') ubahStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahStatusRkbDto) { return this.service.ubahStatus(id, dto.status); }
  @Patch(':id') ubah(@Param('id', ParseIntPipe) id: number, @Body() dto: SimpanMonitoringRkbDto) { return this.service.ubah(id, dto); }
  @Delete(':id') hapus(@Param('id', ParseIntPipe) id: number) { return this.service.hapus(id); }
}
