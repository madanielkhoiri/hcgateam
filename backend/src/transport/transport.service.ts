import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransportDto, UpdateTransportDto } from './dto/transport.dto';

@Injectable()
export class TransportService {
  constructor(private readonly prisma: PrismaService) {}

  private calculate(dto: CreateTransportDto | UpdateTransportDto, current?: any) {
    const fuelDate = dto.fuelDate ?? current?.fuelDate?.toISOString().slice(0, 10);
    const hmStart = Number(dto.hmStart ?? current?.hmStart ?? 0);
    const hmEnd = Number(dto.hmEnd ?? current?.hmEnd ?? 0);
    const totalLiter = Number(dto.totalLiter ?? current?.totalLiter ?? 0);
    const lostTimeBd = Number(dto.lostTimeBd ?? current?.lostTimeBd ?? 0);
    const date = new Date(`${fuelDate}T00:00:00.000Z`);
    const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    const totalHm = Math.max(0, hmEnd - hmStart);
    const hmPerShift = days ? totalHm / (days * 2) : 0;
    const kmPerLiter = totalLiter ? totalHm / totalLiter : 0;
    const targetUa = days * 24;
    const actualUa = Math.max(0, targetUa - lostTimeBd);
    const uaPercentage = targetUa ? (actualUa / targetUa) * 100 : 0;
    return {
      fuelDate: date,
      hmStart: new Prisma.Decimal(hmStart), hmEnd: new Prisma.Decimal(hmEnd),
      totalHm: new Prisma.Decimal(totalHm), hmPerShift: new Prisma.Decimal(hmPerShift),
      kmPerLiter: new Prisma.Decimal(kmPerLiter), totalLiter: new Prisma.Decimal(totalLiter),
      lostTimeBd: new Prisma.Decimal(lostTimeBd), targetUa: new Prisma.Decimal(targetUa),
      actualUa: new Prisma.Decimal(actualUa), uaPercentage: new Prisma.Decimal(uaPercentage),
      unitStatus: dto.unitStatus ?? (lostTimeBd > 0 ? 'BREAKDOWN' : 'READY'),
      achievement: uaPercentage >= 100 ? 'TERCAPAI' : 'TIDAK TERCAPAI',
    };
  }

  async findAll() {
    return this.prisma.transportRecord.findMany({ include: { creator: { select: { id: true, name: true } } }, orderBy: [{ fuelDate: 'desc' }, { unitNumber: 'asc' }] });
  }

  async create(dto: CreateTransportDto, userId: number) {
    return this.prisma.transportRecord.create({ data: {
      unitNumber: dto.unitNumber.trim().toUpperCase(), department: dto.department.trim().toUpperCase(),
      vehicleType: dto.vehicleType ?? (dto.unitNumber.toUpperCase().includes('BUS') ? 'BUS' : 'LV'),
      ...this.calculate(dto), createdBy: userId,
    }});
  }

  async update(id: number, dto: UpdateTransportDto) {
    const current = await this.prisma.transportRecord.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Data transportasi tidak ditemukan');
    return this.prisma.transportRecord.update({ where: { id }, data: {
      unitNumber: dto.unitNumber?.trim().toUpperCase(), department: dto.department?.trim().toUpperCase(),
      vehicleType: dto.vehicleType, ...this.calculate(dto, current),
    }});
  }

  async remove(id: number) {
    const current = await this.prisma.transportRecord.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Data transportasi tidak ditemukan');
    await this.prisma.transportRecord.delete({ where: { id } });
    return { message: 'Data transportasi berhasil dihapus' };
  }

  async dashboard(month?: number, year?: number) {
    const now = new Date();
    const selectedMonth = month ?? now.getUTCMonth() + 1;
    const selectedYear = year ?? now.getUTCFullYear();
    const isAllMonths = selectedMonth === 0;
    const start = isAllMonths
      ? new Date(Date.UTC(selectedYear, 0, 1))
      : new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const end = isAllMonths
      ? new Date(Date.UTC(selectedYear + 1, 0, 1))
      : new Date(Date.UTC(selectedYear, selectedMonth, 1));
    const rows = await this.prisma.transportRecord.findMany({
      where: { fuelDate: { gte: start, lt: end } },
      orderBy: [{ fuelDate: 'asc' }, { unitNumber: 'asc' }],
    });
    const num = (v: any) => Number(v ?? 0);
    const uniqueUnits = new Set(rows.map(r => r.unitNumber));
    const byDepartment = new Map<string, { totalHm: number; totalLiter: number; totalUa: number; count: number }>();
    const byUnit = new Map<string, { hmPerShift: number; totalLiter: number; ua: number; count: number }>();
    for (const r of rows) {
      const d = byDepartment.get(r.department) ?? { totalHm: 0, totalLiter: 0, totalUa: 0, count: 0 };
      d.totalHm += num(r.totalHm); d.totalLiter += num(r.totalLiter); d.totalUa += num(r.uaPercentage); d.count++; byDepartment.set(r.department, d);
      const u = byUnit.get(r.unitNumber) ?? { hmPerShift: 0, totalLiter: 0, ua: 0, count: 0 };
      u.hmPerShift += num(r.hmPerShift); u.totalLiter += num(r.totalLiter); u.ua += num(r.uaPercentage); u.count++; byUnit.set(r.unitNumber, u);
    }
    const avgUa = rows.length ? rows.reduce((a, r) => a + num(r.uaPercentage), 0) / rows.length : 0;
    return {
      month: selectedMonth, year: selectedYear,
      totals: { units: uniqueUnits.size, hm: rows.reduce((a,r)=>a+num(r.totalHm),0), liters: rows.reduce((a,r)=>a+num(r.totalLiter),0), availability: avgUa },
      availabilityByDepartment: [...byDepartment].map(([name,v]) => ({ name, value: v.count ? v.totalUa / v.count : 0 })),
      hmByDepartment: [...byDepartment].map(([name,v]) => ({ name, value: v.totalHm })),
      hmPerShiftByUnit: [...byUnit].map(([name,v]) => ({ name, value: v.count ? v.hmPerShift / v.count : 0 })),
      litersByUnit: [...byUnit].map(([name,v]) => ({ name, value: v.totalLiter })),
    };
  }
}
