import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  BadRequestException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePreActivityCheckDto } from './dto/create-pre-activity-check.dto';
import { UpdatePreActivityCheckDto } from './dto/update-pre-activity-check.dto';
import { PreActivityCheckPdfService } from './pre-activity-check-pdf.service';
import { PreActivityChecksService } from './pre-activity-checks.service';

type AuthRequest = {
  user: {
    id: number;
    username: string;
  };
};

const uploadStorage = diskStorage({
  destination: 'uploads/pre-activity-checks',
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();

    callback(
      null,
      `pre-activity-check-${Date.now()}-${Math.round(
        Math.random() * 1_000_000,
      )}${extension}`,
    );
  },
});

@Controller('pre-activity-checks')
@UseGuards(JwtAuthGuard)
export class PreActivityChecksController {
  constructor(
    private readonly service: PreActivityChecksService,
    private readonly pdfService: PreActivityCheckPdfService,
  ) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findAll(
      search,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePreActivityCheckDto, @Req() request: AuthRequest) {
    return this.service.create(dto, request.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePreActivityCheckDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('upload/:category')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: uploadStorage,
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('File wajib berupa gambar'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @Param('category') category: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const file = files?.[0];

    if (!file) {
      throw new BadRequestException('File gambar wajib diunggah');
    }

    return {
      category,
      path: `/uploads/pre-activity-checks/${file.filename}`,
      paths: files.map(
        (item) => `/uploads/pre-activity-checks/${item.filename}`,
      ),
    };
  }

  @Get(':id/pdf')
  async pdf(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const buffer = await this.pdfService.generate(id);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="pre-activity-check-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    response.end(buffer);
  }
}
