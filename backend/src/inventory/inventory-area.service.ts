import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryScope, ItemCategory, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreateStockInDto, UpdateStockInDto } from './dto/stock-in.dto';
import { CreateStockOutDto, UpdateStockOutDto } from './dto/stock-out.dto';
import { CreateStockInBatchDto } from './dto/stock-in-batch.dto';
import { CreateStockOutBatchDto } from './dto/stock-out-batch.dto';
import { UpdateStockDto } from './dto/stock.dto';
import { DeviasiStokService } from './deviasi-stok.service';
import { InventoryAksesService } from './inventory-akses.service';

@Injectable()
export class InventoryAreaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: InventoryAksesService,
    private readonly deviasiStok: DeviasiStokService,
  ) {}

  private parseScope(value: string): InventoryScope {
    const scope = value.toUpperCase();

    if (
      scope !== InventoryScope.GENERAL &&
      scope !== InventoryScope.MESS &&
      scope !== InventoryScope.ELECTRIC
    ) {
      throw new BadRequestException(
        'Tipe inventory hanya GENERAL, MESS, atau ELECTRIC',
      );
    }

    return scope as InventoryScope;
  }

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private getPrefix(category: ItemCategory): string {
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

  private sortByCode<
    T extends {
      code: string;
      category: ItemCategory;
    },
  >(rows: T[]): T[] {
    const categoryOrder: Record<ItemCategory, number> = {
      ATK: 1,
      HOUSEKEEPING: 2,
      BAJU: 3,
      ELEKTRONIK: 4,
      FURNITURE: 5,
    };

    return rows.sort((first, second) => {
      const categoryDifference =
        categoryOrder[first.category] - categoryOrder[second.category];

      if (categoryDifference !== 0) {
        return categoryDifference;
      }

      const firstNumber = Number(first.code.split('-')[1] ?? 0);

      const secondNumber = Number(second.code.split('-')[1] ?? 0);

      return firstNumber - secondNumber;
    });
  }

  private async generateCode(
    tx: Prisma.TransactionClient,
    scope: InventoryScope,
    category: ItemCategory,
  ): Promise<string> {
    const prefix = this.getPrefix(category);

    const items = await tx.item.findMany({
      where: {
        inventoryScope: scope,
        code: {
          startsWith: `${prefix}-`,
        },
      },
      select: {
        code: true,
      },
    });

    const highest = items.reduce((result, item) => {
      const current = Number(item.code.split('-')[1] ?? 0);

      return Number.isFinite(current) ? Math.max(result, current) : result;
    }, 0);

    return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
  }

  async getItems(scopeValue: string) {
    const scope = this.parseScope(scopeValue);

    const items = await this.prisma.item.findMany({
      where: {
        inventoryScope: scope,
      },
      include: {
        stock: true,
      },
    });

    return this.sortByCode(items);
  }

  async createItem(scopeValue: string, dto: CreateItemDto) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const cleanName = dto.name.trim().toUpperCase();

      const duplicate = await tx.item.findFirst({
        where: {
          inventoryScope: scope,
          name: {
            equals: cleanName,
            mode: 'insensitive',
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Nama barang sudah tersedia');
      }

      const code = await this.generateCode(tx, scope, dto.category);

      return tx.item.create({
        data: {
          code,
          name: cleanName,
          inventoryScope: scope,
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

  async updateItem(scopeValue: string, id: number, dto: UpdateItemDto) {
    const scope = this.parseScope(scopeValue);

    const item = await this.prisma.item.findFirst({
      where: {
        id,
        inventoryScope: scope,
      },
    });

    if (!item) {
      throw new NotFoundException('Master barang tidak ditemukan');
    }

    return this.prisma.item.update({
      where: {
        id,
      },
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

  async deleteItem(scopeValue: string, id: number) {
    const scope = this.parseScope(scopeValue);

    const item = await this.prisma.item.findFirst({
      where: {
        id,
        inventoryScope: scope,
      },
      include: {
        _count: {
          select: {
            stockIns: true,
            stockOuts: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Master barang tidak ditemukan');
    }

    if (item._count.stockIns > 0 || item._count.stockOuts > 0) {
      throw new BadRequestException(
        'Barang sudah memiliki transaksi dan tidak dapat dihapus',
      );
    }

    await this.prisma.item.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Master barang berhasil dihapus',
    };
  }

  async getStocks(scopeValue: string) {
    const scope = this.parseScope(scopeValue);

    const stocks = await this.prisma.inventoryStock.findMany({
      where: {
        item: {
          inventoryScope: scope,
        },
      },
      include: {
        item: true,
      },
    });

    const sortedItems = this.sortByCode(stocks.map((stock) => stock.item));

    const order = new Map(sortedItems.map((item, index) => [item.id, index]));

    return stocks.sort(
      (first, second) =>
        (order.get(first.itemId) ?? 0) - (order.get(second.itemId) ?? 0),
    );
  }

  async updateStock(scopeValue: string, id: number, dto: UpdateStockDto, role: UserRole, aktorId: number) {
    this.akses.wajibBolehEditStok(role);
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.findFirst({
        where: {
          id,
          item: {
            inventoryScope: scope,
          },
        },
      });

      if (!stock) {
        throw new NotFoundException('Data stok tidak ditemukan');
      }

      const updated = await tx.inventoryStock.update({
        where: {
          id,
        },
        data: {
          quantity: dto.quantity,
        },
        include: {
          item: true,
        },
      });

      await this.deviasiStok.catatJikaBerubah(tx, stock.itemId, stock.quantity, dto.quantity, aktorId);

      return updated;
    });
  }

  async getStockIns(scopeValue: string) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.stockIn.findMany({
      where: {
        item: {
          inventoryScope: scope,
        },
      },
      include: {
        item: true,
      },
      orderBy: [
        {
          date: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async createStockInBatch(scopeValue: string, dto: CreateStockInBatchDto) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const results: Prisma.StockInGetPayload<{
        include: { item: true };
      }>[] = [];

      for (const input of dto.items) {
        const item = await tx.item.findFirst({
          where: {
            id: input.itemId,
            inventoryScope: scope,
            isActive: true,
          },
        });

        if (!item) {
          throw new NotFoundException('Barang aktif tidak ditemukan');
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

  async createStockIn(scopeValue: string, dto: CreateStockInDto) {
    return this.createStockInBatch(scopeValue, {
      date: dto.date,
      items: [
        {
          itemId: dto.itemId,
          quantity: dto.quantity,
        },
      ],
    });
  }

  async getStockOuts(scopeValue: string) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.stockOut.findMany({
      where: {
        item: {
          inventoryScope: scope,
        },
      },
      include: {
        item: true,
      },
      orderBy: [
        {
          date: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async createStockOutBatch(scopeValue: string, dto: CreateStockOutBatchDto) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const results: Prisma.StockOutGetPayload<{
        include: { item: true };
      }>[] = [];

      for (const input of dto.items) {
        const item = await tx.item.findFirst({
          where: {
            id: input.itemId,
            inventoryScope: scope,
            isActive: true,
          },
        });

        if (!item) {
          throw new NotFoundException('Barang aktif tidak ditemukan');
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

  async createStockOut(scopeValue: string, dto: CreateStockOutDto) {
    return this.createStockOutBatch(scopeValue, {
      date: dto.date,
      taker: dto.taker,
      department: dto.department,
      items: [
        {
          itemId: dto.itemId,
          quantity: dto.quantity,
        },
      ],
    });
  }

  async updateStockIn(scopeValue: string, id: number, dto: UpdateStockInDto) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockIn.findFirst({
        where: {
          id,
          item: {
            inventoryScope: scope,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('Barang masuk tidak ditemukan');
      }

      const newItem = await tx.item.findFirst({
        where: {
          id: dto.itemId,
          inventoryScope: scope,
          isActive: true,
        },
      });

      if (!newItem) {
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
        where: {
          id,
        },
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

  async deleteStockIn(scopeValue: string, id: number) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockIn.findFirst({
        where: {
          id,
          item: {
            inventoryScope: scope,
          },
        },
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
        where: {
          id,
        },
      });

      return {
        message: 'Barang masuk berhasil dihapus',
      };
    });
  }

  async updateStockOut(scopeValue: string, id: number, dto: UpdateStockOutDto) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findFirst({
        where: {
          id,
          item: {
            inventoryScope: scope,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('Barang keluar tidak ditemukan');
      }

      const newItem = await tx.item.findFirst({
        where: {
          id: dto.itemId,
          inventoryScope: scope,
          isActive: true,
        },
      });

      if (!newItem) {
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
        where: {
          id,
        },
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

  async deleteStockOut(scopeValue: string, id: number) {
    const scope = this.parseScope(scopeValue);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findFirst({
        where: {
          id,
          item: {
            inventoryScope: scope,
          },
        },
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
        where: {
          id,
        },
      });

      return {
        message: 'Barang keluar berhasil dihapus',
      };
    });
  }
}
