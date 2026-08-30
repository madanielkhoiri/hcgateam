// ==================================================
// FILE: backend/src/audit/audit-log.controller.ts
// FUNGSI: Endpoint baca audit log (Admin/Super Admin saja)
// ==================================================

import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAksesService } from './audit-akses.service';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
export class AuditLogController {
  constructor(
    private readonly service: AuditLogService,
    private readonly akses: AuditAksesService,
  ) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  daftar(
    @Req() req: any,
    @Query('entitas') entitas?: string,
    @Query('actorId') actorIdRaw?: string,
    @Query('dari') dariRaw?: string,
    @Query('sampai') sampaiRaw?: string,
    @Query('halaman') halamanRaw?: string,
  ) {
    this.akses.wajibAdmin(req.user.role);

    return this.service.daftar({
      entitas: entitas || undefined,
      actorId: actorIdRaw ? Number(actorIdRaw) : undefined,
      dari: dariRaw ? new Date(dariRaw) : undefined,
      sampai: sampaiRaw ? new Date(sampaiRaw) : undefined,
      halaman: halamanRaw ? Math.max(1, Number(halamanRaw)) : 1,
      ukuranHalaman: 50,
    });
  }

  @Get('admin/entitas')
  @UseGuards(JwtAuthGuard)
  daftarEntitas(@Req() req: any) {
    this.akses.wajibAdmin(req.user.role);
    return this.service.daftarEntitas();
  }
}
