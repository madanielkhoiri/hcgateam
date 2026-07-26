// ==================================================
// FILE: backend/src/prisma/prisma.module.ts
// FUNGSI: Menyediakan Prisma untuk seluruh backend
// ==================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// ==================================================
// PRISMA MODULE
// ==================================================

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// ==================================================
// SELESAI: backend/src/prisma/prisma.module.ts
// ==================================================
