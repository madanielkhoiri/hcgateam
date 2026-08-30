// ==================================================
// FILE: backend/src/audit/audit.interceptor.ts
// FUNGSI: Jaring pengaman audit trail UNTUK SELURUH MODUL sekaligus.
//
// Kenapa generik (bukan per-modul seperti Auth/User/Kip)? Menulis audit log
// yang "berbicara bahasa bisnis" tiap modul (mis. "Status pekerjaan diubah
// jadi SELESAI") butuh paham betul aturan tiap modul — resikonya kalau
// ditulis buru-buru untuk 30+ modul sekaligus adalah catatan yang SALAH,
// yang lebih berbahaya daripada tidak ada catatan sama sekali.
//
// Jadi interceptor ini menangkap FAKTA HTTP apa adanya (method + rute +
// siapa + berhasil/gagal) untuk SEMUA endpoint yang mengubah data, tanpa
// perlu paham logic bisnisnya. Modul yang sudah diaudit manual (Auth,
// User, Kip) dikecualikan di sini supaya tidak dobel catatan generik +
// catatan detail yang sudah ada.
// ==================================================

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';

const METODE_DIAUDIT = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/** Rute yang sudah punya audit log manual (lebih detail) — jangan dobel catat di sini. */
const PREFIX_DIKECUALIKAN = ['/api/auth', '/api/users', '/api/kip', '/api/audit-log'];

const AKSI_PER_METODE: Record<string, string> = {
  POST: 'DIBUAT',
  PUT: 'DIUBAH',
  PATCH: 'DIUBAH',
  DELETE: 'DIHAPUS',
};

/** Ambil sampai 2 segmen rute pertama (bukan angka) sebagai nama entitas generik. */
function ambilEntitas(path: string): { entitas: string; entitasId?: number } {
  const bersih = path.split('?')[0].replace(/^\/api\//, '');
  const segmen = bersih.split('/').filter(Boolean);
  const nonNumerik = segmen.filter((s) => !/^\d+$/.test(s));
  const idSegmen = segmen.find((s) => /^\d+$/.test(s));

  return {
    entitas: nonNumerik.slice(0, 2).join('/') || 'unknown',
    entitasId: idSegmen ? Number(idSegmen) : undefined,
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLog: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const method: string = req.method;
    const path: string = req.originalUrl ?? req.url ?? '';

    const perluDiaudit =
      METODE_DIAUDIT.has(method) && !PREFIX_DIKECUALIKAN.some((prefix) => path.startsWith(prefix));

    if (!perluDiaudit) {
      return next.handle();
    }

    const { entitas, entitasId } = ambilEntitas(path);
    const ip: string = Array.isArray(req.ips) && req.ips.length ? req.ips[0] : req.ip;
    const user = req.user;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditLog.catat({
            actorId: user?.id ?? null,
            actorUsername: user?.username ?? null,
            actorName: user?.nama ?? null,
            aksi: `${entitas.toUpperCase()}_${AKSI_PER_METODE[method] ?? method}`,
            entitas,
            entitasId,
            detail: { method, path },
            alamatIp: ip,
          });
        },
        // Percobaan yang GAGAL (mis. ditolak validasi/akses) tetap dicatat —
        // berguna buat lacak percobaan aksi yang ditolak, tanpa perlu tahu
        // alasan bisnisnya secara spesifik.
        error: (err) => {
          void this.auditLog.catat({
            actorId: user?.id ?? null,
            actorUsername: user?.username ?? null,
            actorName: user?.nama ?? null,
            aksi: `${entitas.toUpperCase()}_${AKSI_PER_METODE[method] ?? method}_GAGAL`,
            entitas,
            entitasId,
            detail: { method, path, error: err?.message ?? 'Error tidak diketahui' },
            alamatIp: ip,
          });
        },
      }),
    );
  }
}
