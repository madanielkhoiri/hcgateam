import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransportDto,
  UpdateTransportDto,
} from './dto/transport.dto';

@Injectable()
export class TransportService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private calculate(
    dto: CreateTransportDto | UpdateTransportDto,
    current?: any,
  ) {
    const fuelDate =
      dto.fuelDate ??
      current?.fuelDate?.toISOString().slice(0, 10);

    const hmStart = Number(
      dto.hmStart ?? current?.hmStart ?? 0,
    );

    const hmEnd = Number(
      dto.hmEnd ?? current?.hmEnd ?? 0,
    );

    const totalLiter = Number(
      dto.totalLiter ?? current?.totalLiter ?? 0,
    );

    const lostTimeBd = Number(
      dto.lostTimeBd ?? current?.lostTimeBd ?? 0,
    );

    const date = new Date(
      `${fuelDate}T00:00:00.000Z`,
    );

    const days = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();

    const totalHm = Math.max(
      0,
      hmEnd - hmStart,
    );

    const hmPerShift = days
      ? totalHm / (days * 2)
      : 0;

    const kmPerLiter = totalLiter
      ? totalHm / totalLiter
      : 0;

    const targetUa = days * 24;

    const actualUa = Math.max(
      0,
      targetUa - lostTimeBd,
    );

    const uaPercentage = targetUa
      ? (actualUa / targetUa) * 100
      : 0;

    return {
      fuelDate: date,

      hmStart: new Prisma.Decimal(hmStart),
      hmEnd: new Prisma.Decimal(hmEnd),

      totalHm: new Prisma.Decimal(totalHm),
      hmPerShift: new Prisma.Decimal(hmPerShift),

      kmPerLiter: new Prisma.Decimal(kmPerLiter),
      totalLiter: new Prisma.Decimal(totalLiter),

      lostTimeBd: new Prisma.Decimal(lostTimeBd),
      targetUa: new Prisma.Decimal(targetUa),

      actualUa: new Prisma.Decimal(actualUa),
      uaPercentage: new Prisma.Decimal(
        uaPercentage,
      ),

      unitStatus:
        dto.unitStatus ??
        (lostTimeBd > 0
          ? 'BREAKDOWN'
          : 'READY'),

      achievement:
        uaPercentage >= 100
          ? 'TERCAPAI'
          : 'TIDAK TERCAPAI',
    };
  }

  async findAll() {
    return this.prisma.transportRecord.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: [
        {
          fuelDate: 'desc',
        },
        {
          unitNumber: 'asc',
        },
      ],
    });
  }

  async create(
    dto: CreateTransportDto,
    userId: number,
  ) {
    return this.prisma.transportRecord.create({
      data: {
        unitNumber: dto.unitNumber
          .trim()
          .toUpperCase(),

        department: dto.department
          .trim()
          .toUpperCase(),

        vehicleType:
          dto.vehicleType ??
          (dto.unitNumber
            .toUpperCase()
            .includes('BUS')
            ? 'BUS'
            : 'LV'),

        ...this.calculate(dto),

        createdBy: userId,
      },
    });
  }

  async importRows(
    rawRows: Record<string, unknown>[],
    userId: number,
    selectedMonth?: number,
    selectedYear?: number,
  ) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      throw new BadRequestException(
        'File Excel belum memiliki data yang dapat diimport',
      );
    }

    if (rawRows.length > 5000) {
      throw new BadRequestException(
        'Maksimal 5.000 baris dalam satu kali import',
      );
    }

    const successful: Array<{
      row: number;
      id: number;
      unitNumber: string;
    }> = [];

    const failed: Array<{
      row: number;
      message: string;
    }> = [];

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];

      try {
        const unitNumber = String(
          row.unitNumber ?? '',
        )
          .trim()
          .toUpperCase();

        const department = String(
          row.department ?? '',
        )
          .trim()
          .toUpperCase();

        const vehicleType = String(
          row.vehicleType ?? 'LV',
        )
          .trim()
          .toUpperCase();

        const hmStart = Number(
          row.hmStart ?? 0,
        );

        const hmEnd = Number(
          row.hmEnd ?? 0,
        );

        const totalLiter = Number(
          row.totalLiter ?? 0,
        );

        const lostTimeBd = Number(
          row.lostTimeBd ?? 0,
        );

        const unitStatus = String(
          row.unitStatus ??
            (lostTimeBd > 0
              ? 'BREAKDOWN'
              : 'READY'),
        )
          .trim()
          .toUpperCase();

        let fuelDate = String(
          row.fuelDate ?? '',
        ).trim();

        if (!unitNumber) {
          throw new Error(
            'No lambung kosong',
          );
        }

        if (!department) {
          throw new Error(
            'Departemen kosong',
          );
        }

        if (!Number.isFinite(hmStart)) {
          throw new Error(
            'HM awal bukan angka',
          );
        }

        if (!Number.isFinite(hmEnd)) {
          throw new Error(
            'HM akhir bukan angka',
          );
        }

        if (hmEnd < hmStart) {
          throw new Error(
            'HM akhir lebih kecil dari HM awal',
          );
        }

        if (
          !Number.isFinite(totalLiter) ||
          totalLiter < 0
        ) {
          throw new Error(
            'Total liter tidak valid',
          );
        }

        if (
          !Number.isFinite(lostTimeBd) ||
          lostTimeBd < 0
        ) {
          throw new Error(
            'Lost Time BD tidak valid',
          );
        }

        if (!fuelDate) {
          if (
            selectedMonth &&
            selectedYear
          ) {
            fuelDate =
              `${selectedYear}-` +
              `${String(selectedMonth).padStart(2, '0')}-01`;
          } else {
            throw new Error(
              'Tanggal kosong',
            );
          }
        }

        const parsedDate = new Date(
          `${fuelDate}T00:00:00.000Z`,
        );

        if (
          Number.isNaN(parsedDate.getTime())
        ) {
          throw new Error(
            'Format tanggal tidak valid',
          );
        }

        if (
          selectedMonth &&
          parsedDate.getUTCMonth() + 1 !==
            Number(selectedMonth)
        ) {
          throw new Error(
            `Tanggal bukan bulan ${selectedMonth}`,
          );
        }

        if (
          selectedYear &&
          parsedDate.getUTCFullYear() !==
            Number(selectedYear)
        ) {
          throw new Error(
            `Tanggal bukan tahun ${selectedYear}`,
          );
        }

        const dto = {
          unitNumber,
          department,

          vehicleType:
            vehicleType === 'BUS'
              ? 'BUS'
              : 'LV',

          fuelDate,

          hmStart,
          hmEnd,

          totalLiter,
          lostTimeBd,

          unitStatus:
            unitStatus === 'BREAKDOWN'
              ? 'BREAKDOWN'
              : 'READY',
        } as CreateTransportDto;

        const created = await this.create(
          dto,
          userId,
        );

        successful.push({
          row: index + 2,
          id: created.id,
          unitNumber: created.unitNumber,
        });
      } catch (error) {
        failed.push({
          row: index + 2,

          message:
            error instanceof Error
              ? error.message
              : 'Data gagal diimport',
        });
      }
    }

    return {
      message:
        failed.length === 0
          ? 'Seluruh data Excel berhasil diimport'
          : 'Import Excel selesai dengan beberapa data gagal',

      total: rawRows.length,

      successCount: successful.length,
      failedCount: failed.length,

      successful,
      failed,
    };
  }

  async update(
    id: number,
    dto: UpdateTransportDto,
  ) {
    const current =
      await this.prisma.transportRecord.findUnique({
        where: {
          id,
        },
      });

    if (!current) {
      throw new NotFoundException(
        'Data transportasi tidak ditemukan',
      );
    }

    return this.prisma.transportRecord.update({
      where: {
        id,
      },

      data: {
        unitNumber:
          dto.unitNumber
            ?.trim()
            .toUpperCase(),

        department:
          dto.department
            ?.trim()
            .toUpperCase(),

        vehicleType:
          dto.vehicleType,

        ...this.calculate(dto, current),
      },
    });
  }

  async remove(id: number) {
    const current =
      await this.prisma.transportRecord.findUnique({
        where: {
          id,
        },
      });

    if (!current) {
      throw new NotFoundException(
        'Data transportasi tidak ditemukan',
      );
    }

    await this.prisma.transportRecord.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Data transportasi berhasil dihapus',
    };
  }

  async dashboard(
    month?: number,
    year?: number,
  ) {
    const now = new Date();

    const selectedMonth =
      month ?? now.getUTCMonth() + 1;

    const selectedYear =
      year ?? now.getUTCFullYear();

    const isAllMonths =
      selectedMonth === 0;

    const start = isAllMonths
      ? new Date(
          Date.UTC(selectedYear, 0, 1),
        )
      : new Date(
          Date.UTC(
            selectedYear,
            selectedMonth - 1,
            1,
          ),
        );

    const end = isAllMonths
      ? new Date(
          Date.UTC(selectedYear + 1, 0, 1),
        )
      : new Date(
          Date.UTC(
            selectedYear,
            selectedMonth,
            1,
          ),
        );

    const rows =
      await this.prisma.transportRecord.findMany({
        where: {
          fuelDate: {
            gte: start,
            lt: end,
          },
        },

        orderBy: [
          {
            fuelDate: 'asc',
          },
          {
            unitNumber: 'asc',
          },
        ],
      });

    const num = (value: any) =>
      Number(value ?? 0);

    const uniqueUnits = new Set(
      rows.map((row) => row.unitNumber),
    );

    const byDepartment = new Map<
      string,
      {
        totalHm: number;
        totalLiter: number;
        totalUa: number;
        count: number;
      }
    >();

    const byUnit = new Map<
      string,
      {
        hmPerShift: number;
        totalLiter: number;
        ua: number;
        count: number;
      }
    >();

    for (const row of rows) {
      const department =
        byDepartment.get(row.department) ?? {
          totalHm: 0,
          totalLiter: 0,
          totalUa: 0,
          count: 0,
        };

      department.totalHm += num(
        row.totalHm,
      );

      department.totalLiter += num(
        row.totalLiter,
      );

      department.totalUa += num(
        row.uaPercentage,
      );

      department.count++;

      byDepartment.set(
        row.department,
        department,
      );

      const unit =
        byUnit.get(row.unitNumber) ?? {
          hmPerShift: 0,
          totalLiter: 0,
          ua: 0,
          count: 0,
        };

      unit.hmPerShift += num(
        row.hmPerShift,
      );

      unit.totalLiter += num(
        row.totalLiter,
      );

      unit.ua += num(
        row.uaPercentage,
      );

      unit.count++;

      byUnit.set(
        row.unitNumber,
        unit,
      );
    }

    const averageUa = rows.length
      ? rows.reduce(
          (total, row) =>
            total +
            num(row.uaPercentage),
          0,
        ) / rows.length
      : 0;

    return {
      month: selectedMonth,
      year: selectedYear,

      totals: {
        units: uniqueUnits.size,

        hm: rows.reduce(
          (total, row) =>
            total + num(row.totalHm),
          0,
        ),

        liters: rows.reduce(
          (total, row) =>
            total + num(row.totalLiter),
          0,
        ),

        availability: averageUa,
      },

      availabilityByDepartment: [
        ...byDepartment,
      ].map(([name, value]) => ({
        name,

        value: value.count
          ? value.totalUa / value.count
          : 0,
      })),

      hmByDepartment: [
        ...byDepartment,
      ].map(([name, value]) => ({
        name,
        value: value.totalHm,
      })),

      hmPerShiftByUnit: [
        ...byUnit,
      ].map(([name, value]) => ({
        name,

        value: value.count
          ? value.hmPerShift /
            value.count
          : 0,
      })),

      litersByUnit: [
        ...byUnit,
      ].map(([name, value]) => ({
        name,
        value: value.totalLiter,
      })),
    };
  }
}
