import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreateStockInDto, UpdateStockInDto } from './dto/stock-in.dto';
import { CreateStockOutDto, UpdateStockOutDto } from './dto/stock-out.dto';
import { CreateStockInBatchDto } from './dto/stock-in-batch.dto';
import { CreateStockOutBatchDto } from './dto/stock-out-batch.dto';
import { UpdateStockDto } from './dto/stock.dto';
import { InventoryAreaService } from './inventory-area.service';

const itemPhotoDirectory = join(process.cwd(), 'uploads', 'items');

if (!existsSync(itemPhotoDirectory)) {
  mkdirSync(itemPhotoDirectory, { recursive: true });
}

const itemPhotoUpload = FileInterceptor('photo', {
  storage: diskStorage({
    destination: itemPhotoDirectory,
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();

      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (_request, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Foto hanya boleh JPG, PNG, atau WEBP'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

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

  @Post('items/:id/photo')
  @UseInterceptors(itemPhotoUpload)
  uploadItemPhoto(
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Foto wajib dipilih');
    }

    return this.service.setItemPhoto(scope, id, file.filename);
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
    @Req() req: any,
  ) {
    return this.service.updateStock(scope, id, dto, req.user.role, req.user.id);
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
