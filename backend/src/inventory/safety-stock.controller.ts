import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafetyStockService } from './safety-stock.service';

// Akses per scope (ELECTRIC butuh CIVIL_INVENTORY_ELECTRIC) diatur lewat
// DYNAMIC_SCOPE_ROUTES di jwt-auth.guard.ts, sama seperti Stock Opname.
@Controller('inventory-area/:scope/safety-stock')
@UseGuards(JwtAuthGuard)
export class SafetyStockController {
  constructor(private readonly service: SafetyStockService) {}

  @Get()
  analisa(
    @Param('scope') scope: string,
    @Query('bulan') bulan?: string,
    @Query('leadTime') leadTime?: string,
    @Query('serviceLevel') serviceLevel?: string,
  ) {
    return this.service.analisa(scope, bulan, leadTime, serviceLevel);
  }
}
