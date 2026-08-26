import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreateStockInDto, UpdateStockInDto } from './dto/stock-in.dto';
import { CreateStockOutDto, UpdateStockOutDto } from './dto/stock-out.dto';
import { UpdateStockDto } from './dto/stock.dto';
import { CreateStockInBatchDto } from './dto/stock-in-batch.dto';
import { CreateStockOutBatchDto } from './dto/stock-out-batch.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private getCategoryPrefix(category: ItemCategory): string {
    if (category === ItemCategory.ATK) {
      return 'ATK';
    }

    if (category === ItemCategory.HOUSEKEEPING) {
      return 'HS';
    }

    if (category === ItemCategory.BAJU) {
      return 'BJ';
    }

    if (category === ItemCategory.ELEKTRONIK) {
      return 'EL';
    }

    return 'FR';
  }

  private async generateItemCode(
    tx: Prisma.TransactionClient,
    category: ItemCategory,
  ): Promise<string> {
    const prefix = this.getCategoryPrefix(category);

    const items = await tx.item.findMany({
      where: {
        code: {
          startsWith: `${prefix}-`,
        },
      },
      select: {
        code: true,
      },
    });

    const highestNumber = items.reduce((highest, item) => {
      const sequence = Number(item.code.split('-')[1] ?? 0);

      if (!Number.isFinite(sequence)) {
        return highest;
      }

      return Math.max(highest, sequence);
    }, 0);

    return `${prefix}-${String(highestNumber + 1).padStart(2, '0')}`;
  }

  async getItems() {
    const items = await this.prisma.item.findMany({
      include: {
        stock: true,
      },
    });

    const categoryOrder: Record<ItemCategory, number> = {
      ATK: 1,
      HOUSEKEEPING: 2,
      BAJU: 3,
      ELEKTRONIK: 4,
      FURNITURE: 5,
    };

    return items.sort((firstItem, secondItem) => {
      const categoryDifference =
        categoryOrder[firstItem.category] - categoryOrder[secondItem.category];

      if (categoryDifference !== 0) {
        return categoryDifference;
      }

      const firstNumber = Number(firstItem.code.split('-')[1] ?? 0);

      const secondNumber = Number(secondItem.code.split('-')[1] ?? 0);

      return firstNumber - secondNumber;
    });
  }

  async createItem(dto: CreateItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const cleanName = dto.name.trim().toUpperCase();

      const duplicate = await tx.item.findFirst({
        where: {
          name: {
            equals: cleanName,
            mode: 'insensitive',
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Nama barang sudah tersedia');
      }

      const code = await this.generateItemCode(tx, dto.category);

      return tx.item.create({
        data: {
          code,
          name: cleanName,
          category: dto.category,
          unit: dto.unit,
          isActive: true,
          stock: {
            create: {
              quantity: 0,
            },
          },
        },
        include: {
          stock: true,
        },
      });
    });
  }

  async updateItem(id: number, dto: UpdateItemDto) {
    const existing = await this.prisma.item.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Master barang tidak ditemukan');
    }

    if (dto.name) {
      const cleanName = dto.name.trim().toUpperCase();

      const duplicate = await this.prisma.item.findFirst({
        where: {
          id: {
            not: id,
          },
          name: {
            equals: cleanName,
            mode: 'insensitive',
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Nama barang sudah tersedia');
      }
    }

    return this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name?.trim().toUpperCase(),
        category: dto.category,
        unit: dto.unit,
        isActive: dto.isActive,
      },
      include: {
        stock: true,
      },
    });
  }

  async deleteItem(id: number) {
    const existing = await this.prisma.item.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockIns: true,
            stockOuts: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Master barang tidak ditemukan');
    }

    if (existing._count.stockIns > 0 || existing._count.stockOuts > 0) {
      throw new BadRequestException(
        'Barang sudah memiliki transaksi dan tidak dapat dihapus',
      );
    }

    await this.prisma.item.delete({
      where: { id },
    });

    return {
      message: 'Master barang berhasil dihapus',
    };
  }

  async getStocks() {
    const stocks = await this.prisma.inventoryStock.findMany({
      include: {
        item: true,
      },
    });

    const categoryOrder: Record<ItemCategory, number> = {
      ATK: 1,
      HOUSEKEEPING: 2,
      BAJU: 3,
      ELEKTRONIK: 4,
      FURNITURE: 5,
    };

    return stocks.sort((firstStock, secondStock) => {
      const categoryDifference =
        categoryOrder[firstStock.item.category] -
        categoryOrder[secondStock.item.category];

      if (categoryDifference !== 0) {
        return categoryDifference;
      }

      const firstNumber = Number(firstStock.item.code.split('-')[1] ?? 0);

      const secondNumber = Number(secondStock.item.code.split('-')[1] ?? 0);

      return firstNumber - secondNumber;
    });
  }

  async updateStock(id: number, dto: UpdateStockDto) {
    const existing = await this.prisma.inventoryStock.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data stok tidak ditemukan');
    }

    return this.prisma.inventoryStock.update({
      where: { id },
      data: {
        quantity: dto.quantity,
      },
      include: {
        item: true,
      },
    });
  }

  async createStockInBatch(dto: CreateStockInBatchDto) {
    return this.prisma.$transaction(async (tx) => {
      const results: Prisma.StockInGetPayload<{ include: { item: true } }>[] =
        [];

      for (const input of dto.items) {
        const item = await tx.item.findUnique({
          where: {
            id: input.itemId,
          },
        });

        if (!item || !item.isActive) {
          throw new NotFoundException(
            `Barang dengan ID ${input.itemId} tidak ditemukan atau tidak aktif`,
          );
        }

        const transaction = await tx.stockIn.create({
          data: {
            date: this.parseDate(dto.date),
            itemId: item.id,
            category: item.category,
            quantity: input.quantity,
            unit: item.unit,
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
              increment: input.quantity,
            },
          },
        });

        results.push(transaction);
      }

      return {
        message: `${results.length} barang masuk berhasil disimpan`,
        data: results,
      };
    });
  }

  async createStockOutBatch(dto: CreateStockOutBatchDto) {
    return this.prisma.$transaction(async (tx) => {
      const results: Prisma.StockOutGetPayload<{ include: { item: true } }>[] =
        [];

      for (const input of dto.items) {
        const item = await tx.item.findUnique({
          where: {
            id: input.itemId,
          },
        });

        if (!item || !item.isActive) {
          throw new NotFoundException(
            `Barang dengan ID ${input.itemId} tidak ditemukan atau tidak aktif`,
          );
        }

        const stock = await tx.inventoryStock.findUnique({
          where: {
            itemId: item.id,
          },
        });

        if (!stock || stock.quantity < input.quantity) {
          throw new BadRequestException(
            `Stok ${item.code} - ${item.name} tidak mencukupi. Stok tersedia: ${stock?.quantity ?? 0}`,
          );
        }

        const transaction = await tx.stockOut.create({
          data: {
            date: this.parseDate(dto.date),
            itemId: item.id,
            category: item.category,
            quantity: input.quantity,
            unit: item.unit,
            taker: dto.taker.trim().toUpperCase(),
            department: dto.department.trim().toUpperCase(),
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
              decrement: input.quantity,
            },
          },
        });

        results.push(transaction);
      }

      return {
        message: `${results.length} barang keluar berhasil disimpan`,
        data: results,
      };
    });
  }
  async getStockIns() {
    return this.prisma.stockIn.findMany({
      include: {
        item: true,
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async createStockIn(dto: CreateStockInDto) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: {
          id: dto.itemId,
        },
      });

      if (!item || !item.isActive) {
        throw new NotFoundException('Barang aktif tidak ditemukan');
      }

      const transaction = await tx.stockIn.create({
        data: {
          date: this.parseDate(dto.date),
          itemId: item.id,
          category: item.category,
          quantity: dto.quantity,
          unit: item.unit,
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
            increment: dto.quantity,
          },
        },
      });

      return transaction;
    });
  }

  async updateStockIn(id: number, dto: UpdateStockInDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockIn.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Barang masuk tidak ditemukan');
      }

      const newItem = await tx.item.findUnique({
        where: {
          id: dto.itemId,
        },
      });

      if (!newItem || !newItem.isActive) {
        throw new NotFoundException('Barang aktif tidak ditemukan');
      }

      const oldStock = await tx.inventoryStock.findUnique({
        where: {
          itemId: existing.itemId,
        },
      });

      if (!oldStock || oldStock.quantity < existing.quantity) {
        throw new BadRequestException(
          'Barang masuk tidak dapat diubah karena stok sudah digunakan',
        );
      }

      await tx.inventoryStock.update({
        where: {
          itemId: existing.itemId,
        },
        data: {
          quantity: {
            decrement: existing.quantity,
          },
        },
      });

      await tx.inventoryStock.update({
        where: {
          itemId: newItem.id,
        },
        data: {
          quantity: {
            increment: dto.quantity,
          },
        },
      });

      return tx.stockIn.update({
        where: { id },
        data: {
          date: this.parseDate(dto.date),
          itemId: newItem.id,
          category: newItem.category,
          quantity: dto.quantity,
          unit: newItem.unit,
        },
        include: {
          item: true,
        },
      });
    });
  }

  async deleteStockIn(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockIn.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Barang masuk tidak ditemukan');
      }

      const stock = await tx.inventoryStock.findUnique({
        where: {
          itemId: existing.itemId,
        },
      });

      if (!stock || stock.quantity < existing.quantity) {
        throw new BadRequestException(
          'Barang masuk tidak dapat dihapus karena stok sudah digunakan',
        );
      }

      await tx.inventoryStock.update({
        where: {
          itemId: existing.itemId,
        },
        data: {
          quantity: {
            decrement: existing.quantity,
          },
        },
      });

      await tx.stockIn.delete({
        where: { id },
      });

      return {
        message: 'Barang masuk berhasil dihapus',
      };
    });
  }

  async getStockOuts() {
    return this.prisma.stockOut.findMany({
      include: {
        item: true,
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async createStockOut(dto: CreateStockOutDto) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: {
          id: dto.itemId,
        },
      });

      if (!item || !item.isActive) {
        throw new NotFoundException('Barang aktif tidak ditemukan');
      }

      const stock = await tx.inventoryStock.findUnique({
        where: {
          itemId: item.id,
        },
      });

      if (!stock || stock.quantity < dto.quantity) {
        throw new BadRequestException(
          `Stok tidak mencukupi. Stok tersedia: ${stock?.quantity ?? 0}`,
        );
      }

      const transaction = await tx.stockOut.create({
        data: {
          date: this.parseDate(dto.date),
          itemId: item.id,
          category: item.category,
          quantity: dto.quantity,
          unit: item.unit,
          taker: dto.taker.trim().toUpperCase(),
          department: dto.department.trim().toUpperCase(),
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
            decrement: dto.quantity,
          },
        },
      });

      return transaction;
    });
  }

  async updateStockOut(id: number, dto: UpdateStockOutDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Barang keluar tidak ditemukan');
      }

      const newItem = await tx.item.findUnique({
        where: {
          id: dto.itemId,
        },
      });

      if (!newItem || !newItem.isActive) {
        throw new NotFoundException('Barang aktif tidak ditemukan');
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

      const availableStock = await tx.inventoryStock.findUnique({
        where: {
          itemId: newItem.id,
        },
      });

      if (!availableStock || availableStock.quantity < dto.quantity) {
        throw new BadRequestException(
          `Stok tidak mencukupi. Stok tersedia: ${availableStock?.quantity ?? 0}`,
        );
      }

      await tx.inventoryStock.update({
        where: {
          itemId: newItem.id,
        },
        data: {
          quantity: {
            decrement: dto.quantity,
          },
        },
      });

      return tx.stockOut.update({
        where: { id },
        data: {
          date: this.parseDate(dto.date),
          itemId: newItem.id,
          category: newItem.category,
          quantity: dto.quantity,
          unit: newItem.unit,
          taker: dto.taker.trim().toUpperCase(),
          department: dto.department.trim().toUpperCase(),
        },
        include: {
          item: true,
        },
      });
    });
  }

  async deleteStockOut(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Barang keluar tidak ditemukan');
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

      await tx.stockOut.delete({
        where: { id },
      });

      return {
        message: 'Barang keluar berhasil dihapus',
      };
    });
  }
}
