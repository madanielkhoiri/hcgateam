import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { KwitansiObatService } from './kwitansi-obat.service';

@Controller('kwitansi-obat')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_KWITANSI_OBAT')
export class KwitansiObatController {
  constructor(private readonly service: KwitansiObatService) {}

  private cekAkses(req: any) {
    if (req?.user?.role === 'ADMIN_DEPT')
      throw new ForbiddenException(
        'Admin Departemen tidak memiliki akses Kwitansi Obat',
      );
  }

  @Get('karyawan') daftarKaryawan(
    @Query('cari') cari?: string,
    @Req() req?: any,
  ) {
    this.cekAkses(req);
    return this.service.daftarKaryawan(cari);
  }

  @Post('preview-import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  previewImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    this.cekAkses(req);
    if (!file?.buffer) throw new ForbiddenException('File Excel wajib dipilih');
    return this.service.previewImport(file.buffer);
  }

  @Post('massal')
  importMassal(
    @Body()
    dto: {
      data?: Array<{
        nrp?: string;
        status?: 'DISETUJUI' | 'DITRANSFER';
        nominal?: number;
      }>;
      kirimNotifikasi?: boolean;
    },
    @Req() req: any,
  ) {
    this.cekAkses(req);
    return this.service.importMassal(dto, Number(req.user.id));
  }

  @Get() daftar(@Req() req: any) {
    this.cekAkses(req);
    return this.service.daftar();
  }
  @Post() buat(
    @Body()
    dto: {
      karyawanId: number;
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal?: number;
      alasan?: string;
    },
    @Req() req: any,
  ) {
    this.cekAkses(req);
    return this.service.buat(dto, Number(req.user.id));
  }
  @Patch(':id/status') ubahStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal?: number;
      alasan?: string;
    },
    @Req() req: any,
  ) {
    this.cekAkses(req);
    return this.service.ubahStatus(id, dto);
  }
  @Patch(':id') edit(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal?: number;
      alasan?: string;
    },
    @Req() req: any,
  ) {
    this.cekAkses(req);
    return this.service.ubahStatus(id, dto);
  }
  @Delete(':id') hapus(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.cekAkses(req);
    return this.service.hapus(id);
  }
}
