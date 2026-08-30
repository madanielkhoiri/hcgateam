// ==================================================
// FILE: backend/src/common/hcga-throttler.guard.ts
// FUNGSI: Rate limiting global (anti brute-force / anti abuse API).
//
// Default: dibatasi per alamat IP — cukup longgar (lihat app.module.ts)
// supaya tidak mengganggu kantor yang berbagi 1 IP publik (NAT).
//
// Khusus endpoint login: dibatasi per kombinasi (IP + username yang
// dicoba), bukan per IP saja — supaya satu akun yang di-brute-force tetap
// kena limit ketat, TANPA ikut mengunci karyawan lain di jaringan/kantor
// yang sama yang cuma mau login ke akunnya sendiri.
// ==================================================

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

const PATH_LOGIN = '/api/auth/login';

/** Pisah jadi fungsi murni supaya gampang di-unit-test tanpa perlu bikin instance NestJS penuh. */
export function tentukanTrackerThrottle(req: {
  ip?: string;
  ips?: string[];
  originalUrl?: string;
  url?: string;
  body?: { username?: unknown };
}): string {
  const ip = Array.isArray(req.ips) && req.ips.length ? req.ips[0] : (req.ip ?? '');
  const path = req.originalUrl ?? req.url ?? '';

  if (path.startsWith(PATH_LOGIN) && typeof req.body?.username === 'string') {
    const username = req.body.username.trim().toLowerCase();
    if (username) {
      return `${ip}:login:${username}`;
    }
  }

  return ip;
}

@Injectable()
export class HcgaThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Terlalu banyak percobaan. Coba lagi dalam beberapa saat.';

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return tentukanTrackerThrottle(req);
  }
}
