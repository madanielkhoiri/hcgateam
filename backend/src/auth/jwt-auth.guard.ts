import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { firstValueFrom, isObservable } from 'rxjs';

const routeAccessMap: Array<{ pattern: RegExp; accessKey: string }> = [
  { pattern: /\/api\/inventory-dashboard(?:\/|\?|$)/, accessKey: 'GA_INVENTORY' },
  { pattern: /\/api\/inventory-area(?:\/|\?|$)/, accessKey: 'GA_INVENTORY' },
  { pattern: /\/api\/inventory(?:\/|\?|$)/, accessKey: 'GA_INVENTORY' },
  { pattern: /\/api\/work-orders(?:\/|\?|$)/, accessKey: 'GA_PEKERJAAN' },
  { pattern: /\/api\/handovers(?:\/|\?|$)/, accessKey: 'GA_PEKERJAAN' },
  { pattern: /\/api\/daily-activities(?:\/|\?|$)/, accessKey: 'GA_AKTIVITAS_HARIAN' },
  { pattern: /\/api\/daily-activity-images(?:\/|\?|$)/, accessKey: 'GA_AKTIVITAS_HARIAN' },
  { pattern: /\/api\/pre-activity-checks(?:\/|\?|$)/, accessKey: 'GA_PROJECT' },
  { pattern: /\/api\/post-activities(?:\/|\?|$)/, accessKey: 'GA_PROJECT' },
  { pattern: /\/api\/p5m(?:\/|\?|$)/, accessKey: 'GA_SAFETY_MEETING' },
  { pattern: /\/api\/transport(?:\/|\?|$)/, accessKey: 'GA_TRANSPORT' },
  { pattern: /\/api\/order-pack-meal(?:\/|\?|$)/, accessKey: 'GA_ORDER_PACK_MEAL' },
  { pattern: /\/api\/signature-library(?:\/|\?|$)/, accessKey: 'GA' },
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

    if (!user || user.role === UserRole.ADMIN) {
      return true;
    }

    const requestUrl = request.originalUrl ?? request.url ?? '';
    const requiredAccess = routeAccessMap.find(({ pattern }) =>
      pattern.test(requestUrl),
    )?.accessKey;

    if (!requiredAccess) {
      return true;
    }

    if (!(user.accessKeys ?? []).includes(requiredAccess)) {
      throw new ForbiddenException(
        'Akses modul untuk akun ini sedang dinonaktifkan',
      );
    }

    return true;
  }
}
