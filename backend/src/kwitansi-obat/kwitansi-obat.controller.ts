import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { KwitansiObatService } from './kwitansi-obat.service';

@Controller('kwitansi-obat')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_COMBEN')
export class KwitansiObatController {
  constructor(private readonly service: KwitansiObatService) {}

  @Get('karyawan') daftarKaryawan(@Query('cari') cari?: string) { return this.service.daftarKaryawan(cari); }
  @Get() daftar() { return this.service.daftar(); }
  @Post() buat(@Body() dto: { karyawanId: number; status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }, @Req() req: any) { return this.service.buat(dto, Number(req.user.id)); }
  @Patch(':id/status') ubahStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }) { return this.service.ubahStatus(id, dto); }
  @Patch(':id') edit(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }) { return this.service.ubahStatus(id, dto); }
  @Delete(':id') hapus(@Param('id', ParseIntPipe) id: number) { return this.service.hapus(id); }
}
