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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePackMealOrderDto } from './dto/create-pack-meal-order.dto';
import { UpdatePackMealOrderDto } from './dto/update-pack-meal-order.dto';
import { OrderPackMealService } from './order-pack-meal.service';

type AuthRequest = {
  user: {
    id: number;
    username: string;
    role: UserRole;
  };
};

const uploadDirectory = 'uploads/order-pack-meal';
mkdirSync(uploadDirectory, { recursive: true });

const approvedFormUpload = FileInterceptor('approvedForm', {
  storage: diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();

      callback(
        null,
        `approved-form-${Date.now()}-${Math.round(
          Math.random() * 1_000_000,
        )}${extension}`,
      );
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new BadRequestException(
          'Form approved wajib berupa PDF, JPG, PNG, atau WEBP',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

@Controller('order-pack-meal')
@UseGuards(JwtAuthGuard)
export class OrderPackMealController {
  constructor(private readonly service: OrderPackMealService) {}

  @Get()
  findAll(@Req() request: AuthRequest, @Query('search') search?: string) {
    return this.service.findAll(request.user, search);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.service.findOne(id, request.user);
  }

  @Post()
  @UseInterceptors(approvedFormUpload)
  create(
    @Body() dto: CreatePackMealOrderDto,
    @UploadedFile() approvedForm: Express.Multer.File | undefined,
    @Req() request: AuthRequest,
  ) {
    if (!approvedForm) {
      throw new BadRequestException('Form approved wajib diunggah');
    }

    return this.service.create(
      dto,
      `/uploads/order-pack-meal/${approvedForm.filename}`,
      request.user,
    );
  }

  @Patch(':id')
  @UseInterceptors(approvedFormUpload)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackMealOrderDto,
    @UploadedFile() approvedForm: Express.Multer.File | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.service.update(
      id,
      dto,
      approvedForm
        ? `/uploads/order-pack-meal/${approvedForm.filename}`
        : undefined,
      request.user,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.service.remove(id, request.user);
  }
}
