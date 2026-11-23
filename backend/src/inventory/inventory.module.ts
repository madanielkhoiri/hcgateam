import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElectricStockOutController } from './electric-stock-out.controller';
import { ElectricStockOutService } from './electric-stock-out.service';
import { InventoryAreaController } from './inventory-area.controller';
import { InventoryAreaService } from './inventory-area.service';
import { InventoryController } from './inventory.controller';
import { InventoryDashboardController } from './inventory-dashboard.controller';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { InventoryService } from './inventory.service';
import { InventoryAksesService } from './inventory-akses.service';
import { StockOpnameController } from './stock-opname.controller';
import { StockOpnameService } from './stock-opname.service';
import { DeviasiStokService } from './deviasi-stok.service';
import { SafetyStockController } from './safety-stock.controller';
import { SafetyStockService } from './safety-stock.service';

@Module({
  controllers: [
    InventoryController,
    InventoryDashboardController,
    InventoryAreaController,
    ElectricStockOutController,
    StockOpnameController,
    SafetyStockController,
  ],
  providers: [
    InventoryService,
    InventoryDashboardService,
    InventoryAreaService,
    ElectricStockOutService,
    InventoryAksesService,
    DeviasiStokService,
    StockOpnameService,
    SafetyStockService,
    PrismaService,
  ],
  exports: [InventoryAreaService],
})
export class InventoryModule {}
