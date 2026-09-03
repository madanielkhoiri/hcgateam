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
import { DeviasiStokService } from './deviasi-stok.service';

@Module({
  controllers: [
    InventoryController,
    InventoryDashboardController,
    InventoryAreaController,
    ElectricStockOutController,
  ],
  providers: [
    InventoryService,
    InventoryDashboardService,
    InventoryAreaService,
    ElectricStockOutService,
    InventoryAksesService,
    DeviasiStokService,
    PrismaService,
  ],
})
export class InventoryModule {}
