import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryDashboardService } from './inventory-dashboard.service';

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
