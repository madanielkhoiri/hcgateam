import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuatStockOpnameDto, IsiStockOpnameItemDto } from './dto/stock-opname.dto';
import { AktorOpname, StockOpnameService } from './stock-opname.service';

type RequestDenganUser = { user: AktorOpname };

// Akses per scope (ELECTRIC butuh CIVIL_INVENTORY_ELECTRIC) diatur lewat
// DYNAMIC_SCOPE_ROUTES di jwt-auth.guard.ts, sama seperti InventoryAreaController.
@Controller('inventory-area/:scope/stock-opname')
@UseGuards(JwtAuthGuard)
export class StockOpnameController {
  constructor(private readonly service: StockOpnameService) {}

  @Get()
  daftar(@Param('scope') scope: string, @Req() req: RequestDenganUser) {
    return this.service.daftar(scope, req.user);
  }

  @Post()
  buat(@Param('scope') scope: string, @Body() dto: BuatStockOpnameDto, @Req() req: RequestDenganUser) {
    return this.service.buat(scope, dto, req.user);
  }

  @Get(':id')
  detail(@Param('scope') scope: string, @Param('id', ParseIntPipe) id: number, @Req() req: RequestDenganUser) {
    return this.service.detail(scope, id, req.user);
  }

  @Patch(':id/items/:itemId')
  isiItem(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: IsiStockOpnameItemDto,
    @Req() req: RequestDenganUser,
  ) {
    return this.service.isiItem(scope, id, itemId, dto, req.user);
  }

  @Post(':id/selesai')
  selesaikan(@Param('scope') scope: string, @Param('id', ParseIntPipe) id: number, @Req() req: RequestDenganUser) {
    return this.service.selesaikan(scope, id, req.user);
  }

  @Delete(':id')
  batalkan(@Param('scope') scope: string, @Param('id', ParseIntPipe) id: number, @Req() req: RequestDenganUser) {
    return this.service.batalkan(scope, id, req.user);
  }
}
