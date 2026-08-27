import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { firstValueFrom, isObservable } from 'rxjs';

const routeAccessMap: Array<{ pattern: RegExp; accessKey: string | string[] }> = [
  {
    pattern: /\/api\/inventory-dashboard\/electric(?:\/|\?|$)/i,
    accessKey: ['GA_INVENTORY', 'CIVIL_INVENTORY_ELECTRIC'],
  },
  {
    pattern: /\/api\/inventory-dashboard(?:\/|\?|$)/,
    accessKey: 'GA_INVENTORY',
  },
  {
    pattern: /\/api\/inventory-area\/ELECTRIC(?:\/|\?|$)/i,
    accessKey: ['GA_INVENTORY', 'CIVIL_INVENTORY_ELECTRIC'],
  },
  { pattern: /\/api\/inventory-area(?:\/|\?|$)/, accessKey: 'GA_INVENTORY' },
  { pattern: /\/api\/inventory(?:\/|\?|$)/, accessKey: 'GA_INVENTORY' },
  { pattern: /\/api\/work-orders(?:\/|\?|$)/, accessKey: 'GA_PEKERJAAN' },
  { pattern: /\/api\/handovers(?:\/|\?|$)/, accessKey: 'GA_PEKERJAAN' },
  {
    pattern: /\/api\/daily-activities(?:\/|\?|$)/,
    accessKey: 'GA_AKTIVITAS_HARIAN',
  },
  {
    pattern: /\/api\/daily-activity-images(?:\/|\?|$)/,
    accessKey: 'GA_AKTIVITAS_HARIAN',
  },
  { pattern: /\/api\/pre-activity-checks(?:\/|\?|$)/, accessKey: 'GA_PROJECT' },
  { pattern: /\/api\/post-activities(?:\/|\?|$)/, accessKey: 'GA_PROJECT' },
  { pattern: /\/api\/p5m(?:\/|\?|$)/, accessKey: 'GA_SAFETY_MEETING' },
  { pattern: /\/api\/transport(?:\/|\?|$)/, accessKey: 'GA_TRANSPORT' },
  {
    pattern: /\/api\/order-pack-meal(?:\/|\?|$)/,
    accessKey: 'GA_ORDER_PACK_MEAL',
  },
  { pattern: /\/api\/signature-library(?:\/|\?|$)/, accessKey: 'GA' },
  { pattern: /\/api\/mcu(?:\/|\?|$)/, accessKey: 'HC_MCU' },
  { pattern: /\/api\/helpdesk(?:\/|\?|$)/, accessKey: 'HC_HELPDESK' },
  {
    pattern: /\/api\/database-karyawan(?:\/|\?|$)/,
    accessKey: 'HC_KARYAWAN',
  },
  {
    pattern: /\/api\/surat-tugas-dinas(?:\/|\?|$)/,
    accessKey: 'HC_TUGAS_DINAS',
  },
  { pattern: /\/api\/anak-magang(?:\/|\?|$)/, accessKey: 'HC_ANAK_MAGANG' },
  {
    pattern: /\/api\/surat-balasan-magang(?:\/|\?|$)/,
    accessKey: 'HC_SURAT_BALASAN_MAGANG',
  },
  {
    pattern: /\/api\/surat-penolakan-magang(?:\/|\?|$)/,
    accessKey: 'HC_SURAT_PENOLAKAN_MAGANG',
  },
  { pattern: /\/api\/eprom(?:\/|\?|$)/, accessKey: 'CIVIL_PROJECT' },
  { pattern: /\/api\/civil-tps3r(?:\/|\?|$)/, accessKey: 'CIVIL_TPS3R' },
  {
    pattern: /\/api\/tiket\/admin(?:\/|\?|$)/,
    accessKey: 'GA_TRANSPORT_TIKET',
  },
  {
    pattern: /\/api\/travel\/admin(?:\/|\?|$)/,
    accessKey: 'GA_TRANSPORT_TRAVEL',
  },
  {
    pattern: /\/api\/housekeeping-indoor(?:\/|\?|$)/,
    accessKey: 'GA_GS_HOUSEKEEPING_INDOOR',
  },
  { pattern: /\/api\/ir(?:\/|\?|$)/, accessKey: 'HC_IR' },
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

    if (
      !user ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.SECTION_HEAD
    ) {
      return true;
    }

    const requestUrl = request.originalUrl ?? request.url ?? '';
    const requiredAccess = routeAccessMap.find(({ pattern }) =>
      pattern.test(requestUrl),
    )?.accessKey;

    if (!requiredAccess) {
      return true;
    }

    const requiredAccessKeys = Array.isArray(requiredAccess)
      ? requiredAccess
      : [requiredAccess];
    const ownedAccessKeys = user.accessKeys ?? [];

    if (!requiredAccessKeys.some((key) => ownedAccessKeys.includes(key))) {
      throw new ForbiddenException(
        'Akses modul untuk akun ini sedang dinonaktifkan',
      );
    }

    return true;
  }
}
