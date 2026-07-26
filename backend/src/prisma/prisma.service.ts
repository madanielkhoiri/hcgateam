// ==================================================
// FILE: backend/src/prisma/prisma.service.ts
// FUNGSI: Koneksi NestJS ke PostgreSQL melalui Prisma 7
// ==================================================

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// ==================================================
// PRISMA SERVICE
// ==================================================

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // ==================================================
  // KONSTRUKTOR PRISMA 7
  // ==================================================

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL tidak ditemukan. Periksa file backend/.env.',
      );
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    super({
      adapter,
    });
  }

  // ==================================================
  // KONEKSI SAAT BACKEND DIMULAI
  // ==================================================

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // ==================================================
  // PUTUSKAN KONEKSI SAAT BACKEND DIHENTIKAN
  // ==================================================

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

// ==================================================
// SELESAI: backend/src/prisma/prisma.service.ts
// ==================================================
