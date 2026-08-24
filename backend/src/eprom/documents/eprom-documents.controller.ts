// ==================================================
// FILE: backend/src/eprom/documents/eprom-documents.controller.ts
// FUNGSI: Endpoint folder/file explorer (Upload Dokumen Tender & Legalitas Vendor)
// ==================================================

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import archiver from 'archiver';
import { ScopeDocumentFolder, TipeFileEprom } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatFolderDto, EpromDocumentsService } from './eprom-documents.service';

@Controller('eprom/documents')
@UseGuards(JwtAuthGuard)
export class EpromDocumentsController {
  constructor(private readonly service: EpromDocumentsService) {}

  @Get()
  isiFolder(
    @Aktor() aktor: AktorEprom,
    @Query('scope') scope: ScopeDocumentFolder,
    @Query('tenderId') tenderId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('parentFolderId') parentFolderId?: string,
  ) {
    return this.service.isiFolder(aktor, {
      scope,
      tenderId: tenderId ? Number(tenderId) : undefined,
      vendorId: vendorId ? Number(vendorId) : undefined,
      parentFolderId: parentFolderId ? Number(parentFolderId) : null,
    });
  }

  @Post('folders')
  buatFolder(@Aktor() aktor: AktorEprom, @Body() dto: BuatFolderDto) {
    return this.service.buatFolder(aktor, dto);
  }

  @Patch('folders/:folderId')
  ubahFolder(
    @Aktor() aktor: AktorEprom,
    @Param('folderId', ParseIntPipe) folderId: number,
    @Body('namaFolder') namaFolder: string,
  ) {
    return this.service.ubahFolder(aktor, folderId, namaFolder);
  }

  @Delete('folders/:folderId')
  hapusFolder(@Aktor() aktor: AktorEprom, @Param('folderId', ParseIntPipe) folderId: number) {
    return this.service.hapusFolder(aktor, folderId);
  }

  @Post('folders/:folderId/files')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggahFile(
    @Aktor() aktor: AktorEprom,
    @Param('folderId', ParseIntPipe) folderId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('tipeFile') tipeFile?: TipeFileEprom,
  ) {
    return this.service.unggahFile(aktor, folderId, file, tipeFile);
  }

  @Delete('files/:id')
  hapusFile(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusFile(aktor, id);
  }

  @Get('files/:id/download')
  async unduhSatu(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const { item, absolutePath } = await this.service.fileUntukDiunduh(
      aktor,
      id,
    );

    return response.download(absolutePath, item.namaFile);
  }

  @Get('files/download-all')
  async unduhSemua(
    @Aktor() aktor: AktorEprom,
    @Query('fileIds') fileIds: string,
    @Res() response: Response,
  ) {
    const ids = (fileIds ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      throw new BadRequestException('Pilih minimal satu file untuk diunduh');
    }

    const items = await this.service.fileBanyakUntukDiunduh(aktor, ids);

    await kirimZip(
      response,
      items.map(({ item, absolutePath }) => ({ absolutePath, namaEntriZip: item.namaFile })),
    );
  }

  @Get('download-semua')
  async unduhSemuaDokumenTender(
    @Aktor() aktor: AktorEprom,
    @Query('scope') scope: ScopeDocumentFolder,
    @Query('tenderId') tenderId: string | undefined,
    @Query('vendorId') vendorId: string | undefined,
    @Res() response: Response,
  ) {
    const items = await this.service.semuaFileUntukDiunduh(aktor, {
      scope,
      tenderId: tenderId ? Number(tenderId) : undefined,
      vendorId: vendorId ? Number(vendorId) : undefined,
    });

    await kirimZip(
      response,
      items.map(({ item, absolutePath }) => ({ absolutePath, namaEntriZip: item.namaEntriZip })),
    );
  }
}

async function kirimZip(
  response: Response,
  items: { absolutePath: string; namaEntriZip: string }[],
): Promise<void> {
  response.setHeader('Content-Type', 'application/zip');
  response.setHeader('Content-Disposition', 'attachment; filename="dokumen-eprom.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(response);

  for (const { absolutePath, namaEntriZip } of items) {
    archive.file(absolutePath, { name: namaEntriZip });
  }

  await archive.finalize();
}
