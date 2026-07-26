import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ElectricStockOutItem = {
  itemId: number;
  quantity: number;
};

type CreateElectricStockOutInput = {
  date: string;
  taker: string;
  description: string;
  items: ElectricStockOutItem[];
};

@Injectable()
export class ElectricStockOutService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private countWords(value: string): number {
    return value.trim().split(/\s+/).filter(Boolean).length;
  }

  async createBatch(input: CreateElectricStockOutInput, photoPath?: string) {
    const description = input.description.trim();
    const taker = input.taker.trim().toUpperCase();

    if (!input.date) {
      throw new BadRequestException('Tanggal wajib diisi');
    }

    if (taker.length < 2) {
      throw new BadRequestException('Nama pengambil wajib diisi');
    }

    if (!description) {
      throw new BadRequestException('Keterangan wajib diisi');
    }

    if (this.countWords(description) > 500) {
      throw new BadRequestException('Keterangan maksimal 500 kata');
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('Minimal satu barang harus dipilih');
    }

    const duplicateIds = input.items
      .map((item) => item.itemId)
      .filter((value, index, array) => array.indexOf(value) !== index);

    if (duplicateIds.length > 0) {
      throw new BadRequestException(
        'Barang yang sama tidak boleh dipilih dua kali',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const results: Prisma.StockOutGetPayload<{
        include: { item: true };
      }>[] = [];

      for (const inputItem of input.items) {
        if (
          !Number.isInteger(inputItem.itemId) ||
          !Number.isInteger(inputItem.quantity) ||
          inputItem.quantity <= 0
        ) {
          throw new BadRequestException('Barang dan jumlah tidak valid');
        }

        const item = await tx.item.findFirst({
          where: {
            id: inputItem.itemId,
            inventoryScope: 'ELECTRIC',
            isActive: true,
          },
        });

        if (!item) {
          throw new NotFoundException('Barang Electric tidak ditemukan');
        }

        const stock = await tx.inventoryStock.findUnique({
          where: {
            itemId: item.id,
          },
        });

        if (!stock || stock.quantity < inputItem.quantity) {
          throw new BadRequestException(
            `Stok ${item.code} - ${item.name} tidak mencukupi. Stok tersedia: ${stock?.quantity ?? 0}`,
          );
        }

        const transaction = await tx.stockOut.create({
          data: {
            date: this.parseDate(input.date),
            itemId: item.id,
            category: item.category,
            quantity: inputItem.quantity,
            unit: item.unit,
            taker,
            department: null,
            description,
            photoPath: photoPath ?? null,
          },
          include: {
            item: true,
          },
        });

        await tx.inventoryStock.update({
          where: {
            itemId: item.id,
          },
          data: {
            quantity: {
              decrement: inputItem.quantity,
            },
          },
        });

        results.push(transaction);
      }

      return {
        message: `${results.length} barang keluar Electric berhasil disimpan`,
        data: results,
      };
    });
  }

  async update(
    id: number,
    input: {
      date: string;
      itemId: number;
      quantity: number;
      taker: string;
      description: string;
    },
    photoPath?: string,
  ) {
    const description = input.description.trim();
    const taker = input.taker.trim().toUpperCase();

    if (!input.date) {
      throw new BadRequestException('Tanggal wajib diisi');
    }

    if (!Number.isInteger(input.itemId)) {
      throw new BadRequestException('Barang tidak valid');
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new BadRequestException('Jumlah barang wajib lebih dari 0');
    }

    if (taker.length < 2) {
      throw new BadRequestException('Nama pengambil wajib diisi');
    }

    if (!description) {
      throw new BadRequestException('Keterangan wajib diisi');
    }

    if (this.countWords(description) > 500) {
      throw new BadRequestException('Keterangan maksimal 500 kata');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findFirst({
        where: {
          id,
          item: {
            inventoryScope: 'ELECTRIC',
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('Barang keluar Electric tidak ditemukan');
      }

      const newItem = await tx.item.findFirst({
        where: {
          id: input.itemId,
          inventoryScope: 'ELECTRIC',
          isActive: true,
        },
      });

      if (!newItem) {
        throw new NotFoundException('Master Barang Electric tidak ditemukan');
      }

      await tx.inventoryStock.update({
        where: {
          itemId: existing.itemId,
        },
        data: {
          quantity: {
            increment: existing.quantity,
          },
        },
      });

      const newStock = await tx.inventoryStock.findUnique({
        where: {
          itemId: newItem.id,
        },
      });

      if (!newStock || newStock.quantity < input.quantity) {
        throw new BadRequestException(
          `Stok ${newItem.code} - ${newItem.name} tidak mencukupi. Stok tersedia: ${newStock?.quantity ?? 0}`,
        );
      }

      await tx.inventoryStock.update({
        where: {
          itemId: newItem.id,
        },
        data: {
          quantity: {
            decrement: input.quantity,
          },
        },
      });

      return tx.stockOut.update({
        where: {
          id,
        },
        data: {
          date: this.parseDate(input.date),
          itemId: newItem.id,
          category: newItem.category,
          quantity: input.quantity,
          unit: newItem.unit,
          taker,
          department: null,
          description,
          ...(photoPath
            ? {
                photoPath,
              }
            : {}),
        },
        include: {
          item: true,
        },
      });
    });
  }
}
