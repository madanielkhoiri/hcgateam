import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { DocumentNumberService } from './document-number.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumber: DocumentNumberService,
  ) {}

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private calculateDuration(requestedAt: Date, closedAt: Date): number {
    const start = new Date(requestedAt);
    const end = new Date(closedAt);

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    const difference = end.getTime() - start.getTime();

    if (difference <= 0) {
      return 0;
    }

    return Math.floor(difference / (1000 * 60 * 60 * 24));
  }

  private async createAutomaticHandover(
    tx: Prisma.TransactionClient,
    workOrderId: number,
    createdBy: number,
  ) {
    const existing = await tx.handover.findUnique({
      where: {
        workOrderId,
      },
    });

    if (existing) {
      return existing;
    }

    const workOrder = await tx.workOrder.findUnique({
      where: {
        id: workOrderId,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work Order tidak ditemukan');
    }

    const handoverDate = workOrder.closedAt ?? new Date();

    const nextNumber = await this.documentNumber.nextHandoverNumber(
      tx,
      handoverDate,
    );

    return tx.handover.create({
      data: {
        stpNumber: nextNumber.documentNumber,
        sequenceNumber: nextNumber.sequenceNumber,
        workOrderId: workOrder.id,
        handoverDate,
        receiverName: workOrder.userDepartmentName,
        receiverPosition: workOrder.position ?? null,
        receiverDepartment: workOrder.department,
        location: workOrder.location ?? workOrder.department,
        handoverNote: 'Serah terima otomatis dari Work Order status CLOSE.',
        documentationPaths: [],
        autoCreated: true,
        createdBy,
      },
      include: {
        workOrder: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  async getDashboard(monthValue: number | null, year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
      throw new BadRequestException('Tahun dashboard tidak valid');
    }

    if (
      monthValue !== null &&
      (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12)
    ) {
      throw new BadRequestException('Bulan dashboard tidak valid');
    }

    const periodStart =
      monthValue === null
        ? new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
        : new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0, 0));

    const periodEnd =
      monthValue === null
        ? new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
        : new Date(Date.UTC(year, monthValue, 1, 0, 0, 0, 0));

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        requestedAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      select: {
        id: true,
        requestedAt: true,
        status: true,
      },
      orderBy: {
        requestedAt: 'asc',
      },
    });

    const summary = {
      total: workOrders.length,
      open: 0,
      onProgress: 0,
      close: 0,
      closingRate: 0,
    };

    type DashboardPoint = {
      key: string;
      label: string;
      total: number;
      open: number;
      onProgress: number;
      close: number;
      closingRate: number;
    };

    const chartMap = new Map<string, DashboardPoint>();

    if (monthValue === null) {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];

      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const key = String(monthIndex + 1).padStart(2, '0');

        chartMap.set(key, {
          key,
          label: monthNames[monthIndex],
          total: 0,
          open: 0,
          onProgress: 0,
          close: 0,
          closingRate: 0,
        });
      }
    }

    for (const workOrder of workOrders) {
      const requestedAt = workOrder.requestedAt;

      const key =
        monthValue === null
          ? String(requestedAt.getUTCMonth() + 1).padStart(2, '0')
          : requestedAt.toISOString().slice(0, 10);

      const label =
        monthValue === null
          ? key
          : requestedAt.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              timeZone: 'UTC',
            });

      const current = chartMap.get(key) ?? {
        key,
        label,
        total: 0,
        open: 0,
        onProgress: 0,
        close: 0,
        closingRate: 0,
      };

      current.total += 1;

      if (workOrder.status === WorkOrderStatus.OPEN) {
        current.open += 1;
        summary.open += 1;
      }

      if (workOrder.status === WorkOrderStatus.ON_PROGRESS) {
        current.onProgress += 1;
        summary.onProgress += 1;
      }

      if (workOrder.status === WorkOrderStatus.CLOSE) {
        current.close += 1;
        summary.close += 1;
      }

      current.closingRate =
        current.total > 0
          ? Number(((current.close / current.total) * 100).toFixed(1))
          : 0;

      chartMap.set(key, current);
    }

    summary.closingRate =
      summary.total > 0
        ? Number(((summary.close / summary.total) * 100).toFixed(1))
        : 0;

    const chart = Array.from(chartMap.values())
      .sort((first, second) => first.key.localeCompare(second.key))
      .map((point) => ({
        label:
          monthValue === null
            ? [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'Mei',
                'Jun',
                'Jul',
                'Agu',
                'Sep',
                'Okt',
                'Nov',
                'Des',
              ][Number(point.key) - 1]
            : point.label,
        total: point.total,
        open: point.open,
        onProgress: point.onProgress,
        close: point.close,
        closingRate: point.closingRate,
      }));

    return {
      filter: {
        month: monthValue,
        year,
        mode: monthValue === null ? 'ALL_MONTHS' : 'MONTH',
      },
      summary,
      chart,
    };
  }
  async findAll() {
    return this.prisma.workOrder.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        handover: true,
      },
      orderBy: [
        {
          priority: 'asc',
        },
        {
          requestedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findAvailableForHandover() {
    return this.prisma.workOrder.findMany({
      where: {
        status: {
          in: [WorkOrderStatus.OPEN, WorkOrderStatus.ON_PROGRESS],
        },
        handover: null,
      },
      orderBy: [
        {
          requestedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: {
        id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        handover: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work Order tidak ditemukan');
    }

    return workOrder;
  }

  async create(dto: CreateWorkOrderDto, createdBy: number) {
    const requestedAt = this.parseDate(dto.requestedAt);

    return this.prisma.$transaction(async (tx) => {
      const nextNumber = await this.documentNumber.nextWorkOrderNumber(
        tx,
        requestedAt,
      );

      const isClosed = dto.status === WorkOrderStatus.CLOSE;

      const closedAt = isClosed ? new Date() : null;

      const workOrder = await tx.workOrder.create({
        data: {
          workOrderNumber: nextNumber.documentNumber,
          sequenceNumber: nextNumber.sequenceNumber,
          workOrderName: dto.workOrderName.trim(),
          department: dto.department.trim(),
          position: dto.position?.trim() || null,
          pic: dto.pic,
          jobType: dto.jobType.trim(),
          userDepartmentName: dto.userDepartmentName.trim(),
          description: dto.description.trim(),
          location: dto.location?.trim() || null,
          requestedAt,
          status: dto.status,
          priority: dto.priority ?? 'P2',
          closedAt,
          closedDurationDays:
            closedAt !== null
              ? this.calculateDuration(requestedAt, closedAt)
              : null,
          imagePaths: dto.imagePaths ?? [],
          createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          handover: true,
        },
      });

      if (isClosed) {
        await this.createAutomaticHandover(tx, workOrder.id, createdBy);
      }

      return tx.workOrder.findUnique({
        where: {
          id: workOrder.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          handover: true,
        },
      });
    });
  }

  async update(id: number, dto: UpdateWorkOrderDto, updatedBy: number) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const nextStatus = dto.status ?? existing.status;

      const becomesClosed =
        existing.status !== WorkOrderStatus.CLOSE &&
        nextStatus === WorkOrderStatus.CLOSE;

      const closedAt = becomesClosed ? new Date() : existing.closedAt;

      const requestedAt = dto.requestedAt
        ? this.parseDate(dto.requestedAt)
        : existing.requestedAt;

      await tx.workOrder.update({
        where: {
          id,
        },
        data: {
          ...(dto.workOrderName !== undefined
            ? {
                workOrderName: dto.workOrderName.trim(),
              }
            : {}),
          ...(dto.department !== undefined
            ? {
                department: dto.department.trim(),
              }
            : {}),
          ...(dto.position !== undefined
            ? {
                position: dto.position.trim() || null,
              }
            : {}),
          ...(dto.pic !== undefined
            ? {
                pic: dto.pic,
              }
            : {}),
          ...(dto.jobType !== undefined
            ? {
                jobType: dto.jobType.trim(),
              }
            : {}),
          ...(dto.userDepartmentName !== undefined
            ? {
                userDepartmentName: dto.userDepartmentName.trim(),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: dto.description.trim(),
              }
            : {}),
          ...(dto.location !== undefined
            ? {
                location: dto.location.trim() || null,
              }
            : {}),
          ...(dto.requestedAt !== undefined
            ? {
                requestedAt,
              }
            : {}),
          ...(dto.status !== undefined
            ? {
                status: dto.status,
              }
            : {}),
          ...(dto.priority !== undefined
            ? {
                priority: dto.priority,
              }
            : {}),
          ...(dto.imagePaths !== undefined
            ? {
                imagePaths: dto.imagePaths,
              }
            : {}),
          ...(becomesClosed
            ? {
                closedAt,
                closedDurationDays: this.calculateDuration(
                  requestedAt,
                  closedAt!,
                ),
              }
            : {}),
        },
      });

      if (nextStatus === WorkOrderStatus.CLOSE) {
        await this.createAutomaticHandover(tx, id, updatedBy);
      } else {
        await tx.handover.deleteMany({
          where: {
            workOrderId: id,
          },
        });
      }

      return tx.workOrder.findUnique({
        where: {
          id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          handover: true,
        },
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.workOrder.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Work Order berhasil dihapus',
    };
  }

  async addImages(id: number, filenames: string[]) {
    const existing = await this.findOne(id);

    const imagePaths = Array.from(
      new Set([...(existing.imagePaths ?? []), ...filenames]),
    );

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        imagePaths,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        handover: true,
      },
    });
  }

  async removeImage(id: number, filename: string) {
    const existing = await this.findOne(id);

    const imagePaths = existing.imagePaths.filter(
      (image) => image !== filename,
    );

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        imagePaths,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        handover: true,
      },
    });
  }
}
