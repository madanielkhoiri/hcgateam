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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateP5mDto } from './dto/create-p5m.dto';
import { UpdateP5mDto } from './dto/update-p5m.dto';
import { P5mPdfService } from './p5m-pdf.service';
import { P5mService } from './p5m.service';

const uploadDirectory = resolve(process.cwd(), 'uploads', 'p5m');

if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const uploadStorage = diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_request, file, callback) => {
    const extension = extname(file.originalname) || '.jpg';

    const random = Math.random().toString(36).slice(2, 10);

    callback(null, `${Date.now()}-${random}${extension.toLowerCase()}`);
  },
});

@Controller('p5m')
@UseGuards(JwtAuthGuard)
export class P5mController {
  constructor(
    private readonly service: P5mService,
    private readonly pdfService: P5mPdfService,
  ) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get(':id/pdf')
  async pdf(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const buffer = await this.pdfService.generate(id);

    response.setHeader('Content-Type', 'application/pdf');

    response.setHeader(
      'Content-Disposition',
      `inline; filename="P5M-${id}.pdf"`,
    );

    response.send(buffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateP5mDto, @Req() request: any) {
    const createdBy = Number(
      request.user?.id ?? request.user?.userId ?? request.user?.sub,
    );

    return this.service.create(dto, createdBy);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateP5mDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      storage: uploadStorage,

      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('Dokumentasi wajib berupa gambar.'), false);

          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return {
      paths: (files ?? []).map((file) => `/uploads/p5m/${file.filename}`),
    };
  }
}
