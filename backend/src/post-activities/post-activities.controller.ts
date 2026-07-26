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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import type { Request, Response } from 'express';
import { CreatePostActivityDto } from './dto/create-post-activity.dto';
import { UpdatePostActivityDto } from './dto/update-post-activity.dto';
import { PostActivitiesService } from './post-activities.service';
import { PostActivityPdfService } from './post-activity-pdf.service';
import { AuthGuard } from '@nestjs/passport';

type UploadedPostActivityFiles = {
  photos?: Express.Multer.File[];
};

type AuthenticatedRequest = Request & {
  user?: {
    id?: number | string;
    userId?: number | string;
    sub?: number | string;
    name?: string;
    username?: string;
  };
};

function safeFilename(originalName: string) {
  const extension = extname(originalName).toLowerCase();

  return (
    [
      'post-activity',
      Date.now(),
      Math.round(Math.random() * 1_000_000_000),
    ].join('-') + extension
  );
}

@UseGuards(AuthGuard('jwt'))
@Controller('post-activities')
export class PostActivitiesController {
  constructor(
    private readonly postActivitiesService: PostActivitiesService,
    private readonly postActivityPdfService: PostActivityPdfService,
  ) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postActivitiesService.findAll({
      search,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id/pdf')
  async pdf(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const buffer = await this.postActivityPdfService.generate(id);

    response.setHeader('Content-Type', 'application/pdf');

    response.setHeader(
      'Content-Disposition',
      `inline; filename="post-activity-${id}.pdf"`,
    );

    response.setHeader('Content-Length', String(buffer.length));

    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    response.end(buffer);
  }
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postActivitiesService.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'photos',
          maxCount: 100,
        },
      ],
      {
        storage: diskStorage({
          destination: (_request, _file, callback) => {
            const directory = process.cwd() + '/uploads/post-activities';

            callback(null, directory);
          },
          filename: (_request, file, callback) => {
            callback(null, safeFilename(file.originalname));
          },
        }),
        fileFilter: (_request, file, callback) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/jpg',
          ];

          if (!allowedMimeTypes.includes(file.mimetype)) {
            callback(
              new Error('Foto harus berformat JPG, JPEG, PNG, atau WEBP'),
              false,
            );

            return;
          }

          callback(null, true);
        },
      },
    ),
  )
  create(
    @Body() dto: CreatePostActivityDto,
    @UploadedFiles()
    files: UploadedPostActivityFiles,
    @Req() request: AuthenticatedRequest,
  ) {
    const photoPaths = (files.photos ?? []).map(
      (file) => `/uploads/post-activities/${file.filename}`,
    );
    const actorId = Number(
      request.user?.id ?? request.user?.userId ?? request.user?.sub,
    );

    if (!Number.isInteger(actorId) || actorId <= 0) {
      throw new Error(
        'User login tidak ditemukan pada request. Silakan login ulang.',
      );
    }

    return this.postActivitiesService.create(dto, photoPaths, {
      id: actorId,
      name: request.user?.name ?? request.user?.username ?? 'Administrator',
      username: request.user?.username ?? 'administrator',
    });
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'photos',
          maxCount: 100,
        },
      ],
      {
        storage: diskStorage({
          destination: (_request, _file, callback) => {
            callback(null, process.cwd() + '/uploads/post-activities');
          },
          filename: (_request, file, callback) => {
            callback(null, safeFilename(file.originalname));
          },
        }),
        fileFilter: (_request, file, callback) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/jpg',
          ];

          if (!allowedMimeTypes.includes(file.mimetype)) {
            callback(
              new Error('Foto harus berformat JPG, JPEG, PNG, atau WEBP'),
              false,
            );

            return;
          }

          callback(null, true);
        },
      },
    ),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostActivityDto,
    @Body('retainedPhotoPaths')
    retainedPhotoPathsRaw: string | string[] | undefined,
    @UploadedFiles()
    files: UploadedPostActivityFiles,
  ) {
    const newPhotoPaths = (files.photos ?? []).map(
      (file) => `/uploads/post-activities/${file.filename}`,
    );

    let retainedPhotoPaths: string[] = [];

    if (Array.isArray(retainedPhotoPathsRaw)) {
      retainedPhotoPaths = retainedPhotoPathsRaw;
    } else if (
      typeof retainedPhotoPathsRaw === 'string' &&
      retainedPhotoPathsRaw.trim()
    ) {
      try {
        const parsed: unknown = JSON.parse(retainedPhotoPathsRaw);

        retainedPhotoPaths = Array.isArray(parsed)
          ? parsed.map(String)
          : [retainedPhotoPathsRaw];
      } catch {
        retainedPhotoPaths = [retainedPhotoPathsRaw];
      }
    }

    return this.postActivitiesService.update(
      id,
      dto,
      newPhotoPaths,
      retainedPhotoPaths,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postActivitiesService.remove(id);
  }
}
