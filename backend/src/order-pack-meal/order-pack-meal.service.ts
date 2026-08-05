import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { existsSync, unlinkSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackMealOrderDto } from './dto/create-pack-meal-order.dto';
import { UpdatePackMealOrderDto } from './dto/update-pack-meal-order.dto';

type Actor = {
  id: number;
  username: string;
  role: UserRole;
};

type OrderItemInput = {
  orderType: string;
  quantity: number;
  notes?: string | null;
};

const staffRoles = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.GRUP_LEADER,
  UserRole.SECTION_HEAD,
]);

@Injectable()
export class OrderPackMealService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(role: UserRole): boolean {
    return staffRoles.has(role);
  }

  private parseItems(value: string): OrderItemInput[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('Format baris jenis order tidak valid');
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException('Minimal satu baris jenis order wajib diisi');
    }

    if (parsed.length > 50) {
      throw new BadRequestException('Maksimal 50 baris jenis order');
    }

    return parsed.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(
          `Baris jenis order ke-${index + 1} tidak valid`,
        );
      }

      const row = item as Record<string, unknown>;
      const orderType = String(row.orderType ?? '').trim();
      const quantity = Number(row.quantity);
      const notes = String(row.notes ?? '').trim();

      if (orderType.length < 2) {
        throw new BadRequestException(
          `Jenis order pada baris ke-${index + 1} wajib diisi`,
        );
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Jumlah pack pada baris ke-${index + 1} wajib lebih dari 0`,
        );
      }

      if (quantity > 100_000) {
        throw new BadRequestException(
          `Jumlah pack pada baris ke-${index + 1} terlalu besar`,
        );
      }

      return {
        orderType,
        quantity,
        notes: notes || null,
      };
    });
  }

  private getPontianakDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Pontianak',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    const dateText = `${values.year}-${values.month}-${values.day}`;

    return {
      dateText,
      date: new Date(`${dateText}T00:00:00.000Z`),
      compact: dateText.replaceAll('-', ''),
    };
  }

  private includeRelations() {
    return {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      items: {
        orderBy: {
          id: 'asc' as const,
        },
      },
    };
  }

  async findAll(actor: Actor, search?: string) {
    const keyword = search?.trim();
    const where: Prisma.PackMealOrderWhereInput = {};

    if (!this.isStaff(actor.role)) {
      where.createdBy = actor.id;
    }

    if (keyword) {
      where.AND = [
        {
          OR: [
            {
              orderNumber: {
                contains: keyword,
                mode: 'insensitive',
              },
            },
            {
              deliveryLocation: {
                contains: keyword,
                mode: 'insensitive',
              },
            },
            {
              department: {
                contains: keyword,
                mode: 'insensitive',
              },
            },
            {
              creator: {
                name: {
                  contains: keyword,
                  mode: 'insensitive',
                },
              },
            },
            {
              items: {
                some: {
                  orderType: {
                    contains: keyword,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        },
      ];
    }

    return this.prisma.packMealOrder.findMany({
      where,
      include: this.includeRelations(),
      orderBy: [
        {
          orderDate: 'desc',
        },
        {
          sequenceNumber: 'desc',
        },
      ],
    });
  }

  async findOne(id: number, actor: Actor) {
    const row = await this.prisma.packMealOrder.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!row) {
      throw new NotFoundException('Order Pack Meal tidak ditemukan');
    }

    if (!this.isStaff(actor.role) && row.createdBy !== actor.id) {
      throw new ForbiddenException('Akses order ini ditolak');
    }

    return row;
  }

  async create(
    dto: CreatePackMealOrderDto,
    approvedFormPath: string,
    actor: Actor,
  ) {
    const items = this.parseItems(dto.items);
    const totalPacks = items.reduce((total, item) => total + item.quantity, 0);
    const orderDate = this.getPontianakDate();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const latest = await transaction.packMealOrder.findFirst({
              where: {
                orderDate: orderDate.date,
              },
              orderBy: {
                sequenceNumber: 'desc',
              },
              select: {
                sequenceNumber: true,
              },
            });

            const sequenceNumber = (latest?.sequenceNumber ?? 0) + 1;
            const orderNumber = `ADD-${orderDate.compact}-${String(
              sequenceNumber,
            ).padStart(3, '0')}`;

            return transaction.packMealOrder.create({
              data: {
                orderNumber,
                orderDate: orderDate.date,
                sequenceNumber,
                neededDate: new Date(dto.neededDate),
                deliveryLocation: dto.deliveryLocation.trim(),
                department: dto.department?.trim() || null,
                contactNumber: dto.contactNumber?.trim() || null,
                deliveryTime: dto.deliveryTime?.trim() || null,
                notes: dto.notes?.trim() || null,
                approvedFormPath,
                totalPacks,
                createdBy: actor.id,
                items: {
                  create: items,
                },
              },
              include: this.includeRelations(),
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error: unknown) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2002');

        if (retryable && attempt < 3) {
          continue;
        }

        this.deleteUploadedFile(approvedFormPath);
        throw error;
      }
    }

    this.deleteUploadedFile(approvedFormPath);
    throw new BadRequestException('Nomor order gagal dibuat');
  }

  async update(
    id: number,
    dto: UpdatePackMealOrderDto,
    newApprovedFormPath: string | undefined,
    actor: Actor,
  ) {
    const current = await this.findOne(id, actor);
    const items = dto.items !== undefined ? this.parseItems(dto.items) : null;
    const totalPacks = items
      ? items.reduce((total, item) => total + item.quantity, 0)
      : undefined;

    try {
      const updated = await this.prisma.$transaction(async (transaction) => {
        if (items) {
          await transaction.packMealOrderItem.deleteMany({
            where: {
              orderId: id,
            },
          });
        }

        return transaction.packMealOrder.update({
          where: { id },
          data: {
            ...(dto.neededDate !== undefined
              ? { neededDate: new Date(dto.neededDate) }
              : {}),
            ...(dto.deliveryLocation !== undefined
              ? { deliveryLocation: dto.deliveryLocation.trim() }
              : {}),
            ...(dto.department !== undefined
              ? { department: dto.department.trim() || null }
              : {}),
            ...(dto.contactNumber !== undefined
              ? { contactNumber: dto.contactNumber.trim() || null }
              : {}),
            ...(dto.deliveryTime !== undefined
              ? { deliveryTime: dto.deliveryTime.trim() || null }
              : {}),
            ...(dto.notes !== undefined
              ? { notes: dto.notes.trim() || null }
              : {}),
            ...(newApprovedFormPath
              ? { approvedFormPath: newApprovedFormPath }
              : {}),
            ...(totalPacks !== undefined ? { totalPacks } : {}),
            ...(items
              ? {
                  items: {
                    create: items,
                  },
                }
              : {}),
          },
          include: this.includeRelations(),
        });
      });

      if (
        newApprovedFormPath &&
        current.approvedFormPath !== newApprovedFormPath
      ) {
        this.deleteUploadedFile(current.approvedFormPath);
      }

      return updated;
    } catch (error) {
      if (newApprovedFormPath) {
        this.deleteUploadedFile(newApprovedFormPath);
      }

      throw error;
    }
  }

  async remove(id: number, actor: Actor) {
    const current = await this.findOne(id, actor);

    await this.prisma.packMealOrder.delete({
      where: { id },
    });

    this.deleteUploadedFile(current.approvedFormPath);

    return {
      message: 'Order Pack Meal berhasil dihapus',
    };
  }

  private deleteUploadedFile(filePath?: string | null) {
    if (!filePath) {
      return;
    }

    const relativePath = filePath.replace(/^\/+/, '');
    const uploadsPrefix = 'uploads/order-pack-meal/';

    if (!relativePath.startsWith(uploadsPrefix)) {
      return;
    }

    const absolutePath = normalize(join(process.cwd(), relativePath));
    const uploadRoot = normalize(
      join(process.cwd(), 'uploads', 'order-pack-meal'),
    );

    if (!absolutePath.startsWith(uploadRoot)) {
      return;
    }

    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }
}
