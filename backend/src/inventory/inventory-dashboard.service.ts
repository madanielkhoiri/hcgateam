import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DailyMovement = {
  date: string;
  stockIn: number;
  stockOut: number;
  stock: number;
  hasTransaction: boolean;
};

@Injectable()
export class InventoryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private parseScope(value: string): InventoryScope {
    const scope = String(value ?? '')
      .trim()
      .toUpperCase();

    if (
      scope !== InventoryScope.GENERAL &&
      scope !== InventoryScope.MESS &&
      scope !== InventoryScope.ELECTRIC
    ) {
      throw new BadRequestException('Scope inventory tidak valid.');
    }

    return scope as InventoryScope;
  }

  private parseMonth(value?: string): number {
    const currentMonth = new Date().getMonth() + 1;
    const month = Number(value || currentMonth);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Bulan tidak valid.');
    }

    return month;
  }

  private parseYear(value?: string): number {
    const currentYear = new Date().getFullYear();
    const year = Number(value || currentYear);

    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
      throw new BadRequestException('Tahun tidak valid.');
    }

    return year;
  }

  private dateKey(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async getDashboard(
    scopeValue: string,
    monthValue?: string,
    yearValue?: string,
  ) {
    const scope = this.parseScope(scopeValue);
    const month = this.parseMonth(monthValue);
    const year = this.parseYear(yearValue);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [
      stocks,
      stockInsFromPeriodStart,
      stockOutsFromPeriodStart,
      stockInsSelectedMonth,
      stockOutsSelectedMonth,
      totalItems,
    ] = await Promise.all([
      this.prisma.inventoryStock.findMany({
        where: {
          item: {
            inventoryScope: scope,
          },
        },
        select: {
          quantity: true,
        },
      }),

      this.prisma.stockIn.findMany({
        where: {
          date: {
            gte: startDate,
            lt: tomorrow,
          },
          item: {
            inventoryScope: scope,
          },
        },
        select: {
          date: true,
          quantity: true,
        },
      }),

      this.prisma.stockOut.findMany({
        where: {
          date: {
            gte: startDate,
            lt: tomorrow,
          },
          item: {
            inventoryScope: scope,
          },
        },
        select: {
          date: true,
          quantity: true,
        },
      }),

      this.prisma.stockIn.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
          item: {
            inventoryScope: scope,
          },
        },
        select: {
          date: true,
          quantity: true,
        },
        orderBy: {
          date: 'asc',
        },
      }),

      this.prisma.stockOut.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
          item: {
            inventoryScope: scope,
          },
        },
        select: {
          date: true,
          quantity: true,
        },
        orderBy: {
          date: 'asc',
        },
      }),

      this.prisma.item.count({
        where: {
          inventoryScope: scope,
          isActive: true,
        },
      }),
    ]);

    const currentStock = stocks.reduce((total, row) => total + row.quantity, 0);

    const stockInAfterStart = stockInsFromPeriodStart.reduce(
      (total, row) => total + row.quantity,
      0,
    );

    const stockOutAfterStart = stockOutsFromPeriodStart.reduce(
      (total, row) => total + row.quantity,
      0,
    );

    /*
     * Saldo stok pada awal bulan direkonstruksi dari stok saat ini.
     * Rumus:
     * stok awal = stok sekarang - seluruh barang masuk setelah awal periode
     *              + seluruh barang keluar setelah awal periode
     */
    let runningStock = currentStock - stockInAfterStart + stockOutAfterStart;

    const movementMap = new Map<
      string,
      {
        stockIn: number;
        stockOut: number;
      }
    >();

    for (const row of stockInsSelectedMonth) {
      const key = this.dateKey(row.date);
      const current = movementMap.get(key) ?? {
        stockIn: 0,
        stockOut: 0,
      };

      current.stockIn += row.quantity;
      movementMap.set(key, current);
    }

    for (const row of stockOutsSelectedMonth) {
      const key = this.dateKey(row.date);
      const current = movementMap.get(key) ?? {
        stockIn: 0,
        stockOut: 0,
      };

      current.stockOut += row.quantity;
      movementMap.set(key, current);
    }

    const sortedDates = Array.from(movementMap.keys()).sort();

    const chart: DailyMovement[] = sortedDates.map((date) => {
      const movement = movementMap.get(date) ?? {
        stockIn: 0,
        stockOut: 0,
      };

      runningStock += movement.stockIn - movement.stockOut;

      return {
        date,
        stockIn: movement.stockIn,
        stockOut: movement.stockOut,
        stock: Math.max(0, runningStock),
        hasTransaction: true,
      };
    });

    const totalStockIn = stockInsSelectedMonth.reduce(
      (total, row) => total + row.quantity,
      0,
    );

    const totalStockOut = stockOutsSelectedMonth.reduce(
      (total, row) => total + row.quantity,
      0,
    );

    return {
      scope,
      month,
      year,
      summary: {
        totalItems,
        currentStock,
        totalStockIn,
        totalStockOut,
        transactionDays: chart.length,
      },
      chart,
    };
  }
}
