import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberService } from '../work-orders/document-number.service';
import { CreateHandoverDto } from './dto/create-handover.dto';
import { UpdateHandoverDto } from './dto/update-handover.dto';

@Injectable()
export class HandoversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumber: DocumentNumberService,
  ) {}

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  async findAll() {
    return this.prisma.handover.findMany({
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
      orderBy: [
        {
          handoverDate: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const handover = await this.prisma.handover.findUnique({
      where: {
        id,
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

    if (!handover) {
      throw new NotFoundException('Serah Terima Pekerjaan tidak ditemukan');
    }

    return handover;
  }

  async create(dto: CreateHandoverDto, createdBy: number) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: {
        id: dto.workOrderId,
      },
      include: {
        handover: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work Order tidak ditemukan');
    }

    if (
      workOrder.status !== WorkOrderStatus.OPEN &&
      workOrder.status !== WorkOrderStatus.ON_PROGRESS
    ) {
      throw new BadRequestException(
        'Serah Terima manual hanya dapat memilih Work Order OPEN atau ON PROGRESS',
      );
    }

    if (workOrder.handover) {
      throw new BadRequestException(
        'Work Order sudah memiliki Serah Terima Pekerjaan',
      );
    }

    const handoverDate = this.parseDate(dto.handoverDate);

    return this.prisma.$transaction(async (tx) => {
      const nextNumber = await this.documentNumber.nextHandoverNumber(
        tx,
        handoverDate,
      );

      const handover = await tx.handover.create({
        data: {
          stpNumber: nextNumber.documentNumber,
          sequenceNumber: nextNumber.sequenceNumber,
          workOrderId: workOrder.id,
          handoverDate,
          receiverName:
            dto.receiverName?.trim() || workOrder.userDepartmentName,
          receiverPosition:
            dto.receiverPosition?.trim() || workOrder.position || null,
          receiverDepartment:
            dto.receiverDepartment?.trim() || workOrder.department,
          location:
            dto.location?.trim() || workOrder.location || workOrder.department,
          handoverNote: dto.handoverNote?.trim() || null,
          documentationPaths: dto.documentationPaths ?? [],
          autoCreated: false,
          createdBy,
        },
      });

      await tx.workOrder.update({
        where: {
          id: workOrder.id,
        },
        data: {
          status: WorkOrderStatus.CLOSE,
          closedAt: new Date(),
        },
      });

      return tx.handover.findUnique({
        where: {
          id: handover.id,
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
    });
  }

  async update(id: number, dto: UpdateHandoverDto) {
    const existing = await this.findOne(id);

    if (
      dto.workOrderId !== undefined &&
      dto.workOrderId !== existing.workOrderId
    ) {
      throw new BadRequestException(
        'Work Order pada Serah Terima tidak dapat diganti',
      );
    }

    return this.prisma.handover.update({
      where: {
        id,
      },
      data: {
        ...(dto.handoverDate !== undefined
          ? {
              handoverDate: this.parseDate(dto.handoverDate),
            }
          : {}),
        ...(dto.receiverName !== undefined
          ? {
              receiverName: dto.receiverName.trim() || null,
            }
          : {}),
        ...(dto.receiverPosition !== undefined
          ? {
              receiverPosition: dto.receiverPosition.trim() || null,
            }
          : {}),
        ...(dto.receiverDepartment !== undefined
          ? {
              receiverDepartment: dto.receiverDepartment.trim() || null,
            }
          : {}),
        ...(dto.location !== undefined
          ? {
              location: dto.location.trim() || null,
            }
          : {}),
        ...(dto.handoverNote !== undefined
          ? {
              handoverNote: dto.handoverNote.trim() || null,
            }
          : {}),
        ...(dto.documentationPaths !== undefined
          ? {
              documentationPaths: dto.documentationPaths,
            }
          : {}),
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

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.handover.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Serah Terima Pekerjaan berhasil dihapus',
    };
  }
}
