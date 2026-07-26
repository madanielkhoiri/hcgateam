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
import { UpdateStockDto } from './dto/stock.dto';
import { CreateStockInBatchDto } from './dto/stock-in-batch.dto';
import { CreateStockOutBatchDto } from './dto/stock-out-batch.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  getItems() {
    return this.inventoryService.getItems();
  }

  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.inventoryService.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteItem(id);
  }

  @Get('stocks')
  getStocks() {
    return this.inventoryService.getStocks();
  }

  @Patch('stocks/:id')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(id, dto);
  }

  @Post('stock-ins/batch')
  createStockInBatch(@Body() dto: CreateStockInBatchDto) {
    return this.inventoryService.createStockInBatch(dto);
  }

  @Post('stock-outs/batch')
  createStockOutBatch(@Body() dto: CreateStockOutBatchDto) {
    return this.inventoryService.createStockOutBatch(dto);
  }
  @Get('stock-ins')
  getStockIns() {
    return this.inventoryService.getStockIns();
  }

  @Post('stock-ins')
  createStockIn(@Body() dto: CreateStockInDto) {
    return this.inventoryService.createStockIn(dto);
  }

  @Patch('stock-ins/:id')
  updateStockIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockInDto,
  ) {
    return this.inventoryService.updateStockIn(id, dto);
  }

  @Delete('stock-ins/:id')
  deleteStockIn(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteStockIn(id);
  }

  @Get('stock-outs')
  getStockOuts() {
    return this.inventoryService.getStockOuts();
  }

  @Post('stock-outs')
  createStockOut(@Body() dto: CreateStockOutDto) {
    return this.inventoryService.createStockOut(dto);
  }

  @Patch('stock-outs/:id')
  updateStockOut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockOutDto,
  ) {
    return this.inventoryService.updateStockOut(id, dto);
  }

  @Delete('stock-outs/:id')
  deleteStockOut(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteStockOut(id);
  }
}
