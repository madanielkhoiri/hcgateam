// ==================================================
// FILE: backend/src/auth/auth.service.ts
// FUNGSI: Login, profil, dan perubahan password
// ==================================================

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ==================================================
  // LOGIN
  // ==================================================

  async login(loginDto: LoginDto, alamatIp?: string) {
    const identifier = loginDto.username.trim();

    const user = await this.usersService.findByIdentifier(identifier);

    if (!user) {
      await this.auditLog.catat({
        aksi: 'LOGIN_GAGAL',
        entitas: 'Auth',
        alamatIp,
        detail: { username: identifier, alasan: 'Akun tidak ditemukan' },
      });
      throw new UnauthorizedException('Username / NRP / Email atau password salah');
    }

    if (!user.isActive) {
      await this.auditLog.catat({
        actorId: user.id,
        actorUsername: user.username,
        actorName: user.name,
        aksi: 'LOGIN_GAGAL',
        entitas: 'Auth',
        alamatIp,
        detail: { username: identifier, alasan: 'Akun tidak aktif' },
      });
      throw new UnauthorizedException('Akun tidak aktif');
    }

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      await this.auditLog.catat({
        actorId: user.id,
        actorUsername: user.username,
        actorName: user.name,
        aksi: 'LOGIN_GAGAL',
        entitas: 'Auth',
        alamatIp,
        detail: { username: identifier, alasan: 'Password salah' },
      });
      throw new UnauthorizedException('Username / NRP / Email atau password salah');
    }

    await this.auditLog.catat({
      actorId: user.id,
      actorUsername: user.username,
      actorName: user.name,
      aksi: 'LOGIN_BERHASIL',
      entitas: 'Auth',
      alamatIp,
    });

    const payload = {
      sub: user.id,
      username: user.username,
      nrp: user.nrp,
      nama: user.name,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login berhasil',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        accessKeys: user.accessKeys,
        vendorId: user.vendorId,
      },
    };
  }

  // ==================================================
  // AMBIL PROFIL
  // ==================================================

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    return user;
  }

  // ==================================================
  // UPDATE PROFIL
  // ==================================================

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(
      userId,
      updateProfileDto,
    );

    const payload = {
      sub: user.id,
      username: user.username,
      nrp: user.nrp,
      nama: user.name,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Profil berhasil diperbarui',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        accessKeys: user.accessKeys,
        vendorId: user.vendorId,
      },
    };
  }

  // ==================================================
  // UBAH PASSWORD
  // ==================================================

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak sama');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'Password baru harus berbeda dari password lama',
      );
    }

    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    const currentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordValid) {
      throw new UnauthorizedException('Password lama salah');
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);

    return this.usersService.updatePassword(userId, passwordHash);
  }
}

// ==================================================
// SELESAI: backend/src/auth/auth.service.ts
// ==================================================
