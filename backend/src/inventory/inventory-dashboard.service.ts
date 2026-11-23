import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WITA_MS = 8 * 60 * 60 * 1000;

type DailyMovement = {
  date: string;
  stockIn: number;
  stockOut: number;
  stock: number;
  /** Penyesuaian stok (Stock Opname / edit stok) pada periode ini; + lebih, - kurang. */
  stockAdjust: number;
  hasTransaction: boolean;
};

@Injectable()
export class InventoryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private parseScope(value: string): InventoryScope {
    const mentah = String(value ?? '')
      .trim()
      .toUpperCase();
    // "INFRAS" = nama tampilan untuk lingkup GENERAL (Inventory Infras).
    const scope = mentah === 'INFRAS' ? InventoryScope.GENERAL : mentah;

    if (
      scope !== InventoryScope.GENERAL &&
      scope !== InventoryScope.MESS &&
      scope !== InventoryScope.ELECTRIC
    ) {
      throw new BadRequestException('Scope inventory tidak valid.');
    }

    return scope as InventoryScope;
  }

  /** Kosong / "all" = semua bulan (satu tahun penuh) -> null. */
  private parseMonth(value?: string): number | null {
    if (value === undefined || value === '' || value === 'all') {
      return null;
    }
    const month = Number(value);

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

    const startDate = month ? new Date(Date.UTC(year, month - 1, 1)) : new Date(Date.UTC(year, 0, 1));
    const endDate = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));

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
      deviasiFromPeriodStart,
    ] = await Promise.all([
      this.prisma.inventoryStock.findMany({
        where: {
          item: {
            inventoryScope: scope,
          },
        },
        select: {
          quantity: true,
          item: { select: { lokasiGudang: true } },
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

      // Penyesuaian stok di luar Barang Masuk/Keluar (Stock Opname, edit stok)
      // tercatat di Deviasi Stok; ikut dihitung agar saldo per bulan akurat.
      this.prisma.deviasiStok.findMany({
        where: {
          createdAt: { gte: new Date(startDate.getTime() - WITA_MS) },
          item: { inventoryScope: scope },
        },
        select: { createdAt: true, selisih: true },
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
    // createdAt berupa waktu (UTC); digeser ke WITA agar masuk tanggal yang benar.
    const deviasiWita = deviasiFromPeriodStart
      .map((row) => ({ tanggal: new Date(row.createdAt.getTime() + WITA_MS), selisih: row.selisih }))
      .filter((row) => row.tanggal >= startDate);
    const deviasiAfterStart = deviasiWita.reduce((total, row) => total + row.selisih, 0);

    let runningStock = currentStock - stockInAfterStart + stockOutAfterStart - deviasiAfterStart;

    const movementMap = new Map<
      string,
      {
        stockIn: number;
        stockOut: number;
        adjust: number;
      }
    >();

    // Semua Bulan: dikelompokkan per bulan (YYYY-MM) agar grafik tidak padat
    // ratusan titik harian. Filter bulan tertentu tetap per hari.
    const kunci = (value: Date) => (month ? this.dateKey(value) : this.dateKey(value).slice(0, 7));

    if (!month) {
      const sekarang = new Date();
      const bulanTerakhir =
        year < sekarang.getUTCFullYear() ? 12 : year === sekarang.getUTCFullYear() ? sekarang.getUTCMonth() + 1 : 0;
      for (let m = 1; m <= bulanTerakhir; m += 1) {
        movementMap.set(`${year}-${String(m).padStart(2, '0')}`, { stockIn: 0, stockOut: 0, adjust: 0 });
      }
    }

    for (const row of stockInsSelectedMonth) {
      const key = kunci(row.date);
      const current = movementMap.get(key) ?? {
        stockIn: 0,
        stockOut: 0,
        adjust: 0,
      };

      current.stockIn += row.quantity;
      movementMap.set(key, current);
    }

    for (const row of stockOutsSelectedMonth) {
      const key = kunci(row.date);
      const current = movementMap.get(key) ?? {
        stockIn: 0,
        stockOut: 0,
        adjust: 0,
      };

      current.stockOut += row.quantity;
      movementMap.set(key, current);
    }

    for (const row of deviasiWita) {
      if (row.tanggal >= endDate) continue;
      const key = kunci(row.tanggal);
      const current = movementMap.get(key) ?? { stockIn: 0, stockOut: 0, adjust: 0 };

      current.adjust += row.selisih;
      movementMap.set(key, current);
    }

    const adaGerak = (gerak?: { stockIn: number; stockOut: number; adjust: number }) =>
      Boolean(gerak && (gerak.stockIn > 0 || gerak.stockOut > 0 || gerak.adjust !== 0));

    const sortedDates = Array.from(movementMap.keys()).sort();

    // Semua Bulan: mulai dari bulan transaksi pertama, bukan Januari
    // (bulan sebelum aplikasi dipakai tidak ditampilkan).
    if (!month) {
      const pertama = sortedDates.findIndex((key) => adaGerak(movementMap.get(key)));
      sortedDates.splice(0, pertama === -1 ? sortedDates.length : pertama);
    }

    const chart: DailyMovement[] = sortedDates.map((date) => {
      const movement = movementMap.get(date) ?? {
        stockIn: 0,
        stockOut: 0,
        adjust: 0,
      };

      runningStock += movement.stockIn - movement.stockOut + movement.adjust;

      return {
        date,
        stockIn: movement.stockIn,
        stockOut: movement.stockOut,
        stock: Math.max(0, runningStock),
        stockAdjust: movement.adjust,
        hasTransaction: adaGerak(movement),
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
        // Inventory Electric: jumlah barang & stok per lokasi gudang.
        perLokasi: (['GUDANG_GA', 'GUDANG_ELEKTRIK'] as const).map((lokasi) => {
          const baris = stocks.filter((stock) => stock.item?.lokasiGudang === lokasi);
          return {
            lokasi,
            jumlahBarang: baris.length,
            stok: baris.reduce((total, stock) => total + stock.quantity, 0),
          };
        }),
        totalStockIn,
        totalStockOut,
        transactionDays: chart.filter((row) => row.hasTransaction).length,
      },
      chart,
    };
  }
}
