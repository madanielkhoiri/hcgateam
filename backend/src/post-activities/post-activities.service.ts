import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, join, normalize } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostActivityDto } from './dto/create-post-activity.dto';
import { UpdatePostActivityDto } from './dto/update-post-activity.dto';

type Actor = {
  id: number;
  name: string;
  username: string;
};

@Injectable()
export class PostActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));

    const where: Prisma.PostActivityWhereInput = {};

    if (params.search?.trim()) {
      const search = params.search.trim();

      where.OR = [
        {
          workName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          creator: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (params.month || params.year) {
      const now = new Date();
      const year = params.year || now.getFullYear();

      if (params.month) {
        where.activityDate = {
          gte: new Date(Date.UTC(year, params.month - 1, 1)),
          lt: new Date(Date.UTC(year, params.month, 1)),
        };
      } else {
        where.activityDate = {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        };
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.postActivity.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.postActivity.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: number) {
    const data = await this.prisma.postActivity.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Data Post Activity tidak ditemukan');
    }

    return data;
  }

  async create(dto: CreatePostActivityDto, photoPaths: string[], actor: Actor) {
    this.validateTime(dto.startTime, dto.endTime);

    if (!photoPaths.length) {
      throw new BadRequestException('Minimal satu foto wajib diunggah');
    }

    return this.prisma.postActivity.create({
      data: {
        activityDate: new Date(dto.activityDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        workName: dto.workName.trim().toUpperCase(),
        progressPercent: Number(dto.progressPercent),
        morningWeather: dto.morningWeather,
        afternoonWeather: dto.afternoonWeather,
        eveningWeather: dto.eveningWeather,
        coordinatorCount: Number(dto.coordinatorCount ?? 1),
        carpenterCount: Number(dto.carpenterCount ?? 1),
        helperCount: Number(dto.helperCount ?? 1),
        approverName: dto.approverName?.trim().toUpperCase() || 'ARIEF RAHIM',
        photoPaths,
        createdBy: actor.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    dto: UpdatePostActivityDto,
    newPhotoPaths: string[],
    retainedPhotoPaths: string[],
  ) {
    const current = await this.findOne(id);

    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;

    this.validateTime(startTime, endTime);

    const retained = current.photoPaths.filter((path) =>
      retainedPhotoPaths.includes(path),
    );

    const finalPhotos = [...retained, ...newPhotoPaths];

    if (!finalPhotos.length) {
      throw new BadRequestException('Minimal satu foto wajib tersedia');
    }

    const deleted = current.photoPaths.filter(
      (path) => !finalPhotos.includes(path),
    );

    const result = await this.prisma.postActivity.update({
      where: { id },
      data: {
        ...(dto.activityDate
          ? {
              activityDate: new Date(dto.activityDate),
            }
          : {}),
        ...(dto.startTime ? { startTime: dto.startTime } : {}),
        ...(dto.endTime ? { endTime: dto.endTime } : {}),
        ...(dto.workName
          ? {
              workName: dto.workName.trim().toUpperCase(),
            }
          : {}),
        ...(dto.progressPercent !== undefined
          ? {
              progressPercent: Number(dto.progressPercent),
            }
          : {}),
        ...(dto.morningWeather
          ? {
              morningWeather: dto.morningWeather,
            }
          : {}),
        ...(dto.afternoonWeather
          ? {
              afternoonWeather: dto.afternoonWeather,
            }
          : {}),
        ...(dto.eveningWeather
          ? {
              eveningWeather: dto.eveningWeather,
              coordinatorCount: Number(dto.coordinatorCount ?? 1),
              carpenterCount: Number(dto.carpenterCount ?? 1),
              helperCount: Number(dto.helperCount ?? 1),
              approverName:
                dto.approverName?.trim().toUpperCase() || 'ARIEF RAHIM',
            }
          : {}),
        photoPaths: finalPhotos,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    this.deleteFiles(deleted);

    return result;
  }

  async remove(id: number) {
    const current = await this.findOne(id);

    await this.prisma.postActivity.delete({
      where: { id },
    });

    this.deleteFiles(current.photoPaths);

    return {
      message: 'Post Activity berhasil dihapus',
    };
  }

  getUploadDirectory() {
    const directory = join(process.cwd(), 'uploads', 'post-activities');

    if (!existsSync(directory)) {
      mkdirSync(directory, {
        recursive: true,
      });
    }

    return directory;
  }

  private validateTime(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException(
        'Jam selesai harus lebih besar dari jam mulai',
      );
    }
  }

  private deleteFiles(paths: string[]) {
    for (const rawPath of paths) {
      try {
        const cleaned = normalize(rawPath)
          .replace(/^[/\\]+/, '')
          .replace(/^uploads[/\\]/i, '');

        const directPath = join(process.cwd(), 'uploads', cleaned);

        const fallbackPath = join(
          process.cwd(),
          'uploads',
          'post-activities',
          basename(cleaned),
        );

        if (existsSync(directPath)) {
          unlinkSync(directPath);
        } else if (existsSync(fallbackPath)) {
          unlinkSync(fallbackPath);
        }
      } catch {
        // Data tetap dapat dihapus.
      }
    }
  }
}
