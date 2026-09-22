// ==================================================
// FILE: backend/src/common/uploads-auth.middleware.ts
// FUNGSI: Wajibkan login untuk membuka file di /api/uploads/ — sebelumnya
// disajikan statis lewat app.useStaticAssets() tanpa otorisasi sama sekali
// (siapa saja yang tahu/menebak URL-nya bisa buka file MCU, tanda tangan,
// dokumen deklarasi dinas, dll tanpa login). Middleware ini dipasang SEBELUM
// useStaticAssets di main.ts supaya jalan lebih dulu untuk prefix yang sama.
//
// Terima token dari header Authorization (fetch/XHR biasa) ATAU query
// `?token=` (dibutuhkan untuk <img src>/<a href> yang dirender browser
// langsung — tidak bisa menyisipkan header custom). Validasinya meniru
// JwtStrategy: signature+expiry token, akun masih aktif, dan sesi belum
// dicabut (tokenValidAfter) — supaya perilakunya konsisten dengan endpoint
// API biasa.
// ==================================================

import { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function ambilToken(req: Request): string | undefined {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }

  const queryToken = req.query.token;

  return typeof queryToken === 'string' ? queryToken : undefined;
}

export function buatUploadsAuthMiddleware(
  jwtService: JwtService,
  usersService: UsersService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = ambilToken(req);

    if (!token) {
      res.status(401).json({ message: 'Login diperlukan untuk membuka file ini' });
      return;
    }

    try {
      const payload = await jwtService.verifyAsync<JwtPayload>(token);
      const user = await usersService.findByIdForAuth(payload.sub);

      if (!user || !user.isActive) {
        res.status(401).json({ message: 'Akun tidak ditemukan atau tidak aktif' });
        return;
      }

      if (
        user.tokenValidAfter &&
        payload.iat &&
        payload.iat * 1000 < user.tokenValidAfter.getTime()
      ) {
        res.status(401).json({ message: 'Sesi ini sudah tidak berlaku — silakan login ulang' });
        return;
      }

      next();
    } catch {
      res.status(401).json({ message: 'Token akses tidak valid atau kedaluwarsa' });
    }
  };
}

// ==================================================
// SELESAI: backend/src/common/uploads-auth.middleware.ts
// ==================================================
