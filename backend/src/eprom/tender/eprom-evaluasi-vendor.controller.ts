import { Body, Controller, Delete, Get, Param, Patch, ParseIntPipe, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { EpromEvaluasiVendorService } from './eprom-evaluasi-vendor.service';
@Controller('eprom/tender/:tenderId/evaluasi-vendor') @UseGuards(JwtAuthGuard) @RequireAccessKey('CIVIL_PROJECT')
export class EpromEvaluasiVendorController {
  constructor(private readonly service: EpromEvaluasiVendorService) {}
  @Get() daftar(@Param('tenderId', ParseIntPipe) id: number, @Req() req: any) { return this.service.daftar(id, req.user); }
  @Patch(':vendorId') @UseInterceptors(FileFieldsInterceptor([{ name: 'admin', maxCount: 50 }, { name: 'hse', maxCount: 50 }], { limits: { fileSize: 2 * 1024 * 1024 } }))
  ubah(@Param('tenderId', ParseIntPipe) id: number, @Param('vendorId', ParseIntPipe) vendorId: number, @Body() body: any, @UploadedFiles() files: any, @Req() req: any) { return this.service.ubah(id, vendorId, { config: JSON.parse(body.config || '{}'), data: JSON.parse(body.data || '{}') }, req.user, files); }
  @Patch(':vendorId/finalisasi')
  finalisasi(@Param('tenderId', ParseIntPipe) id: number, @Param('vendorId', ParseIntPipe) vendorId: number, @Req() req: any) { return this.service.finalisasi(id, vendorId, req.user); }
  @Delete(':vendorId/dokumen')
  hapusDokumen(@Param('tenderId', ParseIntPipe) id: number, @Param('vendorId', ParseIntPipe) vendorId: number, @Query('jenis') jenis: string, @Query('index', ParseIntPipe) index: number, @Req() req: any) { return this.service.hapusDokumen(id, vendorId, jenis, index, req.user); }
  @Get('pdf/final') async pdf(@Param('tenderId', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) { res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="evaluasi-tender-${id}.pdf"` }); res.send(await this.service.pdfBuffer(id, req.user)); }
}
