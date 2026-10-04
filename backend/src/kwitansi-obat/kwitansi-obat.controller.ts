import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { KwitansiObatService } from './kwitansi-obat.service';

@Controller('kwitansi-obat')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_KWITANSI_OBAT')
export class KwitansiObatController {
  constructor(private readonly service: KwitansiObatService) {}

  private cekAkses(req: any) {
    if (req?.user?.role === 'ADMIN_DEPT') throw new ForbiddenException('Admin Departemen tidak memiliki akses Kwitansi Obat');
  }

  @Get('karyawan') daftarKaryawan(@Query('cari') cari?: string, @Req() req?: any) { this.cekAkses(req); return this.service.daftarKaryawan(cari); }
  @Get() daftar(@Req() req: any) { this.cekAkses(req); return this.service.daftar(); }
  @Post() buat(@Body() dto: { karyawanId: number; status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }, @Req() req: any) { this.cekAkses(req); return this.service.buat(dto, Number(req.user.id)); }
  @Patch(':id/status') ubahStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }, @Req() req: any) { this.cekAkses(req); return this.service.ubahStatus(id, dto); }
  @Patch(':id') edit(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }, @Req() req: any) { this.cekAkses(req); return this.service.ubahStatus(id, dto); }
  @Delete(':id') hapus(@Param('id', ParseIntPipe) id: number, @Req() req: any) { this.cekAkses(req); return this.service.hapus(id); }
}

