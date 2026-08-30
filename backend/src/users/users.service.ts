// ==================================================
// FILE: backend/src/users/users.service.ts
// FUNGSI: Pengelolaan data pengguna
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ACCESS_CATALOG,
  ALL_ACCESS_KEYS,
  DEFAULT_GUEST_ACCESS_KEYS,
  sanitizeAccessKeys,
} from '../access/access.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type AdminActor = {
  id: number;
  role: UserRole;
  username?: string;
  nama?: string;
};

const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  nrp: true,
  email: true,
  phoneNumber: true,
  departemen: true,
  jabatan: true,
  role: true,
  isActive: true,
  accessKeys: true,
  vendorId: true,
  driverId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ==================================================
  // CARI USER BERDASARKAN USERNAME / NRP / EMAIL
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

  private assertAdmin(actor: AdminActor): void {
    const bolehKelola =
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.SECTION_HEAD;

    if (!bolehKelola) {
      throw new ForbiddenException(
        'Manajemen akun hanya dapat diakses Admin/Admin HC/Section Head',
      );
    }
  }

  /**
   * Hanya Admin, Admin HC (Super Admin), dan Section Head yang default-nya
   * akses penuh. Role lain default-nya KOSONG — HC/Section Head wajib
   * menentukan sendiri akses tiap akun lewat panel "Atur akses", supaya
   * tidak ada akun yang ke-grant akses penuh tanpa sengaja.
   */
  private defaultAccessKeys(role: UserRole): string[] {
    if (
      role === UserRole.ADMIN ||
      role === UserRole.SUPER_ADMIN ||
      role === UserRole.SECTION_HEAD
    ) {
      return [...ALL_ACCESS_KEYS];
    }

    if (role === UserRole.TAMU) {
      return [...DEFAULT_GUEST_ACCESS_KEYS];
    }

    return [];
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes('email')) {
        throw new BadRequestException('Email sudah digunakan');
      }
      if (target.includes('nrp')) {
        throw new BadRequestException('NRP sudah digunakan');
      }
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

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  async findByIdWithPassword(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(actor: AdminActor, search?: string) {
    this.assertAdmin(actor);
    const keyword = search?.trim();

    return this.prisma.user.findMany({
      where: keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { username: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: publicUserSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  getAccessCatalog(actor: AdminActor) {
    this.assertAdmin(actor);
    return ACCESS_CATALOG;
  }

  async findOneForAdmin(id: number, actor: AdminActor) {
    this.assertAdmin(actor);
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return user;
  }

  async create(dto: CreateUserDto, actor: AdminActor) {
    this.assertAdmin(actor);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const accessKeys = sanitizeAccessKeys(
      dto.accessKeys ?? this.defaultAccessKeys(dto.role),
    );

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          username: dto.username.trim(),
          passwordHash,
          role: dto.role,
          isActive: dto.isActive ?? true,
          accessKeys,
          nrp: dto.nrp?.trim() || null,
          email: dto.email?.trim() || null,
          phoneNumber: dto.phoneNumber?.trim() || null,
          departemen: dto.departemen?.trim() || null,
          jabatan: dto.jabatan?.trim() || null,
        },
        select: publicUserSelect,
      });

      await this.auditLog.catat({
        actorId: actor.id,
        actorUsername: actor.username,
        actorName: actor.nama,
        aksi: 'USER_DIBUAT',
        entitas: 'User',
        entitasId: user.id,
        detail: { name: user.name, username: user.username, role: user.role },
      });

      return user;
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async update(id: number, dto: UpdateUserDto, actor: AdminActor) {
    this.assertAdmin(actor);

    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (id === actor.id && dto.isActive === false) {
      throw new BadRequestException('Admin tidak dapat menonaktifkan akun sendiri');
    }

    if (id === actor.id && dto.role && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException('Admin tidak dapat mengganti role akun sendiri');
    }

    const nextRole = dto.role ?? current.role;
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : undefined;

    const accessKeys = dto.accessKeys
      ? sanitizeAccessKeys(dto.accessKeys)
      : dto.role && dto.role !== current.role
        ? this.defaultAccessKeys(nextRole)
        : undefined;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.username !== undefined
            ? { username: dto.username.trim() }
            : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(accessKeys ? { accessKeys } : {}),
          ...(dto.nrp !== undefined ? { nrp: dto.nrp?.trim() || null } : {}),
          ...(dto.email !== undefined
            ? { email: dto.email?.trim() || null }
            : {}),
          ...(dto.phoneNumber !== undefined
            ? { phoneNumber: dto.phoneNumber?.trim() || null }
            : {}),
          ...(dto.departemen !== undefined
            ? { departemen: dto.departemen?.trim() || null }
            : {}),
          ...(dto.jabatan !== undefined
            ? { jabatan: dto.jabatan?.trim() || null }
            : {}),
        },
        select: publicUserSelect,
      });

      // Tidak pernah catat password (hashed sekalipun) ke audit log.
      const { password: _abaikan, ...dtoTanpaPassword } = dto;

      await this.auditLog.catat({
        actorId: actor.id,
        actorUsername: actor.username,
        actorName: actor.nama,
        aksi: 'USER_DIUBAH',
        entitas: 'User',
        entitasId: id,
        detail: {
          perubahan: dtoTanpaPassword,
          passwordDiubah: Boolean(passwordHash),
        },
      });

      return user;
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateAccess(
    id: number,
    dto: UpdateUserAccessDto,
    actor: AdminActor,
  ) {
    this.assertAdmin(actor);

    try {
      const accessKeys = sanitizeAccessKeys(dto.accessKeys);
      const user = await this.prisma.user.update({
        where: { id },
        data: { accessKeys },
        select: publicUserSelect,
      });

      await this.auditLog.catat({
        actorId: actor.id,
        actorUsername: actor.username,
        actorName: actor.nama,
        aksi: 'USER_AKSES_DIUBAH',
        entitas: 'User',
        entitasId: id,
        detail: { accessKeysBaru: accessKeys },
      });

      return user;
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number, actor: AdminActor) {
    this.assertAdmin(actor);

    if (id === actor.id) {
      throw new BadRequestException('Admin tidak dapat menghapus akun sendiri');
    }

    try {
      const dihapus = await this.prisma.user.delete({ where: { id } });

      await this.auditLog.catat({
        actorId: actor.id,
        actorUsername: actor.username,
        actorName: actor.nama,
        aksi: 'USER_DIHAPUS',
        entitas: 'User',
        entitasId: id,
        detail: { name: dihapus.name, username: dihapus.username, role: dihapus.role },
      });

      return { message: 'Akun berhasil dihapus' };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Akun sudah memiliki data transaksi dan tidak dapat dihapus. Nonaktifkan akun sebagai gantinya.',
        );
      }

      this.handlePrismaError(error);
    }
  }

  async updateProfile(
    id: number,
    data: {
      name: string;
      username: string;
    },
  ) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: data.name.trim(),
          username: data.username.trim(),
        },
        select: publicUserSelect,
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updatePassword(id: number, passwordHash: string) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      return { message: 'Password berhasil diperbarui' };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }
}
