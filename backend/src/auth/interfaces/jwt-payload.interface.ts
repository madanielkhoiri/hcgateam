// ==================================================
// FILE: backend/src/auth/interfaces/jwt-payload.interface.ts
// FUNGSI: Struktur data token JWT
// ==================================================

export interface JwtPayload {
  sub: number;
  username: string;
  nrp?: string;
  nama?: string;
  role: string;
  /** Diisi otomatis oleh @nestjs/jwt saat token diterbitkan (detik sejak epoch) — dipakai untuk cek "cabut sesi". */
  iat?: number;
}

// ==================================================
// SELESAI
// ==================================================
