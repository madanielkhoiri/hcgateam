import { Body, Controller, Delete, Get, Param, Patch, ParseIntPipe, Query, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { EpromEvaluasiVendorService } from './eprom-evaluasi-vendor.service';
@Controller('eprom/tender/:tenderId/evaluasi-vendor') @UseGuards(JwtAuthGuard) @RequireAccessKey('CIVIL_PROJECT')
export class EpromEvaluasiVendorController {
  constructor(private readonly service: EpromEvaluasiVendorService) {}
  @Get() daftar(@Param('tenderId', ParseIntPipe) id: number) { return this.service.daftar(id); }
  @Patch(':vendorId') @UseInterceptors(FileFieldsInterceptor([{ name: 'admin', maxCount: 10 }, { name: 'hse', maxCount: 10 }], { limits: { fileSize: 2 * 1024 * 1024 } }))
  ubah(@Param('tenderId', ParseIntPipe) id: number, @Param('vendorId', ParseIntPipe) vendorId: number, @Body() body: any, @UploadedFiles() files: any) { return this.service.ubah(id, vendorId, { config: JSON.parse(body.config || '{}'), data: JSON.parse(body.data || '{}') }, files); }
  @Delete(':vendorId/dokumen')
  hapusDokumen(@Param('tenderId', ParseIntPipe) id: number, @Param('vendorId', ParseIntPipe) vendorId: number, @Query('jenis') jenis: string, @Query('index', ParseIntPipe) index: number) { return this.service.hapusDokumen(id, vendorId, jenis, index); }
  @Get('pdf/final') async pdf(@Param('tenderId', ParseIntPipe) id: number, @Res() res: Response) { res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="evaluasi-tender-${id}.pdf"` }); res.send(await this.service.pdfBuffer(id)); }
}
