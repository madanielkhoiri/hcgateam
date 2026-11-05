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
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { CreateP5mDto } from './dto/create-p5m.dto';
import { UpdateP5mDto } from './dto/update-p5m.dto';
import { P5mPdfService } from './p5m-pdf.service';
import { P5mService } from './p5m.service';
import { OpenP5mDto } from './dto/open-p5m.dto';
import { SubmitP5mAttendanceDto } from './dto/submit-p5m-attendance.dto';
import { ReviewP5mAttendanceDto } from './dto/review-p5m-attendance.dto';
import { RequireAccessKey } from '../auth/require-access-key.decorator';

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
@RequireAccessKey('GA_SAFETY_MEETING')
export class P5mController {
  constructor(
    private readonly service: P5mService,
    private readonly pdfService: P5mPdfService,
  ) {}

  private userId(request: any) {
    return Number(request.user?.id ?? request.user?.userId ?? request.user?.sub);
  }

  private assertManager(request: any) {
    const allowed: UserRole[] = [
      UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SECTION_HEAD, UserRole.PJO,
    ];
    const accessKeys: string[] = request.user?.accessKeys ?? [];
    const punyaAksesPenuh =
      allowed.includes(request.user?.role) ||
      accessKeys.includes('ALL') ||
      accessKeys.includes('GA_SAFETY_MEETING');

    if (!punyaAksesPenuh) {
      throw new ForbiddenException('Akun ini belum diberi akses penuh ke card P5M.');
    }
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() request?: any,
  ) {
    return this.service.findAll({
      search,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      currentUserId: this.userId(request),
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
    this.assertManager(request);
    const createdBy = Number(
      request.user?.id ?? request.user?.userId ?? request.user?.sub,
    );

    return this.service.create(dto, createdBy);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateP5mDto, @Req() request: any) {
    this.assertManager(request);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    this.assertManager(request);
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
    files: Express.Multer.File[], @Req() request: any,
  ) {
    this.assertManager(request);
    return {
      paths: (files ?? []).map((file) => `/uploads/p5m/${file.filename}`),
    };
  }


  @Post(':id/open')
  open(@Param('id', ParseIntPipe) id: number, @Body() dto: OpenP5mDto, @Req() request: any) {
    this.assertManager(request);
    return this.service.open(id, dto.startTime);
  }

  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    this.assertManager(request);
    return this.service.close(id);
  }

  @Post(':id/attendance')
  submitAttendance(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitP5mAttendanceDto, @Req() request: any) {
    return this.service.submitAttendance(id, this.userId(request), dto);
  }

  @Patch(':id/attendance/:attendanceId/review')
  reviewAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
    @Body() dto: ReviewP5mAttendanceDto,
    @Req() request: any,
  ) {
    this.assertManager(request);
    return this.service.reviewAttendance(id, attendanceId, this.userId(request), dto);
  }
}
