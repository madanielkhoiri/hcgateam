import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DailyActivityImagesService,
  DailyImageCategory,
  DailyImageScope,
} from './daily-activity-images.service';

@Controller('daily-activity-images')
export class DailyActivityImagesController {
  constructor(private readonly imagesService: DailyActivityImagesService) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadProfile(
    @UploadedFile() file: Express.Multer.File,
    @Query('scope') scopeValue?: string,
  ) {
    const scope = this.parseScope(scopeValue);

    const path = await this.imagesService.saveImage(file, scope, 'profiles');

    return {
      path,
      url: this.buildUrl(path),
    };
  }

  @Post('pre-activities')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', undefined, {
      storage: memoryStorage(),
    }),
  )
  async uploadPreActivities(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('scope') scopeValue?: string,
  ) {
    const scope = this.parseScope(scopeValue);

    const paths = await this.imagesService.saveMany(
      files,
      scope,
      'pre-activities',
    );

    return {
      paths,
      files: paths.map((path) => ({
        path,
        url: this.buildUrl(path),
      })),
    };
  }

  @Post('progresses')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', undefined, {
      storage: memoryStorage(),
    }),
  )
  async uploadProgresses(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('scope') scopeValue?: string,
  ) {
    const scope = this.parseScope(scopeValue);

    const paths = await this.imagesService.saveMany(files, scope, 'progresses');

    return {
      paths,
      files: paths.map((path) => ({
        path,
        url: this.buildUrl(path),
      })),
    };
  }

  @Get(':scope/:category/:filename')
  viewImage(
    @Param('scope') scopeValue: string,
    @Param('category') categoryValue: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const scope = this.parseScope(scopeValue);
    const category = this.parseCategory(categoryValue);

    const imagePath = this.imagesService.resolveImage(
      scope,
      category,
      filename,
    );

    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return response.sendFile(imagePath);
  }

  private parseScope(value?: string): DailyImageScope {
    if (value === 'grass-cutting') {
      return 'grass-cutting';
    }

    if (!value || value === 'daily-activities') {
      return 'daily-activities';
    }

    throw new BadRequestException('Scope foto tidak valid');
  }

  private parseCategory(value: string): DailyImageCategory {
    const categories: DailyImageCategory[] = [
      'profiles',
      'pre-activities',
      'progresses',
    ];

    if (!categories.includes(value as DailyImageCategory)) {
      throw new BadRequestException('Kategori foto tidak valid');
    }

    return value as DailyImageCategory;
  }

  private buildUrl(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');

    const scope = parts[1];
    const category = parts[2];
    const filename = parts[3];

    return `/api/daily-activity-images/${scope}/${category}/${filename}`;
  }
}
