// ==================================================
// FILE: backend/src/users/users.service.ts
// FUNGSI: Pengelolaan data pengguna
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================================================
  // CARI USER BERDASARKAN USERNAME
  // ==================================================

  async findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { nrp: identifier },
          { email: identifier },
        ],
      },
    });
  }

  // ==================================================
  // CARI USER BERDASARKAN ID TANPA PASSWORD
  // ==================================================

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ==================================================
  // CARI USER BESERTA PASSWORD HASH
  // ==================================================

  async findByIdWithPassword(id: number) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  // ==================================================
  // UPDATE PROFIL
  // ==================================================

  async updateProfile(
    id: number,
    data: {
      name: string;
      username: string;
    },
  ) {
    try {
      return await this.prisma.user.update({
        where: {
          id,
        },
        data: {
          name: data.name.trim(),
          username: data.username.trim(),
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Username sudah digunakan');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      throw error;
    }
  }

  // ==================================================
  // UPDATE PASSWORD
  // ==================================================

  async updatePassword(id: number, passwordHash: string) {
    try {
      await this.prisma.user.update({
        where: {
          id,
        },
        data: {
          passwordHash,
        },
      });

      return {
        message: 'Password berhasil diperbarui',
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      throw error;
    }
  }
}

// ==================================================
// SELESAI: backend/src/users/users.service.ts
// ==================================================
