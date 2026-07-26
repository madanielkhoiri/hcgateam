import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateP5mDto } from './dto/create-p5m.dto';
import { UpdateP5mDto } from './dto/update-p5m.dto';

@Injectable()
export class P5mService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeStringArray(values?: string[]): string[] {
    return (values ?? []).map((value) => value.trim()).filter(Boolean);
  }

  private normalizeSupervisors(values?: string[]): string[] {
    return Array.from(
      new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
    );
  }

  async findAll(params: {
    search?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);

    const where: Prisma.P5mMeetingWhereInput = {};

    if (params.search?.trim()) {
      const search = params.search.trim();

      where.OR = [
        {
          topic: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          speaker: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          participants: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (params.year) {
      const startMonth = params.month ? params.month - 1 : 0;

      const startDate = new Date(Date.UTC(params.year, startMonth, 1));

      const endDate = params.month
        ? new Date(Date.UTC(params.year, params.month, 1))
        : new Date(Date.UTC(params.year + 1, 0, 1));

      where.activityDate = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.p5mMeeting.findMany({
        where,
        orderBy: [
          {
            activityDate: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      this.prisma.p5mMeeting.count({
        where,
      }),
    ]);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async findOne(id: number) {
    const row = await this.prisma.p5mMeeting.findUnique({
      where: {
        id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Data P5M tidak ditemukan.');
    }

    return row;
  }

  async create(dto: CreateP5mDto, createdBy: number) {
    const supervisors = this.normalizeSupervisors(dto.supervisors);
    const documentationPaths = this.normalizeStringArray(
      dto.documentationPaths,
    ).slice(0, 4);

    return this.prisma.p5mMeeting.create({
      data: {
        activityDate: new Date(`${dto.activityDate}T00:00:00.000Z`),
        location: dto.location.trim(),
        speaker: dto.speaker.trim(),
        participants: dto.participants.trim(),
        topic: dto.topic.trim(),
        supervisors,
        documentationPaths,
        notes: dto.notes?.trim() || null,

        /*
         * Kolom lama tetap diberi nilai agar tabel PostgreSQL
         * yang sudah ada tetap kompatibel.
         */
        startTime: '00:00',
        endTime: null,
        supervisorName: supervisors[0] ?? '',
        supervisorSignPath: null,
        participantNames: [],
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdateP5mDto) {
    await this.findOne(id);

    const supervisors =
      dto.supervisors !== undefined
        ? this.normalizeSupervisors(dto.supervisors)
        : undefined;

    const documentationPaths =
      dto.documentationPaths !== undefined
        ? this.normalizeStringArray(dto.documentationPaths).slice(0, 4)
        : undefined;

    return this.prisma.p5mMeeting.update({
      where: {
        id,
      },
      data: {
        ...(dto.activityDate !== undefined
          ? {
              activityDate: new Date(`${dto.activityDate}T00:00:00.000Z`),
            }
          : {}),

        ...(dto.location !== undefined
          ? {
              location: dto.location.trim(),
            }
          : {}),

        ...(dto.speaker !== undefined
          ? {
              speaker: dto.speaker.trim(),
            }
          : {}),

        ...(dto.participants !== undefined
          ? {
              participants: dto.participants.trim(),
            }
          : {}),

        ...(dto.topic !== undefined
          ? {
              topic: dto.topic.trim(),
            }
          : {}),

        ...(supervisors !== undefined
          ? {
              supervisors,
              supervisorName: supervisors[0] ?? '',
            }
          : {}),

        ...(documentationPaths !== undefined
          ? {
              documentationPaths,
            }
          : {}),

        ...(dto.notes !== undefined
          ? {
              notes: dto.notes.trim() || null,
            }
          : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.p5mMeeting.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Data P5M berhasil dihapus.',
    };
  }
}
