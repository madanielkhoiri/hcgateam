import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { firstValueFrom, isObservable } from 'rxjs';
import { REQUIRE_ACCESS_KEY } from './require-access-key.decorator';

// ==================================================
// InventoryDashboardController & InventoryAreaController SENGAJA TIDAK
// pakai @RequireAccessKey() di controllernya — accessKey yang dibutuhkan
// tergantung nilai param `:scope` di URL saat request (scope ELECTRIC
// butuh accessKey tambahan CIVIL_INVENTORY_ELECTRIC), jadi tidak bisa
// dinyatakan lewat decorator statis. Ini SATU-SATUNYA pengecualian —
// selain dua controller ini, SEMUA proteksi accessKey dinyatakan lewat
// @RequireAccessKey() persis di controller/route-nya masing-masing
// (lihat require-access-key.decorator.ts). Urutan array penting: pola
// scope ELECTRIC harus dicek SEBELUM pola umumnya supaya tidak ketiban
// aturan yang lebih longgar.
// ==================================================
const DYNAMIC_SCOPE_ROUTES: Array<{ pattern: RegExp; accessKey: string[] }> = [
  {
    pattern: /^\/api\/inventory-dashboard\/electric(?:\/|\?|$)/i,
    accessKey: ['GA_INVENTORY', 'CIVIL_INVENTORY_ELECTRIC'],
  },
  {
    pattern: /^\/api\/inventory-dashboard(?:\/|\?|$)/,
    accessKey: ['GA_INVENTORY'],
  },
  {
    pattern: /^\/api\/inventory-area\/electric(?:\/|\?|$)/i,
    accessKey: ['GA_INVENTORY', 'CIVIL_INVENTORY_ELECTRIC'],
  },
  {
    pattern: /^\/api\/inventory-area(?:\/|\?|$)/,
    accessKey: ['GA_INVENTORY'],
  },
];

type GuardRequest = {
  originalUrl?: string;
  url?: string;
  user?: {
    id: number;
    role: UserRole;
    accessKeys?: string[];
  };
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = super.canActivate(context);
    const authenticated = isObservable(result)
      ? await firstValueFrom(result)
      : await result;

    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<GuardRequest>();
    const user = request.user;

    if (
      !user ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.SECTION_HEAD
    ) {
      return true;
    }

    const requiredFromDecorator = this.reflector.getAllAndOverride<
      string[] | undefined
    >(REQUIRE_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    const requestUrl = request.originalUrl ?? request.url ?? '';
    const requiredFromScope = DYNAMIC_SCOPE_ROUTES.find(({ pattern }) =>
      pattern.test(requestUrl),
    )?.accessKey;

    const requiredAccessKeys = requiredFromDecorator ?? requiredFromScope;

    if (!requiredAccessKeys || requiredAccessKeys.length === 0) {
      return true;
    }

    const ownedAccessKeys = user.accessKeys ?? [];

    if (!requiredAccessKeys.some((key) => ownedAccessKeys.includes(key))) {
      throw new ForbiddenException(
        'Akses modul untuk akun ini sedang dinonaktifkan',
      );
    }

    return true;
  }
}
