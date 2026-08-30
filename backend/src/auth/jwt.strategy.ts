// ==================================================
// FILE: backend/src/auth/jwt.strategy.ts
// FUNGSI: Membaca dan memvalidasi token JWT
// ==================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findByIdForAuth(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Akun tidak ditemukan atau tidak aktif');
    }

    if (user.tokenValidAfter && payload.iat && payload.iat * 1000 < user.tokenValidAfter.getTime()) {
      throw new UnauthorizedException('Sesi ini sudah tidak berlaku — silakan login ulang');
    }

    return {
      id: user.id,
      username: user.username,
      nrp: user.nrp,
      nama: user.name,
      role: user.role,
      accessKeys: user.accessKeys,
      vendorId: user.vendorId,
      driverId: user.driverId,
    };
  }
}
