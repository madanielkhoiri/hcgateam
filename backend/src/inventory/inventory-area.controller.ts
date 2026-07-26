import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreateStockInDto, UpdateStockInDto } from './dto/stock-in.dto';
import { CreateStockOutDto, UpdateStockOutDto } from './dto/stock-out.dto';
import { CreateStockInBatchDto } from './dto/stock-in-batch.dto';
import { CreateStockOutBatchDto } from './dto/stock-out-batch.dto';
import { UpdateStockDto } from './dto/stock.dto';
import { InventoryAreaService } from './inventory-area.service';

@Controller('inventory-area/:scope')
@UseGuards(JwtAuthGuard)
export class InventoryAreaController {
  constructor(private readonly service: InventoryAreaService) {}

  @Get('items')
  getItems(@Param('scope') scope: string) {
    return this.service.getItems(scope);
  }

  @Post('items')
  createItem(@Param('scope') scope: string, @Body() dto: CreateItemDto) {
    return this.service.createItem(scope, dto);
  }

  @Patch('items/:id')
  updateItem(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.service.updateItem(scope, id, dto);
  }

  @Delete('items/:id')
  deleteItem(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteItem(scope, id);
  }

  @Get('stocks')
  getStocks(@Param('scope') scope: string) {
    return this.service.getStocks(scope);
  }

  @Patch('stocks/:id')
  updateStock(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
  ) {
    return this.service.updateStock(scope, id, dto);
  }

  @Get('stock-ins')
  getStockIns(@Param('scope') scope: string) {
    return this.service.getStockIns(scope);
  }

  @Post('stock-ins')
  createStockIn(@Param('scope') scope: string, @Body() dto: CreateStockInDto) {
    return this.service.createStockIn(scope, dto);
  }

  @Post('stock-ins/batch')
  createStockInBatch(
    @Param('scope') scope: string,
    @Body() dto: CreateStockInBatchDto,
  ) {
    return this.service.createStockInBatch(scope, dto);
  }

  @Patch('stock-ins/:id')
  updateStockIn(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockInDto,
  ) {
    return this.service.updateStockIn(scope, id, dto);
  }

  @Delete('stock-ins/:id')
  deleteStockIn(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteStockIn(scope, id);
  }

  @Get('stock-outs')
  getStockOuts(@Param('scope') scope: string) {
    return this.service.getStockOuts(scope);
  }

  @Post('stock-outs')
  createStockOut(
    @Param('scope') scope: string,
    @Body() dto: CreateStockOutDto,
  ) {
    return this.service.createStockOut(scope, dto);
  }

  @Post('stock-outs/batch')
  createStockOutBatch(
    @Param('scope') scope: string,
    @Body() dto: CreateStockOutBatchDto,
  ) {
    return this.service.createStockOutBatch(scope, dto);
  }

  @Patch('stock-outs/:id')
  updateStockOut(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockOutDto,
  ) {
    return this.service.updateStockOut(scope, id, dto);
  }

  @Delete('stock-outs/:id')
  deleteStockOut(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteStockOut(scope, id);
  }
}
