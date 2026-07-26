// ==================================================
// FILE: backend/src/auth/jwt-auth.guard.ts
// FUNGSI: Melindungi endpoint menggunakan JWT
// ==================================================

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// ==================================================
// SELESAI: backend/src/auth/jwt-auth.guard.ts
// ==================================================
