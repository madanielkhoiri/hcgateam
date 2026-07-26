import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyActivityStatus,
  DailyActivityType,
  DailyApprovalDecision,
  DailyApprovalStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyActivityDto } from './dto/create-daily-activity.dto';
import { EditDailyActivityDto } from './dto/edit-daily-activity.dto';
import { UpdateDailyActivityProgressDto } from './dto/update-daily-activity-progress.dto';
import { DailyActivityImagesService } from './daily-activity-images.service';

type Actor = {
  id: number;
  username: string;
  role: UserRole;
};

@Injectable()
export class DailyActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imagesService: DailyActivityImagesService,
  ) {}

  async findAll(
    activityType?: DailyActivityType,
    status?: DailyActivityStatus,
  ) {
    return this.prisma.dailyActivity.findMany({
      where: {
        ...(activityType ? { activityType } : {}),
        ...(status ? { status } : {}),
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
        _count: {
          select: {
            progressHistories: true,
            approvals: true,
          },
        },
      },
      orderBy: [
        {
          lastProgressDate: 'desc',
        },
        {
          startDate: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const activity = await this.prisma.dailyActivity.findUnique({
      where: {
        id,
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
        progressHistories: {
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
          orderBy: [
            {
              progressDate: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        },
        approvals: {
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
          orderBy: {
            actedAt: 'asc',
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Daily Activity tidak ditemukan');
    }

    return activity;
  }

  async create(dto: CreateDailyActivityDto, actor: Actor) {
    if (!dto.profilePhotoPath?.trim()) {
      throw new BadRequestException(
        'Satu foto lokasi sebelum dikerjakan wajib diunggah',
      );
    }

    if (!dto.preActivityPhotoPaths?.length) {
      throw new BadRequestException('Foto Pre-Activity wajib diunggah');
    }

    const initialProgress = Number(dto.initialProgress);

    return this.prisma.$transaction(async (transaction) => {
      const activity = await transaction.dailyActivity.create({
        data: {
          activityType: dto.activityType,
          startDate: new Date(dto.startDate),
          lastProgressDate: new Date(dto.startDate),
          workName: dto.workName.trim(),
          location: dto.location.trim(),
          description: dto.description?.trim() || null,
          profilePhotoPath: dto.profilePhotoPath,
          preActivityPhotoPaths: dto.preActivityPhotoPaths,
          currentProgress: initialProgress,
          lastPic: dto.pic.trim(),
          status:
            initialProgress > 0
              ? DailyActivityStatus.ON_PROGRESS
              : DailyActivityStatus.OPEN,
          approvalStatus: DailyApprovalStatus.NONE,
          createdBy: actor.id,
        },
      });

      await transaction.dailyActivityProgress.create({
        data: {
          activityId: activity.id,
          progressDate: new Date(dto.startDate),
          previousProgress: 0,
          addedProgress: initialProgress,
          currentProgress: initialProgress,
          pic: dto.pic.trim(),
          notes: dto.initialNotes?.trim() || 'Pembuatan awal Daily Activity',
          preActivityPhotoPaths: dto.preActivityPhotoPaths,
          photoPaths: [],
          requestClose: false,
          createdBy: actor.id,
        },
      });

      return transaction.dailyActivity.findUnique({
        where: {
          id: activity.id,
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
          progressHistories: true,
        },
      });
    });
  }

  async edit(id: number, dto: EditDailyActivityDto) {
    const activity = await this.findActivity(id);

    if (activity.status === DailyActivityStatus.CLOSE) {
      throw new BadRequestException(
        'Pekerjaan yang sudah CLOSE tidak dapat diedit',
      );
    }

    return this.prisma.dailyActivity.update({
      where: {
        id,
      },
      data: {
        ...(dto.startDate
          ? {
              startDate: new Date(dto.startDate),
            }
          : {}),
        ...(dto.workName !== undefined
          ? {
              workName: dto.workName.trim(),
            }
          : {}),
        ...(dto.location !== undefined
          ? {
              location: dto.location.trim(),
            }
          : {}),
        ...(dto.description !== undefined
          ? {
              description: dto.description.trim() || null,
            }
          : {}),
      },
    });
  }

  async addProgress(
    id: number,
    dto: UpdateDailyActivityProgressDto,
    photoPaths: string[],
    actor: Actor,
  ) {
    const activity = await this.findActivity(id);

    if (activity.status === DailyActivityStatus.CLOSE) {
      throw new BadRequestException(
        'Pekerjaan sudah CLOSE dan tidak dapat diperbarui',
      );
    }

    if (activity.status === DailyActivityStatus.WAITING_APPROVAL) {
      throw new BadRequestException('Pekerjaan sedang menunggu approval');
    }
    if (!dto.preActivityPhotoPaths?.length) {
      throw new BadRequestException(
        'Foto Pre-Activity hari ini wajib diunggah',
      );
    }

    if (!photoPaths.length) {
      throw new BadRequestException('Foto progress wajib diunggah');
    }

    const addedProgress = Number(dto.addedProgress);
    const nextProgress = activity.currentProgress + addedProgress;

    if (nextProgress > 100) {
      throw new BadRequestException(
        `Progress maksimal 100%. Progress saat ini ${activity.currentProgress}%`,
      );
    }

    const progressDate = new Date(dto.progressDate);

    if (progressDate < activity.startDate) {
      throw new BadRequestException(
        'Tanggal update tidak boleh lebih awal dari tanggal dibuat',
      );
    }

    if (activity.lastProgressDate && progressDate < activity.lastProgressDate) {
      throw new BadRequestException(
        'Tanggal update tidak boleh lebih awal dari update terakhir',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.dailyActivityProgress.create({
        data: {
          activityId: id,
          progressDate,
          previousProgress: activity.currentProgress,
          addedProgress,
          currentProgress: nextProgress,
          pic: dto.pic.trim(),
          notes: dto.notes?.trim() || null,
          preActivityPhotoPaths: dto.preActivityPhotoPaths,
          photoPaths,
          requestClose: false,
          createdBy: actor.id,
        },
      });

      await transaction.dailyActivity.update({
        where: {
          id,
        },
        data: {
          currentProgress: nextProgress,
          lastProgressDate: progressDate,
          lastPic: dto.pic.trim(),
          status: DailyActivityStatus.ON_PROGRESS,
          approvalStatus:
            activity.approvalStatus === DailyApprovalStatus.REJECTED
              ? DailyApprovalStatus.NONE
              : activity.approvalStatus,
        },
      });

      return transaction.dailyActivity.findUnique({
        where: {
          id,
        },
        include: {
          progressHistories: {
            orderBy: [
              {
                progressDate: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
          },
          approvals: {
            orderBy: {
              actedAt: 'asc',
            },
          },
        },
      });
    });
  }

  async requestClose(id: number, actor: Actor) {
    const activity = await this.findActivity(id);

    if (activity.status === DailyActivityStatus.CLOSE) {
      throw new BadRequestException('Pekerjaan sudah CLOSE');
    }

    if (activity.status === DailyActivityStatus.WAITING_APPROVAL) {
      throw new BadRequestException('Pengajuan close sudah menunggu approval');
    }

    if (activity.currentProgress !== 100) {
      throw new BadRequestException(
        'Pengajuan close hanya dapat dilakukan saat progress 100%',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.dailyActivityProgress.updateMany({
        where: {
          activityId: id,
          currentProgress: 100,
        },
        data: {
          requestClose: true,
        },
      });

      return transaction.dailyActivity.update({
        where: {
          id,
        },
        data: {
          status: DailyActivityStatus.WAITING_APPROVAL,
          approvalStatus: DailyApprovalStatus.PENDING,
          closeRequestedAt: new Date(),
        },
      });
    });
  }

  async approve(id: number, actor: Actor) {
    this.ensureApprover(actor);

    const activity = await this.findActivity(id);

    if (
      activity.status !== DailyActivityStatus.WAITING_APPROVAL ||
      activity.approvalStatus !== DailyApprovalStatus.PENDING
    ) {
      throw new BadRequestException('Pekerjaan tidak sedang menunggu approval');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.dailyActivityApproval.create({
        data: {
          activityId: id,
          decision: DailyApprovalDecision.APPROVED,
          comment: 'Pekerjaan disetujui dan dinyatakan selesai',
          actedBy: actor.id,
        },
      });

      return transaction.dailyActivity.update({
        where: {
          id,
        },
        data: {
          status: DailyActivityStatus.CLOSE,
          approvalStatus: DailyApprovalStatus.APPROVED,
          closedAt: new Date(),
        },
      });
    });
  }

  async reject(id: number, comment: string, actor: Actor) {
    this.ensureApprover(actor);

    const activity = await this.findActivity(id);

    if (
      activity.status !== DailyActivityStatus.WAITING_APPROVAL ||
      activity.approvalStatus !== DailyApprovalStatus.PENDING
    ) {
      throw new BadRequestException('Pekerjaan tidak sedang menunggu approval');
    }

    if (!comment?.trim()) {
      throw new BadRequestException('Komentar reject wajib diisi');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.dailyActivityApproval.create({
        data: {
          activityId: id,
          decision: DailyApprovalDecision.REJECTED,
          comment: comment.trim(),
          actedBy: actor.id,
        },
      });

      return transaction.dailyActivity.update({
        where: {
          id,
        },
        data: {
          status: DailyActivityStatus.ON_PROGRESS,
          approvalStatus: DailyApprovalStatus.REJECTED,
          closeRequestedAt: null,
          closedAt: null,
        },
      });
    });
  }

  async remove(id: number) {
    const activity = await this.findActivity(id);

    if (activity.status === DailyActivityStatus.CLOSE) {
      throw new BadRequestException(
        'Pekerjaan yang sudah CLOSE tidak dapat dihapus',
      );
    }

    const detail = await this.prisma.dailyActivity.findUnique({
      where: {
        id,
      },
      include: {
        progressHistories: {
          select: {
            photoPaths: true,
          },
        },
      },
    });

    await this.prisma.dailyActivity.delete({
      where: {
        id,
      },
    });

    if (detail) {
      const progressPhotos = detail.progressHistories.flatMap(
        (progress) => progress.photoPaths,
      );

      this.imagesService.deleteMany([
        detail.profilePhotoPath,
        ...detail.preActivityPhotoPaths,
        ...progressPhotos,
      ]);
    }

    return {
      message: 'Daily Activity berhasil dihapus',
    };
  }

  private async findActivity(id: number) {
    const activity = await this.prisma.dailyActivity.findUnique({
      where: {
        id,
      },
    });

    if (!activity) {
      throw new NotFoundException('Daily Activity tidak ditemukan');
    }

    return activity;
  }

  private ensureApprover(actor: Actor): void {
    const allowedRoles: UserRole[] = [
      UserRole.SECTION_HEAD,
      UserRole.GRUP_LEADER,
      UserRole.ADMIN,
    ];

    if (!allowedRoles.includes(actor.role)) {
      throw new ForbiddenException(
        'Approval hanya dapat dilakukan oleh Section Head atau Group Leader',
      );
    }
  }
}
