// ==================================================
// FILE: backend/src/auth/interfaces/jwt-payload.interface.ts
// FUNGSI: Struktur data token JWT
// ==================================================

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

// ==================================================
// SELESAI
// ==================================================
