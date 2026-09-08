// ==================================================
// FILE: backend/src/gudang/gudang.module.ts
// ==================================================

import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { GudangController } from './gudang.controller';
import { GudangService } from './gudang.service';
import { GudangAksesService } from './gudang-akses.service';

@Module({
  imports: [InventoryModule],
  controllers: [GudangController],
  providers: [GudangService, GudangAksesService],
})
export class GudangModule {}
