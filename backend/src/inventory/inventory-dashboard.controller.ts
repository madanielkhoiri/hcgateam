import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryDashboardService } from './inventory-dashboard.service';

// SENGAJA TIDAK pakai @RequireAccessKey() di sini — accessKey yang
// dibutuhkan tergantung nilai param :scope (ELECTRIC butuh kunci
// tambahan CIVIL_INVENTORY_ELECTRIC), jadi diatur lewat pengecualian
// khusus DYNAMIC_SCOPE_ROUTES di jwt-auth.guard.ts, bukan decorator statis.
@Controller('inventory-dashboard')
@UseGuards(JwtAuthGuard)
export class InventoryDashboardController {
  constructor(
    private readonly inventoryDashboardService: InventoryDashboardService,
  ) {}

  @Get(':scope')
  getDashboard(
    @Param('scope') scope: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.inventoryDashboardService.getDashboard(scope, month, year);
  }
}
