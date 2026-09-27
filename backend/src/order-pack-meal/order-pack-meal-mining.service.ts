import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MiningPackMealEntryDto,
  SaveMiningPackMealDto,
} from './dto/save-mining-pack-meal.dto';

type MiningActor = { id: number };

@Injectable()
export class OrderPackMealMiningService {
  constructor(private readonly prisma: PrismaService) {}

  private monthRange(month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Periode bulan harus memakai format YYYY-MM');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, monthNumber - 1, 1)),
      end: new Date(Date.UTC(year, monthNumber, 1)),
    };
  }

  private nonNegative(value: number | undefined): number | null {
    if (value === undefined || value === null) return null;
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  private data(entry: MiningPackMealEntryDto, actor: MiningActor) {
    return {
      date: new Date(`${entry.date.slice(0, 10)}T00:00:00.000Z`),
      area: entry.area.trim(),
      dropLocation: entry.dropLocation?.trim() || null,
      dropTimes: entry.dropTimes?.trim() || null,
      orderedBy: 'GA PPA MINING',
      notes: entry.notes?.trim() || null,
      rosterLunch: entry.rosterLunch,
      rosterDinner: entry.rosterDinner,
      rosterSpecialMeal: entry.rosterSpecialMeal,
      rosterSpecialSnack: entry.rosterSpecialSnack,
      additionalLunch: entry.additionalLunch,
      additionalDinner: entry.additionalDinner,
      additionalSpecialMeal: entry.additionalSpecialMeal,
      additionalSpecialSnack: entry.additionalSpecialSnack,
      receivedLunch: this.nonNegative(entry.receivedLunch),
      receivedDinner: this.nonNegative(entry.receivedDinner),
      receivedSpecialMeal: this.nonNegative(entry.receivedSpecialMeal),
      receivedSpecialSnack: this.nonNegative(entry.receivedSpecialSnack),
      createdBy: actor.id,
    } satisfies Prisma.MiningPackMealEntryUncheckedCreateInput;
  }

  async findByMonth(month: string) {
    const range = this.monthRange(month);
    return this.prisma.miningPackMealEntry.findMany({
      where: { date: { gte: range.start, lt: range.end } },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { area: 'asc' }],
    });
  }

  async saveMany(dto: SaveMiningPackMealDto, actor: MiningActor) {
    if (dto.entries.length === 0) return [];

    const keys = new Set<string>();
    for (const entry of dto.entries) {
      const key = `${entry.date.slice(0, 10)}|${entry.area.trim().toLowerCase()}`;
      if (keys.has(key)) {
        throw new BadRequestException(`Data ${entry.area} pada ${entry.date.slice(0, 10)} duplikat`);
      }
      keys.add(key);
    }

    return this.prisma.$transaction(
      dto.entries.map((entry) => {
        const data = this.data(entry, actor);
        return this.prisma.miningPackMealEntry.upsert({
          where: { date_area: { date: data.date, area: data.area } },
          create: data,
          update: {
            ...data,
            createdBy: undefined,
          },
        });
      }),
    );
  }

  async remove(id: number) {
    const existing = await this.prisma.miningPackMealEntry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Data Pack Meal Mining tidak ditemukan');
    await this.prisma.miningPackMealEntry.delete({ where: { id } });
    return { message: 'Data Pack Meal Mining berhasil dihapus' };
  }
}
