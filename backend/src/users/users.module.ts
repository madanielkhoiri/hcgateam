// ==================================================
// FILE: backend/src/users/users.module.ts
// FUNGSI: Module pengguna
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// ==================================================
// SELESAI: backend/src/users/users.module.ts
// ==================================================
