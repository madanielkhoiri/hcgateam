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
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { TolakWorkOrderDto } from './dto/tolak-work-order.dto';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderPdfService } from './work-order-pdf.service';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    username: string;
    role: UserRole;
  };
};

const uploadDirectory = join(process.cwd(), 'uploads', 'work-orders');

if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const workOrderImagesInterceptor = FilesInterceptor('images', 50, {
  storage: diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase() || '.webp';

      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (_request, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Foto hanya boleh JPG, PNG, atau WEBP'),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(
    private readonly service: WorkOrdersService,
    private readonly pdfService: WorkOrderPdfService,
  ) {}

  @Get('dashboard')
  dashboard(
    @Query('month') monthValue?: string,
    @Query('year') yearValue?: string,
  ) {
    const currentDate = new Date();

    const normalizedMonth = String(monthValue ?? 'all')
      .trim()
      .toLowerCase();

    const month =
      normalizedMonth === 'all' || normalizedMonth === 'semua'
        ? null
        : Number(normalizedMonth);

    const year = Number(yearValue ?? currentDate.getFullYear());

    return this.service.getDashboard(month, year);
  }
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('available-for-handover')
  findAvailableForHandover() {
    return this.service.findAvailableForHandover();
  }

  @Get('images/:filename')
  getImage(@Param('filename') filename: string, @Res() response: Response) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

    return response.sendFile(safeFilename, {
      root: uploadDirectory,
    });
  }

  @Get(':id/pdf')
  downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    return this.pdfService.streamPdf(id, response);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateWorkOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.create(dto, request.user.id);
  }

  @Post(':id/images')
  @UseInterceptors(workOrderImagesInterceptor)
  uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Pilih minimal satu foto');
    }

    return this.service.addImages(
      id,
      files.map((file) => file.filename),
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(id, dto, request.user.id);
  }

  @Patch(':id/setujui')
  setujui(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.setujui(id, request.user);
  }

  @Patch(':id/tolak')
  tolak(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TolakWorkOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.tolak(id, dto, request.user);
  }

  @Delete(':id/images/:filename')
  async removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
  ) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

    const result = await this.service.removeImage(id, safeFilename);

    const filePath = join(uploadDirectory, safeFilename);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    return result;
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
