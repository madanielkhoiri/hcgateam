// ==================================================
// FILE: backend/src/audit/audit-log.service.ts
// FUNGSI: Catat & baca jejak audit (siapa-ubah-apa-kapan).
// Dipakai modul lain lewat catat() — gagal mencatat TIDAK BOLEH
// menggagalkan aksi utama yang sedang dicatat, jadi dibungkus try/catch.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CatatAuditLog = {
  actorId?: number | null;
  actorUsername?: string | null;
  actorName?: string | null;
  actorNrp?: string | null;
  aksi: string;
  entitas: string;
  entitasId?: number | null;
  detail?: Record<string, unknown> | null;
  alamatIp?: string | null;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async catat(data: CatatAuditLog): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: data.actorId ?? null,
          actorUsername: data.actorUsername ?? null,
          actorName: data.actorName ?? null,
          actorNrp: data.actorNrp ?? null,
          aksi: data.aksi,
          entitas: data.entitas,
          entitasId: data.entitasId ?? null,
          detail: (data.detail as Prisma.InputJsonValue) ?? undefined,
          alamatIp: data.alamatIp ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Gagal mencatat audit log', error as Error);
    }
  }

  async daftar(filter: {
    entitas?: string;
    actorId?: number;
    dari?: Date;
    sampai?: Date;
    halaman: number;
    ukuranHalaman: number;
  }) {
    const where = {
      ...(filter.entitas ? { entitas: filter.entitas } : {}),
      ...(filter.actorId ? { actorId: filter.actorId } : {}),
      ...(filter.dari || filter.sampai
        ? {
            createdAt: {
              ...(filter.dari ? { gte: filter.dari } : {}),
              ...(filter.sampai ? { lte: filter.sampai } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.halaman - 1) * filter.ukuranHalaman,
        take: filter.ukuranHalaman,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, halaman: filter.halaman, ukuranHalaman: filter.ukuranHalaman };
  }

  /** Daftar nilai `entitas` yang pernah tercatat — buat isi filter dropdown di frontend. */
  async daftarEntitas(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['entitas'],
      select: { entitas: true },
      orderBy: { entitas: 'asc' },
    });

    return rows.map((r) => r.entitas);
  }
}
